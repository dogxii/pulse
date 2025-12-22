<script setup lang="ts">
// 帖子详情视图
// 显示单个帖子的完整内容、评论和互动操作

import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Loader2, AlertCircle, Heart, MessageCircle, Send, Edit3 } from 'lucide-vue-next'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useAuthStore } from '../stores/auth'
import { posts as postsApi, comments as commentsApi } from '../services/api'
import MarkdownRenderer from '../components/MarkdownRenderer.vue'
import type { Post, Comment, User } from '../types'

// ========== Router & Store ==========
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// ========== 状态 ==========

// 帖子数据
const post = ref<Post | null>(null)
// 评论列表
const comments = ref<Comment[]>([])
// 加载状态
const isLoading = ref(true)
// 评论加载状态
const isLoadingComments = ref(false)
// 错误信息
const error = ref<string | null>(null)
// 新评论内容
const newComment = ref('')
// 评论提交状态
const isSubmittingComment = ref(false)
// 评论错误
const commentError = ref<string | null>(null)

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

/**
 * 评论数量
 */
const commentsCount = computed(() => comments.value.length)

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
 * 获取评论列表
 */
async function fetchComments() {
  isLoadingComments.value = true

  try {
    comments.value = await commentsApi.list(postId.value)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('获取评论失败:', e)
  } finally {
    isLoadingComments.value = false
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
 * 格式化评论时间
 */
function formatCommentDate(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), {
      addSuffix: true,
      locale: zhCN,
    })
  } catch {
    return ''
  }
}

/**
 * 提交评论
 */
async function handleCommentSubmit() {
  if (!newComment.value.trim() || !authStore.isLoggedIn) return

  isSubmittingComment.value = true
  commentError.value = null

  try {
    const comment = await commentsApi.create(postId.value, newComment.value.trim())
    // 添加到评论列表开头
    comments.value.unshift(comment)
    // 更新帖子评论数
    if (post.value) {
      post.value.comments_count = commentsCount.value
    }
    // 清空输入框
    newComment.value = ''
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('发送评论失败:', e)
    commentError.value = e instanceof Error ? e.message : '发送评论失败'
  } finally {
    isSubmittingComment.value = false
  }
}

/**
 * 删除评论
 */
