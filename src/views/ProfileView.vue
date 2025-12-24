<script setup lang="ts">
// 用户主页视图
// 显示用户资料、帖子列表，支持编辑个人简介
// 使用 posts store 实现乐观更新

import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Loader2, AlertCircle, Calendar, Edit3, Check, X } from 'lucide-vue-next'
import { formatDistanceToNow, format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import MainLayout from '../layouts/MainLayout.vue'
import PostCard from '../components/PostCard.vue'
import ScrollToTop from '../components/ScrollToTop.vue'
import { useAuthStore } from '../stores/auth'
import { usePostsStore } from '../stores/posts'
import { users as usersApi, posts as postsApi } from '../services/api'
import type { User, Post } from '../types'

// ========== Router & Store ==========
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const postsStore = usePostsStore()

// ========== 状态 ==========

// 当前查看的用户
const user = ref<User | null>(null)
// 用户的帖子列表
const userPosts = ref<Post[]>([])
// 所有帖子（用于热力图）
const allPosts = ref<Post[]>([])
// 所有用户列表
const allUsers = ref<User[]>([])
// 用户加载状态
const isLoadingUser = ref(true)
// 帖子加载状态
const isLoadingPosts = ref(true)
// 错误信息
const error = ref<string | null>(null)

// 编辑模式
const isEditing = ref(false)
const editBio = ref('')
const isSaving = ref(false)

// ========== 计算属性 ==========

/**
 * 用户名（从路由参数获取）
 */
const username = computed(() => route.params.username as string)

/**
 * 是否为自己的主页
 */
const isOwnProfile = computed(() => authStore.currentUser?.username === username.value)

/**
 * 格式化加入日期
 */
const joinedDate = computed(() => {
  if (!user.value?.joined_at) return ''
  try {
    return format(new Date(user.value.joined_at), 'yyyy年M月', { locale: zhCN })
  } catch {
    return ''
  }
})

/**
 * 最后活跃时间文本
 */
const lastActiveText = computed(() => {
  if (!user.value?.last_post_at) return '暂无动态'
  try {
    return `最近活跃 ${formatDistanceToNow(new Date(user.value.last_post_at), { addSuffix: true, locale: zhCN })}`
  } catch {
    return '暂无动态'
  }
})

// ========== 方法 ==========

/**
 * 获取用户信息
 */
async function fetchUser() {
  isLoadingUser.value = true
  error.value = null

  try {
    user.value = await usersApi.get(username.value)
  } catch (e) {
    globalThis.console.error('获取用户信息失败:', e)
    error.value = e instanceof Error ? e.message : '用户不存在'
    user.value = null
  } finally {
    isLoadingUser.value = false
  }
}

/**
 * 获取用户的帖子和所有帖子
 */
async function fetchPosts() {
  if (!user.value) return

  isLoadingPosts.value = true

  try {
    // 获取所有帖子（用于热力图和筛选当前用户帖子）
    const response = await postsApi.list({ limit: 100 })
    allPosts.value = response.items
    // 筛选当前用户的帖子
    userPosts.value = response.items.filter(p => p.user_id === user.value?.id)
  } catch (e) {
    globalThis.console.error('获取帖子失败:', e)
  } finally {
    isLoadingPosts.value = false
  }
}

/**
 * 获取所有用户列表
 */
async function fetchAllUsers() {
  try {
    allUsers.value = await usersApi.list()
  } catch (e) {
    globalThis.console.error('获取用户列表失败:', e)
  }
}

/**
 * 开始编辑个人简介
 */
function startEditing() {
  editBio.value = user.value?.bio || ''
  isEditing.value = true
}

/**
 * 取消编辑
 */
function cancelEditing() {
  isEditing.value = false
  editBio.value = ''
}

/**
 * 保存个人简介
 */
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
    globalThis.console.error('保存个人简介失败:', e)
  } finally {
    isSaving.value = false
  }
}

/**
 * 处理帖子点赞（乐观更新）
 */
async function handleLikeToggle(postId: string) {
  if (!authStore.isLoggedIn || !authStore.userId) {
    router.push('/login')
    return
  }

  const userId = authStore.userId

  // 找到帖子
  const postIndex = userPosts.value.findIndex(p => p.id === postId)
  const post = userPosts.value[postIndex]
  if (!post) return

  // 保存原始状态用于回滚
  const originalLikes = [...post.likes]
  const wasLiked = post.likes.includes(userId)

  // 乐观更新
  if (wasLiked) {
    post.likes = post.likes.filter(id => id !== userId)
  } else {
    post.likes = [...post.likes, userId]
  }

  // 同时更新所有帖子列表
  const allPostIndex = allPosts.value.findIndex(p => p.id === postId)
  const allPost = allPosts.value[allPostIndex]
  if (allPost) {
    allPost.likes = post.likes
  }

  try {
    const result = await postsApi.toggleLike(postId)
    // 用服务器返回的实际数据更新
    post.likes = result.likes
    if (allPost) {
      allPost.likes = result.likes
    }
    // 同步更新 store 缓存
    postsStore.updatePostLikes(postId, result.likes)
  } catch (e) {
    // 回滚
    globalThis.console.error('点赞切换失败:', e)
    post.likes = originalLikes
    if (allPost) {
      allPost.likes = originalLikes
    }
  }
}

/**
 * 处理帖子删除
 */
async function handlePostDelete(postId: string) {
  try {
    await postsApi.delete(postId)
    // 从用户帖子列表移除
    userPosts.value = userPosts.value.filter(p => p.id !== postId)
    // 从所有帖子列表移除
    allPosts.value = allPosts.value.filter(p => p.id !== postId)
    // 同步更新 store
    postsStore.deletePost(postId).catch(() => {})

    // 更新帖子数
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
    globalThis.console.error('删除帖子失败:', e)
  }
}

