<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Loader2, AlertCircle, Calendar, Edit3, Check, X } from 'lucide-vue-next'
import { formatDistanceToNow, format } from 'date-fns'
import MainLayout from '../layouts/MainLayout.vue'
import PostCard from '../components/PostCard.vue'
import { useAuthStore } from '../stores/auth'
import { users as usersApi, posts as postsApi } from '../services/api'
import type { User, Post } from '../types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// State
const user = ref<User | null>(null)
const userPosts = ref<Post[]>([])
const allUsers = ref<User[]>([])
const isLoadingUser = ref(true)
const isLoadingPosts = ref(true)
const error = ref<string | null>(null)

// Edit mode
const isEditing = ref(false)
const editBio = ref('')
const isSaving = ref(false)

// Computed
const username = computed(() => route.params.username as string)
const isOwnProfile = computed(() => authStore.currentUser?.username === username.value)
const joinedDate = computed(() => {
  if (!user.value?.joined_at) return ''
  try {
    return format(new Date(user.value.joined_at), 'MMMM yyyy')
  } catch {
    return ''
  }
})
const lastActiveText = computed(() => {
  if (!user.value?.last_post_at) return 'No posts yet'
  try {
    return `Last active ${formatDistanceToNow(new Date(user.value.last_post_at), { addSuffix: true })}`
  } catch {
    return 'No posts yet'
  }
})

// Fetch user data
async function fetchUser() {
  isLoadingUser.value = true
  error.value = null

  try {
    user.value = await usersApi.get(username.value)
  } catch (e) {
    console.error('Error fetching user:', e)
    error.value = e instanceof Error ? e.message : 'User not found'
    user.value = null
  } finally {
    isLoadingUser.value = false
  }
}

// Fetch user's posts
async function fetchUserPosts() {
  if (!user.value) return

  isLoadingPosts.value = true

  try {
    // Fetch all posts and filter by user
    // In a real app, you'd have a dedicated endpoint for user posts
    const response = await postsApi.list({ limit: 50 })
    userPosts.value = response.items.filter(p => p.user_id === user.value?.id)
  } catch (e) {
    console.error('Error fetching user posts:', e)
  } finally {
    isLoadingPosts.value = false
  }
}

// Fetch all users for sidebar
async function fetchAllUsers() {
  try {
    allUsers.value = await usersApi.list()
  } catch (e) {
    console.error('Error fetching users:', e)
  }
}

// Start editing bio
function startEditing() {
  editBio.value = user.value?.bio || ''
  isEditing.value = true
}

// Cancel editing
function cancelEditing() {
  isEditing.value = false
  editBio.value = ''
}

// Save bio
async function saveBio() {
  if (!user.value || !authStore.currentUser) return

  isSaving.value = true

  try {
    const updatedUser = await usersApi.updateProfile(authStore.currentUser.id, {
      bio: editBio.value.trim(),
    })

    user.value = updatedUser
    authStore.updateUserLocally({ bio: updatedUser.bio })
    isEditing.value = false
  } catch (e) {
    console.error('Error saving bio:', e)
  } finally {
    isSaving.value = false
  }
}

// Handle like toggle
async function handleLikeToggle(postId: string) {
  if (!authStore.isLoggedIn) {
    router.push('/login')
    return
  }

  try {
    const result = await postsApi.toggleLike(postId)
    const postIndex = userPosts.value.findIndex(p => p.id === postId)
    const post = userPosts.value[postIndex]
    if (postIndex !== -1 && post) {
      post.likes = result.likes
    }
  } catch (e) {
    console.error('Error toggling like:', e)
  }
}

// Handle post delete
async function handlePostDelete(postId: string) {
  try {
    await postsApi.delete(postId)
    userPosts.value = userPosts.value.filter(p => p.id !== postId)

    // Update post count
    if (user.value) {
      user.value.post_count = Math.max(0, user.value.post_count - 1)
    }
    const currentUser = authStore.currentUser
    if (currentUser && isOwnProfile.value) {
      authStore.updateUserLocally({
        post_count: Math.max(0, currentUser.post_count - 1),
      })
    }
  } catch (e) {
    console.error('Error deleting post:', e)
  }
}

// Watch for username changes
watch(
  () => route.params.username,
  async newUsername => {
    if (newUsername) {
      await fetchUser()
      if (user.value) {
        await fetchUserPosts()
      }
    }
  }
)

// Initialize
onMounted(async () => {
  if (!authStore.isInitialized) {
    await authStore.initialize()
  }

  await Promise.all([fetchUser(), fetchAllUsers()])

  if (user.value) {
    await fetchUserPosts()
  }
})
</script>

