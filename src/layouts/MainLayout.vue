<script setup lang="ts">
import UserCard from '../components/UserCard.vue'
import UserWall from '../components/UserWall.vue'
import type { User, Post } from '../types'

withDefaults(
  defineProps<{
    currentUser?: User | null
    allUsers?: User[]
    posts?: Post[]
  }>(),
  {
    currentUser: null,
    allUsers: () => [],
    posts: () => [],
  }
)
</script>

<template>
  <div
    class="min-h-screen bg-gray-50/50 text-gray-900 font-sans selection:bg-emerald-100 selection:text-emerald-900"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 py-8">
        <!-- Left Sidebar (User Profile) -->
        <aside class="hidden lg:block lg:col-span-3">
          <div class="sticky top-8 space-y-6">
            <UserCard :user="currentUser" />

            <div class="text-xs text-gray-400 text-center px-4 leading-relaxed opacity-60">
              <p>&copy; {{ new Date().getFullYear() }} Pulse.</p>
            </div>
          </div>
        </aside>

        <!-- Main Content (Feed) -->
        <main class="lg:col-span-6 min-h-[80vh]">
          <!-- Mobile Header -->
          <div
            class="lg:hidden mb-6 flex items-center justify-between bg-white p-4 rounded-3xl shadow-sm"
          >
            <div class="font-bold text-xl tracking-tight text-gray-800">Pulse</div>
            <!-- Simple avatar for mobile to indicate login state -->
            <div
              class="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-sm"
            >
              <img
                :src="
                  currentUser?.avatar_url || 'https://api.dicebear.com/9.x/micah/svg?seed=Guest'
                "
                alt="Avatar"
                class="w-full h-full object-cover"
              />
            </div>
          </div>

          <slot />
        </main>

        <!-- Right Sidebar (Community) -->
        <aside class="hidden lg:block lg:col-span-3">
          <div class="sticky top-8">
            <UserWall :users="allUsers" :posts="posts" />
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>
