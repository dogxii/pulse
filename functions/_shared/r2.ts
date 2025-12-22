// R2 存储帮助函数

import type { Env, Post, PostsIndex, User, UsersIndex } from "./types";

// R2 存储键名常量
const KEYS = {
	USERS_INDEX: "data/users.json",
	POSTS_INDEX: "data/posts_index.json",
	POST: (id: string) => `data/posts/${id}.json`,
	UPLOAD: (year: string, filename: string) => `uploads/${year}/${filename}`,
};

// ============ JSON 帮助函数 ============

/**
 * 从 R2 读取 JSON 文件
 */
async function readJSON<T>(bucket: R2Bucket, key: string): Promise<T | null> {
	try {
		const object = await bucket.get(key);
		if (!object) return null;
		const text = await object.text();
		return JSON.parse(text) as T;
	} catch (error) {
		console.error(`读取 ${key} 时出错:`, error);
		return null;
	}
}

/**
 * 将 JSON 数据写入 R2
 */
async function writeJSON<T>(
	bucket: R2Bucket,
	key: string,
	data: T,
): Promise<boolean> {
	try {
		await bucket.put(key, JSON.stringify(data, null, 2), {
			httpMetadata: {
				contentType: "application/json",
			},
		});
		return true;
	} catch (error) {
		console.error(`写入 ${key} 时出错:`, error);
		return false;
	}
}

// ============ 用户相关函数 ============

/**
 * 获取所有用户列表
 */
export async function getUsers(env: Env): Promise<User[]> {
	const index = await readJSON<UsersIndex>(env.R2_BUCKET, KEYS.USERS_INDEX);
	return index?.users || [];
}

/**
 * 通过 ID 获取用户
 */
export async function getUser(env: Env, id: string): Promise<User | null> {
	const users = await getUsers(env);
	return users.find((u) => u.id === id) || null;
}

/**
 * 通过用户名获取用户（不区分大小写）
 */
export async function getUserByUsername(
	env: Env,
	username: string,
): Promise<User | null> {
	const users = await getUsers(env);
	return (
		users.find((u) => u.username.toLowerCase() === username.toLowerCase()) ||
		null
	);
}

/**
 * 创建或更新用户
 */
export async function upsertUser(env: Env, user: User): Promise<boolean> {
	const users = await getUsers(env);
	const existingIndex = users.findIndex((u) => u.id === user.id);

	if (existingIndex >= 0) {
		users[existingIndex] = { ...users[existingIndex], ...user };
	} else {
		users.push(user);
	}

	const index: UsersIndex = {
		users,
		updated_at: new Date().toISOString(),
	};

	return writeJSON(env.R2_BUCKET, KEYS.USERS_INDEX, index);
}

/**
 * 更新用户信息
 */
export async function updateUser(
	env: Env,
	id: string,
	updates: Partial<User>,
): Promise<User | null> {
	const users = await getUsers(env);
	const existingIndex = users.findIndex((u) => u.id === id);

	if (existingIndex < 0) return null;

	users[existingIndex] = { ...users[existingIndex], ...updates };

	const index: UsersIndex = {
		users,
		updated_at: new Date().toISOString(),
	};

	const success = await writeJSON(env.R2_BUCKET, KEYS.USERS_INDEX, index);
	return success ? users[existingIndex] : null;
}

// ============ 帖子相关函数 ============

/**
 * 获取帖子索引
 */
export async function getPostsIndex(env: Env): Promise<PostsIndex> {
	const index = await readJSON<PostsIndex>(env.R2_BUCKET, KEYS.POSTS_INDEX);
	return (
		index || {
			post_ids: [],
			total_count: 0,
			updated_at: new Date().toISOString(),
		}
	);
}

/**
 * 通过 ID 获取单个帖子
 */
export async function getPost(env: Env, id: string): Promise<Post | null> {
	return readJSON<Post>(env.R2_BUCKET, KEYS.POST(id));
}

/**
 * 获取帖子列表（分页）
 */
export async function getPosts(
	env: Env,
	options: { page?: number; limit?: number } = {},
): Promise<{ posts: Post[]; total: number; hasMore: boolean }> {
	const { page = 1, limit = 20 } = options;
	const index = await getPostsIndex(env);

	const start = (page - 1) * limit;
	const end = start + limit;
	const postIds = index.post_ids.slice(start, end);

	// 并行获取帖子
	const posts = await Promise.all(postIds.map((id) => getPost(env, id)));

	// 过滤掉空值并获取用户数据
	const validPosts = posts.filter((p): p is Post => p !== null);

	// 填充用户数据
	const users = await getUsers(env);
	const usersMap = new Map(users.map((u) => [u.id, u]));

	for (const post of validPosts) {
		post.user = usersMap.get(post.user_id);
	}

	return {
		posts: validPosts,
		total: index.total_count,
		hasMore: end < index.total_count,
	};
}

