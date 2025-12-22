// Cloudflare Pages Functions 环境类型定义

export interface Env {
	// R2 存储桶绑定（用于文件上传）
	R2_BUCKET: R2Bucket;

	// D1 数据库绑定（用于结构化数据）
	DB: D1Database;

	// 环境变量 / 密钥
	GITHUB_CLIENT_ID: string;
	GITHUB_CLIENT_SECRET: string;
	JWT_SECRET: string;

	// 可选：前端 URL，用于重定向
	FRONTEND_URL?: string;

	// ========== 访问控制配置 ==========

	// 管理员用户列表（GitHub 用户名，逗号分隔）
	// 例如: "admin1,admin2,admin3"
	ADMIN_USERS?: string;

	// 访问模式: "open" | "whitelist" | "blacklist"
	// - open: 开放模式，所有人可访问（默认）
	// - whitelist: 白名单模式，只有白名单用户可访问
	// - blacklist: 黑名单模式，黑名单用户不可访问
	ACCESS_MODE?: string;

	// 白名单用户列表（GitHub 用户名，逗号分隔）
	// 仅在 ACCESS_MODE="whitelist" 时生效
	// 例如: "user1,user2,user3"
	ALLOWED_USERS?: string;

	// 黑名单用户列表（GitHub 用户名，逗号分隔）
	// 仅在 ACCESS_MODE="blacklist" 时生效
	// 例如: "spammer1,spammer2"
	BLOCKED_USERS?: string;
}

// 访问模式类型
export type AccessMode = "open" | "whitelist" | "blacklist";

// 从前端复用的共享类型
export interface User {
	id: string; // GitHub ID
	username: string; // GitHub 用户名
	avatar_url: string;
	bio: string;
	joined_at: string; // ISO 日期格式
	last_post_at: string;
	post_count: number;
	is_admin: boolean;
}

export interface Post {
	id: string; // UUID
	user_id: string;
	content: string;
	images?: string[];
	created_at: string; // ISO 日期格式
	likes: string[];
	comments_count: number;
	user?: User;
}

export interface Comment {
	id: string;
	post_id: string;
	user_id: string;
	content: string;
	created_at: string;
	user?: User;
}

// R2 存储结构
export interface UsersIndex {
	users: User[];
	updated_at: string;
}

export interface PostsIndex {
	// 帖子 ID 数组，按 created_at 降序排列
	post_ids: string[];
	total_count: number;
	updated_at: string;
}

// JWT 载荷
export interface JWTPayload {
	sub: string; // 用户 ID
	username: string;
	iat: number;
	exp: number;
}

// GitHub OAuth 类型
export interface GitHubUser {
	id: number;
	login: string;
	avatar_url: string;
	bio: string | null;
}

export interface GitHubTokenResponse {
	access_token: string;
	token_type: string;
	scope: string;
}

// API 响应类型
export interface APIResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
}

export interface PaginatedResponse<T> {
	items: T[];
	total: number;
	page: number;
	limit: number;
	has_more: boolean;
}
