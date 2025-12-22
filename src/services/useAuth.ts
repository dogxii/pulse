// useAuth 组合式函数
// 使用 Vue 3 组合式 API 管理认证状态

import { computed, ref } from "vue";
import type { User } from "../types";
import { auth, isAuthenticated, removeToken, setToken } from "./api";

// 响应式状态（在所有使用此组合式函数的组件之间共享）
const currentUser = ref<User | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);
const isInitialized = ref(false);

// 导出组合式函数
export function useAuth() {
	// 计算属性
	const isLoggedIn = computed(() => !!currentUser.value);
	const isAdmin = computed(() => currentUser.value?.is_admin ?? false);

	/**
	 * 初始化认证状态（在应用挂载时调用）
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
	 * 处理 OAuth 回调（从回调页面调用）
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
	 * 登出
	 */
	function logout(): void {
		auth.logout();
		currentUser.value = null;
		error.value = null;
	}

	/**
	 * 刷新当前用户数据
	 */
	async function refreshUser(): Promise<void> {
		if (!isAuthenticated()) return;

		isLoading.value = true;
		error.value = null;

		try {
			currentUser.value = await auth.me();
		} catch (e) {
			error.value = e instanceof Error ? e.message : "刷新用户信息失败";
			// 刷新失败时不登出，只报告错误
		} finally {
			isLoading.value = false;
		}
	}

	/**
	 * 更新当前用户（在更新资料后调用）
	 */
	function updateUser(updates: Partial<User>): void {
		if (currentUser.value) {
			currentUser.value = { ...currentUser.value, ...updates };
		}
	}

	/**
	 * 清除错误
	 */
	function clearError(): void {
		error.value = null;
	}

	return {
		// 状态
		currentUser,
		isLoading,
		error,
		isInitialized,

		// 计算属性
		isLoggedIn,
		isAdmin,

		// 方法
		initialize,
		login,
		handleCallback,
		logout,
		refreshUser,
		updateUser,
		clearError,
	};
}

// 导出单例实例用于全局状态
export const authState = {
	currentUser,
	isLoading,
	error,
	isInitialized,
	isLoggedIn: computed(() => !!currentUser.value),
	isAdmin: computed(() => currentUser.value?.is_admin ?? false),
};

export default useAuth;
