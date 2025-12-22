<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import MainLayout from '../layouts/MainLayout.vue'
import PostCard from '../components/PostCard.vue'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { posts as postsApi, users as usersApi } from '../services/api'
import type { User, Post } from '../types'

const authStore = useAuthStore()

// State
const allUsers = ref<User[]>([])
const posts = ref<Post[]>([])
const isLoadingPosts = ref(true)
const isLoadingUsers = ref(true)
const postsError = ref<string | null>(null)
const usersError = ref<string | null>(null)

// Pagination
const currentPage = ref(1)
const hasMorePosts = ref(false)
const isLoadingMore = ref(false)

// Computed
const currentUser = computed(() => authStore.currentUser)
const isLoading = computed(() => isLoadingPosts.value || isLoadingUsers.value)
const hasError = computed(() => postsError.value || usersError.value)

// Fetch users
async function fetchUsers() {
  isLoadingUsers.value = true
  usersError.value = null

  try {
    allUsers.value = await usersApi.list()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching users:', error)
    usersError.value = error instanceof Error ? error.message : 'Failed to load users'
  } finally {
    isLoadingUsers.value = false
  }
}

// Fetch posts
async function fetchPosts(page: number = 1, append: boolean = false) {
  if (page === 1) {
    isLoadingPosts.value = true
  } else {
    isLoadingMore.value = true
  }
  postsError.value = null

  try {
    const response = await postsApi.list({ page, limit: 20 })

    if (append) {
      posts.value = [...posts.value, ...response.items]
    } else {
      posts.value = response.items
    }

    currentPage.value = response.page
    hasMorePosts.value = response.has_more
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching posts:', error)
    postsError.value = error instanceof Error ? error.message : 'Failed to load posts'
  } finally {
    isLoadingPosts.value = false
    isLoadingMore.value = false
  }
}

// Load more posts
async function loadMorePosts() {
  if (isLoadingMore.value || !hasMorePosts.value) return
  await fetchPosts(currentPage.value + 1, true)
}

// Refresh all data
async function refreshData() {
  currentPage.value = 1
  await Promise.all([fetchPosts(1), fetchUsers()])
}

// Handle post like toggle
async function handleLikeToggle(postId: string) {
  if (!authStore.isLoggedIn || !authStore.userId) {
    // Redirect to login if not authenticated
    return
  }

  try {
    const result = await postsApi.toggleLike(postId)

    // Update the post in our local state
    const postIndex = posts.value.findIndex(p => p.id === postId)
    const post = posts.value[postIndex]
    if (postIndex !== -1 && post) {
      post.likes = result.likes
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error toggling like:', error)
  }
}

// Initialize data on mount
onMounted(async () => {
  // Initialize auth if not already done
  if (!authStore.isInitialized) {
    await authStore.initialize()
  }

  // Fetch data in parallel
  await Promise.all([fetchPosts(), fetchUsers()])
})
</script>

<template>
  <MainLayout :current-user="currentUser" :all-users="allUsers">
    <!-- Feed Header -->
    <div class="mb-8 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Latest Pulse</h1>

      <div class="flex items-center gap-3">
        <!-- Refresh Button -->
        <button
          @click="refreshData"
          :disabled="isLoading"
          class="p-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
          title="Refresh"
        >
          <RefreshCw :size="18" :class="{ 'animate-spin': isLoading }" />
        </button>

        <!-- New Post Button -->
        <router-link
          v-if="authStore.isLoggedIn"
          to="/new"
          class="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
        >
          New Post
        </router-link>
        <router-link
          v-else
          to="/login"
          class="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
        >
          Sign In
        </router-link>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && posts.length === 0" class="py-20 text-center">
      <Loader2 class="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
      <p class="text-gray-500">Loading latest posts...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="hasError && posts.length === 0" class="py-20 text-center bg-white rounded-3xl">
      <AlertCircle class="w-12 h-12 text-red-400 mx-auto mb-4" />
      <h2 class="text-lg font-semibold text-gray-900 mb-2">Unable to load posts</h2>
      <p class="text-gray-500 text-sm mb-6">
        {{ postsError || usersError }}
      </p>
      <button
        @click="refreshData"
        class="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors cursor-pointer"
      >
        Try Again
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="posts.length === 0" class="py-20 text-center bg-white rounded-3xl">
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">No posts yet</h2>
      <p class="text-gray-500 text-sm mb-6">Be the first to share something with the community!</p>
      <router-link
        v-if="authStore.isLoggedIn"
        to="/new"
        class="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors"
      >
        Create First Post
      </router-link>
      <router-link
        v-else
        to="/login"
        class="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors"
      >
        Sign in to Post
      </router-link>
    </div>

    <!-- Posts List -->
    <div v-else class="space-y-6">
      <PostCard
        v-for="post in posts"
        :key="post.id"
        :post="post"
        :current-user-id="authStore.userId"
        @like="handleLikeToggle"
      />

      <!-- Load More -->
      <div v-if="hasMorePosts" class="py-6 text-center">
        <button
          @click="loadMorePosts"
          :disabled="isLoadingMore"
          class="px-6 py-3 bg-white text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors border border-gray-200 disabled:opacity-50 cursor-pointer"
        >
          <Loader2 v-if="isLoadingMore" class="w-4 h-4 animate-spin inline mr-2" />
          {{ isLoadingMore ? 'Loading...' : 'Load More' }}
        </button>
      </div>

      <!-- End of Feed -->
      <div v-else class="py-12 text-center">
        <p class="text-gray-400 text-sm">You're all caught up!</p>
      </div>
    </div>
  </MainLayout>
</template>
