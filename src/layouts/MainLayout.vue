<script setup lang="ts">
// 主布局组件
// 包含左侧用户卡片、中间主内容区、右侧社区墙

import UserCard from '../components/UserCard.vue'
import UserWall from '../components/UserWall.vue'
import type { User, Post } from '../types'

// ========== Props ==========
withDefaults(
  defineProps<{
    // 当前登录用户
    currentUser?: User | null
    // 所有用户列表
    allUsers?: User[]
    // 帖子列表（用于热力图）
    posts?: Post[]
    // 是否正在加载用户信息
    isLoading?: boolean
  }>(),
  {
    currentUser: null,
    allUsers: () => [],
    posts: () => [],
    isLoading: false,
  }
)
</script>

<template>
  <div
    class="min-h-screen bg-gray-50/50 dark:bg-[#0f0f0f] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 py-8">
        <!-- 左侧边栏（用户资料卡片） -->
        <aside class="hidden lg:block lg:col-span-3">
          <div class="sticky top-8 space-y-6">
            <UserCard :user="currentUser" :is-loading="isLoading" />

            <div
              class="text-xs text-gray-400 dark:text-gray-500 text-center px-4 leading-relaxed opacity-60"
            >
              <p>&copy; {{ new Date().getFullYear() }} Pulse.</p>
            </div>
          </div>
        </aside>

        <!-- 主内容区（信息流） -->
        <main class="lg:col-span-6 min-h-[80vh]">
          <!-- 移动端顶栏 -->
          <div
            class="lg:hidden mb-6 flex items-center justify-between bg-white dark:bg-[#1a1a1a] p-4 rounded-3xl shadow-sm dark:shadow-none dark:border dark:border-gray-800"
          >
            <div class="font-bold text-xl tracking-tight text-gray-800 dark:text-gray-100">
              Pulse
            </div>
            <!-- 移动端头像显示登录状态 -->
            <div
              v-if="!isLoading"
              class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm"
            >
              <img
                :src="currentUser?.avatar_url || './guest.svg'"
                alt="Avatar"
                class="w-full h-full object-cover"
              />
            </div>
            <!-- 移动端加载状态 -->
            <div v-else class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>

          <!-- 插槽：页面主内容 -->
          <slot />
        </main>

        <!-- 右侧边栏（社区墙 + 热力图） -->
        <aside class="hidden lg:block lg:col-span-3">
          <div class="sticky top-8">
            <UserWall :users="allUsers" :posts="posts" />
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>
