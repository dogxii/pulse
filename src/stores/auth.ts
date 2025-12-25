// Pinia 认证状态仓库
// 全局认证状态管理，支持用户信息缓存

import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
	auth,
	getTokenRemainingTime,
	isAuthenticated,
	refreshTokenExpiry,
	removeToken,
	setToken,
	users as usersApi,
} from "../services/api";
import type { User } from "../types";

// 用户缓存键名
const USER_CACHE_KEY = "pulse_user_cache";

// 用户缓存有效期（15天，与 token 一致）
const USER_CACHE_DURATION = 15 * 24 * 60 * 60 * 1000;

// 用户缓存数据结构
interface UserCache {
	user: User;
	expiresAt: number;
}

/**
 * 从 localStorage 获取缓存的用户信息
 */
function getCachedUser(): User | null {
	try {
		const cached = localStorage.getItem(USER_CACHE_KEY);
		if (!cached) return null;

		const cacheData: UserCache = JSON.parse(cached);
		// 检查缓存是否过期
		if (cacheData.expiresAt > Date.now()) {
			return cacheData.user;
		}
		// 缓存过期，清除
		localStorage.removeItem(USER_CACHE_KEY);
		return null;
	} catch {
		// 解析失败，清除无效缓存
		localStorage.removeItem(USER_CACHE_KEY);
		return null;
	}
}

/**
 * 将用户信息缓存到 localStorage
 */
function setCachedUser(user: User | null): void {
	if (user) {
		const cacheData: UserCache = {
			user,
			expiresAt: Date.now() + USER_CACHE_DURATION,
		};
		localStorage.setItem(USER_CACHE_KEY, JSON.stringify(cacheData));
	} else {
		localStorage.removeItem(USER_CACHE_KEY);
	}
}

/**
 * 刷新用户缓存过期时间
 */
function refreshUserCache(): void {
	try {
		const cached = localStorage.getItem(USER_CACHE_KEY);
		if (!cached) return;

		const cacheData: UserCache = JSON.parse(cached);
		if (cacheData.expiresAt > Date.now()) {
			cacheData.expiresAt = Date.now() + USER_CACHE_DURATION;
			localStorage.setItem(USER_CACHE_KEY, JSON.stringify(cacheData));
		}
	} catch {
		// 忽略错误
	}
}

/**
 * 清除用户缓存
 */
function clearCachedUser(): void {
	localStorage.removeItem(USER_CACHE_KEY);
}

export const useAuthStore = defineStore("auth", () => {
	// ========== 状态 ==========

	// 当前用户（优先从缓存加载，避免闪烁）
	const currentUser = ref<User | null>(
		isAuthenticated() ? getCachedUser() : null,
	);
	// 是否正在加载
	const isLoading = ref(false);
	// 错误信息
	const error = ref<string | null>(null);
	// 是否已完成初始化
	const isInitialized = ref(false);

	// ========== 计算属性 / Getters ==========

	// 是否已登录
	const isLoggedIn = computed(() => !!currentUser.value);
	// 是否为管理员
	const isAdmin = computed(() => currentUser.value?.is_admin ?? false);
	// 当前用户 ID
	const userId = computed(() => currentUser.value?.id ?? null);
	// 当前用户名
	const username = computed(() => currentUser.value?.username ?? null);
	// Token 剩余有效时间（毫秒）
	const tokenRemainingTime = computed(() => getTokenRemainingTime());

	// ========== Actions ==========

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
				// 刷新 token 和缓存过期时间（用户活跃）
				refreshTokenExpiry();
				refreshUserCache();

				// 从服务器获取最新用户信息
				const user = await auth.me();
				currentUser.value = user;
				// 更新缓存
				setCachedUser(user);
			} else {
				// 未认证，清除可能存在的缓存
				currentUser.value = null;
				clearCachedUser();
			}
		} catch (e) {
			// 令牌可能无效或已过期
			globalThis.console.error("认证初始化失败:", e);
			removeToken();
			clearCachedUser();
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
			const user = await auth.me();
			currentUser.value = user;
			// 缓存用户信息
			setCachedUser(user);
			return true;
		} catch (e) {
			error.value = e instanceof Error ? e.message : "认证失败";
			removeToken();
			clearCachedUser();
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
		clearCachedUser();
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
			// 刷新 token 过期时间
			refreshTokenExpiry();

			const user = await auth.me();
			currentUser.value = user;
			// 更新缓存
			setCachedUser(user);
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
			// 更新缓存
			setCachedUser(updatedUser);
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
			const updatedUser = { ...currentUser.value, ...updates };
			currentUser.value = updatedUser;
			// 同步更新缓存
			setCachedUser(updatedUser);
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

	/**
	 * 手动刷新 Token 过期时间
	 * 可在用户进行重要操作时调用
	 */
	function keepAlive(): void {
		if (isAuthenticated()) {
			refreshTokenExpiry();
			refreshUserCache();
		}
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
		tokenRemainingTime,

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
		keepAlive,
	};
});

export default useAuthStore;
