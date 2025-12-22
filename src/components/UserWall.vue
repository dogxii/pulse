<script setup lang="ts">
// 用户墙组件
// 显示社区用户头像网格和活动热力图

import { useRouter } from 'vue-router'
import ActivityHeatmap from './ActivityHeatmap.vue'
import type { User, Post } from '../types'

// ========== Props ==========
defineProps<{
  // 用户列表
  users: User[]
  // 帖子列表（用于热力图）
  posts?: Post[]
}>()

const router = useRouter()

// ========== 方法 ==========

/**
 * 检查用户今天是否发过帖子
 * @param lastPostDate - 最后发帖日期
 */
const hasPostedToday = (lastPostDate: string) => {
  if (!lastPostDate) return false
  try {
    const today = new Date().toISOString().split('T')[0]
    const postDate = new Date(lastPostDate).toISOString().split('T')[0]
    return today === postDate
  } catch {
    return false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- 活动热力图 -->
    <ActivityHeatmap :posts="posts || []" />

    <!-- 社区用户区域 -->
    <div class="bg-white rounded-3xl p-6 shadow-sm">
      <h3 class="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4 pl-1">社区</h3>

      <!-- 用户头像网格 -->
      <div class="grid grid-cols-4 gap-3">
        <div
          v-for="user in users"
          :key="user.id"
          class="relative group cursor-pointer"
          @click="router.push(`/u/${user.username}`)"
        >
          <!-- 头像 -->
          <div
            class="aspect-square rounded-2xl overflow-hidden bg-gray-100 transition-transform duration-200 group-hover:scale-105 ring-2 ring-transparent group-hover:ring-gray-100"
          >
            <img
              :src="user.avatar_url"
              :alt="user.username"
              class="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          <!-- 今日活跃绿点 -->
          <div
            v-if="hasPostedToday(user.last_post_at)"
            class="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white shadow-sm"
            title="今日活跃"
          />

          <!-- 悬浮提示 -->
          <div
            class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-xl flex flex-col items-center gap-0.5"
          >
            <span class="font-bold">{{ user.username }}</span>
            <span class="text-gray-400 font-normal">{{ user.post_count }} 条动态</span>
            <!-- 箭头 -->
            <div
              class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"
            />
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="users.length === 0" class="text-center py-8 text-gray-400 text-sm">暂无用户</div>
    </div>
  </div>
</template>
