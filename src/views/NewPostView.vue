<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Image, X, Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { posts as postsApi, uploads } from '../services/api'

const router = useRouter()
const authStore = useAuthStore()

// Form state
const content = ref('')
const images = ref<string[]>([])
const isSubmitting = ref(false)
const isUploading = ref(false)
const error = ref<string | null>(null)

// Character limit
const MAX_CONTENT_LENGTH = 5000
const MAX_IMAGES = 4

// Computed
const characterCount = computed(() => content.value.length)
const isOverLimit = computed(() => characterCount.value > MAX_CONTENT_LENGTH)
const canSubmit = computed(() => {
  return content.value.trim().length > 0 && !isOverLimit.value && !isSubmitting.value
})
const canUploadMore = computed(() => images.value.length < MAX_IMAGES)

// Handle image upload
async function handleImageUpload(event: globalThis.Event) {
  const input = event.target as globalThis.HTMLInputElement
  if (!input.files || input.files.length === 0) return

  const file = input.files[0] as File

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

// Submit post
async function handleSubmit() {
  if (!canSubmit.value) return

  isSubmitting.value = true
  error.value = null

  try {
    await postsApi.create({
      content: content.value.trim(),
      images: images.value.length > 0 ? images.value : undefined,
    })

    // Update user's post count locally
    if (authStore.currentUser) {
      authStore.updateUserLocally({
        post_count: authStore.currentUser.post_count + 1,
        last_post_at: new Date().toISOString(),
      })
    }

    // Navigate back to home
    router.push('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to create post'
    isSubmitting.value = false
  }
}

// Go back
function goBack() {
  router.back()
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50">
    <div class="max-w-2xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-8">
        <button
          @click="goBack"
          class="p-2 rounded-xl hover:bg-white transition-colors cursor-pointer"
        >
          <ArrowLeft :size="20" class="text-gray-600" />
        </button>
        <h1 class="text-xl font-bold text-gray-900">New Post</h1>
      </div>

      <!-- Form Card -->
      <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm">
        <!-- User Info -->
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
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
            <span class="font-bold text-gray-900 text-sm">
              {{ authStore.currentUser?.username }}
            </span>
            <p class="text-xs text-gray-400">Posting publicly</p>
          </div>
        </div>

        <!-- Error Message -->
        <div
          v-if="error"
          class="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm"
        >
          {{ error }}
        </div>

        <!-- Content Input -->
        <div class="mb-6">
          <textarea
            v-model="content"
            placeholder="What's on your mind?"
            rows="6"
            class="w-full px-0 py-2 text-lg text-gray-800 placeholder-gray-400 border-none focus:outline-none focus:ring-0 resize-none"
            :disabled="isSubmitting"
          />

          <!-- Character Count -->
          <div class="flex justify-end">
            <span class="text-xs" :class="isOverLimit ? 'text-red-500' : 'text-gray-400'">
              {{ characterCount }} / {{ MAX_CONTENT_LENGTH }}
            </span>
          </div>
        </div>

        <!-- Image Previews -->
        <div v-if="images.length > 0" class="mb-6">
          <div class="grid gap-2" :class="images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'">
            <div v-for="(img, index) in images" :key="index" class="relative group">
              <img
                :src="img"
                alt="Upload preview"
                class="rounded-xl w-full h-40 object-cover bg-gray-50"
              />
              <button
                @click="removeImage(index)"
                class="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X :size="14" />
              </button>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between pt-4 border-t border-gray-100">
          <!-- Upload Image Button -->
          <div class="flex items-center gap-2">
            <label
              v-if="canUploadMore"
              class="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
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
            <span v-if="images.length > 0" class="text-xs text-gray-400">
              {{ images.length }}/{{ MAX_IMAGES }} images
            </span>
          </div>

          <!-- Submit Button -->
          <button
            @click="handleSubmit"
            :disabled="!canSubmit"
            class="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Loader2 v-if="isSubmitting" :size="18" class="animate-spin inline mr-2" />
            {{ isSubmitting ? 'Posting...' : 'Post' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