<template>
  <MainLayout :current-user="authStore.currentUser" :all-users="allUsers">
    <!-- Loading State -->
    <div v-if="isLoadingUser" class="py-20 text-center">
      <Loader2 class="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
      <p class="text-gray-500">Loading profile...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="py-20 text-center bg-white rounded-3xl">
      <AlertCircle class="w-12 h-12 text-red-400 mx-auto mb-4" />
      <h2 class="text-lg font-semibold text-gray-900 mb-2">User not found</h2>
      <p class="text-gray-500 text-sm mb-6">{{ error }}</p>
      <router-link
        to="/"
        class="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors"
      >
        Go Home
      </router-link>
    </div>

    <!-- Profile Content -->
    <div v-else-if="user">
      <!-- Profile Header -->
      <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm mb-8">
        <div class="flex flex-col md:flex-row md:items-start gap-6">
          <!-- Avatar -->
          <div
            class="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 mx-auto md:mx-0"
          >
            <img
              :src="user.avatar_url || `https://api.dicebear.com/9.x/micah/svg?seed=${user.id}`"
              :alt="user.username"
              class="w-full h-full object-cover"
            />
          </div>

          <!-- Info -->
          <div class="flex-1 text-center md:text-left">
            <div class="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-3">
              <h1 class="text-2xl font-bold text-gray-900">@{{ user.username }}</h1>
              <div class="flex items-center justify-center md:justify-start gap-2">
                <span
                  v-if="user.is_admin"
                  class="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full"
                >
                  Admin
                </span>
              </div>
            </div>

            <!-- Bio -->
            <div class="mb-4">
              <div v-if="isEditing" class="max-w-md mx-auto md:mx-0">
                <textarea
                  v-model="editBio"
                  placeholder="Write something about yourself..."
                  rows="3"
                  maxlength="500"
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none"
                />
                <div class="flex items-center justify-between mt-2">
                  <span class="text-xs text-gray-400">{{ editBio.length }}/500</span>
                  <div class="flex gap-2">
                    <button
                      @click="cancelEditing"
                      :disabled="isSaving"
                      class="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <X :size="18" />
                    </button>
                    <button
                      @click="saveBio"
                      :disabled="isSaving"
                      class="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Loader2 v-if="isSaving" :size="18" class="animate-spin" />
                      <Check v-else :size="18" />
                    </button>
                  </div>
                </div>
              </div>
              <div v-else class="flex items-start gap-2 justify-center md:justify-start">
                <p class="text-gray-600" :class="{ 'text-gray-400 italic': !user.bio }">
                  {{ user.bio || 'No bio yet' }}
                </p>
                <button
                  v-if="isOwnProfile"
                  @click="startEditing"
                  class="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  title="Edit bio"
                >
                  <Edit3 :size="14" />
                </button>
              </div>
            </div>

            <!-- Stats -->
            <div class="flex items-center justify-center md:justify-start gap-6 text-sm">
              <div>
                <span class="font-bold text-gray-900">{{ user.post_count }}</span>
                <span class="text-gray-500 ml-1">posts</span>
              </div>
              <div class="flex items-center gap-1 text-gray-500">
                <Calendar :size="14" />
                <span>Joined {{ joinedDate }}</span>
              </div>
            </div>

            <!-- Last Active -->
            <p class="mt-2 text-xs text-gray-400">{{ lastActiveText }}</p>
          </div>
        </div>
      </div>

      <!-- Posts Section -->
      <div class="mb-6">
        <h2 class="text-lg font-bold text-gray-900 mb-4">Posts</h2>
      </div>

      <!-- Loading Posts -->
      <div v-if="isLoadingPosts" class="py-12 text-center">
        <Loader2 class="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
        <p class="text-gray-400 text-sm">Loading posts...</p>
      </div>

      <!-- Empty Posts -->
      <div v-else-if="userPosts.length === 0" class="py-12 text-center bg-white rounded-3xl">
        <div
          class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <p class="text-gray-500">
          {{ isOwnProfile ? "You haven't posted anything yet" : 'No posts yet' }}
        </p>
        <router-link
          v-if="isOwnProfile"
          to="/new"
          class="inline-block mt-4 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors"
        >
          Create Your First Post
        </router-link>
      </div>

      <!-- Posts List -->
      <div v-else class="space-y-6">
        <PostCard
          v-for="post in userPosts"
          :key="post.id"
          :post="post"
          :current-user-id="authStore.userId"
          @like="handleLikeToggle"
          @delete="handlePostDelete"
        />
      </div>
    </div>
  </MainLayout>
</template>
