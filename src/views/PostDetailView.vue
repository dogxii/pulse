<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Loader2, AlertCircle, Heart, MessageCircle, Send } from 'lucide-vue-next'
import { formatDistanceToNow } from 'date-fns'
import { useAuthStore } from '../stores/auth'
import { posts as postsApi } from '../services/api'
import type { Post } from '../types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// State
const post = ref<Post | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)
const newComment = ref('')
const isSubmittingComment = ref(false)

// Computed
const postId = computed(() => route.params.id as string)
const formattedDate = computed(() => {
  if (!post.value) return ''
  try {
    return formatDistanceToNow(new Date(post.value.created_at), { addSuffix: true })
  } catch {
    return ''
  }
})
const isLiked = computed(() => {
  if (!authStore.userId || !post.value) return false
  return post.value.likes.includes(authStore.userId)
})

// Fetch post
async function fetchPost() {
  isLoading.value = true
  error.value = null

  try {
    post.value = await postsApi.get(postId.value)
  } catch (e) {
    console.error('Error fetching post:', e)
    error.value = e instanceof Error ? e.message : 'Failed to load post'
  } finally {
    isLoading.value = false
  }
}

// Handle like toggle
async function handleLikeToggle() {
  if (!authStore.isLoggedIn || !post.value) {
    router.push('/login')
    return
  }

  try {
    const result = await postsApi.toggleLike(post.value.id)
    post.value.likes = result.likes
  } catch (e) {
    console.error('Error toggling like:', e)
  }
}

// Handle comment submit (placeholder - comments API not implemented)
async function handleCommentSubmit() {
  if (!newComment.value.trim() || !authStore.isLoggedIn) return

  isSubmittingComment.value = true
  // TODO: Implement comments API
  console.log('Comment submitted:', newComment.value)

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500))
  newComment.value = ''
  isSubmittingComment.value = false
}

// Navigation
function goBack() {
  router.back()
}

function navigateToProfile() {
  if (post.value?.user?.username) {
    router.push(`/u/${post.value.user.username}`)
  }
}

// Initialize
onMounted(async () => {
  if (!authStore.isInitialized) {
    await authStore.initialize()
  }
  await fetchPost()
})
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
        <h1 class="text-xl font-bold text-gray-900">Post</h1>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="py-20 text-center">
        <Loader2 class="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
        <p class="text-gray-500">Loading post...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="py-20 text-center bg-white rounded-3xl">
        <AlertCircle class="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 class="text-lg font-semibold text-gray-900 mb-2">Unable to load post</h2>
        <p class="text-gray-500 text-sm mb-6">{{ error }}</p>
        <button
          @click="fetchPost"
          class="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>

      <!-- Post Content -->
      <div v-else-if="post" class="space-y-6">
        <!-- Main Post Card -->
        <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm">
          <!-- Header: User Info -->
          <div class="flex items-center gap-3 mb-6">
            <div
              class="w-12 h-12 rounded-full overflow-hidden bg-gray-100 cursor-pointer"
              @click="navigateToProfile"
            >
              <img
                :src="post.user?.avatar_url || `https://api.dicebear.com/9.x/micah/svg?seed=${post.user_id}`"
                :alt="post.user?.username"
                class="w-full h-full object-cover"
              />
            </div>
            <div class="flex flex-col">
              <span
                class="font-bold text-gray-900 cursor-pointer hover:underline"
                @click="navigateToProfile"
              >
                {{ post.user?.username || 'Unknown User' }}
              </span>
              <span class="text-sm text-gray-400">{{ formattedDate }}</span>
            </div>
          </div>

          <!-- Content -->
          <div class="mb-6">
            <p class="text-gray-800 text-xl leading-relaxed whitespace-pre-wrap">
              {{ post.content }}
            </p>

            <!-- Images -->
            <div
              v-if="post.images && post.images.length > 0"
              class="mt-6 grid gap-2"
              :class="post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'"
            >
              <img
                v-for="(img, index) in post.images"
                :key="index"
                :src="img"
                alt="Post image"
                class="rounded-2xl w-full h-auto object-cover max-h-[500px] bg-gray-50"
              />
            </div>
          </div>

          <!-- Stats -->
          <div class="flex items-center gap-6 py-4 border-y border-gray-100 text-gray-500">
            <div class="flex items-center gap-2">
              <Heart :size="18" />
              <span class="text-sm font-medium">{{ post.likes.length }} likes</span>
            </div>
            <div class="flex items-center gap-2">
              <MessageCircle :size="18" />
              <span class="text-sm font-medium">{{ post.comments_count }} comments</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-6 pt-4">
            <button
              class="flex items-center gap-2 group transition-colors focus:outline-none cursor-pointer"
              :class="isLiked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-500'"
              @click="handleLikeToggle"
            >
              <Heart
                :size="22"
                :class="{ 'fill-current': isLiked }"
                class="group-hover:scale-110 transition-transform"
              />
              <span class="font-medium">{{ isLiked ? 'Liked' : 'Like' }}</span>
            </button>

            <button
              class="flex items-center gap-2 text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
            >
              <MessageCircle :size="22" />
              <span class="font-medium">Comment</span>
            </button>
          </div>
        </div>

        <!-- Comment Input -->
        <div v-if="authStore.isLoggedIn" class="bg-white rounded-3xl p-6 shadow-sm">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
              <img
                :src="authStore.currentUser?.avatar_url || `https://api.dicebear.com/9.x/micah/svg?seed=${authStore.userId}`"
                :alt="authStore.currentUser?.username"
                class="w-full h-full object-cover"
              />
            </div>
            <div class="flex-1 flex gap-2">
              <input
                v-model="newComment"
                type="text"
                placeholder="Write a comment..."
                class="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-200 text-sm"
                :disabled="isSubmittingComment"
                @keyup.enter="handleCommentSubmit"
              />
              <button
                @click="handleCommentSubmit"
                :disabled="!newComment.trim() || isSubmittingComment"
                class="p-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Loader2 v-if="isSubmittingComment" :size="18" class="animate-spin" />
                <Send v-else :size="18" />
              </button>
            </div>
          </div>
        </div>

        <!-- Login Prompt -->
        <div v-else class="bg-white rounded-3xl p-6 shadow-sm text-center">
          <p class="text-gray-500 text-sm mb-4">Sign in to like and comment on posts</p>
          <router-link
            to="/login"
            class="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors"
          >
            Sign In
          </router-link>
        </div>

        <!-- Comments Section -->
        <div class="bg-white rounded-3xl p-6 shadow-sm">
          <h2 class="font-bold text-gray-900 mb-4">Comments</h2>

          <!-- No Comments -->
          <div v-if="post.comments_count === 0" class="py-8 text-center">
            <MessageCircle class="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p class="text-gray-400 text-sm">No comments yet. Be the first to comment!</p>
          </div>

          <!-- Comments Placeholder -->
          <div v-else class="py-8 text-center">
            <p class="text-gray-400 text-sm">Comments coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