/**
 * 创建新帖子
 */
export async function createPost(env: Env, post: Post): Promise<boolean> {
	// 写入帖子数据
	const postSuccess = await writeJSON(env.R2_BUCKET, KEYS.POST(post.id), post);
	if (!postSuccess) return false;

	// 更新索引
	const index = await getPostsIndex(env);
	index.post_ids.unshift(post.id); // 添加到开头（最新的在前）
	index.total_count = index.post_ids.length;
	index.updated_at = new Date().toISOString();

	const indexSuccess = await writeJSON(env.R2_BUCKET, KEYS.POSTS_INDEX, index);
	if (!indexSuccess) return false;

	// 更新用户的帖子数量和最后发帖时间
	await updateUser(env, post.user_id, {
		post_count: (await getUserPostCount(env, post.user_id)) + 1,
		last_post_at: post.created_at,
	});

	return true;
}

/**
 * 更新帖子
 */
export async function updatePost(
	env: Env,
	id: string,
	updates: Partial<Post>,
): Promise<Post | null> {
	const post = await getPost(env, id);
	if (!post) return null;

	const updatedPost = { ...post, ...updates };
	const success = await writeJSON(env.R2_BUCKET, KEYS.POST(id), updatedPost);

	return success ? updatedPost : null;
}

/**
 * 删除帖子
 */
export async function deletePost(env: Env, id: string): Promise<boolean> {
	try {
		// 从 R2 中删除
		await env.R2_BUCKET.delete(KEYS.POST(id));

		// 更新索引
		const index = await getPostsIndex(env);
		index.post_ids = index.post_ids.filter((pid) => pid !== id);
		index.total_count = index.post_ids.length;
		index.updated_at = new Date().toISOString();

		return writeJSON(env.R2_BUCKET, KEYS.POSTS_INDEX, index);
	} catch (error) {
		console.error("删除帖子时出错:", error);
		return false;
	}
}

/**
 * 获取用户的帖子数量
 */
async function getUserPostCount(env: Env, userId: string): Promise<number> {
	const user = await getUser(env, userId);
	return user?.post_count || 0;
}

// ============ 点赞相关函数 ============

/**
 * 切换帖子的点赞状态
 */
export async function toggleLike(
	env: Env,
	postId: string,
	userId: string,
): Promise<{ liked: boolean; likes: string[] } | null> {
	const post = await getPost(env, postId);
	if (!post) return null;

	const likeIndex = post.likes.indexOf(userId);
	const liked = likeIndex === -1;

	if (liked) {
		post.likes.push(userId);
	} else {
		post.likes.splice(likeIndex, 1);
	}

	const success = await writeJSON(env.R2_BUCKET, KEYS.POST(postId), post);
	return success ? { liked, likes: post.likes } : null;
}

// ============ 上传相关函数 ============

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
		const key = KEYS.UPLOAD(year, filename);

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
		return await env.R2_BUCKET.get(KEYS.UPLOAD(year, filename));
	} catch (error) {
		console.error("获取上传文件时出错:", error);
		return null;
	}
}

// ============ 初始化存储 ============

/**
 * 初始化 R2 存储结构（如果不存在则创建）
 */
export async function initializeStorage(env: Env): Promise<void> {
	// 如果用户索引不存在则初始化
	const usersIndex = await readJSON<UsersIndex>(
		env.R2_BUCKET,
		KEYS.USERS_INDEX,
	);
	if (!usersIndex) {
		await writeJSON(env.R2_BUCKET, KEYS.USERS_INDEX, {
			users: [],
			updated_at: new Date().toISOString(),
		});
	}

	// 如果帖子索引不存在则初始化
	const postsIndex = await readJSON<PostsIndex>(
		env.R2_BUCKET,
		KEYS.POSTS_INDEX,
	);
	if (!postsIndex) {
		await writeJSON(env.R2_BUCKET, KEYS.POSTS_INDEX, {
			post_ids: [],
			total_count: 0,
			updated_at: new Date().toISOString(),
		});
	}
}
