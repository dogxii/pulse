// 前端 API 服务
// 封装 fetch 请求，与 Cloudflare Functions 后端交互

import type { Comment, Post, User } from "../types";

// API 响应类型
interface APIResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
}

// 分页响应类型
interface PaginatedResponse<T> {
	items: T[];
	total: number;
	page: number;
	limit: number;
	has_more: boolean;
}

// 点赞响应类型
interface LikeResponse {
	liked: boolean;
	likes_count: number;
	likes: string[];
}

// 上传响应类型
interface UploadResponse {
	url: string;
	filename: string;
	size: number;
	type: string;
}

// 删除响应类型
interface DeleteResponse {
	deleted: boolean;
}

// API 配置
const API_BASE = "/api";

// Token 存储键名
const TOKEN_KEY = "pulse_auth_token";

/**
 * 获取存储的认证令牌
 */
function getToken(): string | null {
	if (typeof window === "undefined") return null;
	return localStorage.getItem(TOKEN_KEY);
}

/**
 * 设置认证令牌
 */
export function setToken(token: string): void {
	if (typeof window === "undefined") return;
	localStorage.setItem(TOKEN_KEY, token);
}

/**
 * 移除认证令牌
 */
export function removeToken(): void {
	if (typeof window === "undefined") return;
	localStorage.removeItem(TOKEN_KEY);
}

/**
 * 检查是否已认证
 */
export function isAuthenticated(): boolean {
	return !!getToken();
}

/**
 * 通用 fetch 封装，自动携带认证令牌
 */
async function fetchAPI<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	const url = `${API_BASE}${endpoint}`;
	const token = getToken();

	const headers: Record<string, string> = {
		...((options.headers as Record<string, string>) || {}),
	};

	// 如果存在令牌，添加认证头
	if (token) {
		headers["Authorization"] = `Bearer ${token}`;
	}

	// 如果是 JSON 请求体，添加 Content-Type
	if (options.body && typeof options.body === "string") {
		headers["Content-Type"] = "application/json";
	}

	const response = await fetch(url, {
		...options,
		headers,
	});

	// 处理非 2xx 响应
	if (!response.ok) {
		const errorData = (await response.json().catch(() => ({}))) as APIResponse;
		throw new APIError(
			errorData.error || `HTTP ${response.status}: ${response.statusText}`,
			response.status,
		);
	}

	return response.json() as Promise<T>;
}

/**
 * 自定义 API 错误类
 */
export class APIError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "APIError";
		this.status = status;
	}
}

// ============ 认证 API ============

export const auth = {
	/**
	 * 获取 GitHub OAuth 登录 URL（会重定向到 GitHub）
	 */
	getLoginUrl(): string {
		return `${API_BASE}/auth/github`;
	},

	/**
	 * 重定向到 GitHub OAuth 登录
	 */
	login(): void {
		window.location.href = auth.getLoginUrl();
	},

	/**
	 * 获取当前已认证的用户信息
	 */
	async me(): Promise<User> {
		const response = await fetchAPI<APIResponse<User>>("/auth/me");
		if (!response.success || !response.data) {
			throw new APIError(response.error || "获取用户信息失败", 401);
		}
		return response.data;
	},

	/**
	 * 登出（仅客户端操作 - 移除令牌）
	 */
	logout(): void {
		removeToken();
	},
};

// ============ 帖子 API ============

export const posts = {
	/**
	 * 获取帖子列表（分页）
	 */
	async list(
		options: { page?: number; limit?: number } = {},
	): Promise<PaginatedResponse<Post>> {
		const params = new URLSearchParams();
		if (options.page) params.set("page", options.page.toString());
		if (options.limit) params.set("limit", options.limit.toString());

		const query = params.toString();
		const endpoint = query ? `/posts?${query}` : "/posts";

		return fetchAPI<PaginatedResponse<Post>>(endpoint);
	},

	/**
	 * 通过 ID 获取单个帖子
	 */
	async get(id: string): Promise<Post> {
		const response = await fetchAPI<APIResponse<Post>>(`/posts/${id}`);
		if (!response.success || !response.data) {
			throw new APIError(response.error || "帖子不存在", 404);
		}
		return response.data;
	},

	/**
	 * 创建新帖子
	 */
	async create(data: { content: string; images?: string[] }): Promise<Post> {
		const response = await fetchAPI<APIResponse<Post>>("/posts", {
			method: "POST",
			body: JSON.stringify(data),
		});
		if (!response.success || !response.data) {
			throw new APIError(response.error || "创建帖子失败", 400);
		}
		return response.data;
	},

	/**
	 * 更新帖子
	 */
	async update(id: string, data: { content: string }): Promise<Post> {
		const response = await fetchAPI<APIResponse<Post>>(`/posts/${id}`, {
			method: "PATCH",
			body: JSON.stringify(data),
		});
		if (!response.success || !response.data) {
			throw new APIError(response.error || "更新帖子失败", 400);
		}
		return response.data;
	},

	/**
	 * 删除帖子
	 */
	async delete(id: string): Promise<void> {
		const response = await fetchAPI<APIResponse<{ deleted: boolean }>>(
			`/posts/${id}`,
			{ method: "DELETE" },
		);
		if (!response.success) {
			throw new APIError(response.error || "删除帖子失败", 400);
		}
	},

	/**
	 * 切换帖子的点赞状态
	 */
	async toggleLike(id: string): Promise<LikeResponse> {
		const response = await fetchAPI<APIResponse<LikeResponse>>(
			`/posts/${id}/like`,
			{ method: "POST" },
		);
		if (!response.success || !response.data) {
			throw new APIError(response.error || "切换点赞失败", 400);
		}
		return response.data;
	},
};

