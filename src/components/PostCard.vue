<script setup lang="ts">
// 帖子卡片组件
// 显示单个帖子的内容、图片、点赞和评论操作

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Heart, MessageCircle, Trash2, Edit3 } from 'lucide-vue-next'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import MarkdownRenderer from './MarkdownRenderer.vue'
import type { Post } from '../types'

// ========== Props ==========
const props = defineProps<{
  // 帖子数据
  post: Post
  // 当前登录用户 ID
  currentUserId?: string | null
}>()

// ========== Emits ==========
const emit = defineEmits<{
  // 点赞事件
  like: [postId: string]
  // 删除事件
  delete: [postId: string]
}>()

const router = useRouter()

// ========== 计算属性 ==========

/**
 * 格式化发布时间（相对时间）
 */
const formattedDate = computed(() => {
  try {
    return formatDistanceToNow(new Date(props.post.created_at), {
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
  if (!props.currentUserId) return false
  return props.post.likes.includes(props.currentUserId)
})

/**
 * 当前用户是否为帖子作者
 */
const isAuthor = computed(() => {
  if (!props.currentUserId) return false
  return props.post.user_id === props.currentUserId
})

// ========== 方法 ==========

/**
 * 点击评论，跳转到帖子详情
 */
const handleCommentClick = () => {
  router.push(`/post/${props.post.id}`)
}

/**
 * 点击点赞
 */
const handleLikeClick = () => {
  emit('like', props.post.id)
}

/**
 * 点击删除（需确认）
 */
const handleDeleteClick = () => {
  if (globalThis.window.confirm('确定要删除这条动态吗？')) {
    emit('delete', props.post.id)
  }
}

/**
 * 点击编辑，跳转到编辑页面
 */
const handleEditClick = () => {
  router.push(`/post/${props.post.id}/edit`)
}

/**
 * 点击头像或用户名，跳转到用户主页
 */
const navigateToProfile = () => {
  if (props.post.user?.username) {
    router.push(`/u/${props.post.user.username}`)
  }
}
</script>

<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-gray-950/50 hover:shadow-md dark:hover:shadow-gray-950/70 transition-shadow duration-300 mb-6"
  >
    <!-- 头部：用户信息和时间 -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <!-- 头像 -->
        <div
          class="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer"
          @click="navigateToProfile"
        >
          <img
            :src="
              post.user?.avatar_url || `https://api.dicebear.com/9.x/micah/svg?seed=${post.user_id}`
            "
            :alt="post.user?.username"
            class="w-full h-full object-cover"
          />
        </div>
        <!-- 用户名和时间 -->
        <div class="flex flex-col">
          <span
            class="font-bold text-gray-900 dark:text-gray-100 text-sm cursor-pointer hover:underline"
            @click="navigateToProfile"
          >
            {{ post.user?.username || '未知用户' }}
          </span>
          <span class="text-xs text-gray-400 dark:text-gray-500">{{ formattedDate }}</span>
        </div>
      </div>

      <!-- 作者操作按钮 -->
      <div v-if="isAuthor" class="flex items-center gap-2">
        <button
          class="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          title="编辑"
          @click="handleEditClick"
        >
          <Edit3 :size="16" />
        </button>
        <button
          class="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
          title="删除"
          @click="handleDeleteClick"
        >
          <Trash2 :size="16" />
        </button>
      </div>
    </div>

    <!-- 内容区（支持 Markdown 渲染） -->
    <div class="mb-6">
      <MarkdownRenderer
        :content="post.content"
        class="text-gray-800 dark:text-gray-200 text-lg font-medium"
      />

      <!-- 图片（如果有） -->
      <div
        v-if="post.images && post.images.length > 0"
        class="mt-4 grid gap-2"
        :class="post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'"
      >
        <img
          v-for="(img, index) in post.images"
          :key="index"
          :src="img"
          alt="帖子图片"
          class="rounded-2xl w-full h-auto object-cover max-h-96 bg-gray-50 dark:bg-gray-800"
        />
      </div>
    </div>

    <!-- 底部：操作按钮 -->
    <div class="flex items-center gap-6 text-gray-400 dark:text-gray-500">
      <!-- 点赞 -->
      <button
        class="flex items-center gap-2 group transition-colors focus:outline-none bg-transparent p-0 border-none shadow-none cursor-pointer"
        :class="
          isLiked
            ? 'text-rose-500 dark:text-rose-400'
            : 'hover:text-rose-500 dark:hover:text-rose-400'
        "
        @click="handleLikeClick"
      >
        <Heart
          :size="20"
          :class="{ 'fill-current': isLiked }"
          class="group-hover:scale-110 transition-transform"
        />
        <span class="text-sm font-medium">{{ post.likes.length }}</span>
      </button>

      <!-- 评论 -->
      <button
        class="flex items-center gap-2 group transition-colors hover:text-blue-500 dark:hover:text-blue-400 focus:outline-none bg-transparent p-0 border-none shadow-none cursor-pointer"
        @click="handleCommentClick"
      >
        <MessageCircle :size="20" class="group-hover:scale-110 transition-transform" />
        <span class="text-sm font-medium">{{ post.comments_count }}</span>
      </button>
    </div>
  </div>
</template>
