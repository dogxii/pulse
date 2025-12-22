<script setup lang="ts">
// 活动热力图组件
// 显示最近 30 天的发帖活动热力图，类似 GitHub 贡献图

import { computed, ref } from 'vue'
import type { Post } from '../types'

// ========== Props ==========
const props = defineProps<{
  posts: Post[]
}>()

// ========== 计算属性 ==========

/**
 * 生成最近 30 天的热力图数据
 */
const heatmapData = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days: { date: Date; count: number; dateStr: string }[] = []

  // 创建 30 天数组（从 29 天前到今天）
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    days.push({
      date,
      count: 0,
      dateStr: date.toISOString().split('T')[0] || '',
    })
  }

  // 统计每天的帖子数
  props.posts.forEach(post => {
    try {
      const postDate = new Date(post.created_at)
      postDate.setHours(0, 0, 0, 0)
      const postDateStr = postDate.toISOString().split('T')[0]

      const dayData = days.find(d => d.dateStr === postDateStr)
      if (dayData) {
        dayData.count++
      }
    } catch {
      // 日期无效，跳过
    }
  })

  return days
})

/**
 * 将数据排列成 3 行 x 10 列的网格（按列排列，类似 GitHub）
 */
const grid = computed(() => {
  const rows: (typeof heatmapData.value)[] = [[], [], []]

  heatmapData.value.forEach((day, index) => {
    const rowIndex = index % 3
    rows[rowIndex]?.push(day)
  })

  return rows
})

/**
 * 根据帖子数量获取颜色强度等级 (0-4)
 * @param count - 帖子数量
 */
const getIntensityClass = (count: number): string => {
  if (count === 0) return 'bg-gray-100 dark:bg-gray-800'
  if (count === 1) return 'bg-emerald-200 dark:bg-emerald-900'
  if (count === 2) return 'bg-emerald-300 dark:bg-emerald-700'
  if (count <= 4) return 'bg-emerald-400 dark:bg-emerald-600'
  return 'bg-emerald-500 dark:bg-emerald-500'
}

/**
 * 最近 30 天的总帖子数
 */
const totalPosts = computed(() => {
  return heatmapData.value.reduce((sum, day) => sum + day.count, 0)
})

// ========== 悬浮提示状态 ==========
const hoveredDay = ref<{ date: Date; count: number; dateStr: string } | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })

function handleMouseEnter(event: MouseEvent, day: { date: Date; count: number; dateStr: string }) {
  hoveredDay.value = day
  updateTooltipPosition(event)
}

function handleMouseMove(event: MouseEvent) {
  if (hoveredDay.value) {
    updateTooltipPosition(event)
  }
}

function handleMouseLeave() {
  hoveredDay.value = null
}

function updateTooltipPosition(event: MouseEvent) {
  tooltipPosition.value = {
    x: event.clientX,
    y: event.clientY - 10,
  }
}

/**
 * 格式化完整日期用于 tooltip 显示
 */
const formatFullDate = (date: Date): string => {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}
</script>

<template>
  <div class="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm dark:shadow-gray-950/50 mb-4">
    <!-- 标题 -->
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest">
        活动
      </h3>
      <span class="text-xs text-gray-400 dark:text-gray-500">
        近 30 天 {{ totalPosts }} 条动态
      </span>
    </div>

    <!-- 热力图网格 (3 行 x 10 列) -->
    <div class="flex flex-col gap-1">
      <div v-for="(row, rowIndex) in grid" :key="rowIndex" class="flex gap-1">
        <div
          v-for="(day, colIndex) in row"
          :key="`${rowIndex}-${colIndex}`"
          :class="[
            'w-full aspect-square rounded-sm transition-all duration-200 cursor-default',
            getIntensityClass(day.count),
            'hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600 hover:ring-offset-1 dark:hover:ring-offset-gray-900',
          ]"
          @mouseenter="handleMouseEnter($event, day)"
          @mousemove="handleMouseMove"
          @mouseleave="handleMouseLeave"
        />
      </div>
    </div>

    <!-- 悬浮提示框 -->
    <Teleport to="body">
      <Transition name="tooltip">
        <div
          v-if="hoveredDay"
          class="fixed z-50 px-3 py-2 text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg shadow-lg pointer-events-none whitespace-nowrap"
          :style="{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)',
          }"
        >
          <div class="font-medium">{{ formatFullDate(hoveredDay.date) }}</div>
          <div class="text-gray-300 dark:text-gray-600 mt-0.5">{{ hoveredDay.count }} 条动态</div>
          <!-- 小三角 -->
          <div
            class="absolute left-1/2 -translate-x-1/2 -bottom-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"
          />
        </div>
      </Transition>
    </Teleport>

    <!-- 图例 -->
    <div class="flex items-center justify-end gap-1 mt-3">
      <span class="text-xs text-gray-400 dark:text-gray-500 mr-1">少</span>
      <div class="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" title="0 条" />
      <div class="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900" title="1 条" />
      <div class="w-3 h-3 rounded-sm bg-emerald-300 dark:bg-emerald-700" title="2 条" />
      <div class="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-600" title="3-4 条" />
      <div class="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-500" title="5+ 条" />
      <span class="text-xs text-gray-400 dark:text-gray-500 ml-1">多</span>
    </div>
  </div>
</template>

<style scoped>
/* Tooltip 动画 */
.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.15s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
}
</style>
