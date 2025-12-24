// Mock API 处理器
// 在开发模式下拦截 API 请求，返回模拟数据

import type { Comment, Post, User } from "../types";
import {
	getUserById,
	getUserByUsername,
	mockComments,
	mockCurrentUser,
	mockPosts,
	mockUsers,
	randomDelay,
} from "./data";

// ========== 类型定义 ==========

interface APIResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
}

interface PaginatedResponse<T> {
	items: T[];
	total: number;
	page: number;
	limit: number;
	has_more: boolean;
}

interface LikeResponse {
	liked: boolean;
	likes_count: number;
	likes: string[];
}

// ========== Mock 状态 ==========

// 是否启用 Mock
let mockEnabled = false;

// 本地状态（用于模拟数据变更）
let localPosts = [...mockPosts];
let localComments = { ...mockComments };
let nextPostId = 100;
let nextCommentId = 100;

/**
 * 启用 Mock API
 */
export function enableMock(): void {
	if (mockEnabled) return;

	mockEnabled = true;

	// 保存原始 fetch
	const originalFetch = globalThis.fetch;

	// 替换 fetch
	globalThis.fetch = async (
		input: RequestInfo | URL,
		init?: RequestInit,
	): Promise<Response> => {
		const url =
			typeof input === "string"
				? input
				: input instanceof URL
					? input.href
					: input.url;

		// 只拦截 /api 请求
		if (!url.includes("/api/")) {
			return originalFetch(input, init);
		}

		// 解析请求
		const method = init?.method || "GET";
		const path = url.replace(/^.*\/api/, "");

		globalThis.console.log(`[Mock] ${method} ${path}`);

		// 模拟网络延迟
		await randomDelay(150, 400);

		try {
			const response = await handleMockRequest(path, method, init);
			return new Response(JSON.stringify(response), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			return new Response(
				JSON.stringify({ success: false, error: errorMessage }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
	};

	globalThis.console.log("[Mock] Mock API 已启用");
}

/**
 * 禁用 Mock API（需要刷新页面才能恢复原始 fetch）
 */
export function disableMock(): void {
	mockEnabled = false;
	globalThis.console.log("[Mock] Mock API 已禁用（刷新页面生效）");
}

/**
 * 重置 Mock 数据
 */
export function resetMockData(): void {
	localPosts = [...mockPosts];
	localComments = { ...mockComments };
	nextPostId = 100;
	nextCommentId = 100;
	globalThis.console.log("[Mock] Mock 数据已重置");
}

/**
 * 检查 Mock 是否启用
 */
export function isMockEnabled(): boolean {
	return mockEnabled;
}

// ========== 请求处理 ==========

/**
 * 处理 Mock 请求
 */
async function handleMockRequest(
	path: string,
	method: string,
	init?: RequestInit,
): Promise<APIResponse> {
	// 解析请求体
	let body: Record<string, unknown> = {};
	if (init?.body && typeof init.body === "string") {
		try {
			body = JSON.parse(init.body);
		} catch {
			// 忽略解析错误
		}
	}

	// ========== 认证 API ==========

	// GET /auth/me - 获取当前用户
	if (path === "/auth/me" && method === "GET") {
		return { success: true, data: mockCurrentUser };
	}

	// ========== 用户 API ==========

	// GET /users - 获取用户列表
	if (path === "/users" && method === "GET") {
		return { success: true, data: mockUsers };
	}

	// GET /users/:id - 获取单个用户
	const userMatch = path.match(/^\/users\/([^/]+)$/);
	if (userMatch && method === "GET") {
		const idOrUsername = decodeURIComponent(userMatch[1] || "");
		const user = getUserById(idOrUsername) || getUserByUsername(idOrUsername);
		if (user) {
			return { success: true, data: user };
		}
		return { success: false, error: "用户不存在" };
	}

	// PATCH /users/:id - 更新用户资料
	if (userMatch && method === "PATCH") {
		const userId = userMatch[1];
		const userIndex = mockUsers.findIndex((u) => u.id === userId);
		if (userIndex !== -1 && mockUsers[userIndex]) {
			const updatedUser = { ...mockUsers[userIndex], ...body } as User;
			mockUsers[userIndex] = updatedUser;
			return { success: true, data: updatedUser };
		}
		return { success: false, error: "用户不存在" };
	}

	// ========== 帖子 API ==========

	// GET /posts - 获取帖子列表
	if (
		path.startsWith("/posts") &&
		method === "GET" &&
		!path.includes("/posts/")
	) {
		const urlParams = new URLSearchParams(path.split("?")[1] || "");
		const page = parseInt(urlParams.get("page") || "1");
		const limit = parseInt(urlParams.get("limit") || "20");

		// 使用本地帖子数据
		const start = (page - 1) * limit;
		const end = start + limit;
		const items = localPosts.slice(start, end);

		const response: PaginatedResponse<Post> = {
			items,
			total: localPosts.length,
			page,
			limit,
			has_more: end < localPosts.length,
		};

		return { success: true, ...response };
	}

	// POST /posts - 创建帖子
	if (path === "/posts" && method === "POST") {
		const currentUser = mockCurrentUser;
		if (!currentUser) {
			return { success: false, error: "未登录" };
		}
		const newPost: Post = {
			id: `post-${nextPostId++}`,
			user_id: currentUser.id,
			content: (body.content as string) || "",
			images: (body.images as string[]) || [],
			created_at: new Date().toISOString(),
			likes: [],
			comments_count: 0,
			user: currentUser,
		};
		localPosts.unshift(newPost);
		return { success: true, data: newPost };
	}

	// GET /posts/:id - 获取单个帖子
	const postMatch = path.match(/^\/posts\/([^/]+)$/);
	if (postMatch && method === "GET") {
		const postId = postMatch[1];
		const post = localPosts.find((p) => p.id === postId);
		if (post) {
			return { success: true, data: post };
		}
		return { success: false, error: "帖子不存在" };
	}

	// PATCH /posts/:id - 更新帖子
	if (postMatch && method === "PATCH") {
		const postId = postMatch[1];
		const postIndex = localPosts.findIndex((p) => p.id === postId);
		if (postIndex !== -1 && localPosts[postIndex]) {
			const updatedPost = { ...localPosts[postIndex], ...body } as Post;
			localPosts[postIndex] = updatedPost;
			return { success: true, data: updatedPost };
		}
		return { success: false, error: "帖子不存在" };
	}

	// DELETE /posts/:id - 删除帖子
	if (postMatch && method === "DELETE") {
		const postId = postMatch[1];
		const postIndex = localPosts.findIndex((p) => p.id === postId);
		if (postIndex !== -1) {
			localPosts.splice(postIndex, 1);
			return { success: true, data: { deleted: true } };
		}
		return { success: false, error: "帖子不存在" };
	}

	// POST /posts/:id/like - 切换点赞
	const likeMatch = path.match(/^\/posts\/([^/]+)\/like$/);
	if (likeMatch && method === "POST") {
		const postId = likeMatch[1];
		const post = localPosts.find((p) => p.id === postId);
		const currentUser = mockCurrentUser;
		if (post && currentUser) {
			const userId = currentUser.id;
			const likeIndex = post.likes.indexOf(userId);
			let liked: boolean;

			if (likeIndex === -1) {
				post.likes.push(userId);
				liked = true;
			} else {
				post.likes.splice(likeIndex, 1);
				liked = false;
			}

			const response: LikeResponse = {
				liked,
				likes_count: post.likes.length,
				likes: post.likes,
			};
			return { success: true, data: response };
		}
		return { success: false, error: "帖子不存在" };
	}

	// ========== 评论 API ==========

	// GET /posts/:id/comments - 获取评论列表
	const commentsMatch = path.match(/^\/posts\/([^/]+)\/comments$/);
	if (commentsMatch && method === "GET") {
		const postId = commentsMatch[1] || "";
		const comments = localComments[postId] || [];
		return { success: true, data: comments };
	}

	// POST /posts/:id/comments - 创建评论
	if (commentsMatch && method === "POST") {
		const postId = commentsMatch[1] || "";
		const post = localPosts.find((p) => p.id === postId);
		const currentUser = mockCurrentUser;
		if (post && currentUser) {
			const newComment: Comment = {
				id: `comment-${nextCommentId++}`,
				post_id: postId,
				user_id: currentUser.id,
				content: (body.content as string) || "",
				created_at: new Date().toISOString(),
				user: currentUser,
			};

			if (!localComments[postId]) {
				localComments[postId] = [];
			}
			localComments[postId]!.unshift(newComment);
			post.comments_count++;

			return { success: true, data: newComment };
		}
		return { success: false, error: "帖子不存在" };
	}

	// DELETE /posts/:postId/comments/:commentId - 删除评论
	const deleteCommentMatch = path.match(
		/^\/posts\/([^/]+)\/comments\/([^/]+)$/,
	);
	if (deleteCommentMatch && method === "DELETE") {
		const postId = deleteCommentMatch[1] || "";
		const commentId = deleteCommentMatch[2];
		const post = localPosts.find((p) => p.id === postId);
		const comments = localComments[postId];

		if (post && comments) {
			const commentIndex = comments.findIndex((c) => c.id === commentId);
			if (commentIndex !== -1) {
				comments.splice(commentIndex, 1);
				post.comments_count = Math.max(0, post.comments_count - 1);
				return { success: true, data: { deleted: true } };
			}
		}
		return { success: false, error: "评论不存在" };
	}

	// ========== 上传 API ==========

	// POST /uploads - 模拟图片上传
	if (path === "/uploads" && method === "POST") {
		// 返回一个模拟的图片 URL
		const mockImageUrl = `https://images.unsplash.com/photo-${Date.now()}?w=800&q=80`;
		return {
			success: true,
			data: {
				url: mockImageUrl,
				filename: "mock-image.jpg",
				size: 1024 * 100,
				type: "image/jpeg",
			},
		};
	}

	// 未匹配的路由
	return { success: false, error: `未知的 API 路径: ${method} ${path}` };
}

// 导出类型
export type { APIResponse, PaginatedResponse, LikeResponse };
