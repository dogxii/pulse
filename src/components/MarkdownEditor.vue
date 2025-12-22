<script setup lang="ts">
import { ref, computed } from 'vue'
import { Eye, Edit3, Bold, Italic, Link, Image, List, Code, Quote, Heading } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  minRows?: number
  maxLength?: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Mode: 'write' or 'preview'
const mode = ref<'write' | 'preview'>('write')

// Local content for textarea
const content = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

// Character count
const characterCount = computed(() => props.modelValue.length)
const isOverLimit = computed(() => {
  if (!props.maxLength) return false
  return characterCount.value > props.maxLength
})

// Simple Markdown to HTML parser
const renderedContent = computed(() => {
  if (!props.modelValue) return '<p class="text-gray-400 italic">Nothing to preview</p>'

  let html = props.modelValue
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-gray-900 mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-gray-900 mt-4 mb-2">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>')
    .replace(/__(.+?)__/g, '<strong class="font-bold">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/_(.+?)_/g, '<em class="italic">$1</em>')
    // Code blocks
    .replace(
      /```(\w*)\n([\s\S]*?)```/g,
      '<pre class="bg-gray-100 rounded-lg p-4 my-3 overflow-x-auto"><code class="text-sm font-mono text-gray-800">$2</code></pre>'
    )
    // Inline code
    .replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">$1</code>'
    )
    // Blockquotes
    .replace(
      /^> (.+)$/gm,
      '<blockquote class="border-l-4 border-gray-300 pl-4 my-3 text-gray-600 italic">$1</blockquote>'
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
    // Images
    .replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" class="rounded-xl max-w-full my-3" />'
    )
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="my-6 border-gray-200" />')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/\n/g, '<br />')

  // Wrap in paragraph
  html = `<p class="mb-3">${html}</p>`

  // Fix consecutive list items
  html = html.replace(/<\/li><br \/><li/g, '</li><li')

  return html
})

// Toolbar actions
const textareaRef = ref<globalThis.HTMLTextAreaElement | null>(null)

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

  // Set cursor position
  globalThis.setTimeout(() => {
    textarea.focus()
    textarea.setSelectionRange(start + before.length, start + before.length + textToInsert.length)
  }, 0)
}

function insertBold() {
  insertText('**', '**', 'bold text')
}

function insertItalic() {
  insertText('*', '*', 'italic text')
}

function insertLink() {
  insertText('[', '](url)', 'link text')
}

function insertImage() {
  insertText('![', '](image-url)', 'alt text')
}

function insertList() {
  insertText('\n- ', '', 'list item')
}

function insertCode() {
  insertText('`', '`', 'code')
}

function insertQuote() {
  insertText('\n> ', '', 'quote')
}

function insertHeading() {
  insertText('\n## ', '', 'heading')
}
</script>

<template>
  <div class="markdown-editor rounded-2xl border border-gray-200 overflow-hidden bg-white">
    <!-- Toolbar -->
    <div class="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
      <!-- Formatting Buttons -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          title="Heading"
          :disabled="mode === 'preview' || disabled"
          @click="insertHeading"
        >
          <Heading :size="16" />
        </button>
        <button
          type="button"
          class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          title="Bold"
          :disabled="mode === 'preview' || disabled"
          @click="insertBold"
        >
          <Bold :size="16" />
        </button>
        <button
          type="button"
          class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          title="Italic"
          :disabled="mode === 'preview' || disabled"
          @click="insertItalic"
        >
          <Italic :size="16" />
        </button>
        <div class="w-px h-5 bg-gray-200 mx-1" />
        <button
          type="button"
          class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          title="Link"
          :disabled="mode === 'preview' || disabled"
          @click="insertLink"
        >
          <Link :size="16" />
        </button>
        <button
          type="button"
          class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          title="Image"
          :disabled="mode === 'preview' || disabled"
          @click="insertImage"
        >
          <Image :size="16" />
        </button>
        <div class="w-px h-5 bg-gray-200 mx-1" />
        <button
          type="button"
          class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          title="List"
          :disabled="mode === 'preview' || disabled"
          @click="insertList"
        >
          <List :size="16" />
        </button>
        <button
          type="button"
          class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          title="Inline Code"
          :disabled="mode === 'preview' || disabled"
          @click="insertCode"
        >
          <Code :size="16" />
        </button>
        <button
          type="button"
          class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          title="Quote"
          :disabled="mode === 'preview' || disabled"
          @click="insertQuote"
        >
          <Quote :size="16" />
        </button>
      </div>

      <!-- Mode Toggle -->
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
          Write
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
          Preview
        </button>
      </div>
    </div>

    <!-- Editor / Preview -->
    <div class="min-h-50">
      <!-- Write Mode -->
      <textarea
        v-show="mode === 'write'"
        ref="textareaRef"
        v-model="content"
        :placeholder="placeholder || 'Write your content here... Markdown is supported!'"
        :rows="minRows || 8"
        :disabled="disabled"
        class="w-full px-4 py-4 text-gray-800 placeholder-gray-400 border-none focus:outline-none focus:ring-0 resize-none font-mono text-sm leading-relaxed"
      />

      <!-- Preview Mode -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div
        v-show="mode === 'preview'"
        class="px-4 py-4 prose prose-gray max-w-none text-gray-800 leading-relaxed min-h-50"
        v-html="renderedContent"
      />
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-200">
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400">Markdown supported</span>
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
</style>
