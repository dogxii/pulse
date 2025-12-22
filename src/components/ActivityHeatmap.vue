<script setup lang="ts">
// 活动热力图组件
// 显示最近 30 天的发帖活动热力图，类似 GitHub 贡献图

import { computed } from 'vue'
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
  if (count === 0) return 'bg-gray-100'
  if (count === 1) return 'bg-emerald-200'
  if (count === 2) return 'bg-emerald-300'
  if (count <= 4) return 'bg-emerald-400'
  return 'bg-emerald-500'
}

/**
 * 格式化日期用于显示提示
 * @param date - 日期对象
 */
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * 最近 30 天的总帖子数
 */
const totalPosts = computed(() => {
  return heatmapData.value.reduce((sum, day) => sum + day.count, 0)
})
</script>

<template>
  <div class="bg-white rounded-2xl p-4 shadow-sm mb-4">
    <!-- 标题 -->
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-gray-400 text-xs font-bold uppercase tracking-widest">活动</h3>
      <span class="text-xs text-gray-400"> 近 30 天 {{ totalPosts }} 条动态 </span>
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
            'hover:ring-2 hover:ring-gray-300 hover:ring-offset-1',
          ]"
          :title="`${formatDate(day.date)}: ${day.count} 条动态`"
        />
      </div>
    </div>

    <!-- 图例 -->
    <div class="flex items-center justify-end gap-1 mt-3">
      <span class="text-xs text-gray-400 mr-1">少</span>
      <div class="w-3 h-3 rounded-sm bg-gray-100" title="0 条" />
      <div class="w-3 h-3 rounded-sm bg-emerald-200" title="1 条" />
      <div class="w-3 h-3 rounded-sm bg-emerald-300" title="2 条" />
      <div class="w-3 h-3 rounded-sm bg-emerald-400" title="3-4 条" />
      <div class="w-3 h-3 rounded-sm bg-emerald-500" title="5+ 条" />
      <span class="text-xs text-gray-400 ml-1">多</span>
    </div>
  </div>
</template>
