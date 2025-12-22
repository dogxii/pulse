<script setup lang="ts">
// Markdown 渲染器组件
// 将 Markdown 文本转换为 HTML 并安全渲染

import { computed } from 'vue'

// ========== Props ==========
const props = defineProps<{
  // 要渲染的 Markdown 内容
  content: string
  // 额外的 CSS 类
  class?: string
}>()

// ========== 计算属性 ==========

/**
 * 将 Markdown 转换为 HTML
 * 支持：标题、粗体、斜体、代码、引用、列表、链接、图片、分割线等
 */
const renderedContent = computed(() => {
  if (!props.content) return ''

  let html = props.content
    // 转义 HTML 特殊字符，防止 XSS
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // 标题（H1-H3）
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-gray-900 mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-gray-900 mt-3 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-gray-900 mt-3 mb-1">$1</h1>')
    // 粗体
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>')
    .replace(/__(.+?)__/g, '<strong class="font-bold">$1</strong>')
    // 斜体
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/_(.+?)_/g, '<em class="italic">$1</em>')
    // 代码块
    .replace(
      /```(\w*)\n([\s\S]*?)```/g,
      '<pre class="bg-gray-100 rounded-lg p-3 my-2 overflow-x-auto"><code class="text-sm font-mono text-gray-800">$2</code></pre>'
    )
    // 行内代码
    .replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">$1</code>'
    )
    // 引用块
    .replace(
      /^> (.+)$/gm,
      '<blockquote class="border-l-4 border-gray-300 pl-3 my-2 text-gray-600 italic">$1</blockquote>'
    )
    // 无序列表
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\* (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // 有序列表
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // 链接（新标签页打开）
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-emerald-600 hover:text-emerald-700 underline">$1</a>'
    )
    // 图片（行内图片，非帖子图片数组）
    .replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" class="rounded-xl max-w-full my-2 inline-block" loading="lazy" />'
    )
    // 分割线
    .replace(/^---$/gm, '<hr class="my-4 border-gray-200" />')
    // 换行处理 - 双换行 = 新段落
    .replace(/\n\n/g, '</p><p class="mb-2">')
    // 单换行 = 换行
    .replace(/\n/g, '<br />')

  // 包装成段落
  html = `<p class="mb-2">${html}</p>`

  // 修复连续列表项（移除它们之间的 br）
  html = html.replace(/<\/li><br \/><li/g, '</li><li')

  // 清除空段落
  html = html.replace(/<p class="mb-2"><\/p>/g, '')

  return html
})
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="markdown-content leading-relaxed" :class="props.class" v-html="renderedContent" />
</template>

<style scoped>
/* 列表样式 */
.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0.5rem 0;
}

.markdown-content :deep(li) {
  margin: 0.25rem 0;
}

/* 代码块样式 */
.markdown-content :deep(pre) {
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* 链接样式 */
.markdown-content :deep(a) {
  word-break: break-word;
}

/* 图片样式 */
.markdown-content :deep(img) {
  max-height: 300px;
  object-fit: contain;
}
</style>
