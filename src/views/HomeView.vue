<script setup lang="ts">
// 首页视图
// 显示最新帖子列表、用户列表和活动热力图
// 使用 posts store 实现乐观更新

import { onMounted, ref, computed } from 'vue'
import MainLayout from '../layouts/MainLayout.vue'
import PostCard from '../components/PostCard.vue'
import ScrollToTop from '../components/ScrollToTop.vue'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { usePostsStore } from '../stores/posts'
import { users as usersApi } from '../services/api'
import type { User } from '../types'

// ========== Store ==========
const authStore = useAuthStore()
const postsStore = usePostsStore()

// ========== 状态 ==========

// 用户列表
const allUsers = ref<User[]>([])
// 用户加载状态
const isLoadingUsers = ref(true)
// 用户加载错误
const usersError = ref<string | null>(null)

// ========== 计算属性 ==========

// 当前登录用户
const currentUser = computed(() => authStore.currentUser)
// 认证加载状态
const isAuthLoading = computed(() => authStore.isLoading && !authStore.isInitialized)
// 帖子列表
const posts = computed(() => postsStore.posts)
// 帖子加载状态
const isLoadingPosts = computed(() => postsStore.isLoading)
// 加载更多状态
const isLoadingMore = computed(() => postsStore.isLoadingMore)
// 是否有更多帖子
const hasMorePosts = computed(() => postsStore.hasMore)
// 帖子错误
const postsError = computed(() => postsStore.error)
// 整体加载状态
const isLoading = computed(() => isLoadingPosts.value || isLoadingUsers.value)
// 是否有错误
const hasError = computed(() => postsError.value || usersError.value)

// ========== 方法 ==========

/**
 * 获取用户列表
 */
async function fetchUsers() {
  isLoadingUsers.value = true
  usersError.value = null

  try {
    allUsers.value = await usersApi.list()
  } catch (error) {
    globalThis.console.error('获取用户列表失败:', error)
    usersError.value = error instanceof Error ? error.message : '加载用户失败'
  } finally {
    isLoadingUsers.value = false
  }
}

/**
 * 加载更多帖子
 */
async function loadMorePosts() {
  await postsStore.loadMore()
}

/**
 * 刷新所有数据
 */
async function refreshData() {
  await Promise.all([postsStore.refresh(), fetchUsers()])
}

/**
 * 处理帖子点赞切换（乐观更新）
 * @param postId - 帖子 ID
 */
async function handleLikeToggle(postId: string) {
  if (!authStore.isLoggedIn || !authStore.userId) {
    // 未登录，不处理
    return
  }

  try {
    // 使用 store 的乐观更新方法
    await postsStore.toggleLike(postId, authStore.userId)
  } catch (error) {
    // 错误已在 store 中处理并回滚
    globalThis.console.error('点赞切换失败:', error)
  }
}

/**
 * 处理帖子删除
 * @param postId - 帖子 ID
 */
async function handleDelete(postId: string) {
  if (!authStore.isLoggedIn) return

  try {
    await postsStore.deletePost(postId)
    // 更新用户帖子数
    if (authStore.currentUser) {
      authStore.updateUserLocally({
        post_count: Math.max(0, authStore.currentUser.post_count - 1),
      })
    }
  } catch (error) {
    globalThis.console.error('删除帖子失败:', error)
  }
}

// ========== 生命周期 ==========

onMounted(async () => {
  // 初始化认证（如果尚未初始化）
  if (!authStore.isInitialized) {
    await authStore.initialize()
  }

  // 并行获取数据
  // 如果缓存有效，则跳过帖子加载
  const fetchPromises: Promise<void>[] = [fetchUsers()]

  if (!postsStore.isCacheValid || postsStore.posts.length === 0) {
    fetchPromises.push(postsStore.fetchPosts())
  }

  await Promise.all(fetchPromises)
})
</script>

<template>
  <MainLayout
    :current-user="currentUser"
    :all-users="allUsers"
    :posts="posts"
    :is-loading="isAuthLoading"
  >
    <!-- 信息流标题 -->
    <div class="mb-8 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
        Latest Pulse
      </h1>

      <div class="flex items-center gap-3">
        <!-- 刷新按钮 -->
        <button
          :disabled="isLoading"
          class="p-2.5 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 cursor-pointer"
          title="刷新"
          @click="refreshData"
        >
          <RefreshCw :size="18" :class="{ 'animate-spin': isLoading }" />
        </button>

        <!-- 新建帖子按钮 -->
        <router-link
          v-if="authStore.isLoggedIn"
          to="/new"
          class="inline-block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-lg shadow-gray-200 dark:shadow-gray-950/30"
        >
          发布动态
        </router-link>
        <router-link
          v-else
          to="/login"
          class="inline-block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-lg shadow-gray-200 dark:shadow-gray-950/30"
        >
          登录
        </router-link>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading && posts.length === 0" class="py-20 text-center">
      <Loader2 class="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500 mx-auto mb-4" />
      <p class="text-gray-500 dark:text-gray-400">正在加载最新动态...</p>
    </div>

    <!-- 错误状态 -->
    <div
      v-else-if="hasError && posts.length === 0"
      class="py-20 text-center bg-white dark:bg-gray-900 rounded-3xl"
    >
      <AlertCircle class="w-12 h-12 text-red-400 mx-auto mb-4" />
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">加载失败</h2>
      <p class="text-gray-500 dark:text-gray-400 text-sm mb-6">
        {{ postsError || usersError }}
      </p>
      <button
        class="px-5 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors cursor-pointer"
        @click="refreshData"
      >
        重试
      </button>
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="posts.length === 0"
      class="py-20 text-center bg-white dark:bg-gray-900 rounded-3xl"
    >
      <div
        class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4"
      >
        <svg
          class="w-8 h-8 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">暂无动态</h2>
      <p class="text-gray-500 dark:text-gray-400 text-sm mb-6">成为第一个分享动态的人吧！</p>
      <router-link
        v-if="authStore.isLoggedIn"
        to="/new"
        class="inline-block px-5 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
      >
        发布第一条动态
      </router-link>
      <router-link
        v-else
        to="/login"
        class="inline-block px-5 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
      >
        登录后发布
      </router-link>
    </div>

    <!-- 帖子列表 -->
    <div v-else class="space-y-6">
      <PostCard
        v-for="post in posts"
        :key="post.id"
        :post="post"
        :current-user-id="authStore.userId"
        @like="handleLikeToggle"
        @delete="handleDelete"
      />

      <!-- 加载更多 -->
      <div v-if="hasMorePosts" class="py-6 text-center">
        <button
          :disabled="isLoadingMore"
          class="px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700 disabled:opacity-50 cursor-pointer"
          @click="loadMorePosts"
        >
          <Loader2 v-if="isLoadingMore" class="w-4 h-4 animate-spin inline mr-2" />
          {{ isLoadingMore ? '加载中...' : '加载更多' }}
        </button>
      </div>

      <!-- 已加载全部 -->
      <div v-else class="py-12 text-center">
        <p class="text-gray-400 dark:text-gray-500 text-sm">已经看完所有动态了！</p>
      </div>
    </div>

    <!-- 返回顶部按钮 -->
    <ScrollToTop :threshold="400" position="right" />
  </MainLayout>
</template>
