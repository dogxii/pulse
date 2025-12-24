<script setup lang="ts">
// Markdown 渲染器组件
// 将 Markdown 文本转换为 HTML 并安全渲染
// 支持：标题、粗体、斜体、代码、引用、列表、链接、图片、分割线、任务列表、删除线、表格等

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
 * 支持：标题、粗体、斜体、代码、引用、列表、链接、图片、分割线、任务列表、删除线、表格等
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
    '<pre class="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 my-2 overflow-x-auto"><code class="text-sm font-mono text-gray-800 dark:text-gray-200">$2</code></pre>'
  )

  // 处理表格（在其他处理之前）
  html = processMarkdownTables(html)

  // 处理标题（移除标题后的换行，避免产生多余的 br）
  html = html.replace(
    /^### (.+)$/gm,
    '<h3 class="md-heading text-base font-bold text-gray-900 dark:text-gray-100 mt-4 mb-2">$1</h3>'
  )
  html = html.replace(
    /^## (.+)$/gm,
    '<h2 class="md-heading text-lg font-bold text-gray-900 dark:text-gray-100 mt-4 mb-2">$1</h2>'
  )
  html = html.replace(
    /^# (.+)$/gm,
    '<h1 class="md-heading text-xl font-bold text-gray-900 dark:text-gray-100 mt-4 mb-2">$1</h1>'
  )

  // 删除线（在粗体斜体之前处理）
  html = html.replace(
    /~~(.+?)~~/g,
    '<del class="line-through text-gray-500 dark:text-gray-400">$1</del>'
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
    '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200">$1</code>'
  )

  // 处理引用块（支持多行）
  html = html.replace(/^&gt; (.+)$/gm, '___QUOTE___$1___QUOTE_END___')

  // 将连续的引用行包裹在 blockquote 中
  html = html.replace(
    /(___QUOTE___[\s\S]+?___QUOTE_END___(?:\n___QUOTE___[\s\S]+?___QUOTE_END___)*)/g,
    match => {
      const lines = match
        .split('___QUOTE_END___')
        .filter(line => line.includes('___QUOTE___'))
        .map(line => line.replace('___QUOTE___', '').trim())
        .join('<br />')
      return `<blockquote class="border-l-4 border-emerald-500 dark:border-emerald-600 pl-4 my-3 text-gray-600 dark:text-gray-400 italic bg-emerald-50/50 dark:bg-emerald-950/20 py-2 rounded-r">${lines}</blockquote>`
    }
  )

  // 处理任务列表（在普通列表之前）
  html = html.replace(/^- \[ \] (.+)$/gm, '___TASK_UNCHECKED___$1___TASK_END___')
  html = html.replace(/^- \[x\] (.+)$/gm, '___TASK_CHECKED___$1___TASK_END___')
  html = html.replace(/^- \[X\] (.+)$/gm, '___TASK_CHECKED___$1___TASK_END___')

  // 处理列表 - 需要识别连续的列表项并包裹在 ul/ol 中
  // 无序列表（- 或 *）
  html = html.replace(/^[-*] (.+)$/gm, '___UL_ITEM___$1___UL_ITEM_END___')
  // 有序列表
  html = html.replace(/^\d+\. (.+)$/gm, '___OL_ITEM___$1___OL_ITEM_END___')

  // 渲染任务列表
  html = html.replace(
    /(___TASK_(?:UN)?CHECKED___[\s\S]+?___TASK_END___(?:\n___TASK_(?:UN)?CHECKED___[\s\S]+?___TASK_END___)*)/g,
    match => {
      const items = match
        .split('___TASK_END___')
        .filter(item => item.includes('___TASK_'))
        .map(item => {
          const isChecked = item.includes('___TASK_CHECKED___')
          const content = item.replace(/___TASK_(?:UN)?CHECKED___/, '').trim()
          const checkbox = isChecked
            ? '<input type="checkbox" checked disabled class="mr-2 align-middle cursor-not-allowed" />'
            : '<input type="checkbox" disabled class="mr-2 align-middle cursor-not-allowed" />'
          const textClass = isChecked ? 'line-through text-gray-500 dark:text-gray-500' : ''
          return `<li class="flex items-start gap-2 ml-0 list-none"><span class="shrink-0 mt-0.5">${checkbox}</span><span class="${textClass}">${content}</span></li>`
        })
        .join('')
      return `<ul class="task-list my-2 space-y-1">${items}</ul>`
    }
  )

  // 将连续的无序列表项包裹在 ul 中
  html = html.replace(
    /(___UL_ITEM___[\s\S]+?___UL_ITEM_END___(?:\n___UL_ITEM___[\s\S]+?___UL_ITEM_END___)*)/g,
    match => {
      const items = match
        .split('___UL_ITEM_END___')
        .filter(item => item.includes('___UL_ITEM___'))
        .map(item => {
          const content = item.replace('___UL_ITEM___', '').trim()
          return `<li class="ml-4 list-disc">${content}</li>`
        })
        .join('')
      return `<ul class="my-2">${items}</ul>`
    }
  )

  // 将连续的有序列表项包裹在 ol 中
  html = html.replace(
    /(___OL_ITEM___[\s\S]+?___OL_ITEM_END___(?:\n___OL_ITEM___[\s\S]+?___OL_ITEM_END___)*)/g,
    match => {
      const items = match
        .split('___OL_ITEM_END___')
        .filter(item => item.includes('___OL_ITEM___'))
        .map(item => {
          const content = item.replace('___OL_ITEM___', '').trim()
          return `<li class="ml-4 list-decimal">${content}</li>`
        })
        .join('')
      return `<ol class="my-2">${items}</ol>`
    }
  )

  // 图片（行内图片，非帖子图片数组）- 必须在链接之前处理
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="rounded-xl max-w-full my-2 inline-block cursor-zoom-in hover:opacity-90 transition-opacity" loading="lazy" />'
  )

  // 链接（新标签页打开）
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline">$1</a>'
  )

  // 自动链接（URL 自动转换为链接）
  html = html.replace(
    /(?<!href="|src=")https?:\/\/[^\s<]+[^\s<.,:;!?'")\]]/g,
    '<a href="$&" target="_blank" rel="noopener noreferrer" class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline break-all">$&</a>'
  )

  // 分割线
  html = html.replace(/^---$/gm, '<hr class="my-4 border-gray-200 dark:border-gray-700" />')

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

  // 移除列表前后的多余换行
  html = html.replace(/\n(<[uo]l class)/g, '$1')
  html = html.replace(/(<\/[uo]l>)\n/g, '$1')

  // 移除表格前后的多余换行
  html = html.replace(/\n(<table class)/g, '$1')
  html = html.replace(/(<\/table>)\n/g, '$1')

  // 移除分割线周围可能残留的 br
  html = html.replace(/\n(<hr)/g, '$1')
  html = html.replace(/(<hr[^>]*>)\n/g, '$1')

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

  // 清理列表周围可能残留的 br
  html = html.replace(/<br \/>\s*(<[uo]l class)/g, '$1')
  html = html.replace(/(<\/[uo]l>)\s*<br \/>/g, '$1')

  // 清理表格周围可能残留的 br
  html = html.replace(/<br \/>\s*(<table class)/g, '$1')
  html = html.replace(/(<\/table>)\s*<br \/>/g, '$1')

  // 清理分割线周围可能残留的 br
  html = html.replace(/<br \/>\s*(<hr)/g, '$1')
  html = html.replace(/(<hr[^>]*>)\s*<br \/>/g, '$1')

  // 包装成段落（如果不是以块级元素开头）
  if (
    !html.startsWith('<h') &&
    !html.startsWith('<pre') &&
    !html.startsWith('<blockquote') &&
    !html.startsWith('<hr') &&
    !html.startsWith('<ul') &&
    !html.startsWith('<ol') &&
    !html.startsWith('<table')
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
  html = html.replace(/<p class="mb-2">(<[uo]l)/g, '$1')
  html = html.replace(/(<\/[uo]l>)<\/p>/g, '$1')
  html = html.replace(/<p class="mb-2">(<table)/g, '$1')
  html = html.replace(/(<\/table>)<\/p>/g, '$1')

  return html
})

