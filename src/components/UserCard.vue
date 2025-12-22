<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Activity } from 'lucide-vue-next';
import type { User } from '../types';

const props = defineProps<{
  user?: User | null;
}>();

const router = useRouter();

const displayUser = computed(() => {
  if (props.user) return props.user;
  return {
    username: 'Guest',
    avatar_url: 'https://api.dicebear.com/9.x/micah/svg?seed=Guest',
    bio: 'Sign in to share your pulse.',
    post_count: 0,
    is_admin: false
  };
});

const handleLogoClick = () => {
  if (props.user?.is_admin) {
    router.push('/admin');
  }
};
</script>

<template>
  <div class="bg-white rounded-3xl p-8 shadow-sm relative flex flex-col items-center text-center transition-all duration-300 hover:shadow-md">
    <!-- Logo (Top Right) -->
    <div
      class="absolute top-6 right-6 text-gray-300 hover:text-emerald-500 transition-colors cursor-pointer"
      @click="handleLogoClick"
      :title="user?.is_admin ? 'Admin Dashboard' : 'Pulse'"
    >
      <Activity :size="20" />
    </div>

    <!-- Avatar -->
    <div class="w-28 h-28 rounded-full overflow-hidden mb-5 bg-gray-50 p-1">
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
    <div v-else class="mt-6 pt-6 border-t border-gray-50 w-full flex justify-center gap-8">
       <div class="flex flex-col items-center">
        <span class="font-bold text-gray-900 text-lg">{{ displayUser.post_count || 0 }}</span>
        <span class="text-gray-400 text-xs uppercase tracking-wider">Pulses</span>
      </div>
    </div>
  </div>
</template>
