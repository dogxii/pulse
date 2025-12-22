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

  // 先处理代码块（防止内部内容被其他规则处理）
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre class="bg-gray-100 rounded-lg p-3 my-2 overflow-x-auto"><code class="text-sm font-mono text-gray-800">$2</code></pre>'
  )

  // 处理标题（移除标题后的换行，避免产生多余的 br）
  html = html.replace(
    /^### (.+)$/gm,
    '<h3 class="md-heading text-base font-bold text-gray-900">$1</h3>'
  )
  html = html.replace(
    /^## (.+)$/gm,
    '<h2 class="md-heading text-lg font-bold text-gray-900">$1</h2>'
  )
  html = html.replace(
    /^# (.+)$/gm,
    '<h1 class="md-heading text-xl font-bold text-gray-900">$1</h1>'
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

  // 引用块
  html = html.replace(
    /^> (.+)$/gm,
    '<blockquote class="border-l-4 border-gray-300 pl-3 my-2 text-gray-600 italic">$1</blockquote>'
  )

  // 无序列表
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
  html = html.replace(/^\* (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')

  // 有序列表
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')

  // 链接（新标签页打开）
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-emerald-600 hover:text-emerald-700 underline">$1</a>'
  )

  // 图片（行内图片，非帖子图片数组）
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="rounded-xl max-w-full my-2 inline-block" loading="lazy" />'
  )

  // 分割线
  html = html.replace(/^---$/gm, '<hr class="my-4 border-gray-200" />')

  // 处理换行
  // 移除标题前后的空行产生的多余换行
  html = html.replace(/\n(<h[1-3] class="md-heading)/g, '$1')
  html = html.replace(/(<\/h[1-3]>)\n/g, '$1')

  // 移除代码块前后的多余换行
  html = html.replace(/\n(<pre class)/g, '$1')
  html = html.replace(/(<\/pre>)\n/g, '$1')

  // 移除引用块前后的多余换行
  html = html.replace(/\n(<blockquote)/g, '$1')
  html = html.replace(/(<\/blockquote>)\n/g, '$1')

  // 移除列表项之间的换行
  html = html.replace(/<\/li>\n<li/g, '</li><li')

  // 双换行 = 新段落
  html = html.replace(/\n\n+/g, '</p><p class="mb-2">')

  // 单换行 = 换行（但不在块级元素之后）
  html = html.replace(/\n/g, '<br />')

  // 清理标题周围可能残留的 br
  html = html.replace(/<br \/>\s*(<h[1-3] class="md-heading)/g, '$1')
  html = html.replace(/(<\/h[1-3]>)\s*<br \/>/g, '$1')

  // 清理代码块周围可能残留的 br
  html = html.replace(/<br \/>\s*(<pre class)/g, '$1')
  html = html.replace(/(<\/pre>)\s*<br \/>/g, '$1')

  // 清理引用块周围可能残留的 br
  html = html.replace(/<br \/>\s*(<blockquote)/g, '$1')
  html = html.replace(/(<\/blockquote>)\s*<br \/>/g, '$1')

  // 清理分割线周围可能残留的 br
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

  // 确保段落内的块级元素正确处理
  html = html.replace(/<p class="mb-2">(<h[1-3])/g, '$1')
  html = html.replace(/(<\/h[1-3]>)<\/p>/g, '$1')
  html = html.replace(/<p class="mb-2">(<pre)/g, '$1')
  html = html.replace(/(<\/pre>)<\/p>/g, '$1')
  html = html.replace(/<p class="mb-2">(<blockquote)/g, '$1')
  html = html.replace(/(<\/blockquote>)<\/p>/g, '$1')
  html = html.replace(/<p class="mb-2">(<hr)/g, '$1')

  return html
})
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="markdown-content leading-relaxed" :class="props.class" v-html="renderedContent" />
</template>

<style scoped>
/* 标题样式 - 固定间距 */
.markdown-content :deep(.md-heading) {
  margin-top: 0.75rem;
  margin-bottom: 0.25rem;
  line-height: 1.4;
}

.markdown-content :deep(.md-heading:first-child) {
  margin-top: 0;
}

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
  margin: 0.5rem 0;
}

/* 引用块样式 */
.markdown-content :deep(blockquote) {
  margin: 0.5rem 0;
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

/* 段落样式 */
.markdown-content :deep(p) {
  margin-bottom: 0.5rem;
}

.markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}

/* 分割线样式 */
.markdown-content :deep(hr) {
  margin: 1rem 0;
}
</style>
