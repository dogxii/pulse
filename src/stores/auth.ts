// Pinia 认证状态仓库
// 全局认证状态管理

import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
	auth,
	isAuthenticated,
	removeToken,
	setToken,
	users as usersApi,
} from "../services/api";
import type { User } from "../types";

export const useAuthStore = defineStore("auth", () => {
	// 状态
	const currentUser = ref<User | null>(null);
	const isLoading = ref(false);
	const error = ref<string | null>(null);
	const isInitialized = ref(false);

	// 计算属性 / Getters
	const isLoggedIn = computed(() => !!currentUser.value);
	const isAdmin = computed(() => currentUser.value?.is_admin ?? false);
	const userId = computed(() => currentUser.value?.id ?? null);
	const username = computed(() => currentUser.value?.username ?? null);

	// Actions

	/**
	 * 在应用挂载时初始化认证状态
	 * 检查是否存在有效令牌并获取用户数据
	 */
	async function initialize(): Promise<void> {
		if (isInitialized.value) return;

		isLoading.value = true;
		error.value = null;

		try {
			if (isAuthenticated()) {
				currentUser.value = await auth.me();
			}
		} catch (e) {
			// 令牌可能无效或已过期
			console.error("认证初始化失败:", e);
			removeToken();
			currentUser.value = null;
		} finally {
			isLoading.value = false;
			isInitialized.value = true;
		}
	}

	/**
	 * 重定向到 GitHub OAuth 登录
	 */
	function login(): void {
		auth.login();
	}

	/**
	 * 处理 OAuth 回调
	 * @param token - 来自 OAuth 回调的 JWT 令牌
	 * @returns 成功返回 true，否则返回 false
	 */
	async function handleCallback(token: string): Promise<boolean> {
		isLoading.value = true;
		error.value = null;

		try {
			// 存储令牌
			setToken(token);

			// 获取用户信息
			currentUser.value = await auth.me();
			return true;
		} catch (e) {
			error.value = e instanceof Error ? e.message : "认证失败";
			removeToken();
			currentUser.value = null;
			return false;
		} finally {
			isLoading.value = false;
		}
	}

	/**
	 * 登出当前用户
	 */
	function logout(): void {
		auth.logout();
		currentUser.value = null;
		error.value = null;
	}

	/**
	 * 从服务器刷新当前用户数据
	 */
	async function refreshUser(): Promise<void> {
		if (!isAuthenticated()) return;

		isLoading.value = true;
		error.value = null;

		try {
			currentUser.value = await auth.me();
		} catch (e) {
			error.value = e instanceof Error ? e.message : "刷新用户信息失败";
		} finally {
			isLoading.value = false;
		}
	}

	/**
	 * 更新当前用户的资料
	 * @param data - 要更新的资料数据（如 bio 等）
	 */
	async function updateProfile(data: { bio?: string }): Promise<boolean> {
		if (!currentUser.value) return false;

		isLoading.value = true;
		error.value = null;

		try {
			const updatedUser = await usersApi.updateProfile(
				currentUser.value.id,
				data,
			);
			currentUser.value = updatedUser;
			return true;
		} catch (e) {
			error.value = e instanceof Error ? e.message : "更新资料失败";
			return false;
		} finally {
			isLoading.value = false;
		}
	}

	/**
	 * 更新本地用户状态（不调用 API）
	 * 在执行改变用户数据的操作后使用（如创建帖子）
	 */
	function updateUserLocally(updates: Partial<User>): void {
		if (currentUser.value) {
			currentUser.value = { ...currentUser.value, ...updates };
		}
	}

	/**
	 * 清除已存储的错误
	 */
	function clearError(): void {
		error.value = null;
	}

	/**
	 * 检查当前用户是否为资源的所有者
	 * @param ownerId - 资源所有者的 ID
	 */
	function isOwner(ownerId: string): boolean {
		return currentUser.value?.id === ownerId;
	}

	/**
	 * 检查当前用户是否可以修改资源（所有者或管理员）
	 * @param ownerId - 资源所有者的 ID
	 */
	function canModify(ownerId: string): boolean {
		if (!currentUser.value) return false;
		return currentUser.value.id === ownerId || currentUser.value.is_admin;
	}

	return {
		// 状态
		currentUser,
		isLoading,
		error,
		isInitialized,

		// Getters
		isLoggedIn,
		isAdmin,
		userId,
		username,

		// Actions
		initialize,
		login,
		handleCallback,
		logout,
		refreshUser,
		updateProfile,
		updateUserLocally,
		clearError,
		isOwner,
		canModify,
	};
});

export default useAuthStore;
