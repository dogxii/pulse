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
    '<pre class="not-prose bg-gray-900 text-gray-100 rounded-xl p-4 my-4 overflow-x-auto shadow-sm border border-gray-800"><code class="text-sm font-mono font-normal">$2</code></pre>'
  )

  // 处理表格（在其他处理之前）
  html = processMarkdownTables(html)

  // 处理标题（移除标题后的换行，避免产生多余的 br）
  html = html.replace(
    /^### (.+)$/gm,
    '<h3 class="md-heading text-xl font-bold text-gray-900 dark:text-gray-100 mt-6 mb-3 tracking-tight">$1</h3>'
  )
  html = html.replace(
    /^## (.+)$/gm,
    '<h2 class="md-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4 tracking-tight border-b border-gray-100 dark:border-gray-800 pb-2">$1</h2>'
  )
  html = html.replace(
    /^# (.+)$/gm,
    '<h1 class="md-heading text-3xl font-extrabold text-gray-900 dark:text-gray-100 mt-8 mb-6 tracking-tight">$1</h1>'
  )

  // 删除线（在粗体斜体之前处理）
  html = html.replace(
    /~~(.+?)~~/g,
    '<del class="line-through text-gray-400 dark:text-gray-500 decoration-gray-400">$1</del>'
  )

  // 粗体
  html = html.replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="font-bold text-gray-900 dark:text-gray-100">$1</strong>'
  )
  html = html.replace(
    /__(.+?)__/g,
    '<strong class="font-bold text-gray-900 dark:text-gray-100">$1</strong>'
  )

  // 斜体
  html = html.replace(/\*(.+?)\*/g, '<em class="italic text-gray-800 dark:text-gray-200">$1</em>')
  html = html.replace(/_(.+?)_/g, '<em class="italic text-gray-800 dark:text-gray-200">$1</em>')

  // 行内代码
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md text-sm font-mono text-emerald-600 dark:text-emerald-400 border border-gray-200 dark:border-gray-700/50">$1</code>'
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
      return `<blockquote class="not-italic border-l-4 border-emerald-500 pl-4 my-4 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/30 py-3 pr-3 rounded-r-lg shadow-sm">${lines}</blockquote>`
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
            ? '<input type="checkbox" checked disabled class="mt-1 mr-2 h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-default" />'
            : '<input type="checkbox" disabled class="mt-1 mr-2 h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-default" />'
          const textClass = isChecked
            ? 'line-through text-gray-400 dark:text-gray-500'
            : 'text-gray-700 dark:text-gray-300'
          return `<li class="flex items-start gap-2 ml-0 list-none py-1">${checkbox}<span class="${textClass}">${content}</span></li>`
        })
        .join('')
      return `<ul class="task-list my-3 space-y-1">${items}</ul>`
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
          return `<li class="ml-4 pl-1 marker:text-gray-400 dark:marker:text-gray-500">${content}</li>`
        })
        .join('')
      return `<ul class="list-disc my-3 space-y-1 text-gray-700 dark:text-gray-300 pl-4">${items}</ul>`
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
          return `<li class="ml-4 pl-1 marker:text-gray-400 dark:marker:text-gray-500">${content}</li>`
        })
        .join('')
      return `<ol class="list-decimal my-3 space-y-1 text-gray-700 dark:text-gray-300 pl-4">${items}</ol>`
    }
  )

  // 图片（行内图片，非帖子图片数组）- 必须在链接之前处理
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="rounded-xl shadow-md max-w-full my-4 inline-block cursor-zoom-in hover:opacity-95 transition-opacity border border-gray-100 dark:border-gray-800" loading="lazy" />'
  )

  // 链接（新标签页打开）
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline decoration-emerald-300/50 hover:decoration-emerald-500 underline-offset-2 transition-colors">$1</a>'
  )

  // 自动链接（URL 自动转换为链接）
  html = html.replace(
    /(?<!href="|src=")https?:\/\/[^\s<]+[^\s<.,:;!?'")\]]/g,
    '<a href="$&" target="_blank" rel="noopener noreferrer" class="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline decoration-emerald-300/50 hover:decoration-emerald-500 underline-offset-2 transition-colors break-all">$&</a>'
  )

  // 分割线
  html = html.replace(/^---$/gm, '<hr class="my-8 border-gray-200 dark:border-gray-800" />')

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
  html = html.replace(
    /\n\n+/g,
    '</p><p class="mb-4 leading-relaxed text-gray-700 dark:text-gray-300">'
  )

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
    html = `<p class="mb-4 leading-relaxed text-gray-700 dark:text-gray-300">${html}</p>`
  }

  // 清除空段落
  html = html.replace(/<p class="[^"]*"><\/p>/g, '')
  html = html.replace(/<p class="[^"]*">\s*<\/p>/g, '')

  // 确保段落内的块级元素正确处理
  html = html.replace(/<p class="[^"]*">(<h[1-3])/g, '$1')
  html = html.replace(/(<\/h[1-3]>)<\/p>/g, '$1')
  html = html.replace(/<p class="[^"]*">(<pre)/g, '$1')
  html = html.replace(/(<\/pre>)<\/p>/g, '$1')
  html = html.replace(/<p class="[^"]*">(<blockquote)/g, '$1')
  html = html.replace(/(<\/blockquote>)<\/p>/g, '$1')
  html = html.replace(/<p class="[^"]*">(<hr)/g, '$1')
  html = html.replace(/<p class="[^"]*">(<[uo]l)/g, '$1')
  html = html.replace(/(<\/[uo]l>)<\/p>/g, '$1')
  html = html.replace(/<p class="[^"]*">(<table)/g, '$1')
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
    let tableHtml =
      '<div class="overflow-x-auto my-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"><table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">'

    // 表头
    tableHtml += '<thead class="bg-gray-50 dark:bg-gray-800/50"><tr>'
    headerCells.forEach((cell, i) => {
      const align = alignments[i] || 'left'
      tableHtml += `<th class="px-4 py-3 text-${align} text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">${cell}</th>`
    })
    tableHtml += '</tr></thead>'

    // 表格体
    tableHtml +=
      '<tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">'
    rows.forEach(row => {
      tableHtml += '<tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">'
      row.forEach((cell, i) => {
        const align = alignments[i] || 'left'
        tableHtml += `<td class="px-4 py-3 text-${align} text-gray-700 dark:text-gray-300 whitespace-nowrap">${cell}</td>`
      })
      tableHtml += '</tr>'
    })
    tableHtml += '</tbody></table></div>'

    return tableHtml
  })
}
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="markdown-content" :class="props.class" v-html="renderedContent" />
</template>

<style scoped>
/*
  这里保留一些基础的重置和特定样式，
  大部分样式已经迁移到内联 Tailwind 类中以获得更好的可维护性。
*/

.markdown-content {
  /* 基础字体设置 */
  font-size: 1rem;
  line-height: 1.75;
}

/* 确保嵌套列表样式正确 */
.markdown-content :deep(ul ul),
.markdown-content :deep(ol ol),
.markdown-content :deep(ul ol),
.markdown-content :deep(ol ul) {
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

/* 链接悬停效果增强 */
.markdown-content :deep(a) {
  text-decoration-thickness: 2px;
}

/* 图片最大高度限制 */
.markdown-content :deep(img) {
  max-height: 500px;
  object-fit: contain;
}

/* 最后一个元素去除底部边距 */
.markdown-content > :deep(*:last-child) {
  margin-bottom: 0;
}

/* 第一个元素去除顶部边距 */
.markdown-content > :deep(*:first-child) {
  margin-top: 0;
}
</style>
