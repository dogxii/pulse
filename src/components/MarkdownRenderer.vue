<script setup lang="ts">
// Markdown 渲染器组件
// 将 Markdown 文本转换为 HTML 并安全渲染
// 优化：针对短内容/动态流的排版，以及自定义滚动条样式

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
 */
const renderedContent = computed(() => {
  if (!props.content) return ''

  let html = props.content
    // 转义 HTML 特殊字符，防止 XSS
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 先处理代码块（防止内部内容被其他规则处理）
  // 优化：添加自定义滚动条类 custom-scrollbar
  // 移除 Mac 样式
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre class="custom-scrollbar not-prose bg-gray-900 text-gray-100 rounded-2xl p-4 my-3 overflow-x-auto shadow-sm border border-gray-800"><code class="block text-sm font-mono font-normal">$2</code></pre>'
  )

  // 处理表格（在其他处理之前）
  html = processMarkdownTables(html)

  // 处理标题
  // 优化：针对短内容，减小标题间距，使其更紧凑
  html = html.replace(
    /^### (.+)$/gm,
    '<h3 class="md-heading text-lg font-bold text-gray-900 dark:text-gray-100 mt-4 mb-2 tracking-tight leading-snug">$1</h3>'
  )
  html = html.replace(
    /^## (.+)$/gm,
    '<h2 class="md-heading text-xl font-bold text-gray-900 dark:text-gray-100 mt-5 mb-2.5 tracking-tight leading-snug">$1</h2>'
  )
  html = html.replace(
    /^# (.+)$/gm,
    '<h1 class="md-heading text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-5 mb-3 tracking-tight leading-snug">$1</h1>'
  )

  // 删除线
  html = html.replace(
    /~~(.+?)~~/g,
    '<del class="line-through text-gray-400 dark:text-gray-500 decoration-gray-400/60">$1</del>'
  )

  // 粗体 - 使用 font-semibold 避免过度加粗
  html = html.replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>'
  )
  html = html.replace(
    /__(.+?)__/g,
    '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>'
  )

  // 斜体
  html = html.replace(/\*(.+?)\*/g, '<em class="italic text-gray-800 dark:text-gray-200">$1</em>')
  html = html.replace(/_(.+?)_/g, '<em class="italic text-gray-800 dark:text-gray-200">$1</em>')

  // 行内代码
  // 优化：更精致的胶囊样式
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md text-[0.9em] font-mono text-emerald-600 dark:text-emerald-400 border border-gray-200 dark:border-gray-700/50 align-middle">$1</code>'
  )

  // 处理引用块
  html = html.replace(/^&gt; (.+)$/gm, '___QUOTE___$1___QUOTE_END___')

  // 优化：引用块样式更像社交媒体的“转发/引用”样式
  html = html.replace(
    /(___QUOTE___[\s\S]+?___QUOTE_END___(?:\n___QUOTE___[\s\S]+?___QUOTE_END___)*)/g,
    match => {
      const lines = match
        .split('___QUOTE_END___')
        .filter(line => line.includes('___QUOTE___'))
        .map(line => line.replace('___QUOTE___', '').trim())
        .join('<br />')
      return `<blockquote class="not-italic border-l-[3px] border-emerald-500 pl-4 my-3 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/40 py-2 pr-3 rounded-r-xl text-[0.95em] leading-relaxed">${lines}</blockquote>`
    }
  )

  // 处理任务列表
  html = html.replace(/^- \[ \] (.+)$/gm, '___TASK_UNCHECKED___$1___TASK_END___')
  html = html.replace(/^- \[x\] (.+)$/gm, '___TASK_CHECKED___$1___TASK_END___')
  html = html.replace(/^- \[X\] (.+)$/gm, '___TASK_CHECKED___$1___TASK_END___')

  // 处理列表
  html = html.replace(/^[-*] (.+)$/gm, '___UL_ITEM___$1___UL_ITEM_END___')
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
          // 还原为标准 input 样式，移除绿色
          const checkbox = isChecked
            ? '<input type="checkbox" checked disabled class="mt-1 mr-2 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-gray-600 focus:ring-gray-500 cursor-default" />'
            : '<input type="checkbox" disabled class="mt-1 mr-2 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-gray-600 focus:ring-gray-500 cursor-default" />'

          const textClass = isChecked
            ? 'line-through text-gray-400 dark:text-gray-500 decoration-gray-400/50'
            : 'text-gray-700 dark:text-gray-300'
          return `<li class="flex items-start ml-0 list-none py-1 group">${checkbox}<span class="${textClass} transition-colors">${content}</span></li>`
        })
        .join('')
      return `<ul class="task-list my-3 space-y-0.5">${items}</ul>`
    }
  )

  // 渲染无序列表
  html = html.replace(
    /(___UL_ITEM___[\s\S]+?___UL_ITEM_END___(?:\n___UL_ITEM___[\s\S]+?___UL_ITEM_END___)*)/g,
    match => {
      const items = match
        .split('___UL_ITEM_END___')
        .filter(item => item.includes('___UL_ITEM___'))
        .map(item => {
          const content = item.replace('___UL_ITEM___', '').trim()
          return `<li class="ml-5 pl-1 marker:text-gray-400 dark:marker:text-gray-500 marker:text-[0.8em]">${content}</li>`
        })
        .join('')
      return `<ul class="list-disc my-3 space-y-1 text-gray-700 dark:text-gray-300 pl-1">${items}</ul>`
    }
  )

  // 渲染有序列表
  html = html.replace(
    /(___OL_ITEM___[\s\S]+?___OL_ITEM_END___(?:\n___OL_ITEM___[\s\S]+?___OL_ITEM_END___)*)/g,
    match => {
      const items = match
        .split('___OL_ITEM_END___')
        .filter(item => item.includes('___OL_ITEM___'))
        .map(item => {
          const content = item.replace('___OL_ITEM___', '').trim()
          return `<li class="ml-5 pl-1 marker:text-gray-400 dark:marker:text-gray-500 marker:font-medium marker:text-sm">${content}</li>`
        })
        .join('')
      return `<ol class="list-decimal my-3 space-y-1 text-gray-700 dark:text-gray-300 pl-1">${items}</ol>`
    }
  )

  // 图片
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="rounded-2xl shadow-sm max-w-full my-3 inline-block cursor-zoom-in hover:opacity-95 transition-opacity border border-gray-100 dark:border-gray-800" loading="lazy" />'
  )

  // 链接
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline decoration-emerald-300/50 hover:decoration-emerald-500 underline-offset-2 transition-all">$1</a>'
  )

  // 自动链接
  html = html.replace(
    /(?<!href="|src=")https?:\/\/[^\s<]+[^\s<.,:;!?'")\]]/g,
    '<a href="$&" target="_blank" rel="noopener noreferrer" class="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline decoration-emerald-300/50 hover:decoration-emerald-500 underline-offset-2 transition-all break-all">$1</a>'
  )

  // 分割线
  html = html.replace(
    /^---$/gm,
    '<hr class="my-6 border-gray-100 dark:border-gray-800 border-t-2 border-dashed" />'
  )

  // 处理换行
  html = html.replace(/\n(<h[1-3] class="md-heading)/g, '$1')
  html = html.replace(/(<\/h[1-3]>)\n/g, '$1')
  html = html.replace(/\n(<pre class)/g, '$1')
  html = html.replace(/(<\/pre>)\n/g, '$1')
  html = html.replace(/\n(<blockquote)/g, '$1')
  html = html.replace(/(<\/blockquote>)\n/g, '$1')
  html = html.replace(/\n(<[uo]l class)/g, '$1')
  html = html.replace(/(<\/[uo]l>)\n/g, '$1')
  html = html.replace(/\n(<div class="overflow-x-auto)/g, '$1')
  html = html.replace(/(<\/div>)\n/g, '$1')
  html = html.replace(/\n(<hr)/g, '$1')
  html = html.replace(/(<hr[^>]*>)\n/g, '$1')

  // 双换行 = 新段落
  // 优化：段落间距适中，适合短文阅读
  html = html.replace(
    /\n\n+/g,
    '</p><p class="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">'
  )

  // 单换行
  html = html.replace(/\n/g, '<br />')

  // 清理残留 br
  html = html.replace(/<br \/>\s*(<h[1-3] class="md-heading)/g, '$1')
  html = html.replace(/(<\/h[1-3]>)\s*<br \/>/g, '$1')
  html = html.replace(/<br \/>\s*(<pre class)/g, '$1')
  html = html.replace(/(<\/pre>)\s*<br \/>/g, '$1')
  html = html.replace(/<br \/>\s*(<blockquote)/g, '$1')
  html = html.replace(/(<\/blockquote>)\s*<br \/>/g, '$1')
  html = html.replace(/<br \/>\s*(<[uo]l class)/g, '$1')
  html = html.replace(/(<\/[uo]l>)\s*<br \/>/g, '$1')
  html = html.replace(/<br \/>\s*(<div class="overflow-x-auto)/g, '$1')
  html = html.replace(/(<\/div>)\s*<br \/>/g, '$1')
  html = html.replace(/<br \/>\s*(<hr)/g, '$1')
  html = html.replace(/(<hr[^>]*>)\s*<br \/>/g, '$1')

  // 包装成段落
  if (
    !html.startsWith('<h') &&
    !html.startsWith('<pre') &&
    !html.startsWith('<blockquote') &&
    !html.startsWith('<hr') &&
    !html.startsWith('<ul') &&
    !html.startsWith('<ol') &&
    !html.startsWith('<div class="overflow-x-auto')
  ) {
    html = `<p class="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">${html}</p>`
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
  html = html.replace(/<p class="[^"]*">(<div)/g, '$1')
  html = html.replace(/(<\/div>)<\/p>/g, '$1')

  return html
})

/**
 * 处理 Markdown 表格
 */
function processMarkdownTables(text: string): string {
  const tableRegex = /^\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/gm

  return text.replace(tableRegex, match => {
    const lines = match.trim().split('\n')
    if (lines.length < 3) return match

    const headerCells = lines[0]!
      .split('|')
      .slice(1, -1)
      .map(cell => cell.trim())

    const alignments = lines[1]!
      .split('|')
      .slice(1, -1)
      .map(cell => {
        const trimmed = cell.trim()
        if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center'
        if (trimmed.endsWith(':')) return 'right'
        return 'left'
      })

    const rows = lines.slice(2).map(line =>
      line
        .split('|')
        .slice(1, -1)
        .map(cell => cell.trim())
    )

    // 优化：表格容器圆角更大，阴影更柔和
    let tableHtml =
      '<div class="overflow-x-auto custom-scrollbar my-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"><table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">'

    tableHtml += '<thead class="bg-gray-50 dark:bg-gray-800/50"><tr>'
    headerCells.forEach((cell, i) => {
      const align = alignments[i] || 'left'
      tableHtml += `<th class="px-4 py-3 text-${align} text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">${cell}</th>`
    })
    tableHtml += '</tr></thead>'

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
.markdown-content {
  font-size: 1rem;
  line-height: 1.65; /* 稍微紧凑一点的行高，适合短内容 */
}

/* 嵌套列表间距 */
.markdown-content :deep(ul ul),
.markdown-content :deep(ol ol),
.markdown-content :deep(ul ol),
.markdown-content :deep(ol ul) {
  margin-top: 0.125rem;
  margin-bottom: 0.125rem;
}

/* 链接下划线 */
.markdown-content :deep(a) {
  text-decoration-thickness: 2px;
}

/* 图片最大高度 */
.markdown-content :deep(img) {
  max-height: 450px;
  object-fit: contain;
}

/* 最后一个元素无下边距 */
.markdown-content > :deep(*:last-child) {
  margin-bottom: 0;
}

/* 第一个元素无上边距 */
.markdown-content > :deep(*:first-child) {
  margin-top: 0;
}

/* ========== 自定义滚动条样式 ========== */
.markdown-content :deep(.custom-scrollbar::-webkit-scrollbar) {
  height: 8px; /* 横向滚动条高度 */
  width: 8px;
}

.markdown-content :deep(.custom-scrollbar::-webkit-scrollbar-track) {
  background: transparent;
  border-radius: 4px;
}

.markdown-content :deep(.custom-scrollbar::-webkit-scrollbar-thumb) {
  background-color: rgba(156, 163, 175, 0.3); /* gray-400 with opacity */
  border-radius: 4px;
  border: 2px solid transparent; /* 创建 padding 效果 */
  background-clip: content-box;
  transition: background-color 0.2s;
}

.markdown-content :deep(.custom-scrollbar:hover::-webkit-scrollbar-thumb) {
  background-color: rgba(156, 163, 175, 0.6); /* hover 时加深 */
}

/* 暗色模式下的滚动条 */
:global(.dark) .markdown-content :deep(.custom-scrollbar::-webkit-scrollbar-thumb) {
  background-color: rgba(75, 85, 99, 0.4); /* gray-600 with opacity */
}

:global(.dark) .markdown-content :deep(.custom-scrollbar:hover::-webkit-scrollbar-thumb) {
  background-color: rgba(75, 85, 99, 0.7);
}
</style>
