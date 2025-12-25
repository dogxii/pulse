// Mock 模块入口
// 在开发模式下自动启用 Mock API

import { mockComments, mockCurrentUser, mockPosts, mockUsers } from "./data";
import {
	disableMock,
	enableMock,
	isMockEnabled,
	resetMockData,
} from "./handlers";

// ========== 常量 ==========

const MOCK_TOKEN = "mock_jwt_token_for_development";
const TOKEN_KEY = "pulse_auth_token";
const USER_CACHE_KEY = "pulse_user_cache";

// Token 有效期（15天）
const TOKEN_EXPIRY_DURATION = 15 * 24 * 60 * 60 * 1000;

// ========== Mock 认证 ==========

/**
 * 设置 Mock 登录状态
 */
function setupMockAuth(): void {
	if (typeof globalThis.window === "undefined") return;

	// 设置带过期时间的 token
	const tokenData = {
		token: MOCK_TOKEN,
		expiresAt: Date.now() + TOKEN_EXPIRY_DURATION,
	};
	globalThis.localStorage.setItem(TOKEN_KEY, JSON.stringify(tokenData));

	// 缓存用户信息
	if (mockCurrentUser) {
		const userCache = {
			user: mockCurrentUser,
			expiresAt: Date.now() + TOKEN_EXPIRY_DURATION,
		};
		globalThis.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(userCache));
	}

	globalThis.console.log(
		"%c[Pulse Mock] 已自动登录: " + mockCurrentUser?.username,
		"color: #10b981; font-weight: bold;",
	);
}

/**
 * 清除 Mock 登录状态
 */
function clearMockAuth(): void {
	if (typeof globalThis.window === "undefined") return;

	try {
		const tokenData = JSON.parse(
			globalThis.localStorage.getItem(TOKEN_KEY) || "{}",
		);
		// 只清除 mock token
		if (tokenData.token === MOCK_TOKEN) {
			globalThis.localStorage.removeItem(TOKEN_KEY);
			globalThis.localStorage.removeItem(USER_CACHE_KEY);
		}
	} catch {
		// 忽略
	}
}

// ========== 环境检测 ==========

/**
 * 检查是否应该启用 Mock
 */
export function shouldEnableMock(): boolean {
	if (typeof globalThis.window !== "undefined") {
		const urlParams = new URLSearchParams(globalThis.window.location.search);

		// URL 参数优先级最高
		if (urlParams.get("mock") === "true") return true;
		if (urlParams.get("mock") === "false") return false;

		// 检查 localStorage
		const stored = globalThis.localStorage.getItem("pulse_mock_enabled");
		if (stored === "true") return true;
		if (stored === "false") return false;
	}

	// 默认：检查环境变量
	return import.meta.env.DEV && import.meta.env.VITE_MOCK === "true";
}

/**
 * 初始化 Mock 系统
 */
export function initMock(): void {
	if (!shouldEnableMock()) return;

	enableMock();
	setupMockAuth();

	// 暴露到全局供调试
	if (typeof globalThis.window !== "undefined") {
		(globalThis.window as unknown as Record<string, unknown>).__pulse_mock__ = {
			enable: enableMock,
			disable: () => {
				disableMock();
				clearMockAuth();
			},
			reset: resetMockData,
			isEnabled: isMockEnabled,
			relogin: setupMockAuth,
			logout: clearMockAuth,
			data: {
				users: mockUsers,
				posts: mockPosts,
				comments: mockComments,
				currentUser: mockCurrentUser,
			},
		};

		globalThis.console.log(
			"%c[Pulse Mock] Mock API 已启用",
			"color: #10b981; font-weight: bold;",
		);
		globalThis.console.log(
			"%c使用 window.__pulse_mock__ 控制 Mock 系统",
			"color: #6b7280;",
		);
	}
}

/**
 * 持久化设置 Mock 启用状态
 */
export function setMockEnabled(enabled: boolean): void {
	if (typeof globalThis.window !== "undefined") {
		globalThis.localStorage.setItem("pulse_mock_enabled", String(enabled));
		globalThis.console.log(
			`[Mock] 已${enabled ? "启用" : "禁用"}，刷新页面生效`,
		);
	}
}

// 导出
export { enableMock, disableMock, resetMockData, isMockEnabled };
export {
	getCommentsForPost,
	getPaginatedPosts,
	getPostById,
	getPostsForUser,
	getUserById,
	getUserByUsername,
	mockComments,
	mockCurrentUser,
	mockPosts,
	mockUsers,
} from "./data";
