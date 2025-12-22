// 帖子 API 处理器
// GET /api/posts - 获取帖子列表（分页）
// POST /api/posts - 创建新帖子（需要认证）

import { createPost, getPosts, getUser } from "../../_shared/db";
import { extractToken, verifyJWT } from "../../_shared/jwt";
import { errors, handleCors, paginated, success } from "../../_shared/response";
import type { Env, Post } from "../../_shared/types";

interface CFContext {
	request: Request;
	env: Env;
	params: Record<string, string>;
}

// GET /api/posts - 获取帖子列表（分页）
export const onRequestGet = async ({ request, env }: CFContext) => {
	try {
		const url = new URL(request.url);
		const page = parseInt(url.searchParams.get("page") || "1", 10);
		const limit = Math.min(
			parseInt(url.searchParams.get("limit") || "20", 10),
			50,
		); // 每页最多 50 条

		if (page < 1 || limit < 1) {
			return errors.badRequest("无效的分页参数");
		}

		const { posts, total } = await getPosts(env, { page, limit });

		return paginated(posts, total, page, limit);
	} catch (error) {
		console.error("获取帖子列表时出错:", error);
		return errors.internalError("获取帖子失败");
	}
};

// POST /api/posts - 创建新帖子
export const onRequestPost = async ({ request, env }: CFContext) => {
	const { JWT_SECRET } = env;

	if (!JWT_SECRET) {
		return errors.internalError("认证未配置");
	}

	// 验证认证
	const token = extractToken(request);
	if (!token) {
		return errors.unauthorized("需要登录");
	}

	const payload = await verifyJWT(token, JWT_SECRET);
	if (!payload) {
		return errors.unauthorized("令牌无效或已过期");
	}

	// 获取用户
	const user = await getUser(env, payload.sub);
	if (!user) {
		return errors.notFound("用户不存在");
	}

	try {
		// 解析请求体
		const body = await request.json();
		const { content, images } = body as {
			content?: string;
			images?: string[];
		};

		// 验证内容
		if (!content || typeof content !== "string") {
			return errors.badRequest("内容不能为空");
		}

		const trimmedContent = content.trim();
		if (trimmedContent.length === 0) {
			return errors.badRequest("内容不能为空");
		}

		if (trimmedContent.length > 5000) {
			return errors.badRequest("内容超过最大长度限制（5000 字符）");
		}

		// 验证图片（可选）
		const validImages: string[] = [];
		if (images && Array.isArray(images)) {
			for (const img of images) {
				if (typeof img === "string" && img.startsWith("/api/uploads/")) {
					validImages.push(img);
				}
			}
			if (validImages.length > 4) {
				return errors.badRequest("每篇帖子最多 4 张图片");
			}
		}

		// 创建帖子
		const post: Post = {
			id: crypto.randomUUID(),
			user_id: user.id,
			content: trimmedContent,
			images: validImages.length > 0 ? validImages : undefined,
			created_at: new Date().toISOString(),
			likes: [],
			comments_count: 0,
		};

		const success_result = await createPost(env, post);
		if (!success_result) {
			return errors.internalError("创建帖子失败");
		}

		// 返回带有用户数据的帖子
		post.user = user;

		return success(post, 201);
	} catch (error) {
		console.error("创建帖子时出错:", error);
		if (error instanceof SyntaxError) {
			return errors.badRequest("无效的 JSON 格式");
		}
		return errors.internalError("创建帖子失败");
	}
};

// 处理 CORS 预检请求
export const onRequestOptions = () => handleCors();
