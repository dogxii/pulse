<script setup lang="ts">
// Markdown 编辑器组件
// 支持工具栏格式化、实时预览、字符统计等功能
// 优化移动端体验：更大触控目标、折叠工具栏、自适应布局

import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Eye,
  Edit3,
  Bold,
  Italic,
  Link,
  Image,
  List,
  Code,
  Quote,
  Heading,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
} from 'lucide-vue-next'

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

// 移动端状态
const isMobile = ref(false)
const isToolbarExpanded = ref(false)
const isFullscreen = ref(false)

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
    '<pre class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 my-2 overflow-x-auto"><code class="text-sm font-mono text-gray-800 dark:text-gray-200">$2</code></pre>'
  )

  // 标题（使用特殊类名便于样式控制）
  html = html.replace(
    /^### (.+)$/gm,
    '<h3 class="md-heading text-lg font-bold text-gray-900 dark:text-gray-100">$1</h3>'
  )
  html = html.replace(
    /^## (.+)$/gm,
    '<h2 class="md-heading text-xl font-bold text-gray-900 dark:text-gray-100">$1</h2>'
  )
  html = html.replace(
    /^# (.+)$/gm,
    '<h1 class="md-heading text-2xl font-bold text-gray-900 dark:text-gray-100">$1</h1>'
  )

  // 粗体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
  html = html.replace(/__(.+?)__/g, '<strong class="font-semibold">$1</strong>')

  // 斜体
  html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
  html = html.replace(/_(.+?)_/g, '<em class="italic">$1</em>')

  // 行内代码
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200">$1</code>'
  )

  // 引用
  html = html.replace(
    /^&gt; (.+)$/gm,
    '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-2 text-gray-600 dark:text-gray-400 italic">$1</blockquote>'
  )

  // 无序列表
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
  html = html.replace(/^\* (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')

  // 有序列表
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')

  // 链接
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline">$1</a>'
  )

  // 图片
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="rounded-xl max-w-full my-2" />'
  )

  // 分割线
  html = html.replace(/^---$/gm, '<hr class="my-4 border-gray-200 dark:border-gray-700" />')

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
 * 检测是否为移动端
 */
function checkMobile() {
  isMobile.value = globalThis.window.innerWidth < 768
}

/**
 * 切换工具栏展开状态（移动端）
 */
function toggleToolbar() {
  isToolbarExpanded.value = !isToolbarExpanded.value
}

/**
 * 切换全屏模式
 */
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  if (isFullscreen.value) {
    // 全屏时自动展开工具栏
    isToolbarExpanded.value = true
  }
}

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

  // 移动端插入后收起工具栏
  if (isMobile.value && !isFullscreen.value) {
    isToolbarExpanded.value = false
  }
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

// ========== 生命周期 ==========

onMounted(() => {
  checkMobile()
  globalThis.window.addEventListener('resize', checkMobile, { passive: true })
})

