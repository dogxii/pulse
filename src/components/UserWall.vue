<script setup lang="ts">
import { useRouter } from 'vue-router'
import ActivityHeatmap from './ActivityHeatmap.vue'
import type { User, Post } from '../types'

defineProps<{
  users: User[]
  posts?: Post[]
}>()

const router = useRouter()

// Helper to check if user posted today
const hasPostedToday = (lastPostDate: string) => {
  if (!lastPostDate) return false
  try {
    const today = new Date().toISOString().split('T')[0]
    const postDate = new Date(lastPostDate).toISOString().split('T')[0]
    return today === postDate
  } catch {
    return false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Activity Heatmap -->
    <ActivityHeatmap :posts="posts || []" />

    <!-- Community Section -->
    <div class="bg-white rounded-3xl p-6 shadow-sm">
      <h3 class="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4 pl-1">Community</h3>

      <div class="grid grid-cols-4 gap-3">
        <div
          v-for="user in users"
          :key="user.id"
          class="relative group cursor-pointer"
          @click="router.push(`/u/${user.username}`)"
        >
          <!-- Avatar -->
          <div
            class="aspect-square rounded-2xl overflow-hidden bg-gray-100 transition-transform duration-200 group-hover:scale-105 ring-2 ring-transparent group-hover:ring-gray-100"
          >
            <img
              :src="user.avatar_url"
              :alt="user.username"
              class="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          <!-- Green Dot (Status) -->
          <div
            v-if="hasPostedToday(user.last_post_at)"
            class="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white shadow-sm"
            title="Posted today"
          />

          <!-- Tooltip -->
          <div
            class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-xl flex flex-col items-center gap-0.5"
          >
            <span class="font-bold">{{ user.username }}</span>
            <span class="text-gray-400 font-normal">{{ user.post_count }} pulses</span>
            <!-- Arrow -->
            <div
              class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"
            />
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="users.length === 0" class="text-center py-8 text-gray-400 text-sm">
        No users found.
      </div>
    </div>
  </div>
</template>
