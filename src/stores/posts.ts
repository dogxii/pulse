// Pinia 帖子状态仓库
// 帖子缓存和乐观更新支持

import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { posts as postsApi } from "../services/api";
import type { Post } from "../types";

// 缓存过期时间（5分钟）
const CACHE_TTL = 5 * 60 * 1000;

interface CachedPost {
	post: Post;
	timestamp: number;
}

export const usePostsStore = defineStore("posts", () => {
	// ========== 状态 ==========

	// 帖子列表
	const posts = ref<Post[]>([]);
	// 单个帖子缓存 (id -> cached post)
	const postCache = ref<Map<string, CachedPost>>(new Map());
	// 分页信息
	const currentPage = ref(1);
	const hasMore = ref(false);
	// 加载状态
	const isLoading = ref(false);
	const isLoadingMore = ref(false);
	// 错误信息
	const error = ref<string | null>(null);
	// 最后更新时间
	const lastUpdated = ref<number>(0);

	// ========== Getters ==========

	// 获取缓存的帖子
	const getCachedPost = computed(() => {
		return (id: string): Post | null => {
			const cached = postCache.value.get(id);
			if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
				return cached.post;
			}
			return null;
		};
	});

	// 检查缓存是否有效
	const isCacheValid = computed(() => {
		return Date.now() - lastUpdated.value < CACHE_TTL;
	});

	// ========== Actions ==========

	/**
	 * 设置帖子到缓存
	 */
	function setCachedPost(post: Post): void {
		postCache.value.set(post.id, {
			post,
			timestamp: Date.now(),
		});
	}

	/**
	 * 批量设置帖子到缓存
	 */
	function setCachedPosts(postList: Post[]): void {
		for (const post of postList) {
			setCachedPost(post);
		}
	}

	/**
	 * 从缓存中获取帖子（如果存在且未过期）
	 */
	function getFromCache(id: string): Post | null {
		const cached = postCache.value.get(id);
		if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
			return cached.post;
		}
		// 清除过期缓存
		if (cached) {
			postCache.value.delete(id);
		}
		return null;
	}

	/**
	 * 获取帖子列表
	 */
	async function fetchPosts(
		page: number = 1,
		append: boolean = false,
	): Promise<void> {
		if (page === 1) {
			isLoading.value = true;
		} else {
			isLoadingMore.value = true;
		}
		error.value = null;

		try {
			const response = await postsApi.list({ page, limit: 20 });

			if (append) {
				posts.value = [...posts.value, ...response.items];
			} else {
				posts.value = response.items;
			}

			// 缓存所有帖子
			setCachedPosts(response.items);

			currentPage.value = response.page;
			hasMore.value = response.has_more;
			lastUpdated.value = Date.now();
		} catch (e) {
			console.error("获取帖子列表失败:", e);
			error.value = e instanceof Error ? e.message : "加载帖子失败";
		} finally {
			isLoading.value = false;
			isLoadingMore.value = false;
		}
	}

	/**
	 * 加载更多帖子
	 */
	async function loadMore(): Promise<void> {
		if (isLoadingMore.value || !hasMore.value) return;
		await fetchPosts(currentPage.value + 1, true);
	}

	/**
	 * 获取单个帖子（优先从缓存）
	 */
	async function fetchPost(id: string): Promise<Post> {
		// 先检查缓存
		const cached = getFromCache(id);
		if (cached) {
			return cached;
		}

		// 从服务器获取
		const post = await postsApi.get(id);
		setCachedPost(post);
		return post;
	}

	/**
	 * 乐观更新点赞状态
	 * @returns 回滚函数（如果需要撤销）
	 */
	function optimisticToggleLike(postId: string, userId: string): () => void {
		// 查找帖子
		const postIndex = posts.value.findIndex((p) => p.id === postId);
		const post = posts.value[postIndex];

		// 保存原始状态用于回滚
		let originalLikes: string[] | null = null;
		let cachedOriginalLikes: string[] | null = null;

		// 更新列表中的帖子
		if (post) {
			originalLikes = [...post.likes];
			const isLiked = post.likes.includes(userId);
			if (isLiked) {
				post.likes = post.likes.filter((id) => id !== userId);
			} else {
				post.likes = [...post.likes, userId];
			}
		}

		// 更新缓存中的帖子
		const cachedPost = postCache.value.get(postId);
		if (cachedPost) {
			cachedOriginalLikes = [...cachedPost.post.likes];
			const isLiked = cachedPost.post.likes.includes(userId);
			if (isLiked) {
				cachedPost.post.likes = cachedPost.post.likes.filter(
					(id) => id !== userId,
				);
			} else {
				cachedPost.post.likes = [...cachedPost.post.likes, userId];
			}
		}

		// 返回回滚函数
		return () => {
			if (post && originalLikes) {
				post.likes = originalLikes;
			}
			if (cachedPost && cachedOriginalLikes) {
				cachedPost.post.likes = cachedOriginalLikes;
			}
		};
	}

	/**
	 * 切换点赞（带乐观更新）
	 */
	async function toggleLike(postId: string, userId: string): Promise<void> {
		// 乐观更新
		const rollback = optimisticToggleLike(postId, userId);

		try {
			// 发送请求
			const result = await postsApi.toggleLike(postId);

			// 用服务器返回的实际数据更新
			const postIndex = posts.value.findIndex((p) => p.id === postId);
			if (postIndex !== -1 && posts.value[postIndex]) {
				posts.value[postIndex].likes = result.likes;
			}

			const cachedPost = postCache.value.get(postId);
			if (cachedPost) {
				cachedPost.post.likes = result.likes;
			}
		} catch (e) {
			// 发生错误，回滚
			console.error("点赞切换失败:", e);
			rollback();
			throw e;
		}
	}

	/**
	 * 更新帖子的点赞状态（从服务器同步）
	 */
	function updatePostLikes(postId: string, likes: string[]): void {
		// 更新列表
		const postIndex = posts.value.findIndex((p) => p.id === postId);
		if (postIndex !== -1 && posts.value[postIndex]) {
			posts.value[postIndex].likes = likes;
		}

		// 更新缓存
		const cachedPost = postCache.value.get(postId);
		if (cachedPost) {
			cachedPost.post.likes = likes;
		}
	}

	/**
	 * 删除帖子
	 */
	async function deletePost(postId: string): Promise<void> {
		await postsApi.delete(postId);

		// 从列表中移除
		posts.value = posts.value.filter((p) => p.id !== postId);

		// 从缓存中移除
		postCache.value.delete(postId);
	}

	/**
	 * 添加新帖子到列表顶部
	 */
	function addPost(post: Post): void {
		posts.value.unshift(post);
		setCachedPost(post);
	}

	/**
	 * 更新帖子
	 */
	function updatePost(updatedPost: Post): void {
		const index = posts.value.findIndex((p) => p.id === updatedPost.id);
		if (index !== -1) {
			posts.value[index] = updatedPost;
		}
		setCachedPost(updatedPost);
	}

	/**
	 * 更新帖子评论数
	 */
	function updateCommentsCount(postId: string, count: number): void {
		const postIndex = posts.value.findIndex((p) => p.id === postId);
		if (postIndex !== -1 && posts.value[postIndex]) {
			posts.value[postIndex].comments_count = count;
		}

		const cachedPost = postCache.value.get(postId);
		if (cachedPost) {
			cachedPost.post.comments_count = count;
		}
	}

	/**
	 * 清除所有缓存
	 */
	function clearCache(): void {
		postCache.value.clear();
		posts.value = [];
		currentPage.value = 1;
		hasMore.value = false;
		lastUpdated.value = 0;
	}

	/**
	 * 刷新帖子列表
	 */
	async function refresh(): Promise<void> {
		currentPage.value = 1;
		await fetchPosts(1, false);
	}

	return {
		// 状态
		posts,
		currentPage,
		hasMore,
		isLoading,
		isLoadingMore,
		error,
		lastUpdated,

		// Getters
		getCachedPost,
		isCacheValid,

		// Actions
		fetchPosts,
		loadMore,
		fetchPost,
		toggleLike,
		updatePostLikes,
		deletePost,
		addPost,
		updatePost,
		updateCommentsCount,
		clearCache,
		refresh,
		getFromCache,
		setCachedPost,
	};
});

export default usePostsStore;
