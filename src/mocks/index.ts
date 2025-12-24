// Mock 模块入口
// 在开发模式下自动启用 Mock API

import { mockComments, mockCurrentUser, mockPosts, mockUsers } from "./data";
import {
	disableMock,
	enableMock,
	isMockEnabled,
	resetMockData,
} from "./handlers";

// ========== 环境检测 ==========

/**
 * 检查是否应该启用 Mock
 * 条件：
 * 1. 开发模式 (import.meta.env.DEV)
 * 2. URL 参数包含 ?mock=true
 * 3. localStorage 中设置了 pulse_mock_enabled
 */
export function shouldEnableMock(): boolean {
	// 检查 URL 参数
	if (typeof globalThis.window !== "undefined") {
		const urlParams = new URLSearchParams(globalThis.window.location.search);

		// URL 参数优先级最高
		if (urlParams.get("mock") === "true") {
			return true;
		}
		if (urlParams.get("mock") === "false") {
			return false;
		}

		// 检查 localStorage
		const storedValue = globalThis.localStorage.getItem("pulse_mock_enabled");
		if (storedValue === "true") {
			return true;
		}
		if (storedValue === "false") {
			return false;
		}
	}

	// 默认：仅在开发模式下启用
	return import.meta.env.DEV && import.meta.env.VITE_MOCK === "true";
}

/**
 * 初始化 Mock 系统
 * 在应用启动时调用
 */
export function initMock(): void {
	if (shouldEnableMock()) {
		enableMock();

		// 在开发者工具中暴露 Mock 控制函数
		if (typeof globalThis.window !== "undefined") {
			(globalThis.window as unknown as Record<string, unknown>).__pulse_mock__ =
				{
					enable: enableMock,
					disable: disableMock,
					reset: resetMockData,
					isEnabled: isMockEnabled,
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
				"%c使用 window.__pulse_mock__ 访问 Mock 控制",
				"color: #6b7280;",
			);
			globalThis.console.log(
				"%c- __pulse_mock__.disable() 禁用 Mock",
				"color: #6b7280;",
			);
			globalThis.console.log(
				"%c- __pulse_mock__.reset() 重置数据",
				"color: #6b7280;",
			);
			globalThis.console.log(
				"%c- __pulse_mock__.data 查看模拟数据",
				"color: #6b7280;",
			);
		}
	}
}

/**
 * 设置 Mock 启用状态（持久化到 localStorage）
 */
export function setMockEnabled(enabled: boolean): void {
	if (typeof globalThis.window !== "undefined") {
		globalThis.localStorage.setItem("pulse_mock_enabled", String(enabled));
		globalThis.console.log(
			`[Mock] Mock ${enabled ? "启用" : "禁用"} 已保存，刷新页面生效`,
		);
	}
}

// 导出所有功能
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
