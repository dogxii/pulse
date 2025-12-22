// 访问控制帮助函数
// 处理管理员判断、白名单/黑名单检查

import type { AccessMode, Env } from "./types";

/**
 * 解析逗号分隔的用户名列表
 * @param list - 逗号分隔的用户名字符串
 * @returns 小写的用户名数组
 */
export function parseUserList(list: string | undefined): string[] {
	if (!list || list.trim() === "") {
		return [];
	}
	return list
		.split(",")
		.map((u) => u.trim().toLowerCase())
		.filter((u) => u.length > 0);
}

/**
 * 检查用户是否为管理员
 * @param env - 环境变量
 * @param username - GitHub 用户名
 * @returns 是否为管理员
 */
export function isAdmin(env: Env, username: string): boolean {
	const adminUsers = parseUserList(env.ADMIN_USERS);
	return adminUsers.includes(username.toLowerCase());
}

/**
 * 获取当前的访问模式
 * @param env - 环境变量
 * @returns 访问模式
 */
export function getAccessMode(env: Env): AccessMode {
	const mode = env.ACCESS_MODE?.toLowerCase().trim();
	if (mode === "whitelist" || mode === "blacklist") {
		return mode;
	}
	return "open";
}

/**
 * 检查用户是否被允许访问
 * @param env - 环境变量
 * @param username - GitHub 用户名
 * @returns 检查结果 { allowed: boolean, reason?: string }
 */
export function checkAccess(
	env: Env,
	username: string,
): { allowed: boolean; reason?: string } {
	const mode = getAccessMode(env);
	const lowerUsername = username.toLowerCase();

	// 管理员始终可以访问
	if (isAdmin(env, username)) {
		return { allowed: true };
	}

	switch (mode) {
		case "whitelist": {
			const allowedUsers = parseUserList(env.ALLOWED_USERS);
			// 白名单模式下，管理员也自动包含在白名单中
			const adminUsers = parseUserList(env.ADMIN_USERS);
			const allAllowed = [...new Set([...allowedUsers, ...adminUsers])];

			if (allAllowed.length === 0) {
				// 如果白名单为空，默认拒绝所有人（除管理员外）
				return {
					allowed: false,
					reason: "白名单未配置，请联系管理员",
				};
			}

			if (!allAllowed.includes(lowerUsername)) {
				return {
					allowed: false,
					reason: "您不在白名单中，请联系管理员申请访问权限",
				};
			}
			return { allowed: true };
		}

		case "blacklist": {
			const blockedUsers = parseUserList(env.BLOCKED_USERS);
			if (blockedUsers.includes(lowerUsername)) {
				return {
					allowed: false,
					reason: "您的账号已被禁止访问",
				};
			}
			return { allowed: true };
		}

		case "open":
		default:
			return { allowed: true };
	}
}

/**
 * 获取访问控制状态信息（用于调试/管理）
 * @param env - 环境变量
 */
export function getAccessInfo(env: Env): {
	mode: AccessMode;
	adminCount: number;
	allowedCount: number;
	blockedCount: number;
} {
	return {
		mode: getAccessMode(env),
		adminCount: parseUserList(env.ADMIN_USERS).length,
		allowedCount: parseUserList(env.ALLOWED_USERS).length,
		blockedCount: parseUserList(env.BLOCKED_USERS).length,
	};
}
