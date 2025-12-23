<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Image, X, Loader2, AlertCircle } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { posts as postsApi, uploads } from '../services/api'
import MarkdownEditor from '../components/MarkdownEditor.vue'
import type { Post } from '../types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// State
const post = ref<Post | null>(null)
const content = ref('')
const images = ref<string[]>([])
const isLoading = ref(true)
const isSubmitting = ref(false)
const isUploading = ref(false)
const error = ref<string | null>(null)
const loadError = ref<string | null>(null)
const isDragging = ref(false)

// Character limit
const MAX_CONTENT_LENGTH = 5000
const MAX_IMAGES = 4

// Allowed image types
const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']

// Computed
const postId = computed(() => route.params.id as string)
const isOverLimit = computed(() => content.value.length > MAX_CONTENT_LENGTH)
const canSubmit = computed(() => {
  const hasContent = content.value.trim().length > 0
  const hasImages = images.value.length > 0
  return (hasContent || hasImages) && !isOverLimit.value && !isSubmitting.value
})
const canUploadMore = computed(() => images.value.length < MAX_IMAGES)
const hasChanges = computed(() => {
  if (!post.value) return false
  const originalImages = post.value.images || []
  return (
    content.value !== post.value.content ||
    JSON.stringify(images.value) !== JSON.stringify(originalImages)
  )
})

// Fetch the existing post
async function fetchPost() {
  isLoading.value = true
  loadError.value = null

  try {
    const fetchedPost = await postsApi.get(postId.value)

    // Check if current user is the author
    if (fetchedPost.user_id !== authStore.userId) {
      loadError.value = '你只可以编辑你自己的帖子'
      return
    }

    post.value = fetchedPost
    content.value = fetchedPost.content
    images.value = fetchedPost.images ? [...fetchedPost.images] : []
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error fetching post:', e)
    loadError.value = e instanceof Error ? e.message : '加载帖子失败'
  } finally {
    isLoading.value = false
  }
}

// Upload a single file
async function uploadFile(file: globalThis.File) {
  // Validate file type
  if (!allowedTypes.includes(file.type)) {
    error.value = '请选择一个有效图片文件 (JPEG, PNG, GIF, WebP, or AVIF)'
    return
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    error.value = '图片大小必须小于 5MB'
    return
  }

  // Check if we can upload more
  if (!canUploadMore.value) {
    error.value = `最多上传 ${MAX_IMAGES} 张图片`
    return
  }

  isUploading.value = true
  error.value = null

  try {
    const result = await uploads.uploadImage(file)
    images.value.push(result.url)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '上传图片失败'
  } finally {
    isUploading.value = false
  }
}

// Handle image upload from file input
async function handleImageUpload(event: globalThis.Event) {
  const input = event.target as globalThis.HTMLInputElement
  if (!input.files || input.files.length === 0) return

  const file = input.files[0] as globalThis.File
  await uploadFile(file)

  // Reset input
  input.value = ''
}

// Handle drag and drop
function handleDragEnter(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  if (canUploadMore.value && !isUploading.value) {
    isDragging.value = true
  }
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  // Only set to false if we're leaving the drop zone entirely
  const relatedTarget = e.relatedTarget as Node | null
  const currentTarget = e.currentTarget as Node
  if (!currentTarget.contains(relatedTarget)) {
    isDragging.value = false
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
}

async function handleDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = false

  if (!canUploadMore.value || isUploading.value) return

  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return

  // Upload only image files, up to the remaining slots
  const remainingSlots = MAX_IMAGES - images.value.length
  let uploadCount = 0

  for (let i = 0; i < files.length && uploadCount < remainingSlots; i++) {
    const file = files[i] as globalThis.File
    if (allowedTypes.includes(file.type)) {
      await uploadFile(file)
      uploadCount++
    }
  }
}

// Remove image
function removeImage(index: number) {
  images.value.splice(index, 1)
}

