<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Shield, Users, FileText, Settings, Loader2, AlertCircle } from 'lucide-vue-next'
import MainLayout from '../layouts/MainLayout.vue'
import { useAuthStore } from '../stores/auth'
import { users as usersApi } from '../services/api'
import type { User } from '../types'

const router = useRouter()
const authStore = useAuthStore()

// State
const allUsers = ref<User[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

// Computed
const isAdmin = computed(() => authStore.currentUser?.is_admin ?? false)
const stats = computed(() => ({
  totalUsers: allUsers.value.length,
  adminCount: allUsers.value.filter(u => u.is_admin).length,
  totalPosts: allUsers.value.reduce((sum, u) => sum + u.post_count, 0)
}))

// Fetch users
async function fetchUsers() {
  isLoading.value = true
  error.value = null

  try {
    allUsers.value = await usersApi.list()
  } catch (e) {
    console.error('Error fetching users:', e)
    error.value = e instanceof Error ? e.message : 'Failed to load users'
  } finally {
    isLoading.value = false
  }
}

// Initialize
onMounted(async () => {
  if (!authStore.isInitialized) {
    await authStore.initialize()
  }

  // Redirect if not admin
  if (!authStore.isLoggedIn) {
    router.replace('/login')
    return
  }

  if (!authStore.currentUser?.is_admin) {
    router.replace('/')
    return
  }

  await fetchUsers()
})
</script>

<template>
  <MainLayout :current-user="authStore.currentUser" :all-users="allUsers">
    <!-- Not Authorized -->
    <div v-if="!isAdmin && !isLoading" class="py-20 text-center bg-white rounded-3xl">
      <Shield class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h2 class="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
      <p class="text-gray-500 mb-6">You don't have permission to view this page.</p>
      <router-link
        to="/"
        class="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors"
      >
        Go Home
      </router-link>
    </div>

    <!-- Admin Content -->
    <div v-else>
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center gap-3 mb-2">
          <Shield class="w-8 h-8 text-emerald-600" />
          <h1 class="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
        <p class="text-gray-500">Manage users, posts, and site settings</p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="py-20 text-center">
        <Loader2 class="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
        <p class="text-gray-500">Loading dashboard...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="py-20 text-center bg-white rounded-3xl">
        <AlertCircle class="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 class="text-lg font-semibold text-gray-900 mb-2">Unable to load dashboard</h2>
        <p class="text-gray-500 text-sm mb-6">{{ error }}</p>
        <button
          @click="fetchUsers"
          class="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>

      <!-- Dashboard Content -->
      <div v-else class="space-y-6">
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Total Users -->
          <div class="bg-white rounded-2xl p-6 shadow-sm">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users class="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p class="text-2xl font-bold text-gray-900">{{ stats.totalUsers }}</p>
                <p class="text-sm text-gray-500">Total Users</p>
              </div>
            </div>
          </div>

          <!-- Total Posts -->
          <div class="bg-white rounded-2xl p-6 shadow-sm">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <FileText class="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p class="text-2xl font-bold text-gray-900">{{ stats.totalPosts }}</p>
                <p class="text-sm text-gray-500">Total Posts</p>
              </div>
            </div>
          </div>

          <!-- Admin Count -->
          <div class="bg-white rounded-2xl p-6 shadow-sm">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Shield class="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p class="text-2xl font-bold text-gray-900">{{ stats.adminCount }}</p>
                <p class="text-sm text-gray-500">Admins</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Users Table -->
        <div class="bg-white rounded-3xl p-6 shadow-sm">
          <h2 class="font-bold text-gray-900 mb-4">All Users</h2>

          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-left text-sm text-gray-500 border-b border-gray-100">
                  <th class="pb-3 font-medium">User</th>
                  <th class="pb-3 font-medium">Posts</th>
                  <th class="pb-3 font-medium">Role</th>
                  <th class="pb-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr v-for="user in allUsers" :key="user.id" class="hover:bg-gray-50/50">
                  <td class="py-3">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full overflow-hidden bg-gray-100">
                        <img
                          :src="user.avatar_url || `https://api.dicebear.com/9.x/micah/svg?seed=${user.id}`"
                          :alt="user.username"
                          class="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <router-link
                          :to="`/u/${user.username}`"
                          class="font-medium text-gray-900 hover:underline"
                        >
                          @{{ user.username }}
                        </router-link>
                      </div>
                    </div>
                  </td>
                  <td class="py-3 text-gray-600">{{ user.post_count }}</td>
                  <td class="py-3">
                    <span
                      v-if="user.is_admin"
                      class="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full"
                    >
                      Admin
                    </span>
                    <span
                      v-else
                      class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full"
                    >
                      User
                    </span>
                  </td>
                  <td class="py-3 text-gray-500 text-sm">
                    {{ new Date(user.joined_at).toLocaleDateString() }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="allUsers.length === 0" class="py-8 text-center">
            <p class="text-gray-400">No users found</p>
          </div>
        </div>

        <!-- Settings Placeholder -->
        <div class="bg-white rounded-3xl p-6 shadow-sm">
          <div class="flex items-center gap-3 mb-4">
            <Settings class="w-5 h-5 text-gray-400" />
            <h2 class="font-bold text-gray-900">Settings</h2>
          </div>
          <p class="text-gray-500 text-sm">
            Admin settings and configuration options coming soon...
          </p>
        </div>
      </div>
    </div>
  </MainLayout>
</template>
