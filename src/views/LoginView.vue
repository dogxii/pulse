<script setup lang="ts">
import { Github, Loader2 } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const handleLogin = () => {
  authStore.login();
};
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 flex items-center justify-center px-4">
    <div class="max-w-md w-full">
      <!-- Logo / Brand -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gray-900 tracking-tight mb-2">Pulse</h1>
        <p class="text-gray-500">Share your thoughts with the world</p>
      </div>

      <!-- Login Card -->
      <div class="bg-white rounded-3xl p-8 shadow-sm">
        <h2 class="text-xl font-semibold text-gray-900 text-center mb-6">
          Welcome to Pulse
        </h2>

        <p class="text-gray-500 text-center text-sm mb-8">
          Sign in with your GitHub account to start sharing and connecting with others.
        </p>

        <!-- Error Message -->
        <div
          v-if="authStore.error"
          class="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm"
        >
          {{ authStore.error }}
        </div>

        <!-- GitHub Login Button -->
        <button
          @click="handleLogin"
          :disabled="authStore.isLoading"
          class="w-full flex items-center justify-center gap-3 bg-gray-900 text-white px-6 py-3.5 rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Loader2 v-if="authStore.isLoading" :size="20" class="animate-spin" />
          <Github v-else :size="20" />
          <span>{{ authStore.isLoading ? 'Signing in...' : 'Continue with GitHub' }}</span>
        </button>

        <!-- Terms -->
        <p class="mt-6 text-xs text-gray-400 text-center leading-relaxed">
          By signing in, you agree to our
          <a href="#" class="text-gray-600 hover:underline">Terms of Service</a>
          and
          <a href="#" class="text-gray-600 hover:underline">Privacy Policy</a>.
        </p>
      </div>

      <!-- Back to Home -->
      <div class="mt-6 text-center">
        <router-link
          to="/"
          class="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back to Home
        </router-link>
      </div>
    </div>
  </div>
</template>