// Submit post update
async function handleSubmit() {
  if (!canSubmit.value || !post.value) return

  isSubmitting.value = true
  error.value = null

  try {
    await postsApi.update(post.value.id, {
      content: content.value.trim(),
    })

    // Navigate back to the post detail
    router.push(`/post/${post.value.id}`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '更新帖子失败'
    isSubmitting.value = false
  }
}

// Discard changes and go back
function handleCancel() {
  if (hasChanges.value) {
    if (!globalThis.window.confirm('你有未保存更改. 你想要放弃更改它们吗？')) {
      return
    }
  }
  router.back()
}

// Go back
function goBack() {
  handleCancel()
}

// Initialize
onMounted(async () => {
  if (!authStore.isInitialized) {
    await authStore.initialize()
  }

  if (!authStore.isLoggedIn) {
    router.push('/login')
    return
  }

  await fetchPost()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 dark:bg-[#0f0f0f] transition-colors duration-300">
    <div class="max-w-2xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-8">
        <button
          class="p-2 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors cursor-pointer"
          @click="goBack"
        >
          <ArrowLeft :size="20" class="text-gray-600 dark:text-gray-400" />
        </button>
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">编辑帖子</h1>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="py-20 text-center">
        <Loader2 class="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <p class="text-gray-500 dark:text-gray-400">加载帖子...</p>
      </div>

      <!-- Load Error State -->
      <div v-else-if="loadError" class="py-20 text-center bg-white dark:bg-gray-900 rounded-3xl">
        <AlertCircle class="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">无法加载帖子</h2>
        <p class="text-gray-500 dark:text-gray-400 text-sm mb-6">{{ loadError }}</p>
        <button
          class="px-5 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors cursor-pointer"
          @click="goBack"
        >
          返回
        </button>
      </div>

      <!-- Edit Form -->
      <div v-else-if="post" class="space-y-6">
        <!-- Form Card with Drop Zone -->
        <div
          class="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-gray-950/50 relative"
          :class="{ 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-900': isDragging }"
          @dragenter="handleDragEnter"
          @dragleave="handleDragLeave"
          @dragover="handleDragOver"
          @drop="handleDrop"
        >
          <!-- Drag Overlay -->
          <div
            v-if="isDragging"
            class="absolute inset-0 bg-blue-50/90 dark:bg-blue-950/90 rounded-3xl flex items-center justify-center z-10 pointer-events-none"
          >
            <div class="text-center">
              <Image :size="48" class="mx-auto mb-3 text-blue-500 dark:text-blue-400" />
              <p class="text-blue-600 dark:text-blue-400 font-medium">拖动图片到这里</p>
              <p class="text-blue-500/70 dark:text-blue-500/70 text-sm mt-1">
                {{ images.length }}/{{ MAX_IMAGES }} 图片
              </p>
            </div>
          </div>
          <!-- User Info -->
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
              <img
                :src="
                  authStore.currentUser?.avatar_url ||
                  `https://api.dicebear.com/9.x/micah/svg?seed=${authStore.userId}`
                "
                :alt="authStore.currentUser?.username"
                class="w-full h-full object-cover"
              />
            </div>
            <div>
              <span class="font-bold text-gray-900 dark:text-gray-100 text-sm">
                {{ authStore.currentUser?.username }}
              </span>
              <p class="text-xs text-gray-400 dark:text-gray-500">编辑帖子</p>
            </div>
          </div>

          <!-- Error Message -->
          <div
            v-if="error"
            class="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-sm"
          >
            {{ error }}
          </div>

          <!-- Markdown Editor -->
          <div class="mb-6">
            <MarkdownEditor
              v-model="content"
              placeholder="记录下来你的想法..."
              :max-length="MAX_CONTENT_LENGTH"
              :min-rows="6"
              :disabled="isSubmitting"
            />
          </div>

          <!-- Image Previews -->
          <div v-if="images.length > 0" class="mb-6">
            <div class="grid gap-2" :class="images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'">
              <div v-for="(img, index) in images" :key="index" class="relative group">
                <img
                  :src="img"
                  alt="Upload preview"
                  class="rounded-xl w-full h-40 object-cover bg-gray-50 dark:bg-gray-800"
                />
                <button
                  class="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  @click="removeImage(index)"
                >
                  <X :size="14" />
                </button>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div
            class="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800"
          >
            <!-- Upload Image Button -->
            <div class="flex items-center gap-2">
              <label
                v-if="canUploadMore"
                class="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
                :class="{ 'opacity-50 pointer-events-none': isUploading }"
              >
                <Loader2 v-if="isUploading" :size="18" class="animate-spin" />
                <Image v-else :size="18" />
                <span class="text-sm font-medium">
                  {{ isUploading ? '上传中...' : '添加图片' }}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
                  class="hidden"
                  :disabled="isUploading"
                  @change="handleImageUpload"
                />
              </label>
              <span v-if="images.length > 0" class="text-xs text-gray-400 dark:text-gray-500">
                {{ images.length }}/{{ MAX_IMAGES }} 图片
              </span>
            </div>

            <!-- Submit Buttons -->
            <div class="flex items-center gap-3">
              <button
                class="px-5 py-2.5 text-gray-600 dark:text-gray-400 rounded-xl font-medium text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
                :disabled="isSubmitting"
                @click="handleCancel"
              >
                Cancel
              </button>
              <button
                class="px-6 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                :disabled="!canSubmit || !hasChanges"
                @click="handleSubmit"
              >
                <Loader2 v-if="isSubmitting" :size="18" class="animate-spin inline mr-2" />
                {{ isSubmitting ? '保存中...' : '保存更改' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Markdown Tips -->
        <div class="p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-950/50">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Markdown Tips</h3>
          <div class="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div>
              <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">**粗体**</code> →
              <strong>粗体</strong>
            </div>
            <div>
              <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">*斜体*</code> →
              <em>斜体</em>
            </div>
            <div>
              <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">`code`</code> →
              <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">code</code>
            </div>
            <div>
              <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">[link](url)</code> → link
            </div>
            <div><code class="bg-gray-100 dark:bg-gray-800 px-1 rounded"># 标题</code> → 标题</div>
            <div><code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">> 引用</code> → 引用</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
