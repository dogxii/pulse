<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const APP_VERSION = __APP_VERSION__
import {
  Shield,
  Users,
  FileText,
  Loader2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-vue-next'
import MainLayout from '../layouts/MainLayout.vue'
import { useAuthStore } from '../stores/auth'
import { usePostsStore } from '../stores/posts'
import { users as usersApi } from '../services/api'
import type { User } from '../types'

const router = useRouter()
const authStore = useAuthStore()
const postsStore = usePostsStore()

// State
const allUsers = ref<User[]>([])
const isLoading = ref(true)
const isRefreshing = ref(false)
const error = ref<string | null>(null)

// Computed
const isAdmin = computed(() => authStore.currentUser?.is_admin ?? false)
const stats = computed(() => ({
  totalUsers: allUsers.value.length,
  adminCount: allUsers.value.filter(u => u.is_admin).length,
  totalPosts: allUsers.value.reduce((sum, u) => sum + u.post_count, 0),
}))

// Fetch users
async function fetchUsers(showRefresh = false) {
  if (showRefresh) {
    isRefreshing.value = true
  } else {
    isLoading.value = true
  }
  error.value = null

  try {
    allUsers.value = await usersApi.list()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载用户列表失败'
  } finally {
    isLoading.value = false
    isRefreshing.value = false
  }
}

// Navigate to user profile
function viewProfile(username: string) {
  router.push(`/u/${username}`)
}

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Initialize
onMounted(async () => {
  if (!authStore.isInitialized) {
    await authStore.initialize()
  }

  // Redirect if not admin
  if (!authStore.isLoggedIn) {
    router.replace('/login')
    return
  }

  if (!authStore.currentUser?.is_admin) {
    router.replace('/')
    return
  }

  await fetchUsers()
})
</script>

<template>
  <MainLayout :current-user="authStore.currentUser" :all-users="allUsers" :posts="postsStore.posts">
    <!-- Not Authorized -->
    <div
      v-if="!isAdmin && !isLoading"
      class="py-20 text-center bg-white dark:bg-gray-900 rounded-3xl"
    >
      <Shield class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
      <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">访问被拒绝</h2>
      <p class="text-gray-500 dark:text-gray-400 mb-6">您没有权限访问此页面。</p>
      <router-link
        to="/"
        class="inline-block px-5 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
      >
        返回首页
      </router-link>
    </div>

    <!-- Admin Content -->
    <div v-else>
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center"
            >
              <Shield class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">管理后台</h1>
              <p class="text-sm text-gray-500 dark:text-gray-400">管理用户和内容</p>
            </div>
          </div>
          <button
            class="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            :disabled="isRefreshing"
            @click="fetchUsers(true)"
          >
            <RefreshCw :size="18" :class="{ 'animate-spin': isRefreshing }" />
            <span class="text-sm font-medium hidden sm:inline">刷新</span>
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="py-20 text-center">
        <Loader2 class="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <p class="text-gray-500 dark:text-gray-400">加载中...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="py-20 text-center bg-white dark:bg-gray-900 rounded-3xl">
        <AlertCircle class="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">加载失败</h2>
        <p class="text-gray-500 dark:text-gray-400 text-sm mb-6">{{ error }}</p>
        <button
          class="px-5 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors cursor-pointer"
          @click="fetchUsers()"
        >
          重试
        </button>
      </div>

      <!-- Dashboard Content -->
      <div v-else class="space-y-6">
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Total Users -->
          <div class="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm dark:shadow-gray-950/50">
            <div class="flex items-center gap-4">
              <div
                class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0"
              >
                <Users class="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {{ stats.totalUsers }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">用户总数</p>
              </div>
            </div>
          </div>

          <!-- Total Posts -->
          <div class="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm dark:shadow-gray-950/50">
            <div class="flex items-center gap-4">
              <div
                class="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center shrink-0"
              >
                <FileText class="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {{ stats.totalPosts }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">帖子总数</p>
              </div>
            </div>
          </div>

          <!-- Admin Count -->
          <div class="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm dark:shadow-gray-950/50">
            <div class="flex items-center gap-4">
              <div
                class="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center shrink-0"
              >
                <Shield class="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {{ stats.adminCount }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400">管理员</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Admin Tips -->
        <div
          class="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4"
        >
          <p class="text-sm text-amber-800 dark:text-amber-200">
            <strong>管理员提示：</strong>
            您可以在任意帖子的详情页面进行编辑或删除操作。点击用户名可查看其个人主页。
          </p>
        </div>

        <!-- Users Table -->
        <div class="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm dark:shadow-gray-950/50">
          <h2 class="font-bold text-gray-900 dark:text-gray-100 mb-4">用户列表</h2>

          <div class="overflow-x-auto -mx-6 px-6">
            <table class="w-full min-w-[500px]">
              <thead>
                <tr
                  class="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800"
                >
                  <th class="pb-3 font-medium">用户</th>
                  <th class="pb-3 font-medium">帖子</th>
                  <th class="pb-3 font-medium">角色</th>
                  <th class="pb-3 font-medium">注册时间</th>
                  <th class="pb-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
                <tr
                  v-for="user in allUsers"
                  :key="user.id"
                  class="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td class="py-3">
                    <div class="flex items-center gap-3">
                      <div
                        class="w-9 h-9 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0"
                      >
                        <img
                          :src="
                            user.avatar_url ||
                            `https://api.dicebear.com/9.x/micah/svg?seed=${user.id}`
                          "
                          :alt="user.username"
                          class="w-full h-full object-cover"
                        />
                      </div>
                      <div class="min-w-0">
                        <p
                          class="font-medium text-gray-900 dark:text-gray-100 truncate cursor-pointer hover:underline"
                          @click="viewProfile(user.username)"
                        >
                          @{{ user.username }}
                        </p>
                        <p
                          v-if="user.bio"
                          class="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]"
                        >
                          {{ user.bio }}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td class="py-3">
                    <span class="text-gray-600 dark:text-gray-400">{{ user.post_count }}</span>
                  </td>
                  <td class="py-3">
                    <span
                      v-if="user.is_admin"
                      class="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full"
                    >
                      <Shield :size="10" />
                      管理员
                    </span>
                    <span
                      v-else
                      class="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full"
                    >
                      用户
                    </span>
                  </td>
                  <td class="py-3 text-gray-500 dark:text-gray-400 text-sm">
                    {{ formatDate(user.joined_at) }}
                  </td>
                  <td class="py-3 text-right">
                    <button
                      class="inline-flex items-center gap-1 px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer text-sm"
                      @click="viewProfile(user.username)"
                    >
                      <ExternalLink :size="14" />
                      <span>查看</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="allUsers.length === 0" class="py-8 text-center">
            <p class="text-gray-400 dark:text-gray-500">暂无用户</p>
          </div>
        </div>

        <!-- Version Info -->
        <div class="text-center text-xs text-gray-400 dark:text-gray-500 py-4">
          Pulse Admin v{{ APP_VERSION }}
        </div>
      </div>
    </div>
  </MainLayout>
</template>
