<script setup lang="ts">
// 返回顶部按钮组件
// 当页面向下滚动一定距离后显示，点击后平滑滚动到顶部

import { onMounted, onUnmounted, ref } from 'vue'
import { ArrowUp } from 'lucide-vue-next'

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

// ========== 状态 ==========
const isVisible = ref(false)
const isScrolling = ref(false)

// ========== 方法 ==========

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

// ========== 生命周期 ==========

onMounted(() => {
  // 初始检查
  handleScroll()

  // 添加滚动监听（使用 passive 提升性能）
  globalThis.window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  globalThis.window.removeEventListener('scroll', handleScroll)
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
    <button
      v-show="isVisible"
      :class="[
        'fixed bottom-6 z-50 p-3 rounded-full',
        'bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-950/50',
        'border border-gray-200 dark:border-gray-700',
        'text-gray-600 dark:text-gray-400',
        'hover:bg-gray-50 dark:hover:bg-gray-700',
        'hover:text-gray-900 dark:hover:text-gray-100',
        'hover:shadow-xl dark:hover:shadow-gray-950/70',
        'hover:scale-110',
        'active:scale-95',
        'transition-all duration-200',
        'cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600',
        position === 'right' ? 'right-6' : 'left-6',
      ]"
      :disabled="isScrolling"
      aria-label="返回顶部"
      title="返回顶部"
      @click="scrollToTop"
    >
      <ArrowUp
        :size="22"
        :class="['transition-transform duration-200', isScrolling ? 'animate-bounce' : '']"
      />
    </button>
  </Transition>
</template>
