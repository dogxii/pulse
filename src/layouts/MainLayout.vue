<script setup lang="ts">
// 主布局组件
// 包含左侧用户卡片、中间主内容区、右侧社区墙

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Sun, Moon, Monitor, User as UserIcon, LogIn } from 'lucide-vue-next'
import UserCard from '../components/UserCard.vue'
import UserWall from '../components/UserWall.vue'
import type { User, Post } from '../types'

// ========== Props ==========
const props = withDefaults(
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

const router = useRouter()

// ========== 移动端菜单状态 ==========
const showMobileMenu = ref(false)
const menuRef = ref<HTMLDivElement | null>(null)

// ========== 主题状态 ==========
type ThemeMode = 'auto' | 'light' | 'dark'
const themeMode = ref<ThemeMode>('auto')

// 从 localStorage 恢复主题设置
onMounted(() => {
  const savedTheme = localStorage.getItem('pulse_theme') as ThemeMode | null
  if (savedTheme && ['auto', 'light', 'dark'].includes(savedTheme)) {
    themeMode.value = savedTheme
  }
  applyTheme(themeMode.value)

  // 添加点击外部关闭菜单的监听
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 点击外部关闭菜单
function handleClickOutside(event: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    showMobileMenu.value = false
  }
}

// 应用主题
function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  if (mode === 'dark') {
    root.classList.add('dark')
  } else if (mode === 'light') {
    root.classList.remove('dark')
  } else {
    // auto: 根据系统偏好
    if (globalThis.window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }
}

// 监听主题变化
watch(themeMode, newMode => {
  localStorage.setItem('pulse_theme', newMode)
  applyTheme(newMode)
})

// 切换到下一个主题
function cycleTheme() {
  const modes: ThemeMode[] = ['auto', 'light', 'dark']
  const currentIndex = modes.indexOf(themeMode.value)
  themeMode.value = modes[(currentIndex + 1) % modes.length] || 'auto'
}

// 获取主题显示文本
const themeDisplayText = computed(() => {
  switch (themeMode.value) {
    case 'light':
      return '浅色'
    case 'dark':
      return '深色'
    default:
      return '自动'
  }
})

// 获取主题图标
const ThemeIcon = computed(() => {
  switch (themeMode.value) {
    case 'light':
      return Sun
    case 'dark':
      return Moon
    default:
      return Monitor
  }
})

// ========== 事件处理 ==========

// 点击 Logo 返回首页
function handleLogoClick() {
  router.push('/')
}

// 点击头像切换菜单
function toggleMobileMenu(event: MouseEvent) {
  event.stopPropagation()
  showMobileMenu.value = !showMobileMenu.value
}

// 前往个人主页
function goToProfile() {
  if (props.currentUser?.username) {
    router.push(`/u/${props.currentUser.username}`)
  }
  showMobileMenu.value = false
}

// 前往登录页
function goToLogin() {
  router.push('/login')
  showMobileMenu.value = false
}

// 切换主题并关闭菜单
function handleThemeChange() {
  cycleTheme()
}
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
            <!-- Logo - 点击返回首页 -->
            <div
              class="font-bold text-xl tracking-tight text-gray-800 dark:text-gray-100 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              @click="handleLogoClick"
            >
              Pulse
            </div>

            <!-- 移动端头像 - 点击显示菜单 -->
            <div ref="menuRef" class="relative">
              <!-- 头像按钮 -->
              <div
                v-if="!isLoading"
                class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm cursor-pointer transition-transform hover:scale-105"
                @click="toggleMobileMenu"
              >
                <img
                  :src="currentUser?.avatar_url || './guest.svg'"
                  alt="Avatar"
                  class="w-full h-full object-cover"
                />
              </div>
              <!-- 加载状态 -->
              <div
                v-else
                class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"
              />

              <!-- 下拉菜单 -->
              <Transition
                enter-active-class="transition duration-150 ease-out"
                enter-from-class="opacity-0 scale-95 -translate-y-1"
                enter-to-class="opacity-100 scale-100 translate-y-0"
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100 scale-100 translate-y-0"
                leave-to-class="opacity-0 scale-95 -translate-y-1"
              >
                <div
                  v-if="showMobileMenu"
                  class="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-900 rounded-2xl shadow-xl dark:shadow-gray-950/50 border border-gray-100 dark:border-gray-800 overflow-hidden z-50"
                >
                  <!-- 用户信息（已登录） -->
                  <div
                    v-if="currentUser"
                    class="px-4 py-3 border-b border-gray-100 dark:border-gray-800"
                  >
                    <p class="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                      @{{ currentUser.username }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ currentUser.post_count }} 条动态
                    </p>
                  </div>

                  <!-- 菜单项 -->
                  <div class="py-1">
                    <!-- 个人主页（已登录） -->
                    <button
                      v-if="currentUser"
                      class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      @click="goToProfile"
                    >
                      <UserIcon :size="18" class="text-gray-400 dark:text-gray-500" />
                      <span class="text-sm">个人主页</span>
                    </button>

                    <!-- 登录（未登录） -->
                    <button
                      v-else
                      class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      @click="goToLogin"
                    >
                      <LogIn :size="18" class="text-gray-400 dark:text-gray-500" />
                      <span class="text-sm">登录</span>
                    </button>

                    <!-- 切换主题 -->
                    <button
                      class="w-full flex items-center justify-between px-4 py-2.5 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      @click="handleThemeChange"
                    >
                      <div class="flex items-center gap-3">
                        <component
                          :is="ThemeIcon"
                          :size="18"
                          class="text-gray-400 dark:text-gray-500"
                        />
                        <span class="text-sm">主题</span>
                      </div>
                      <span class="text-xs text-gray-400 dark:text-gray-500">
                        {{ themeDisplayText }}
                      </span>
                    </button>
                  </div>
                </div>
              </Transition>
            </div>
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