async function handleDeleteComment(commentId: string) {
  if (!globalThis.window.confirm('确定要删除这条评论吗？')) return

  try {
    await commentsApi.delete(postId.value, commentId)
    // 从列表中移除
    comments.value = comments.value.filter(c => c.id !== commentId)
    // 更新帖子评论数
    if (post.value) {
      post.value.comments_count = commentsCount.value
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('删除评论失败:', e)
  }
}

/**
 * 检查是否为评论作者或帖子作者
 */
function canDeleteComment(comment: Comment): boolean {
  if (!authStore.userId) return false
  // 评论作者或帖子作者可以删除
  return comment.user_id === authStore.userId || post.value?.user_id === authStore.userId
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
function navigateToProfile(user?: User | null) {
  if (user?.username) {
    router.push(`/u/${user.username}`)
  }
}

/**
 * 滚动到评论区
 */
function scrollToComments() {
  const commentsSection = document.getElementById('comments-section')
  if (commentsSection) {
    commentsSection.scrollIntoView({ behavior: 'smooth' })
  }
}

// ========== 生命周期 ==========

onMounted(async () => {
  // 初始化认证
  if (!authStore.isInitialized) {
    await authStore.initialize()
  }
  // 并行获取帖子和评论
  await Promise.all([fetchPost(), fetchComments()])
})
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 dark:bg-[#0f0f0f] transition-colors duration-300">
    <div class="max-w-2xl mx-auto px-4 py-8">
      <!-- 头部 -->
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-4">
          <button
            class="p-2 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors cursor-pointer"
            @click="goBack"
          >
            <ArrowLeft :size="20" class="text-gray-600 dark:text-gray-400" />
          </button>
          <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">动态详情</h1>
        </div>

        <!-- 编辑按钮（仅作者可见） -->
        <button
          v-if="isAuthor && post"
          class="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
          @click="handleEdit"
        >
          <Edit3 :size="18" />
          <span class="text-sm font-medium">编辑</span>
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoading" class="py-20 text-center">
        <Loader2 class="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <p class="text-gray-500 dark:text-gray-400">正在加载...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="py-20 text-center bg-white dark:bg-gray-900 rounded-3xl">
        <AlertCircle class="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">加载失败</h2>
        <p class="text-gray-500 dark:text-gray-400 text-sm mb-6">{{ error }}</p>
        <button
          class="px-5 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors cursor-pointer"
          @click="fetchPost"
        >
          重试
        </button>
      </div>

      <!-- 帖子内容 -->
      <div v-else-if="post" class="space-y-6">
        <!-- 主要帖子卡片 -->
        <div
          class="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-gray-950/50"
        >
          <!-- 用户信息 -->
          <div class="flex items-center gap-3 mb-6">
            <div
              class="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer"
              @click="navigateToProfile(post.user)"
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
                class="font-bold text-gray-900 dark:text-gray-100 cursor-pointer hover:underline"
                @click="navigateToProfile(post.user)"
              >
                {{ post.user?.username || '未知用户' }}
              </span>
              <span class="text-sm text-gray-400 dark:text-gray-500">{{ formattedDate }}</span>
            </div>
          </div>

          <!-- 内容区（Markdown 渲染） -->
          <div class="mb-6">
            <MarkdownRenderer
              :content="post.content"
              class="text-gray-800 dark:text-gray-200 text-xl"
            />

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
                class="rounded-2xl w-full h-auto object-cover max-h-[500px] bg-gray-50 dark:bg-gray-800"
              />
            </div>
          </div>

          <!-- 操作按钮（合并统计信息和操作） -->
          <div class="flex items-center gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <!-- 点赞 -->
            <button
              class="flex items-center gap-2 group transition-colors focus:outline-none cursor-pointer"
              :class="
                isLiked
                  ? 'text-rose-500 dark:text-rose-400'
                  : 'text-gray-400 dark:text-gray-500 hover:text-rose-500 dark:hover:text-rose-400'
              "
              @click="handleLikeToggle"
            >
              <Heart
                :size="22"
                :class="{ 'fill-current': isLiked }"
                class="group-hover:scale-110 transition-transform"
              />
              <span class="font-medium">{{ post.likes.length }}</span>
            </button>

            <!-- 评论 -->
            <button
              class="flex items-center gap-2 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer"
              @click="scrollToComments"
            >
              <MessageCircle :size="22" />
              <span class="font-medium">{{ commentsCount }}</span>
            </button>
          </div>
        </div>

        <!-- 评论区 -->
        <div
          id="comments-section"
          class="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm dark:shadow-gray-950/50"
        >
          <h2 class="font-bold text-gray-900 dark:text-gray-100 mb-6">
            评论
            <span v-if="commentsCount > 0" class="text-gray-400 dark:text-gray-500 font-normal">
              ({{ commentsCount }})
            </span>
          </h2>

          <!-- 评论输入框（已登录） -->
          <div v-if="authStore.isLoggedIn" class="mb-6">
            <!-- 评论错误提示 -->
            <div
              v-if="commentError"
              class="mb-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-sm"
            >
              {{ commentError }}
            </div>

            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0"
              >
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
                  class="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  :disabled="isSubmittingComment"
                  @keyup.enter="handleCommentSubmit"
                />
                <button
                  class="p-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
          <div v-else class="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
            <p class="text-gray-500 dark:text-gray-400 text-sm mb-3">登录后即可发表评论</p>
            <router-link
              to="/login"
              class="inline-block px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              登录
            </router-link>
          </div>

          <!-- 评论加载状态 -->
          <div v-if="isLoadingComments" class="py-8 text-center">
            <Loader2 class="w-6 h-6 animate-spin text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p class="text-gray-400 dark:text-gray-500 text-sm">加载评论中...</p>
          </div>

          <!-- 评论列表 -->
          <div v-else-if="comments.length > 0" class="space-y-4">
            <div
              v-for="comment in comments"
              :key="comment.id"
              class="flex gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl group"
            >
              <!-- 评论者头像 -->
              <div
                class="w-9 h-9 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 cursor-pointer"
                @click="navigateToProfile(comment.user)"
              >
                <img
                  :src="
                    comment.user?.avatar_url ||
                    `https://api.dicebear.com/9.x/micah/svg?seed=${comment.user_id}`
                  "
                  :alt="comment.user?.username"
                  class="w-full h-full object-cover"
                />
              </div>

              <!-- 评论内容 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <div class="flex items-center gap-2">
                    <span
                      class="font-semibold text-gray-900 dark:text-gray-100 text-sm cursor-pointer hover:underline"
                      @click="navigateToProfile(comment.user)"
                    >
                      {{ comment.user?.username || '未知用户' }}
                    </span>
                    <span class="text-xs text-gray-400 dark:text-gray-500">
                      {{ formatCommentDate(comment.created_at) }}
                    </span>
                  </div>

                  <!-- 删除按钮（评论作者或帖子作者可见） -->
                  <button
                    v-if="canDeleteComment(comment)"
                    class="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    @click="handleDeleteComment(comment.id)"
                  >
                    删除
                  </button>
                </div>
                <p class="text-gray-700 dark:text-gray-300 text-sm break-words">
                  {{ comment.content }}
                </p>
              </div>
            </div>
          </div>

          <!-- 暂无评论 -->
          <div v-else class="py-8 text-center">
            <MessageCircle class="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p class="text-gray-400 dark:text-gray-500 text-sm">暂无评论，快来抢沙发吧！</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
