<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Activity, Github, Sun, Moon, Monitor } from 'lucide-vue-next'
import type { User } from '../types'

// ========== Props ==========
const props = defineProps<{
  user?: User | null
  isLoading?: boolean
  todayPostCount?: number
}>()

const router = useRouter()

// ========== 常量 ==========
const APP_VERSION = '1.0.0'
const GITHUB_URL = 'https://github.com/dogxii/pulse'

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
})

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

// 切换主题
function cycleTheme() {
  const modes: ThemeMode[] = ['auto', 'light', 'dark']
  const currentIndex = modes.indexOf(themeMode.value)
  themeMode.value = modes[(currentIndex + 1) % modes.length] || 'auto'
  showToast()
}

// ========== 浮动提示状态 ==========
const showFloatingToast = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null

// 显示浮动提示
function showToast() {
  // 清除之前的定时器
  if (toastTimer) {
    clearTimeout(toastTimer)
  }
  showFloatingToast.value = true
  // 3秒后自动隐藏
  toastTimer = setTimeout(() => {
    showFloatingToast.value = false
  }, 3000)
}

// 获取主题显示文本
const themeDisplayText = computed(() => {
  switch (themeMode.value) {
    case 'light':
      return 'Light'
    case 'dark':
      return 'Dark'
    default:
      return 'Auto'
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

// ========== 计算属性 ==========
const displayUser = computed(() => {
  if (props.user) return props.user
  return {
    username: 'Guest',
    avatar_url: './guest.svg',
    bio: 'Sign in to share your pulse.',
    post_count: 0,
    is_admin: false,
  }
})

// ========== 事件处理 ==========

// 点击头像导航到首页
const handleAvatarClick = () => {
  router.push('/')
}

// 点击 Logo 切换主题并显示提示
const handleLogoClick = () => {
  cycleTheme()
}

// 打开 GitHub
const openGitHub = () => {
  globalThis.window.open(GITHUB_URL, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm relative flex flex-col items-center text-center transition-all duration-300 hover:shadow-md dark:shadow-gray-950/50"
  >
    <!-- Logo (右上角) - 点击切换主题 -->
    <div
      class="absolute top-6 right-6 text-gray-300 dark:text-gray-600 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer"
      title="切换主题"
      @click="handleLogoClick"
    >
      <Activity :size="20" />
    </div>

    <!-- 骨架屏加载状态 -->
    <template v-if="isLoading">
      <!-- 头像骨架 -->
      <div class="w-28 h-28 rounded-full mb-5 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <!-- 用户名骨架 -->
      <div class="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg mb-2 animate-pulse" />
      <!-- Bio 骨架 -->
      <div class="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      <!-- 按钮骨架 -->
      <div class="mt-6 w-full">
        <div class="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      </div>
    </template>

    <!-- 正常内容 -->
    <template v-else>
      <!-- 头像 - 点击返回首页 -->
      <div
        class="w-28 h-28 rounded-full overflow-hidden mb-5 bg-gray-50 dark:bg-gray-800 p-1 cursor-pointer transition-transform hover:scale-105"
        title="返回首页"
        @click="handleAvatarClick"
      >
        <img
          :src="displayUser.avatar_url"
          :alt="displayUser.username"
          class="w-full h-full object-cover rounded-full"
        />
      </div>

      <!-- 用户名 -->
      <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2 tracking-tight">
        {{ displayUser.username }}
      </h2>

      <!-- 个人简介 -->
      <p class="text-gray-500 dark:text-gray-400 text-sm leading-relaxed px-2">
        {{ displayUser.bio }}
      </p>

      <!-- 登录按钮 (未登录时显示) -->
      <div v-if="!user" class="mt-6 w-full">
        <a
          href="/api/auth/github"
          class="block w-full py-2 px-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
        >
          Login with GitHub
        </a>
      </div>

      <!-- 统计信息 (已登录时显示) -->
      <div v-else class="mt-6 pt-6 border-t border-gray-50 dark:border-gray-800 w-full">
        <div class="flex justify-center gap-8 mb-4">
          <div class="flex flex-col items-center">
            <span class="font-bold text-gray-900 dark:text-gray-100 text-lg">{{
              displayUser.post_count || 0
            }}</span>
            <span class="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wider"
              >Pulses</span
            >
          </div>
          <div class="flex flex-col items-center">
            <span class="font-bold text-gray-900 dark:text-gray-100 text-lg">{{
              props.todayPostCount || 0
            }}</span>
            <span class="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wider"
              >Today</span
            >
          </div>
        </div>
      </div>
    </template>

    <!-- 浮动提示框 (右上角) -->
    <Teleport to="body">
      <Transition name="toast">
        <div
          v-if="showFloatingToast"
          class="fixed top-4 right-4 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-gray-950/50 border border-gray-100 dark:border-gray-800 p-3 min-w-56 animate-toast-in"
        >
          <div class="flex items-center gap-3">
            <!-- 主题图标 -->
            <div
              class="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0"
            >
              <component :is="ThemeIcon" :size="18" class="text-gray-700 dark:text-gray-300" />
            </div>

            <!-- 信息 -->
            <div class="flex-1 min-w-0">
              <div class="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                当前版本: v{{ APP_VERSION }}
              </div>
              <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                主题: {{ themeDisplayText }}
              </div>
            </div>

            <!-- GitHub 按钮 -->
            <button
              class="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer flex-shrink-0"
              title="访问 GitHub"
              @click.stop="openGitHub"
            >
              <Github :size="18" />
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Toast 进入/离开动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Toast 弹入动画 */
@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-toast-in {
  animation: toast-in 0.3s ease-out;
}
</style>
