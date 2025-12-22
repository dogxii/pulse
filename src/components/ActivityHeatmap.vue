<script setup lang="ts">
import { computed } from 'vue'
import type { Post } from '../types'

const props = defineProps<{
  posts: Post[]
}>()

// Generate last 30 days data
const heatmapData = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days: { date: Date; count: number; dateStr: string }[] = []

  // Create 30 days array (starting from 29 days ago to today)
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    days.push({
      date,
      count: 0,
      dateStr: date.toISOString().split('T')[0] || '',
    })
  }

  // Count posts per day
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
      // Invalid date, skip
    }
  })

  return days
})

// Arrange into 3 rows x 10 columns (column-first like GitHub)
const grid = computed(() => {
  const rows: (typeof heatmapData.value)[] = [[], [], []]

  heatmapData.value.forEach((day, index) => {
    const rowIndex = index % 3
    rows[rowIndex]?.push(day)
  })

  return rows
})

// Get intensity level (0-4) based on post count
const getIntensityClass = (count: number): string => {
  if (count === 0) return 'bg-gray-100'
  if (count === 1) return 'bg-emerald-200'
  if (count === 2) return 'bg-emerald-300'
  if (count <= 4) return 'bg-emerald-400'
  return 'bg-emerald-500'
}

// Format date for tooltip
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// Total posts in last 30 days
const totalPosts = computed(() => {
  return heatmapData.value.reduce((sum, day) => sum + day.count, 0)
})
</script>

<template>
  <div class="bg-white rounded-2xl p-4 shadow-sm mb-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-gray-400 text-xs font-bold uppercase tracking-widest">Activity</h3>
      <span class="text-xs text-gray-400"> {{ totalPosts }} posts in 30 days </span>
    </div>

    <!-- Heatmap Grid (3 rows x 10 columns) -->
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
          :title="`${formatDate(day.date)}: ${day.count} post${day.count !== 1 ? 's' : ''}`"
        />
      </div>
    </div>

    <!-- Legend -->
    <div class="flex items-center justify-end gap-1 mt-3">
      <span class="text-xs text-gray-400 mr-1">Less</span>
      <div class="w-3 h-3 rounded-sm bg-gray-100" title="0 posts" />
      <div class="w-3 h-3 rounded-sm bg-emerald-200" title="1 post" />
      <div class="w-3 h-3 rounded-sm bg-emerald-300" title="2 posts" />
      <div class="w-3 h-3 rounded-sm bg-emerald-400" title="3-4 posts" />
      <div class="w-3 h-3 rounded-sm bg-emerald-500" title="5+ posts" />
      <span class="text-xs text-gray-400 ml-1">More</span>
    </div>
  </div>
</template>
