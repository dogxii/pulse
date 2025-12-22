// D1 数据库帮助函数
// 用于管理结构化数据（用户、帖子、评论、点赞）

import type { Comment, Env, Post, User } from "./types";

// ============ 用户相关函数 ============

/**
 * 获取所有用户列表
 */
export async function getUsers(env: Env): Promise<User[]> {
	const result = await env.DB.prepare(
		"SELECT * FROM users ORDER BY joined_at DESC",
	).all<User>();
	return result.results.map(normalizeUser);
}

/**
 * 通过 ID 获取用户
 */
export async function getUser(env: Env, id: string): Promise<User | null> {
	const result = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
		.bind(id)
		.first<User>();
	return result ? normalizeUser(result) : null;
}

/**
 * 通过用户名获取用户（不区分大小写）
 */
export async function getUserByUsername(
	env: Env,
	username: string,
): Promise<User | null> {
	const result = await env.DB.prepare(
		"SELECT * FROM users WHERE LOWER(username) = LOWER(?)",
	)
		.bind(username)
		.first<User>();
	return result ? normalizeUser(result) : null;
}

/**
 * 创建或更新用户
 */
export async function upsertUser(env: Env, user: User): Promise<boolean> {
	try {
		await env.DB.prepare(
			`INSERT INTO users (id, username, avatar_url, bio, joined_at, last_post_at, post_count, is_admin)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(id) DO UPDATE SET
			   username = excluded.username,
			   avatar_url = excluded.avatar_url,
			   bio = excluded.bio,
			   last_post_at = excluded.last_post_at,
			   post_count = excluded.post_count,
			   is_admin = excluded.is_admin,
			   updated_at = datetime('now')`,
		)
			.bind(
				user.id,
				user.username,
				user.avatar_url,
				user.bio || "",
				user.joined_at,
				user.last_post_at || null,
				user.post_count || 0,
				user.is_admin ? 1 : 0,
			)
			.run();
		return true;
	} catch (error) {
		console.error("创建或更新用户时出错:", error);
		return false;
	}
}

/**
 * 更新用户信息
 */
