<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Activity, X, Github, ExternalLink, Shield } from 'lucide-vue-next'
import type { User } from '../types'

const props = defineProps<{
  user?: User | null
}>()

const router = useRouter()

// App info
const APP_VERSION = '1.0.0'
const GITHUB_URL = 'https://github.com/nicepkg/pulse'

// Modal state
const showAboutModal = ref(false)

const displayUser = computed(() => {
  if (props.user) return props.user
  return {
    username: 'Guest',
    avatar_url: 'https://api.dicebear.com/9.x/micah/svg?seed=Guest',
    bio: 'Sign in to share your pulse.',
    post_count: 0,
    is_admin: false,
  }
})

// Navigate to home when clicking avatar
const handleAvatarClick = () => {
  router.push('/')
}

// Show about modal when clicking logo
const handleLogoClick = () => {
  showAboutModal.value = true
}

// Close modal
const closeModal = () => {
  showAboutModal.value = false
}

// Open GitHub in new tab
const openGitHub = () => {
  globalThis.window.open(GITHUB_URL, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div
    class="bg-white rounded-3xl p-8 shadow-sm relative flex flex-col items-center text-center transition-all duration-300 hover:shadow-md"
  >
    <!-- Logo (Top Right) -->
    <div
      class="absolute top-6 right-6 text-gray-300 hover:text-emerald-500 transition-colors cursor-pointer"
      title="About Pulse"
      @click="handleLogoClick"
    >
      <Activity :size="20" />
    </div>

    <!-- Avatar - Clickable to go home -->
    <div
      class="w-28 h-28 rounded-full overflow-hidden mb-5 bg-gray-50 p-1 cursor-pointer transition-transform hover:scale-105"
      title="Go to Home"
      @click="handleAvatarClick"
    >
      <img
        :src="displayUser.avatar_url"
        :alt="displayUser.username"
        class="w-full h-full object-cover rounded-full"
      />
    </div>

    <!-- Name -->
    <h2 class="text-xl font-bold text-gray-800 mb-2 tracking-tight">
      {{ displayUser.username }}
    </h2>

    <!-- Bio -->
    <p class="text-gray-500 text-sm leading-relaxed px-2">
      {{ displayUser.bio }}
    </p>

    <!-- Login Button (if guest) -->
    <div v-if="!user" class="mt-6 w-full">
      <a
        href="/api/auth/github"
        class="block w-full py-2 px-4 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        Login with GitHub
      </a>
    </div>

    <!-- Stats (if logged in) -->
    <div v-else class="mt-6 pt-6 border-t border-gray-50 w-full">
      <div class="flex justify-center gap-8 mb-4">
        <div class="flex flex-col items-center">
          <span class="font-bold text-gray-900 text-lg">{{ displayUser.post_count || 0 }}</span>
          <span class="text-gray-400 text-xs uppercase tracking-wider">Pulses</span>
        </div>
      </div>

      <!-- Admin Dashboard Link -->
      <router-link
        v-if="user?.is_admin"
        to="/admin"
        class="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
      >
        <Shield :size="16" />
        Admin Dashboard
      </router-link>
    </div>

    <!-- About Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showAboutModal"
          class="fixed inset-0 z-50 flex items-start justify-end p-4"
          @click.self="closeModal"
        >
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/20 backdrop-blur-sm" @click="closeModal" />

          <!-- Modal Content -->
          <div
            class="relative bg-white rounded-2xl shadow-2xl w-80 mt-16 mr-4 overflow-hidden animate-slide-in"
          >
            <!-- Header -->
            <div class="relative p-6 pb-4 bg-linear-to-br from-gray-50 to-white">
              <!-- Close Button -->
              <button
                class="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                @click="closeModal"
              >
                <X :size="18" />
              </button>

              <!-- Logo & Title -->
              <div class="flex items-center gap-3 mb-4">
                <div
                  class="w-12 h-12 bg-linear-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200"
                >
                  <Activity :size="24" class="text-white" />
                </div>
                <div>
                  <h3 class="text-lg font-bold text-gray-900">Pulse</h3>
                  <p class="text-sm text-gray-400">v{{ APP_VERSION }}</p>
                </div>
              </div>

              <!-- Description -->
              <p class="text-sm text-gray-600 leading-relaxed">
                A minimalist social platform for sharing your daily moments with the community.
              </p>
            </div>

            <!-- Links -->
            <div class="p-4 pt-0 space-y-2">
              <!-- GitHub Link -->
              <button
                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group"
                @click="openGitHub"
              >
                <Github :size="20" class="text-gray-700" />
                <div class="flex-1 text-left">
                  <span class="text-sm font-medium text-gray-900">GitHub Repository</span>
                  <p class="text-xs text-gray-400">View source code</p>
                </div>
                <ExternalLink
                  :size="16"
                  class="text-gray-400 group-hover:text-gray-600 transition-colors"
                />
              </button>

              <!-- Version Info -->
              <div class="px-4 py-3 bg-gray-50 rounded-xl">
                <div class="flex justify-between items-center text-sm">
                  <span class="text-gray-500">Version</span>
                  <span class="font-mono text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{{
                    APP_VERSION
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <p class="text-xs text-gray-400 text-center">Built with Vue 3 + Cloudflare</p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Modal Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* Slide-in Animation */
@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

.animate-slide-in {
  animation: slide-in 0.25s ease-out;
}
</style>