// ============ 用户 API ============

export const users = {
	/**
	 * 获取所有用户列表
	 */
	async list(): Promise<User[]> {
		const response = await fetchAPI<APIResponse<User[]>>("/users");
		if (!response.success || !response.data) {
			throw new APIError(response.error || "获取用户列表失败", 400);
		}
		return response.data;
	},

	/**
	 * 通过 ID 或用户名获取用户
	 */
	async get(idOrUsername: string): Promise<User> {
		const response = await fetchAPI<APIResponse<User>>(
			`/users/${encodeURIComponent(idOrUsername)}`,
		);
		if (!response.success || !response.data) {
			throw new APIError(response.error || "用户不存在", 404);
		}
		return response.data;
	},

	/**
	 * 更新当前用户的资料
	 */
	async updateProfile(id: string, data: { bio?: string }): Promise<User> {
		const response = await fetchAPI<APIResponse<User>>(`/users/${id}`, {
			method: "PATCH",
			body: JSON.stringify(data),
		});
		if (!response.success || !response.data) {
			throw new APIError(response.error || "更新资料失败", 400);
		}
		return response.data;
	},
};

// ============ 上传 API ============

export const uploads = {
	/**
	 * 上传图片文件
	 */
	async uploadImage(file: File): Promise<UploadResponse> {
		const formData = new FormData();
		formData.append("file", file);

		const token = getToken();
		const headers: Record<string, string> = {};
		if (token) {
			headers["Authorization"] = `Bearer ${token}`;
		}

		const response = await fetch(`${API_BASE}/uploads`, {
			method: "POST",
			headers,
			body: formData,
		});

		if (!response.ok) {
			const errorData = (await response
				.json()
				.catch(() => ({}))) as APIResponse;
			throw new APIError(
				errorData.error || `上传失败: ${response.statusText}`,
				response.status,
			);
		}

		const result = (await response.json()) as APIResponse<UploadResponse>;
		if (!result.success || !result.data) {
			throw new APIError(result.error || "上传失败", 400);
		}

		return result.data;
	},

	/**
	 * 获取已上传文件的 URL
	 */
	getUrl(year: string, filename: string): string {
		return `${API_BASE}/uploads/${year}/${filename}`;
	},
};

// ============ 评论 API ============

export const comments = {
	/**
	 * 获取帖子的评论列表
	 */
	async list(postId: string): Promise<Comment[]> {
		const response = await fetchAPI<APIResponse<Comment[]>>(
			`/posts/${postId}/comments`,
		);
		if (!response.success || !response.data) {
			throw new APIError(response.error || "获取评论列表失败", 400);
		}
		return response.data;
	},

	/**
	 * 创建新评论
	 */
	async create(postId: string, content: string): Promise<Comment> {
		const response = await fetchAPI<APIResponse<Comment>>(
			`/posts/${postId}/comments`,
			{
				method: "POST",
				body: JSON.stringify({ content }),
			},
		);
		if (!response.success || !response.data) {
			throw new APIError(response.error || "创建评论失败", 400);
		}
		return response.data;
	},

	/**
	 * 删除评论
	 */
	async delete(postId: string, commentId: string): Promise<void> {
		const response = await fetchAPI<APIResponse<DeleteResponse>>(
			`/posts/${postId}/comments/${commentId}`,
			{ method: "DELETE" },
		);
		if (!response.success) {
			throw new APIError(response.error || "删除评论失败", 400);
		}
	},
};

// 默认导出所有 API 模块
export default {
	auth,
	posts,
	users,
	uploads,
	comments,
	setToken,
	removeToken,
	isAuthenticated,
	APIError,
};
