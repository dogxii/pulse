<script setup lang="ts">
// 图片灯箱组件
// 全屏查看图片，支持键盘操作和手势关闭

import { onMounted, onUnmounted, ref, watch } from 'vue'
import { X, ChevronLeft, ChevronRight } from 'lucide-vue-next'

// ========== Props ==========
const props = defineProps<{
  // 图片列表
  images: string[]
  // 当前显示的图片索引
  currentIndex: number
  // 是否显示
  visible: boolean
}>()

// ========== Emits ==========
const emit = defineEmits<{
  // 关闭灯箱
  close: []
  // 切换图片
  change: [index: number]
}>()

// ========== 状态 ==========
const imageLoaded = ref(false)
const touchStartX = ref(0)
const touchStartY = ref(0)

// ========== 方法 ==========

/**
 * 关闭灯箱
 */
function handleClose() {
  emit('close')
}

/**
 * 上一张图片
 */
function handlePrev() {
  if (props.currentIndex > 0) {
    imageLoaded.value = false
    emit('change', props.currentIndex - 1)
  }
}

/**
 * 下一张图片
 */
function handleNext() {
  if (props.currentIndex < props.images.length - 1) {
    imageLoaded.value = false
    emit('change', props.currentIndex + 1)
  }
}

/**
 * 点击背景关闭
 */
function handleBackdropClick(event: globalThis.MouseEvent) {
  if (event.target === event.currentTarget) {
    handleClose()
  }
}

/**
 * 键盘事件处理
 */
function handleKeydown(event: globalThis.KeyboardEvent) {
  if (!props.visible) return

  switch (event.key) {
    case 'Escape':
      handleClose()
      break
    case 'ArrowLeft':
      handlePrev()
      break
    case 'ArrowRight':
      handleNext()
      break
  }
}

/**
 * 图片加载完成
 */
function handleImageLoad() {
  imageLoaded.value = true
}

/**
 * 触摸开始
 */
function handleTouchStart(event: globalThis.TouchEvent) {
  const touch = event.touches[0]
  if (touch) {
    touchStartX.value = touch.clientX
    touchStartY.value = touch.clientY
  }
}

/**
 * 触摸结束（滑动切换图片）
 */
function handleTouchEnd(event: globalThis.TouchEvent) {
  const touch = event.changedTouches[0]
  if (!touch) return

  const deltaX = touch.clientX - touchStartX.value
  const deltaY = touch.clientY - touchStartY.value

  // 只有水平滑动大于垂直滑动才响应
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
    if (deltaX > 0) {
      handlePrev()
    } else {
      handleNext()
    }
  }
}

/**
 * 禁止滚动
 */
function preventScroll() {
  globalThis.document.body.style.overflow = 'hidden'
}

/**
 * 恢复滚动
 */
function restoreScroll() {
  globalThis.document.body.style.overflow = ''
}

// ========== 生命周期 ==========

// 监听 visible 变化
watch(
  () => props.visible,
  visible => {
    if (visible) {
      preventScroll()
      imageLoaded.value = false
    } else {
      restoreScroll()
    }
  }
)

// 监听 currentIndex 变化，重置加载状态
watch(
  () => props.currentIndex,
  () => {
    imageLoaded.value = false
  }
)

onMounted(() => {
  globalThis.window.addEventListener('keydown', handleKeydown)
  if (props.visible) {
    preventScroll()
  }
})

onUnmounted(() => {
  globalThis.window.removeEventListener('keydown', handleKeydown)
  restoreScroll()
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        class="fixed inset-0 z-9999 flex items-center justify-center bg-black/90 backdrop-blur-sm"
        @click="handleBackdropClick"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
      >
        <!-- 关闭按钮 -->
        <button
          class="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10 cursor-pointer"
          @click="handleClose"
        >
          <X :size="24" />
        </button>

        <!-- 上一张按钮 -->
        <button
          v-if="images.length > 1 && currentIndex > 0"
          class="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10 cursor-pointer hidden sm:block"
          @click.stop="handlePrev"
        >
          <ChevronLeft :size="28" />
        </button>

        <!-- 下一张按钮 -->
        <button
          v-if="images.length > 1 && currentIndex < images.length - 1"
          class="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10 cursor-pointer hidden sm:block"
          @click.stop="handleNext"
        >
          <ChevronRight :size="28" />
        </button>

        <!-- 图片容器 -->
        <div class="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
          <!-- 加载指示器 -->
          <div v-if="!imageLoaded" class="absolute inset-0 flex items-center justify-center">
            <div
              class="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin"
            />
          </div>

          <!-- 图片 -->
          <img
            :src="images[currentIndex]"
            :alt="`图片 ${currentIndex + 1}`"
            class="max-w-full max-h-[90vh] object-contain select-none transition-opacity duration-200"
            :class="imageLoaded ? 'opacity-100' : 'opacity-0'"
            draggable="false"
            @load="handleImageLoad"
            @click.stop
          />
        </div>

        <!-- 图片计数器 -->
        <div
          v-if="images.length > 1"
          class="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium"
        >
          {{ currentIndex + 1 }} / {{ images.length }}
        </div>

        <!-- 移动端滑动提示（首次显示） -->
        <div
          v-if="images.length > 1"
          class="absolute bottom-16 left-1/2 -translate-x-1/2 text-white/50 text-xs sm:hidden"
        >
          左右滑动切换图片
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