// ========== 监听器 ==========

// 监听用户名变化，重新加载数据
watch(
  () => route.params.username,
  async newUsername => {
    if (newUsername) {
      await fetchUser()
      if (user.value) {
        await fetchPosts()
      }
    }
  }
)

// ========== 生命周期 ==========

onMounted(async () => {
  // 初始化认证
  if (!authStore.isInitialized) {
    await authStore.initialize()
  }

  // 并行获取用户信息和用户列表
  await Promise.all([fetchUser(), fetchAllUsers()])

  // 获取帖子
  if (user.value) {
    await fetchPosts()
  }
})
</script>

<template>
  <MainLayout
    :current-user="authStore.currentUser"
    :all-users="allUsers"
    :posts="allPosts"
    :is-loading="authStore.isLoading && !authStore.isInitialized"
  >
    <!-- 加载状态 -->
    <div v-if="isLoadingUser" class="py-20 text-center">
      <Loader2 class="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500 mx-auto mb-4" />
      <p class="text-gray-500 dark:text-gray-400">正在加载...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="py-20 text-center bg-white dark:bg-gray-900 rounded-3xl">
      <AlertCircle class="w-12 h-12 text-red-400 mx-auto mb-4" />
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">用户不存在</h2>
      <p class="text-gray-500 dark:text-gray-400 text-sm mb-6">{{ error }}</p>
      <router-link
        to="/"
        class="px-5 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
      >
        返回首页
      </router-link>
    </div>

    <!-- 用户主页内容 -->
    <div v-else-if="user">
      <!-- 用户资料卡片 -->
      <div
        class="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-gray-950/50 mb-8"
      >
        <div class="flex flex-col md:flex-row md:items-start gap-6">
          <!-- 头像 -->
          <div
            class="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 mx-auto md:mx-0"
          >
            <img
              :src="user.avatar_url || `https://api.dicebear.com/9.x/micah/svg?seed=${user.id}`"
              :alt="user.username"
              class="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          <!-- 用户信息 -->
          <div class="flex-1 text-center md:text-left">
            <div class="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-3">
              <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                @{{ user.username }}
              </h1>
              <div class="flex items-center justify-center md:justify-start gap-2">
                <span
                  v-if="user.is_admin"
                  class="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full"
                >
                  管理员
                </span>
              </div>
            </div>

            <!-- 个人简介 -->
            <div class="mb-4">
              <!-- 编辑模式 -->
              <div v-if="isEditing" class="max-w-md mx-auto md:mx-0">
                <textarea
                  v-model="editBio"
                  placeholder="写点什么介绍一下自己..."
                  rows="3"
                  maxlength="500"
                  class="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 resize-none"
                />
                <div class="flex items-center justify-between mt-2">
                  <span class="text-xs text-gray-400 dark:text-gray-500"
                    >{{ editBio.length }}/500</span
                  >
                  <div class="flex gap-2">
                    <button
                      class="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                      :disabled="isSaving"
                      @click="cancelEditing"
                    >
                      <X :size="18" />
                    </button>
                    <button
                      class="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors cursor-pointer"
                      :disabled="isSaving"
                      @click="saveBio"
                    >
                      <Loader2 v-if="isSaving" :size="18" class="animate-spin" />
                      <Check v-else :size="18" />
                    </button>
                  </div>
                </div>
              </div>
              <!-- 显示模式 -->
              <div v-else class="flex items-start gap-2 justify-center md:justify-start">
                <p
                  class="text-gray-600 dark:text-gray-300"
                  :class="{ 'text-gray-400 dark:text-gray-500 italic': !user.bio }"
                >
                  {{ user.bio || '暂无简介' }}
                </p>
                <button
                  v-if="isOwnProfile"
                  class="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                  title="编辑简介"
                  @click="startEditing"
                >
                  <Edit3 :size="14" />
                </button>
              </div>
            </div>

            <!-- 统计信息 -->
            <div class="flex items-center justify-center md:justify-start gap-6 text-sm">
              <div>
                <span class="font-bold text-gray-900 dark:text-gray-100">{{
                  user.post_count
                }}</span>
                <span class="text-gray-500 dark:text-gray-400 ml-1">动态</span>
              </div>
              <div class="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <Calendar :size="14" />
                <span>{{ joinedDate }} 加入</span>
              </div>
            </div>

            <!-- 最近活跃 -->
            <p class="mt-2 text-xs text-gray-400 dark:text-gray-500">{{ lastActiveText }}</p>
          </div>
        </div>
      </div>

      <!-- 帖子区域 -->
      <div class="mb-6">
        <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">动态</h2>
      </div>

      <!-- 帖子加载中 -->
      <div v-if="isLoadingPosts" class="py-12 text-center">
        <Loader2 class="w-6 h-6 animate-spin text-gray-400 dark:text-gray-500 mx-auto mb-2" />
        <p class="text-gray-400 dark:text-gray-500 text-sm">加载动态中...</p>
      </div>

      <!-- 无帖子 -->
      <div
        v-else-if="userPosts.length === 0"
        class="py-12 text-center bg-white dark:bg-gray-900 rounded-3xl"
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
        <p class="text-gray-500 dark:text-gray-400">
          {{ isOwnProfile ? '你还没有发布任何动态' : '暂无动态' }}
        </p>
        <router-link
          v-if="isOwnProfile"
          to="/new"
          class="inline-block mt-4 px-5 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
        >
          发布第一条动态
        </router-link>
      </div>

      <!-- 帖子列表 -->
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

    <!-- 返回顶部按钮 -->
    <ScrollToTop :threshold="400" position="right" />
  </MainLayout>
</template>
