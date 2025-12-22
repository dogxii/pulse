<script setup lang="ts">
// Markdown 编辑器组件
// 支持工具栏格式化、实时预览、字符统计等功能

import { ref, computed } from 'vue'
import { Eye, Edit3, Bold, Italic, Link, Image, List, Code, Quote, Heading } from 'lucide-vue-next'

// ========== Props ==========
const props = defineProps<{
  // 编辑器内容（v-model）
  modelValue: string
  // 占位符文本
  placeholder?: string
  // 最小行数
  minRows?: number
  // 最大字符数
  maxLength?: number
  // 是否禁用
  disabled?: boolean
}>()

// ========== Emits ==========
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// ========== 状态 ==========

// 编辑模式：'write' 写作 | 'preview' 预览
const mode = ref<'write' | 'preview'>('write')

// ========== 计算属性 ==========

/**
 * 双向绑定的内容
 */
const content = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

/**
 * 当前字符数
 */
const characterCount = computed(() => props.modelValue.length)

/**
 * 是否超出字符限制
 */
const isOverLimit = computed(() => {
  if (!props.maxLength) return false
  return characterCount.value > props.maxLength
})

/**
 * 将 Markdown 转换为 HTML 用于预览
 */
const renderedContent = computed(() => {
  if (!props.modelValue) return '<p class="text-gray-400 italic">暂无内容预览</p>'

  let html = props.modelValue
    // 转义 HTML 特殊字符
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 先处理代码块（防止内部内容被其他规则处理）
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre class="bg-gray-100 rounded-lg p-4 my-2 overflow-x-auto"><code class="text-sm font-mono text-gray-800">$2</code></pre>'
  )

  // 标题（使用特殊类名便于样式控制）
  html = html.replace(
    /^### (.+)$/gm,
    '<h3 class="md-heading text-lg font-bold text-gray-900">$1</h3>'
  )
  html = html.replace(
    /^## (.+)$/gm,
    '<h2 class="md-heading text-xl font-bold text-gray-900">$1</h2>'
  )
  html = html.replace(
    /^# (.+)$/gm,
    '<h1 class="md-heading text-2xl font-bold text-gray-900">$1</h1>'
  )

  // 粗体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>')
  html = html.replace(/__(.+?)__/g, '<strong class="font-bold">$1</strong>')

  // 斜体
  html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
  html = html.replace(/_(.+?)_/g, '<em class="italic">$1</em>')

  // 行内代码
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">$1</code>'
  )

  // 引用
  html = html.replace(
    /^> (.+)$/gm,
    '<blockquote class="border-l-4 border-gray-300 pl-4 my-2 text-gray-600 italic">$1</blockquote>'
  )

  // 无序列表
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
  html = html.replace(/^\* (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')

  // 有序列表
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')

  // 链接
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-emerald-600 hover:text-emerald-700 underline">$1</a>'
  )

  // 图片
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="rounded-xl max-w-full my-2" />'
  )

  // 分割线
  html = html.replace(/^---$/gm, '<hr class="my-4 border-gray-200" />')

  // 处理换行 - 移除块级元素前后的换行
  html = html.replace(/\n(<h[1-3] class="md-heading)/g, '$1')
  html = html.replace(/(<\/h[1-3]>)\n/g, '$1')
  html = html.replace(/\n(<pre class)/g, '$1')
  html = html.replace(/(<\/pre>)\n/g, '$1')
  html = html.replace(/\n(<blockquote)/g, '$1')
  html = html.replace(/(<\/blockquote>)\n/g, '$1')
  html = html.replace(/<\/li>\n<li/g, '</li><li')

  // 双换行 = 新段落
  html = html.replace(/\n\n+/g, '</p><p class="mb-2">')

  // 单换行 = 换行
  html = html.replace(/\n/g, '<br />')

  // 清理块级元素周围的 br
  html = html.replace(/<br \/>\s*(<h[1-3] class="md-heading)/g, '$1')
  html = html.replace(/(<\/h[1-3]>)\s*<br \/>/g, '$1')
  html = html.replace(/<br \/>\s*(<pre class)/g, '$1')
  html = html.replace(/(<\/pre>)\s*<br \/>/g, '$1')
  html = html.replace(/<br \/>\s*(<blockquote)/g, '$1')
  html = html.replace(/(<\/blockquote>)\s*<br \/>/g, '$1')
  html = html.replace(/<br \/>\s*(<hr)/g, '$1')
  html = html.replace(/(<hr[^>]*>)\s*<br \/>/g, '$1')

  // 包装成段落（如果不是以块级元素开头）
  if (
    !html.startsWith('<h') &&
    !html.startsWith('<pre') &&
    !html.startsWith('<blockquote') &&
    !html.startsWith('<hr')
  ) {
    html = `<p class="mb-2">${html}</p>`
  }

  // 清除空段落
  html = html.replace(/<p class="mb-2"><\/p>/g, '')
  html = html.replace(/<p class="mb-2">\s*<\/p>/g, '')

  // 修复段落内嵌套块级元素
  html = html.replace(/<p class="mb-2">(<h[1-3])/g, '$1')
  html = html.replace(/(<\/h[1-3]>)<\/p>/g, '$1')
  html = html.replace(/<p class="mb-2">(<pre)/g, '$1')
  html = html.replace(/(<\/pre>)<\/p>/g, '$1')

  return html
})

// ========== DOM 引用 ==========

const textareaRef = ref<globalThis.HTMLTextAreaElement | null>(null)

// ========== 方法 ==========

/**
 * 在光标位置插入文本
 * @param before - 前缀文本
 * @param after - 后缀文本
 * @param placeholder - 默认占位文本
 */
function insertText(before: string, after: string = '', placeholder: string = '') {
  const textarea = textareaRef.value
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = content.value.substring(start, end)
  const textToInsert = selectedText || placeholder

  const newValue =
    content.value.substring(0, start) + before + textToInsert + after + content.value.substring(end)

  content.value = newValue

  // 设置光标位置
  globalThis.setTimeout(() => {
    textarea.focus()
    textarea.setSelectionRange(start + before.length, start + before.length + textToInsert.length)
  }, 0)
}

/**
 * 插入粗体格式
 */
function insertBold() {
  insertText('**', '**', '粗体文本')
}

/**
 * 插入斜体格式
 */
function insertItalic() {
  insertText('*', '*', '斜体文本')
}

/**
 * 插入链接格式
 */
function insertLink() {
  insertText('[', '](链接地址)', '链接文本')
}

/**
 * 插入图片格式
 */
function insertImage() {
  insertText('![', '](图片地址)', '图片描述')
}

/**
 * 插入列表格式
 */
function insertList() {
  insertText('\n- ', '', '列表项')
}

/**
 * 插入行内代码格式
 */
function insertCode() {
  insertText('`', '`', '代码')
}

/**
 * 插入引用格式
 */
function insertQuote() {
  insertText('\n> ', '', '引用内容')
}

/**
 * 插入标题格式
 */
function insertHeading() {
  insertText('\n## ', '', '标题')
}
</script>

<template>
  <div class="markdown-editor rounded-2xl border border-gray-200 overflow-hidden bg-white">
    <!-- 工具栏 -->
    <div class="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
      <!-- 格式化按钮 -->
      <div class="flex items-center gap-1">
        <!-- 标题 -->
        <button
          type="button"
          class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          title="标题"
          :disabled="mode === 'preview' || disabled"
          @click="insertHeading"
        >
          <Heading :size="16" />
        </button>
        <!-- 粗体 -->
        <button
          type="button"
          class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          title="粗体"
          :disabled="mode === 'preview' || disabled"
          @click="insertBold"
        >
          <Bold :size="16" />
        </button>
        <!-- 斜体 -->
        <button
          type="button"
          class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          title="斜体"
          :disabled="mode === 'preview' || disabled"
          @click="insertItalic"
        >
          <Italic :size="16" />
        </button>
        <div class="w-px h-5 bg-gray-200 mx-1" />
        <!-- 链接 -->
        <button
          type="button"
          class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          title="链接"
          :disabled="mode === 'preview' || disabled"
          @click="insertLink"
        >
          <Link :size="16" />
        </button>
        <!-- 图片 -->
        <button
          type="button"
          class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          title="图片"
          :disabled="mode === 'preview' || disabled"
          @click="insertImage"
        >
          <Image :size="16" />
        </button>
        <div class="w-px h-5 bg-gray-200 mx-1" />
        <!-- 列表 -->
        <button
          type="button"
          class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          title="列表"
          :disabled="mode === 'preview' || disabled"
          @click="insertList"
        >
          <List :size="16" />
        </button>
        <!-- 代码 -->
        <button
          type="button"
          class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          title="代码"
          :disabled="mode === 'preview' || disabled"
          @click="insertCode"
        >
          <Code :size="16" />
        </button>
        <!-- 引用 -->
        <button
          type="button"
          class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          title="引用"
          :disabled="mode === 'preview' || disabled"
          @click="insertQuote"
        >
          <Quote :size="16" />
        </button>
      </div>

      <!-- 模式切换 -->
      <div class="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer"
          :class="
            mode === 'write'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          "
          @click="mode = 'write'"
        >
          <Edit3 :size="14" />
          编辑
        </button>
        <button
          type="button"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer"
          :class="
            mode === 'preview'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          "
          @click="mode = 'preview'"
        >
          <Eye :size="14" />
          预览
        </button>
      </div>
    </div>

    <!-- 编辑器 / 预览区 -->
    <div class="min-h-50">
      <!-- 编辑模式 -->
      <textarea
        v-show="mode === 'write'"
        ref="textareaRef"
        v-model="content"
        :placeholder="placeholder || '写点什么吧... 支持 Markdown 语法！'"
        :rows="minRows || 8"
        :disabled="disabled"
        class="w-full px-4 py-4 text-gray-800 placeholder-gray-400 border-none focus:outline-none focus:ring-0 resize-none font-mono text-sm leading-relaxed"
      />

      <!-- 预览模式 -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div
        v-show="mode === 'preview'"
        class="px-4 py-4 prose prose-gray max-w-none text-gray-800 leading-relaxed min-h-50"
        v-html="renderedContent"
      />
    </div>

    <!-- 底部信息栏 -->
    <div class="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-200">
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400">支持 Markdown 语法</span>
      </div>
      <div v-if="maxLength" class="text-xs" :class="isOverLimit ? 'text-red-500' : 'text-gray-400'">
        {{ characterCount }} / {{ maxLength }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.markdown-editor textarea {
  min-height: 200px;
}

/* 预览区标题样式 - 固定间距 */
.markdown-editor :deep(.md-heading) {
  margin-top: 0.75rem;
  margin-bottom: 0.25rem;
  line-height: 1.4;
}

.markdown-editor :deep(.md-heading:first-child) {
  margin-top: 0;
}

/* 预览区段落样式 */
.markdown-editor :deep(p) {
  margin-bottom: 0.5rem;
}

.markdown-editor :deep(p:last-child) {
  margin-bottom: 0;
}
</style>
