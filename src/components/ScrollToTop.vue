<script setup lang="ts">
// 浮动操作按钮组件
// 桌面端：返回顶部按钮
// 移动端：+ 按钮用于发帖，长按返回顶部

import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowUp, Plus } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'

// ========== Props ==========
const props = withDefaults(
  defineProps<{
    // 显示按钮的滚动阈值（像素）
    threshold?: number
    // 按钮位置
    position?: 'left' | 'right'
  }>(),
  {
    threshold: 400,
    position: 'right',
  }
)

const router = useRouter()
const authStore = useAuthStore()

// ========== 状态 ==========
const isVisible = ref(false)
const isScrolling = ref(false)
const isMobile = ref(false)
const longPressTimer = ref<ReturnType<typeof globalThis.setTimeout> | null>(null)
const isLongPress = ref(false)
const showTooltip = ref(false)

// ========== 计算属性 ==========
const isLoggedIn = computed(() => authStore.isLoggedIn)

// ========== 方法 ==========

/**
 * 检测是否为移动端
 */
function checkMobile() {
  isMobile.value = globalThis.window.innerWidth < 1024 // lg breakpoint
}

/**
 * 处理滚动事件
 */
function handleScroll() {
  isVisible.value = globalThis.window.scrollY > props.threshold
}

/**
 * 滚动到顶部
 */
function scrollToTop() {
  if (isScrolling.value) return

  isScrolling.value = true
  showTooltip.value = false

  globalThis.window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })

  // 等待滚动完成后重置状态
  const checkScrollEnd = () => {
    if (globalThis.window.scrollY === 0) {
      isScrolling.value = false
    } else {
      globalThis.requestAnimationFrame(checkScrollEnd)
    }
  }

  globalThis.requestAnimationFrame(checkScrollEnd)

  // 超时保护，防止无限等待
  globalThis.setTimeout(() => {
    isScrolling.value = false
  }, 1000)
}

/**
 * 前往发帖页面
 */
function goToNewPost() {
  if (isLoggedIn.value) {
    router.push('/new')
  } else {
    router.push('/login')
  }
}

/**
 * 处理点击事件
 * 移动端：短按发帖
 * 桌面端：短按返回顶部
 */
function handleClick() {
  if (isLongPress.value) {
    isLongPress.value = false
    return
  }

  if (isMobile.value) {
    goToNewPost()
  } else {
    scrollToTop()
  }
}

/**
 * 开始长按（移动端用于返回顶部）
 */
function handleTouchStart() {
  if (!isMobile.value) return

  longPressTimer.value = globalThis.setTimeout(() => {
    isLongPress.value = true
    scrollToTop()
    // 触觉反馈（如果支持）
    if ('vibrate' in globalThis.navigator) {
      globalThis.navigator.vibrate(50)
    }
  }, 500) // 500ms 触发长按
}

/**
 * 取消长按
 */
function handleTouchEnd() {
  if (longPressTimer.value) {
    globalThis.clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

/**
 * 鼠标悬停显示提示
 */
function handleMouseEnter() {
  if (isMobile.value) {
    showTooltip.value = true
  }
}

function handleMouseLeave() {
  showTooltip.value = false
}

// ========== 生命周期 ==========

onMounted(() => {
  // 初始检查
  checkMobile()
  handleScroll()

  // 添加滚动监听（使用 passive 提升性能）
  globalThis.window.addEventListener('scroll', handleScroll, { passive: true })
  globalThis.window.addEventListener('resize', checkMobile, { passive: true })
})

onUnmounted(() => {
  globalThis.window.removeEventListener('scroll', handleScroll)
  globalThis.window.removeEventListener('resize', checkMobile)
  if (longPressTimer.value) {
    globalThis.clearTimeout(longPressTimer.value)
  }
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-4 scale-90"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 translate-y-4 scale-90"
  >
    <div
      v-show="isVisible"
      :class="[
        'fixed z-50',
        position === 'right' ? 'right-6' : 'left-6',
        // 移动端需要考虑安全区域
        'bottom-[calc(1.5rem+env(safe-area-inset-bottom))]',
      ]"
    >
      <!-- 移动端提示气泡 -->
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="showTooltip && isMobile"
          class="absolute bottom-full mb-2 right-0 px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium rounded-lg whitespace-nowrap shadow-lg"
        >
          长按返回顶部
          <div
            class="absolute top-full right-4 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"
          />
        </div>
      </Transition>

      <!-- FAB 按钮 -->
      <button
        :class="[
          'p-3.5 rounded-full',
          // 移动端使用主题色，桌面端使用中性色
          isMobile
            ? 'bg-emerald-500 dark:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 dark:shadow-emerald-600/30'
            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 shadow-lg dark:shadow-gray-950/50 border border-gray-200 dark:border-gray-700',
          // 悬停效果
          isMobile
            ? 'hover:bg-emerald-600 dark:hover:bg-emerald-500'
            : 'hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100',
          'hover:shadow-xl hover:scale-110',
          'active:scale-95',
          'transition-all duration-200',
          'cursor-pointer',
          'focus:outline-none focus:ring-2',
          isMobile
            ? 'focus:ring-emerald-300 dark:focus:ring-emerald-700'
            : 'focus:ring-gray-300 dark:focus:ring-gray-600',
        ]"
        :disabled="isScrolling"
        :aria-label="isMobile ? '发布新动态' : '返回顶部'"
        :title="isMobile ? '点击发帖，长按返回顶部' : '返回顶部'"
        @click="handleClick"
        @touchstart.passive="handleTouchStart"
        @touchend="handleTouchEnd"
        @touchcancel="handleTouchEnd"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
      >
        <!-- 移动端显示 + 号 -->
        <Plus
          v-if="isMobile"
          :size="24"
          :class="['transition-transform duration-200', isScrolling ? 'rotate-180' : '']"
        />
        <!-- 桌面端显示箭头 -->
        <ArrowUp
          v-else
          :size="22"
          :class="['transition-transform duration-200', isScrolling ? 'animate-bounce' : '']"
        />
      </button>
    </div>
  </Transition>
</template>