export async function updateUser(
	env: Env,
	id: string,
	updates: Partial<User>,
): Promise<User | null> {
	try {
		// 构建动态更新语句
		const fields: string[] = [];
		const values: (string | number | null)[] = [];

		if (updates.username !== undefined) {
			fields.push("username = ?");
			values.push(updates.username);
		}
		if (updates.avatar_url !== undefined) {
			fields.push("avatar_url = ?");
			values.push(updates.avatar_url);
		}
		if (updates.bio !== undefined) {
			fields.push("bio = ?");
			values.push(updates.bio);
		}
		if (updates.last_post_at !== undefined) {
			fields.push("last_post_at = ?");
			values.push(updates.last_post_at);
		}
		if (updates.post_count !== undefined) {
			fields.push("post_count = ?");
			values.push(updates.post_count);
		}
		if (updates.is_admin !== undefined) {
			fields.push("is_admin = ?");
			values.push(updates.is_admin ? 1 : 0);
		}

		if (fields.length === 0) {
			return await getUser(env, id);
		}

		fields.push("updated_at = datetime('now')");
		values.push(id);

		await env.DB.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`)
			.bind(...values)
			.run();

		return await getUser(env, id);
	} catch (error) {
		console.error("更新用户时出错:", error);
		return null;
	}
}

/**
 * 将数据库中的用户数据规范化（处理布尔值等）
 */
function normalizeUser(user: User): User {
	return {
		...user,
		is_admin: Boolean(user.is_admin),
		post_count: user.post_count || 0,
		bio: user.bio || "",
	};
}

// ============ 帖子相关函数 ============

/**
 * 通过 ID 获取单个帖子
 */
export async function getPost(env: Env, id: string): Promise<Post | null> {
	const result = await env.DB.prepare("SELECT * FROM posts WHERE id = ?")
		.bind(id)
		.first<PostRow>();

	if (!result) return null;

	const post = normalizePost(result);

	// 获取点赞列表
	post.likes = await getPostLikes(env, id);

	// 获取用户信息
	post.user = (await getUser(env, post.user_id)) || undefined;

	return post;
}

/**
 * 获取帖子列表（分页）
 */
export async function getPosts(
	env: Env,
	options: { page?: number; limit?: number } = {},
): Promise<{ posts: Post[]; total: number; hasMore: boolean }> {
	const { page = 1, limit = 20 } = options;
	const offset = (page - 1) * limit;

	// 获取总数
	const countResult = await env.DB.prepare(
		"SELECT COUNT(*) as count FROM posts",
	).first<{ count: number }>();
	const total = countResult?.count || 0;

	// 获取帖子列表
	const result = await env.DB.prepare(
		"SELECT * FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?",
	)
		.bind(limit, offset)
		.all<PostRow>();

	const posts = result.results.map(normalizePost);

	// 批量获取点赞和用户信息
	const postIds = posts.map((p) => p.id);
	const userIds = [...new Set(posts.map((p) => p.user_id))];

	// 获取所有相关用户
	const users = await Promise.all(userIds.map((id) => getUser(env, id)));
	const usersMap = new Map(
		users.filter((u): u is User => u !== null).map((u) => [u.id, u]),
	);

	// 获取所有帖子的点赞
	const likesMap = await getPostsLikes(env, postIds);

	// 填充数据
	for (const post of posts) {
		post.likes = likesMap.get(post.id) || [];
		post.user = usersMap.get(post.user_id);
	}

	return {
		posts,
		total,
		hasMore: offset + posts.length < total,
	};
}

/**
 * 获取用户的帖子列表
 */
export async function getUserPosts(
	env: Env,
	userId: string,
	options: { page?: number; limit?: number } = {},
): Promise<{ posts: Post[]; total: number; hasMore: boolean }> {
	const { page = 1, limit = 20 } = options;
	const offset = (page - 1) * limit;

	// 获取总数
	const countResult = await env.DB.prepare(
		"SELECT COUNT(*) as count FROM posts WHERE user_id = ?",
	)
		.bind(userId)
		.first<{ count: number }>();
	const total = countResult?.count || 0;

	// 获取帖子列表
	const result = await env.DB.prepare(
		"SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
	)
		.bind(userId, limit, offset)
		.all<PostRow>();

	const posts = result.results.map(normalizePost);

	// 获取用户信息
	const user = await getUser(env, userId);

	// 获取所有帖子的点赞
	const postIds = posts.map((p) => p.id);
	const likesMap = await getPostsLikes(env, postIds);

	// 填充数据
	for (const post of posts) {
		post.likes = likesMap.get(post.id) || [];
		post.user = user || undefined;
	}

	return {
		posts,
		total,
		hasMore: offset + posts.length < total,
	};
}

/**
 * 创建新帖子
 */
export async function createPost(env: Env, post: Post): Promise<boolean> {
	try {
		const imagesJson = post.images ? JSON.stringify(post.images) : null;

		await env.DB.prepare(
			`INSERT INTO posts (id, user_id, content, images, created_at, comments_count)
			 VALUES (?, ?, ?, ?, ?, ?)`,
		)
			.bind(
				post.id,
				post.user_id,
				post.content,
				imagesJson,
				post.created_at,
				post.comments_count || 0,
			)
			.run();

		// 更新用户的帖子数量和最后发帖时间
		await env.DB.prepare(
			`UPDATE users SET
			   post_count = post_count + 1,
			   last_post_at = ?,
			   updated_at = datetime('now')
			 WHERE id = ?`,
		)
			.bind(post.created_at, post.user_id)
			.run();

		return true;
	} catch (error) {
		console.error("创建帖子时出错:", error);
		return false;
	}
}

/**
 * 更新帖子
 */
export async function updatePost(
	env: Env,
	id: string,
	updates: Partial<Post>,
): Promise<Post | null> {
	try {
		const fields: string[] = [];
		const values: (string | number | null)[] = [];

		if (updates.content !== undefined) {
			fields.push("content = ?");
			values.push(updates.content);
		}
		if (updates.images !== undefined) {
			fields.push("images = ?");
			values.push(updates.images ? JSON.stringify(updates.images) : null);
		}
		if (updates.comments_count !== undefined) {
			fields.push("comments_count = ?");
			values.push(updates.comments_count);
		}

		if (fields.length === 0) {
			return await getPost(env, id);
		}

		fields.push("updated_at = datetime('now')");
		values.push(id);

		await env.DB.prepare(`UPDATE posts SET ${fields.join(", ")} WHERE id = ?`)
			.bind(...values)
			.run();

		return await getPost(env, id);
	} catch (error) {
		console.error("更新帖子时出错:", error);
		return null;
	}
}

/**
 * 删除帖子
 */
export async function deletePost(env: Env, id: string): Promise<boolean> {
	try {
		// 先获取帖子信息以获取作者 ID
		const post = await env.DB.prepare("SELECT user_id FROM posts WHERE id = ?")
			.bind(id)
			.first<{ user_id: string }>();

		if (!post) return false;

		// 删除帖子（级联删除会自动删除相关的点赞和评论）
		await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();

		// 更新用户的帖子数量
		await env.DB.prepare(
			`UPDATE users SET
			   post_count = MAX(0, post_count - 1),
			   updated_at = datetime('now')
			 WHERE id = ?`,
		)
			.bind(post.user_id)
			.run();

		return true;
	} catch (error) {
		console.error("删除帖子时出错:", error);
		return false;
	}
}

// 帖子数据库行类型（images 是 JSON 字符串）
interface PostRow {
	id: string;
	user_id: string;
	content: string;
	images: string | null;
	created_at: string;
	comments_count: number;
	updated_at: string;
}

/**
 * 将数据库中的帖子数据规范化
 */
function normalizePost(row: PostRow): Post {
	return {
		id: row.id,
		user_id: row.user_id,
		content: row.content,
		images: row.images ? JSON.parse(row.images) : undefined,
		created_at: row.created_at,
		comments_count: row.comments_count || 0,
		likes: [], // 将在后续填充
	};
}

// ============ 点赞相关函数 ============

/**
 * 获取帖子的点赞用户 ID 列表
 */
async function getPostLikes(env: Env, postId: string): Promise<string[]> {
	const result = await env.DB.prepare(
		"SELECT user_id FROM likes WHERE post_id = ? ORDER BY created_at ASC",
	)
		.bind(postId)
		.all<{ user_id: string }>();
	return result.results.map((r) => r.user_id);
}

/**
 * 批量获取多个帖子的点赞
 */
async function getPostsLikes(
	env: Env,
	postIds: string[],
): Promise<Map<string, string[]>> {
	if (postIds.length === 0) return new Map();

	// 使用 IN 查询批量获取
	const placeholders = postIds.map(() => "?").join(", ");
	const result = await env.DB.prepare(
		`SELECT post_id, user_id FROM likes WHERE post_id IN (${placeholders}) ORDER BY created_at ASC`,
	)
		.bind(...postIds)
		.all<{ post_id: string; user_id: string }>();

	const likesMap = new Map<string, string[]>();
	for (const postId of postIds) {
		likesMap.set(postId, []);
	}
	for (const row of result.results) {
		likesMap.get(row.post_id)?.push(row.user_id);
	}

	return likesMap;
}

/**
 * 切换帖子的点赞状态
 */
export async function toggleLike(
	env: Env,
	postId: string,
	userId: string,
): Promise<{ liked: boolean; likes: string[] } | null> {
	try {
		// 检查帖子是否存在
		const postExists = await env.DB.prepare("SELECT 1 FROM posts WHERE id = ?")
			.bind(postId)
			.first();
		if (!postExists) return null;

		// 检查是否已点赞
		const existingLike = await env.DB.prepare(
			"SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?",
		)
			.bind(postId, userId)
			.first();

		if (existingLike) {
			// 取消点赞
			await env.DB.prepare(
				"DELETE FROM likes WHERE post_id = ? AND user_id = ?",
			)
				.bind(postId, userId)
				.run();
		} else {
			// 添加点赞
			await env.DB.prepare("INSERT INTO likes (post_id, user_id) VALUES (?, ?)")
				.bind(postId, userId)
				.run();
		}

		const likes = await getPostLikes(env, postId);
		return {
			liked: !existingLike,
			likes,
		};
	} catch (error) {
		console.error("切换点赞时出错:", error);
		return null;
	}
}

// ============ 评论相关函数 ============

/**
 * 获取单个评论
 */
export async function getComment(
	env: Env,
	postId: string,
	commentId: string,
): Promise<Comment | null> {
	const result = await env.DB.prepare(
		"SELECT * FROM comments WHERE id = ? AND post_id = ?",
	)
		.bind(commentId, postId)
		.first<Comment>();

	if (!result) return null;

	// 获取用户信息
	const user = await getUser(env, result.user_id);
	return {
		...result,
		user: user || undefined,
	};
}

/**
 * 获取帖子的所有评论
 */
export async function getComments(
	env: Env,
	postId: string,
): Promise<Comment[]> {
	const result = await env.DB.prepare(
		"SELECT * FROM comments WHERE post_id = ? ORDER BY created_at DESC",
	)
		.bind(postId)
		.all<Comment>();

	const comments = result.results;

	// 获取所有评论者的用户信息
	const userIds = [...new Set(comments.map((c) => c.user_id))];
	const users = await Promise.all(userIds.map((id) => getUser(env, id)));
	const usersMap = new Map(
		users.filter((u): u is User => u !== null).map((u) => [u.id, u]),
	);

	return comments.map((comment) => ({
		...comment,
		user: usersMap.get(comment.user_id),
	}));
}

/**
 * 创建评论
 */
export async function createComment(
	env: Env,
	comment: Comment,
): Promise<boolean> {
	try {
		await env.DB.prepare(
			`INSERT INTO comments (id, post_id, user_id, content, created_at)
			 VALUES (?, ?, ?, ?, ?)`,
		)
			.bind(
				comment.id,
				comment.post_id,
				comment.user_id,
				comment.content,
				comment.created_at,
			)
			.run();

		// 更新帖子的评论数
		await env.DB.prepare(
			`UPDATE posts SET
			   comments_count = comments_count + 1,
			   updated_at = datetime('now')
			 WHERE id = ?`,
		)
			.bind(comment.post_id)
			.run();

		return true;
	} catch (error) {
		console.error("创建评论时出错:", error);
		return false;
	}
}

/**
 * 删除评论
 */
export async function deleteComment(
	env: Env,
	postId: string,
	commentId: string,
): Promise<boolean> {
	try {
		// 检查评论是否存在
		const comment = await env.DB.prepare(
			"SELECT 1 FROM comments WHERE id = ? AND post_id = ?",
		)
			.bind(commentId, postId)
			.first();

		if (!comment) return false;

		// 删除评论
		await env.DB.prepare("DELETE FROM comments WHERE id = ?")
			.bind(commentId)
			.run();

		// 更新帖子的评论数
		await env.DB.prepare(
			`UPDATE posts SET
			   comments_count = MAX(0, comments_count - 1),
			   updated_at = datetime('now')
			 WHERE id = ?`,
		)
			.bind(postId)
			.run();

		return true;
	} catch (error) {
		console.error("删除评论时出错:", error);
		return false;
	}
}

// ============ 文件上传相关函数（继续使用 R2）============

// R2 存储键名常量
const R2_KEYS = {
	UPLOAD: (year: string, filename: string) => `uploads/${year}/${filename}`,
};

/**
 * 上传图片到 R2
 */
export async function uploadImage(
	env: Env,
	file: ArrayBuffer,
	filename: string,
	contentType: string,
): Promise<string | null> {
	try {
		const year = new Date().getFullYear().toString();
		const key = R2_KEYS.UPLOAD(year, filename);

		await env.R2_BUCKET.put(key, file, {
			httpMetadata: {
				contentType,
			},
		});

		// 返回公开访问的 URL 路径
		return `/api/uploads/${year}/${filename}`;
	} catch (error) {
		console.error("上传图片时出错:", error);
		return null;
	}
}

/**
 * 获取上传的文件
 */
export async function getUpload(
	env: Env,
	year: string,
	filename: string,
): Promise<R2ObjectBody | null> {
	try {
		return await env.R2_BUCKET.get(R2_KEYS.UPLOAD(year, filename));
	} catch (error) {
		console.error("获取上传文件时出错:", error);
		return null;
	}
}
