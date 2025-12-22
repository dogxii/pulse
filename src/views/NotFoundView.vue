<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Home, ArrowLeft } from 'lucide-vue-next'

const router = useRouter()

function goBack() {
  router.back()
}

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 flex items-center justify-center px-4">
    <div class="max-w-md w-full text-center">
      <!-- 404 Illustration -->
      <div class="mb-8">
        <div class="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span class="text-5xl font-bold text-gray-300">404</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p class="text-gray-500">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          @click="goBack"
          class="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors border border-gray-200 cursor-pointer"
        >
          <ArrowLeft :size="18" />
          <span>Go Back</span>
        </button>
        <button
          @click="goHome"
          class="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors cursor-pointer"
        >
          <Home :size="18" />
          <span>Go Home</span>
        </button>
      </div>

      <!-- Pulse Branding -->
      <div class="mt-12 text-xs text-gray-400">
        <p>&copy; {{ new Date().getFullYear() }} Pulse. All rights reserved.</p>
      </div>
    </div>
  </div>
</template>
