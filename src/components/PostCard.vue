<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Heart, MessageCircle, Trash2, Edit3 } from 'lucide-vue-next'
import { formatDistanceToNow } from 'date-fns'
import MarkdownRenderer from './MarkdownRenderer.vue'
import type { Post } from '../types'

const props = defineProps<{
  post: Post
  currentUserId?: string | null
}>()

const emit = defineEmits<{
  like: [postId: string]
  delete: [postId: string]
}>()

const router = useRouter()

const formattedDate = computed(() => {
  try {
    return formatDistanceToNow(new Date(props.post.created_at), { addSuffix: true })
  } catch {
    return ''
  }
})

// Check if current user has liked this post
const isLiked = computed(() => {
  if (!props.currentUserId) return false
  return props.post.likes.includes(props.currentUserId)
})

// Check if current user is the author
const isAuthor = computed(() => {
  if (!props.currentUserId) return false
  return props.post.user_id === props.currentUserId
})

const handleCommentClick = () => {
  router.push(`/post/${props.post.id}`)
}

const handleLikeClick = () => {
  emit('like', props.post.id)
}

const handleDeleteClick = () => {
  if (globalThis.window.confirm('Are you sure you want to delete this post?')) {
    emit('delete', props.post.id)
  }
}

const handleEditClick = () => {
  router.push(`/post/${props.post.id}/edit`)
}

const navigateToProfile = () => {
  if (props.post.user?.username) {
    router.push(`/u/${props.post.user.username}`)
  }
}
</script>

<template>
  <div
    class="bg-white rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow duration-300 mb-6"
  >
    <!-- Header: User Info & Time -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full overflow-hidden bg-gray-100 cursor-pointer"
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
        <div class="flex flex-col">
          <span
            class="font-bold text-gray-900 text-sm cursor-pointer hover:underline"
            @click="navigateToProfile"
          >
            {{ post.user?.username || 'Unknown User' }}
          </span>
          <span class="text-xs text-gray-400">{{ formattedDate }}</span>
        </div>
      </div>

      <!-- Author Actions -->
      <div v-if="isAuthor" class="flex items-center gap-2">
        <button
          @click="handleEditClick"
          class="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          title="Edit post"
        >
          <Edit3 :size="16" />
        </button>
        <button
          @click="handleDeleteClick"
          class="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
          title="Delete post"
        >
          <Trash2 :size="16" />
        </button>
      </div>
    </div>

    <!-- Content with Markdown Rendering -->
    <div class="mb-6">
      <MarkdownRenderer :content="post.content" class="text-gray-800 text-lg font-medium" />

      <!-- Images (if any) -->
      <div
        v-if="post.images && post.images.length > 0"
        class="mt-4 grid gap-2"
        :class="post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'"
      >
        <img
          v-for="(img, index) in post.images"
          :key="index"
          :src="img"
          alt="Post image"
          class="rounded-2xl w-full h-auto object-cover max-h-96 bg-gray-50"
        />
      </div>
    </div>

    <!-- Footer: Actions -->
    <div class="flex items-center gap-6 text-gray-400">
      <!-- Like -->
      <button
        class="flex items-center gap-2 group transition-colors focus:outline-none bg-transparent p-0 border-none shadow-none cursor-pointer"
        :class="isLiked ? 'text-rose-500' : 'hover:text-rose-500'"
        @click="handleLikeClick"
      >
        <Heart
          :size="20"
          :class="{ 'fill-current': isLiked }"
          class="group-hover:scale-110 transition-transform"
        />
        <span class="text-sm font-medium">{{ post.likes.length }}</span>
      </button>

      <!-- Comment -->
      <button
        class="flex items-center gap-2 group transition-colors hover:text-blue-500 focus:outline-none bg-transparent p-0 border-none shadow-none cursor-pointer"
        @click="handleCommentClick"
      >
        <MessageCircle :size="20" class="group-hover:scale-110 transition-transform" />
        <span class="text-sm font-medium">{{ post.comments_count }}</span>
      </button>
    </div>
  </div>
</template>