/**
 * 处理 Markdown 表格
 */
function processMarkdownTables(text: string): string {
  // 匹配表格格式：
  // | Header 1 | Header 2 |
  // |----------|----------|
  // | Cell 1   | Cell 2   |
  const tableRegex = /^\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/gm

  return text.replace(tableRegex, match => {
    const lines = match.trim().split('\n')
    if (lines.length < 3) return match

    // 解析表头
    const headerCells = lines[0]!
      .split('|')
      .slice(1, -1)
      .map(cell => cell.trim())

    // 解析对齐方式
    const alignments = lines[1]!
      .split('|')
      .slice(1, -1)
      .map(cell => {
        const trimmed = cell.trim()
        if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center'
        if (trimmed.endsWith(':')) return 'right'
        return 'left'
      })

    // 解析表格行
    const rows = lines.slice(2).map(line =>
      line
        .split('|')
        .slice(1, -1)
        .map(cell => cell.trim())
    )

    // 生成 HTML
    let tableHtml = '<table class="min-w-full border-collapse my-4 text-sm">'

    // 表头
    tableHtml += '<thead class="bg-gray-50 dark:bg-gray-800"><tr>'
    headerCells.forEach((cell, i) => {
      const align = alignments[i] || 'left'
      tableHtml += `<th class="border border-gray-200 dark:border-gray-700 px-4 py-2 text-${align} font-semibold text-gray-900 dark:text-gray-100">${cell}</th>`
    })
    tableHtml += '</tr></thead>'

    // 表格体
    tableHtml += '<tbody>'
    rows.forEach(row => {
      tableHtml += '<tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">'
      row.forEach((cell, i) => {
        const align = alignments[i] || 'left'
        tableHtml += `<td class="border border-gray-200 dark:border-gray-700 px-4 py-2 text-${align} text-gray-700 dark:text-gray-300">${cell}</td>`
      })
      tableHtml += '</tr>'
    })
    tableHtml += '</tbody></table>'

    return tableHtml
  })
}
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="markdown-content leading-relaxed" :class="props.class" v-html="renderedContent" />
</template>

<style scoped>
/* 标题样式 - 固定间距 */
.markdown-content :deep(.md-heading) {
  line-height: 1.4;
}

.markdown-content :deep(.md-heading:first-child) {
  margin-top: 0;
}

/* 列表样式 */
.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  padding-left: 0;
  list-style-position: inside;
}

.markdown-content :deep(ul.task-list) {
  list-style: none;
  padding-left: 0;
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
  margin: 0.75rem 0;
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

/* 表格样式 */
.markdown-content :deep(table) {
  border-radius: 0.5rem;
  overflow: hidden;
  display: block;
  overflow-x: auto;
  white-space: nowrap;
}

/* 删除线样式 */
.markdown-content :deep(del) {
  opacity: 0.7;
}
</style>
