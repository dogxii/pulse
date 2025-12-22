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

// Character limit
const MAX_CONTENT_LENGTH = 5000
const MAX_IMAGES = 4

// Computed
const postId = computed(() => route.params.id as string)
const isOverLimit = computed(() => content.value.length > MAX_CONTENT_LENGTH)
const canSubmit = computed(() => {
  return content.value.trim().length > 0 && !isOverLimit.value && !isSubmitting.value
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
      loadError.value = 'You can only edit your own posts'
      return
    }

    post.value = fetchedPost
    content.value = fetchedPost.content
    images.value = fetchedPost.images ? [...fetchedPost.images] : []
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error fetching post:', e)
    loadError.value = e instanceof Error ? e.message : 'Failed to load post'
  } finally {
    isLoading.value = false
  }
}

// Handle image upload
async function handleImageUpload(event: globalThis.Event) {
  const input = event.target as globalThis.HTMLInputElement
  if (!input.files || input.files.length === 0) return

  const file = input.files[0] as globalThis.File

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']
  if (!allowedTypes.includes(file.type)) {
    error.value = 'Please select a valid image file (JPEG, PNG, GIF, WebP, or AVIF)'
    return
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Image must be less than 5MB'
    return
  }

  isUploading.value = true
  error.value = null

  try {
    const result = await uploads.uploadImage(file)
    images.value.push(result.url)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to upload image'
  } finally {
    isUploading.value = false
    // Reset input
    input.value = ''
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
    error.value = e instanceof Error ? e.message : 'Failed to update post'
    isSubmitting.value = false
  }
}

// Discard changes and go back
function handleCancel() {
  if (hasChanges.value) {
    if (
      !globalThis.window.confirm('You have unsaved changes. Are you sure you want to discard them?')
    ) {
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
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Post</h1>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="py-20 text-center">
        <Loader2 class="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <p class="text-gray-500 dark:text-gray-400">Loading post...</p>
      </div>

      <!-- Load Error State -->
      <div v-else-if="loadError" class="py-20 text-center bg-white dark:bg-gray-900 rounded-3xl">
        <AlertCircle class="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Unable to load post
        </h2>
        <p class="text-gray-500 dark:text-gray-400 text-sm mb-6">{{ loadError }}</p>
        <button
          class="px-5 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors cursor-pointer"
          @click="goBack"
        >
          Go Back
        </button>
      </div>

      <!-- Edit Form -->
      <div v-else-if="post" class="space-y-6">
        <!-- Form Card -->
        <div
          class="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-gray-950/50"
        >
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
              <p class="text-xs text-gray-400 dark:text-gray-500">Editing post</p>
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
              placeholder="What's on your mind?"
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
                  {{ isUploading ? 'Uploading...' : 'Add Image' }}
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
                {{ images.length }}/{{ MAX_IMAGES }} images
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
                {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Markdown Tips -->
        <div class="p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:shadow-gray-950/50">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Markdown Tips</h3>
          <div class="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div>
              <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">**bold**</code> →
              <strong>bold</strong>
            </div>
            <div>
              <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">*italic*</code> →
              <em>italic</em>
            </div>
            <div>
              <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">`code`</code> →
              <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">code</code>
            </div>
            <div>
              <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">[link](url)</code> → link
            </div>
            <div>
              <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded"># Heading</code> → Heading
            </div>
            <div>
              <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">> quote</code> → Quote
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
