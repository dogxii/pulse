<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  content: string
  class?: string
}>()

// Simple Markdown to HTML parser
const renderedContent = computed(() => {
  if (!props.content) return ''

  let html = props.content
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-gray-900 mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-gray-900 mt-3 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-gray-900 mt-3 mb-1">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>')
    .replace(/__(.+?)__/g, '<strong class="font-bold">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/_(.+?)_/g, '<em class="italic">$1</em>')
    // Code blocks
    .replace(
      /```(\w*)\n([\s\S]*?)```/g,
      '<pre class="bg-gray-100 rounded-lg p-3 my-2 overflow-x-auto"><code class="text-sm font-mono text-gray-800">$2</code></pre>'
    )
    // Inline code
    .replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">$1</code>'
    )
    // Blockquotes
    .replace(
      /^> (.+)$/gm,
      '<blockquote class="border-l-4 border-gray-300 pl-3 my-2 text-gray-600 italic">$1</blockquote>'
    )
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\* (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Links
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-emerald-600 hover:text-emerald-700 underline">$1</a>'
    )
    // Images (inline in text, not the post images array)
    .replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" class="rounded-xl max-w-full my-2 inline-block" loading="lazy" />'
    )
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="my-4 border-gray-200" />')
    // Line breaks - double newline = new paragraph
    .replace(/\n\n/g, '</p><p class="mb-2">')
    // Single newline = br
    .replace(/\n/g, '<br />')

  // Wrap in paragraph
  html = `<p class="mb-2">${html}</p>`

  // Fix consecutive list items (remove br between them)
  html = html.replace(/<\/li><br \/><li/g, '</li><li')

  // Clean up empty paragraphs
  html = html.replace(/<p class="mb-2"><\/p>/g, '')

  return html
})
</script>

<template>
  <div class="markdown-content leading-relaxed" :class="props.class" v-html="renderedContent" />
</template>

<style scoped>
.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0.5rem 0;
}

.markdown-content :deep(li) {
  margin: 0.25rem 0;
}

.markdown-content :deep(pre) {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.markdown-content :deep(a) {
  word-break: break-word;
}

.markdown-content :deep(img) {
  max-height: 300px;
  object-fit: contain;
}
</style>
