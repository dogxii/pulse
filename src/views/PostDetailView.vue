<script setup lang="ts">
// 帖子详情视图
// 显示单个帖子的完整内容、评论和互动操作

import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Loader2, AlertCircle, Heart, MessageCircle, Send, Edit3 } from 'lucide-vue-next'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useAuthStore } from '../stores/auth'
import { posts as postsApi } from '../services/api'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import type { Post } from '../types'

// ========== Router & Store ==========
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// ========== 状态 ==========

// 帖子数据
const post = ref<Post | null>(null)
// 加载状态
const isLoading = ref(true)
// 错误信息
const error = ref<string | null>(null)
// 新评论内容
const newComment = ref('')
// 评论提交状态
const isSubmittingComment = ref(false)

// ========== 计算属性 ==========

/**
 * 帖子 ID（从路由参数获取）
 */
const postId = computed(() => route.params.id as string)

/**
 * 格式化发布时间（相对时间，中文）
 */
const formattedDate = computed(() => {
  if (!post.value) return ''
  try {
    return formatDistanceToNow(new Date(post.value.created_at), {
      addSuffix: true,
      locale: zhCN,
    })
  } catch {
    return ''
  }
})

/**
 * 当前用户是否已点赞
 */
const isLiked = computed(() => {
  if (!authStore.userId || !post.value) return false
  return post.value.likes.includes(authStore.userId)
})

/**
 * 当前用户是否为帖子作者
 */
const isAuthor = computed(() => {
  if (!authStore.userId || !post.value) return false
  return post.value.user_id === authStore.userId
})

// ========== 方法 ==========

/**
 * 获取帖子详情
 */
async function fetchPost() {
  isLoading.value = true
  error.value = null

  try {
    post.value = await postsApi.get(postId.value)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('获取帖子失败:', e)
    error.value = e instanceof Error ? e.message : '加载帖子失败'
  } finally {
    isLoading.value = false
  }
}

/**
 * 切换点赞状态
 */
async function handleLikeToggle() {
  if (!authStore.isLoggedIn || !post.value) {
    router.push('/login')
    return
  }

  try {
    const result = await postsApi.toggleLike(post.value.id)
    post.value.likes = result.likes
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('点赞切换失败:', e)
  }
}

/**
 * 提交评论（暂未实现评论 API）
 */
async function handleCommentSubmit() {
  if (!newComment.value.trim() || !authStore.isLoggedIn) return

  isSubmittingComment.value = true
  // TODO: 实现评论 API
  // eslint-disable-next-line no-console
  console.log('评论已提交:', newComment.value)

  // 模拟 API 调用
  await new Promise(resolve => globalThis.setTimeout(resolve, 500))
  newComment.value = ''
  isSubmittingComment.value = false
}

/**
 * 跳转到编辑页面
 */
function handleEdit() {
  if (post.value) {
    router.push(`/post/${post.value.id}/edit`)
  }
}

/**
 * 返回上一页
 */
function goBack() {
  router.back()
}

/**
 * 跳转到用户主页
 */
function navigateToProfile() {
  if (post.value?.user?.username) {
    router.push(`/u/${post.value.user.username}`)
  }
}

// ========== 生命周期 ==========