onUnmounted(() => {
  globalThis.window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <div
    :class="[
      'markdown-editor rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900 transition-all duration-300',
      isFullscreen
        ? 'fixed inset-4 z-50 flex flex-col shadow-2xl bg-white dark:bg-gray-900'
        : 'relative',
    ]"
  >
    <!-- 全屏模式遮罩 -->
    <div
      v-if="isFullscreen"
      class="fixed inset-0 bg-gray-900/60 dark:bg-black/70 -z-10"
      @click="toggleFullscreen"
    />

    <!-- 工具栏 -->
    <div
      class="toolbar flex flex-col bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
    >
      <!-- 移动端：主工具栏（简化版） -->
      <div class="flex items-center justify-between px-3 py-2 md:px-4">
        <!-- 移动端：折叠按钮 + 常用按钮 -->
        <div class="flex items-center gap-1">
          <!-- 移动端折叠/展开按钮 -->
          <button
            v-if="isMobile"
            type="button"
            class="toolbar-btn p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            title="展开/收起工具栏"
            @click="toggleToolbar"
          >
            <ChevronDown v-if="!isToolbarExpanded" :size="18" class="transition-transform" />
            <ChevronUp v-else :size="18" class="transition-transform" />
          </button>

          <!-- 桌面端：完整工具栏 -->
          <template v-if="!isMobile">
            <!-- 标题 -->
            <button
              type="button"
              class="toolbar-btn p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="标题"
              :disabled="mode === 'preview' || disabled"
              @click="insertHeading"
            >
              <Heading :size="18" />
            </button>
            <!-- 粗体 -->
            <button
              type="button"
              class="toolbar-btn p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="粗体"
              :disabled="mode === 'preview' || disabled"
              @click="insertBold"
            >
              <Bold :size="18" />
            </button>
            <!-- 斜体 -->
            <button
              type="button"
              class="toolbar-btn p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="斜体"
              :disabled="mode === 'preview' || disabled"
              @click="insertItalic"
            >
              <Italic :size="18" />
            </button>
            <div class="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />
            <!-- 链接 -->
            <button
              type="button"
              class="toolbar-btn p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="链接"
              :disabled="mode === 'preview' || disabled"
              @click="insertLink"
            >
              <Link :size="18" />
            </button>
            <!-- 图片 -->
            <button
              type="button"
              class="toolbar-btn p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="图片"
              :disabled="mode === 'preview' || disabled"
              @click="insertImage"
            >
              <Image :size="18" />
            </button>
            <div class="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />
            <!-- 列表 -->
            <button
              type="button"
              class="toolbar-btn p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="列表"
              :disabled="mode === 'preview' || disabled"
              @click="insertList"
            >
              <List :size="18" />
            </button>
            <!-- 代码 -->
            <button
              type="button"
              class="toolbar-btn p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="代码"
              :disabled="mode === 'preview' || disabled"
              @click="insertCode"
            >
              <Code :size="18" />
            </button>
            <!-- 引用 -->
            <button
              type="button"
              class="toolbar-btn p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="引用"
              :disabled="mode === 'preview' || disabled"
              @click="insertQuote"
            >
              <Quote :size="18" />
            </button>
          </template>

          <!-- 移动端：常用快捷按钮（始终显示） -->
          <template v-if="isMobile && !isToolbarExpanded">
            <button
              type="button"
              class="toolbar-btn p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="粗体"
              :disabled="mode === 'preview' || disabled"
              @click="insertBold"
            >
              <Bold :size="18" />
            </button>
            <button
              type="button"
              class="toolbar-btn p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="链接"
              :disabled="mode === 'preview' || disabled"
              @click="insertLink"
            >
              <Link :size="18" />
            </button>
            <button
              type="button"
              class="toolbar-btn p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="图片"
              :disabled="mode === 'preview' || disabled"
              @click="insertImage"
            >
              <Image :size="18" />
            </button>
          </template>
        </div>

        <!-- 右侧：模式切换 + 全屏按钮 -->
        <div class="flex items-center gap-2">
          <!-- 全屏按钮 -->
          <button
            type="button"
            class="p-2 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            :title="isFullscreen ? '退出全屏' : '全屏编辑'"
            @click="toggleFullscreen"
          >
            <Minimize2 v-if="isFullscreen" :size="16" />
            <Maximize2 v-else :size="16" />
          </button>

          <!-- 模式切换 -->
          <div class="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            <button
              type="button"
              class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              :class="
                mode === 'write'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              "
              @click="mode = 'write'"
            >
              <Edit3 :size="14" />
              <span class="hidden sm:inline">编辑</span>
            </button>
            <button
              type="button"
              class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              :class="
                mode === 'preview'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              "
              @click="mode = 'preview'"
            >
              <Eye :size="14" />
              <span class="hidden sm:inline">预览</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 移动端：展开的完整工具栏 -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 max-h-0"
        enter-to-class="opacity-100 max-h-20"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 max-h-20"
        leave-to-class="opacity-0 max-h-0"
      >
        <div
          v-if="isMobile && isToolbarExpanded"
          class="overflow-hidden border-t border-gray-200 dark:border-gray-700"
        >
          <div class="flex items-center gap-1 px-3 py-2 overflow-x-auto">
            <!-- 标题 -->
            <button
              type="button"
              class="toolbar-btn shrink-0 p-3 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="标题"
              :disabled="mode === 'preview' || disabled"
              @click="insertHeading"
            >
              <Heading :size="20" />
            </button>
            <!-- 粗体 -->
            <button
              type="button"
              class="toolbar-btn shrink-0 p-3 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="粗体"
              :disabled="mode === 'preview' || disabled"
              @click="insertBold"
            >
              <Bold :size="20" />
            </button>
            <!-- 斜体 -->
            <button
              type="button"
              class="toolbar-btn shrink-0 p-3 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="斜体"
              :disabled="mode === 'preview' || disabled"
              @click="insertItalic"
            >
              <Italic :size="20" />
            </button>
            <div class="w-px h-8 bg-gray-200 dark:bg-gray-600 mx-1 shrink-0" />
            <!-- 链接 -->
            <button
              type="button"
              class="toolbar-btn shrink-0 p-3 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="链接"
              :disabled="mode === 'preview' || disabled"
              @click="insertLink"
            >
              <Link :size="20" />
            </button>
            <!-- 图片 -->
            <button
              type="button"
              class="toolbar-btn shrink-0 p-3 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="图片"
              :disabled="mode === 'preview' || disabled"
              @click="insertImage"
            >
              <Image :size="20" />
            </button>
            <div class="w-px h-8 bg-gray-200 dark:bg-gray-600 mx-1 shrink-0" />
            <!-- 列表 -->
            <button
              type="button"
              class="toolbar-btn shrink-0 p-3 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="列表"
              :disabled="mode === 'preview' || disabled"
              @click="insertList"
            >
              <List :size="20" />
            </button>
            <!-- 代码 -->
            <button
              type="button"
              class="toolbar-btn shrink-0 p-3 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="代码"
              :disabled="mode === 'preview' || disabled"
              @click="insertCode"
            >
              <Code :size="20" />
            </button>
            <!-- 引用 -->
            <button
              type="button"
              class="toolbar-btn shrink-0 p-3 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="引用"
              :disabled="mode === 'preview' || disabled"
              @click="insertQuote"
            >
              <Quote :size="20" />
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 编辑器 / 预览区 -->
    <div :class="['min-h-50', isFullscreen ? 'flex-1 overflow-hidden' : '']">
      <!-- 编辑模式 -->
      <textarea
        v-show="mode === 'write'"
        ref="textareaRef"
        v-model="content"
        :placeholder="placeholder || '写点什么吧... 支持 Markdown 语法！'"
        :rows="minRows || 8"
        :disabled="disabled"
        :class="[
          'w-full px-4 py-4 md:px-5 md:py-5',
          'text-gray-800 dark:text-gray-200 bg-transparent',
          'placeholder-gray-400 dark:placeholder-gray-500',
          'border-none focus:outline-none focus:ring-0 resize-none',
          'font-mono leading-relaxed',
          // 移动端使用 16px 防止 iOS 自动缩放，桌面端使用 14px
          'text-base md:text-sm',
          // 全屏模式下填满高度
          isFullscreen ? 'h-full' : '',
        ]"
        style="line-height: 1.8"
      />

      <!-- 预览模式 -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div
        v-show="mode === 'preview'"
        :class="[
          'preview px-4 py-4 md:px-5 md:py-5',
          'prose prose-gray dark:prose-invert max-w-none',
          'text-gray-800 dark:text-gray-200 leading-relaxed min-h-50',
          isFullscreen ? 'h-full overflow-y-auto' : '',
        ]"
        v-html="renderedContent"
      />
    </div>

    <!-- 底部信息栏 -->
    <div
      class="flex items-center justify-between px-4 py-2.5 md:py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400 dark:text-gray-500"> 支持 Markdown </span>
      </div>
      <div
        v-if="maxLength"
        class="text-xs font-medium"
        :class="isOverLimit ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'"
      >
        {{ characterCount }} / {{ maxLength }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.markdown-editor textarea {
  min-height: 180px;
}

/* 全屏模式下的 textarea */
.markdown-editor.fixed textarea {
  min-height: 100%;
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

/* 移动端触控优化 */
@media (max-width: 768px) {
  .toolbar-btn {
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .markdown-editor textarea {
    /* 确保移动端有足够的输入空间 */
    min-height: 200px;
    /* 使用 16px 防止 iOS Safari 自动缩放 */
    font-size: 16px !important;
  }
}

/* 工具栏滚动（移动端） */
@media (max-width: 768px) {
  .toolbar > div:last-child {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .toolbar > div:last-child::-webkit-scrollbar {
    display: none;
  }
}
</style>
