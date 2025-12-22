<script setup lang="ts">
import { Github, Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const handleLogin = () => {
  authStore.login()
}
</script>

<template>
  <div
    class="min-h-screen bg-gray-50/50 dark:bg-[#0f0f0f] flex items-center justify-center px-4 transition-colors duration-300"
  >
    <div class="max-w-md w-full">
      <!-- Logo / Brand -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-2">
          Pulse
        </h1>
        <p class="text-gray-500 dark:text-gray-400">与世界分享你的想法!</p>
      </div>

      <!-- Login Card -->
      <div class="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm dark:shadow-gray-950/50">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center mb-6">
          Welcome to Pulse
        </h2>

        <p class="text-gray-500 dark:text-gray-400 text-center text-sm mb-8">
          使用您的 GitHub 帐户登录，开始与他人共享和联系。
        </p>

        <!-- Error Message -->
        <div
          v-if="authStore.error"
          class="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-sm"
        >
          {{ authStore.error }}
        </div>

        <!-- GitHub Login Button -->
        <button
          class="w-full flex items-center justify-center gap-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-6 py-3.5 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-lg shadow-gray-200 dark:shadow-gray-950/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          :disabled="authStore.isLoading"
          @click="handleLogin"
        >
          <Loader2 v-if="authStore.isLoading" :size="20" class="animate-spin" />
          <Github v-else :size="20" />
          <span>{{ authStore.isLoading ? 'Signing in...' : 'Continue with GitHub' }}</span>
        </button>

        <!-- Terms -->
        <p class="mt-6 text-xs text-gray-400 dark:text-gray-500 text-center leading-relaxed">
          By signing in, you agree to our
          <a href="#" class="text-gray-600 dark:text-gray-400 hover:underline">Terms of Service</a>
          and
          <a href="#" class="text-gray-600 dark:text-gray-400 hover:underline">Privacy Policy</a>.
        </p>
      </div>

      <!-- Back to Home -->
      <div class="mt-6 text-center">
        <router-link
          to="/"
          class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          ← Back to Home
        </router-link>
      </div>
    </div>
  </div>
</template>