onMounted(async () => {
  // 初始化认证
  if (!authStore.isInitialized) {
    await authStore.initialize()
  }
  // 获取帖子
  await fetchPost()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50/50">
    <div class="max-w-2xl mx-auto px-4 py-8">
      <!-- 头部 -->
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-4">
          <button
            class="p-2 rounded-xl hover:bg-white transition-colors cursor-pointer"
            @click="goBack"
          >
            <ArrowLeft :size="20" class="text-gray-600" />
          </button>
          <h1 class="text-xl font-bold text-gray-900">动态详情</h1>
        </div>

        <!-- 编辑按钮（仅作者可见） -->
        <button
          v-if="isAuthor && post"
          class="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-xl transition-colors cursor-pointer"
          @click="handleEdit"
        >
          <Edit3 :size="18" />
          <span class="text-sm font-medium">编辑</span>
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoading" class="py-20 text-center">
        <Loader2 class="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
        <p class="text-gray-500">正在加载...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="py-20 text-center bg-white rounded-3xl">
        <AlertCircle class="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 class="text-lg font-semibold text-gray-900 mb-2">加载失败</h2>
        <p class="text-gray-500 text-sm mb-6">{{ error }}</p>
        <button
          class="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors cursor-pointer"
          @click="fetchPost"
        >
          重试
        </button>
      </div>

      <!-- 帖子内容 -->
      <div v-else-if="post" class="space-y-6">
        <!-- 主要帖子卡片 -->
        <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm">
          <!-- 用户信息 -->
          <div class="flex items-center gap-3 mb-6">
            <div
              class="w-12 h-12 rounded-full overflow-hidden bg-gray-100 cursor-pointer"
              @click="navigateToProfile"
            >
              <img
                :src="
                  post.user?.avatar_url ||
                  `https://api.dicebear.com/9.x/micah/svg?seed=${post.user_id}`
                "
                :alt="post.user?.username"
                class="w-full h-full object-cover"
              />
            </div>
            <div class="flex flex-col">
              <span
                class="font-bold text-gray-900 cursor-pointer hover:underline"
                @click="navigateToProfile"
              >
                {{ post.user?.username || '未知用户' }}
              </span>
              <span class="text-sm text-gray-400">{{ formattedDate }}</span>
            </div>
          </div>

          <!-- 内容区（Markdown 渲染） -->
          <div class="mb-6">
            <MarkdownRenderer :content="post.content" class="text-gray-800 text-xl" />

            <!-- 图片 -->
            <div
              v-if="post.images && post.images.length > 0"
              class="mt-6 grid gap-2"
              :class="post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'"
            >
              <img
                v-for="(img, index) in post.images"
                :key="index"
                :src="img"
                alt="帖子图片"
                class="rounded-2xl w-full h-auto object-cover max-h-[500px] bg-gray-50"
              />
            </div>
          </div>

          <!-- 统计信息 -->
          <div class="flex items-center gap-6 py-4 border-y border-gray-100 text-gray-500">
            <div class="flex items-center gap-2">
              <Heart :size="18" />
              <span class="text-sm font-medium">{{ post.likes.length }} 赞</span>
            </div>
            <div class="flex items-center gap-2">
              <MessageCircle :size="18" />
              <span class="text-sm font-medium">{{ post.comments_count }} 评论</span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex items-center gap-6 pt-4">
            <!-- 点赞 -->
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
              <span class="font-medium">{{ isLiked ? '已赞' : '点赞' }}</span>
            </button>

            <!-- 评论 -->
            <button
              class="flex items-center gap-2 text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
            >
              <MessageCircle :size="22" />
              <span class="font-medium">评论</span>
            </button>
          </div>
        </div>

        <!-- 评论输入框（已登录） -->
        <div v-if="authStore.isLoggedIn" class="bg-white rounded-3xl p-6 shadow-sm">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
              <img
                :src="
                  authStore.currentUser?.avatar_url ||
                  `https://api.dicebear.com/9.x/micah/svg?seed=${authStore.userId}`
                "
                :alt="authStore.currentUser?.username"
                class="w-full h-full object-cover"
              />
            </div>
            <div class="flex-1 flex gap-2">
              <input
                v-model="newComment"
                type="text"
                placeholder="写下你的评论..."
                class="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-200 text-sm"
                :disabled="isSubmittingComment"
                @keyup.enter="handleCommentSubmit"
              />
              <button
                class="p-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                :disabled="!newComment.trim() || isSubmittingComment"
                @click="handleCommentSubmit"
              >
                <Loader2 v-if="isSubmittingComment" :size="18" class="animate-spin" />
                <Send v-else :size="18" />
              </button>
            </div>
          </div>
        </div>

        <!-- 登录提示（未登录） -->
        <div v-else class="bg-white rounded-3xl p-6 shadow-sm text-center">
          <p class="text-gray-500 text-sm mb-4">登录后即可点赞和评论</p>
          <router-link
            to="/login"
            class="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors"
          >
            登录
          </router-link>
        </div>

        <!-- 评论区 -->
        <div class="bg-white rounded-3xl p-6 shadow-sm">
          <h2 class="font-bold text-gray-900 mb-4">评论</h2>

          <!-- 暂无评论 -->
          <div v-if="post.comments_count === 0" class="py-8 text-center">
            <MessageCircle class="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p class="text-gray-400 text-sm">暂无评论，快来抢沙发吧！</p>
          </div>

          <!-- 评论占位符（待实现） -->
          <div v-else class="py-8 text-center">
            <p class="text-gray-400 text-sm">评论功能即将上线...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
