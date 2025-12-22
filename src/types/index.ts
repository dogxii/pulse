export interface User {
	id: string; // GitHub ID
	username: string; // GitHub Login
	avatar_url: string;
	bio: string; // 默认为 GitHub bio，可修改
	joined_at: string; // ISO Date
	last_post_at: string; // 用于判断是否显示绿点
	post_count: number; // 动态总数缓存
	is_admin: boolean; // 是否为管理员
}

export interface Post {
	id: string; // UUID
	user_id: string; // 关联 User
	content: string; // 支持 Markdown 或 纯文本
	images?: string[]; // 图片 URL 数组 (可选)
	created_at: string; // ISO Date
	likes: string[]; // 点赞的用户 ID 数组
	comments_count: number; // 评论数缓存
	user?: User; // Optional: populated user data for frontend display
}

export interface Comment {
	id: string;
	post_id: string;
	user_id: string;
	content: string;
	created_at: string;
	user?: User; // Optional: populated user data for frontend display
}
