<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { Loader2 } from "lucide-vue-next";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const authStore = useAuthStore();

const status = ref<"loading" | "success" | "error">("loading");
const errorMessage = ref("");

onMounted(async () => {
	// Get token from URL query params
	const params = new URLSearchParams(window.location.search);
	const token = params.get("token");
	const error = params.get("error");

	if (error) {
		status.value = "error";
		errorMessage.value = decodeURIComponent(error);
		return;
	}

	if (!token) {
		status.value = "error";
		errorMessage.value = "No authentication token received";
		return;
	}

	// Handle the callback
	const success = await authStore.handleCallback(token);

	if (success) {
		status.value = "success";
		// Redirect to home after a brief delay
		setTimeout(() => {
			router.replace("/");
		}, 1000);
	} else {
		status.value = "error";
		errorMessage.value = authStore.error || "Authentication failed";
	}
});

const goToLogin = () => {
	router.push("/login");
};

const goHome = () => {
	router.push("/");
};
</script>

<template>
	<div
		class="min-h-screen bg-gray-50/50 flex items-center justify-center p-4"
	>
		<div class="bg-white rounded-3xl p-8 md:p-12 shadow-sm max-w-md w-full text-center">
			<!-- Loading State -->
			<div v-if="status === 'loading'" class="space-y-4">
				<Loader2 class="w-12 h-12 animate-spin text-gray-400 mx-auto" />
				<h1 class="text-xl font-bold text-gray-900">Signing you in...</h1>
				<p class="text-gray-500 text-sm">Please wait while we complete authentication.</p>
			</div>

			<!-- Success State -->
			<div v-else-if="status === 'success'" class="space-y-4">
				<div
					class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto"
				>
					<svg
						class="w-8 h-8 text-emerald-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 13l4 4L19 7"
						/>
					</svg>
				</div>
				<h1 class="text-xl font-bold text-gray-900">Welcome back!</h1>
				<p class="text-gray-500 text-sm">
					Successfully signed in as
					<span class="font-medium text-gray-900">@{{ authStore.currentUser?.username }}</span>
				</p>
				<p class="text-gray-400 text-xs">Redirecting to home...</p>
			</div>

			<!-- Error State -->
			<div v-else-if="status === 'error'" class="space-y-4">
				<div
					class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto"
				>
					<svg
						class="w-8 h-8 text-red-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</div>
				<h1 class="text-xl font-bold text-gray-900">Authentication Failed</h1>
				<p class="text-gray-500 text-sm">{{ errorMessage }}</p>
				<div class="flex gap-3 justify-center pt-4">
					<button
						@click="goToLogin"
						class="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors cursor-pointer"
					>
						Try Again
					</button>
					<button
						@click="goHome"
						class="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors cursor-pointer"
					>
						Go Home
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
