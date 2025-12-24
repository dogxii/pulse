<script setup lang="ts">
// 根组件
// 提供全局的图片灯箱功能和路由出口

import { ref, onMounted, onUnmounted, provide } from 'vue'
import { RouterView } from 'vue-router'
import ImageLightbox from './components/ImageLightbox.vue'

// ========== 全局图片灯箱状态 ==========
const lightboxVisible = ref(false)
const lightboxImages = ref<string[]>([])
const lightboxIndex = ref(0)

/**
 * 打开全局图片灯箱
 */
function openGlobalLightbox(images: string[], index: number = 0) {
  lightboxImages.value = images
  lightboxIndex.value = index
  lightboxVisible.value = true
}

/**
 * 关闭全局图片灯箱
 */
function closeGlobalLightbox() {
  lightboxVisible.value = false
}

/**
 * 切换图片索引
 */
function changeLightboxIndex(index: number) {
  lightboxIndex.value = index
}

// 提供全局灯箱方法给子组件
provide('openGlobalLightbox', openGlobalLightbox)

// ========== 全局图片点击处理 ==========

/**
 * 处理 Markdown 渲染的图片点击
 * 监听 document 上的图片点击事件
 */
function handleGlobalImageClick(event: globalThis.MouseEvent) {
  const target = event.target as globalThis.HTMLElement

  // 检查是否点击了 markdown-content 内的图片
  if (
    target.tagName === 'IMG' &&
    target.closest('.markdown-content') &&
    target.classList.contains('cursor-zoom-in')
  ) {
    event.preventDefault()
    event.stopPropagation()

    const imgSrc = (target as globalThis.HTMLImageElement).src
    if (imgSrc) {
      openGlobalLightbox([imgSrc], 0)
    }
  }
}

onMounted(() => {
  // 添加全局图片点击监听
  globalThis.document.addEventListener('click', handleGlobalImageClick)
})

onUnmounted(() => {
  // 移除全局图片点击监听
  globalThis.document.removeEventListener('click', handleGlobalImageClick)
})
</script>

<template>
  <RouterView />

  <!-- 全局图片灯箱 -->
  <ImageLightbox
    :images="lightboxImages"
    :current-index="lightboxIndex"
    :visible="lightboxVisible"
    @close="closeGlobalLightbox"
    @change="changeLightboxIndex"
  />
</template>
