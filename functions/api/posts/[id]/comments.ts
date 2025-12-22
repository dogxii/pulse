// 评论 API 处理器
// GET /api/posts/:id/comments - 获取帖子的评论列表
// POST /api/posts/:id/comments - 创建新评论

import { extractToken, verifyJWT } from "../../../_shared/jwt";
import {
	createComment,
	getComments,
	getPost,
	getUser,
} from "../../../_shared/r2";
import { errors, handleCors, success } from "../../../_shared/response";
import type { Comment, Env } from "../../../_shared/types";

interface CFContext {
	request: Request;
	env: Env;
	params: {
		id: string;
	};
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
	const timestamp = Date.now().toString(36);
	const randomPart = Math.random().toString(36).substring(2, 9);
	return `${timestamp}-${randomPart}`;
}

// GET /api/posts/:id/comments - 获取帖子的评论列表
export const onRequestGet = async ({ env, params }: CFContext) => {
	const { id: postId } = params;

	if (!postId) {
		return errors.badRequest("帖子 ID 不能为空");
	}

	try {
		// 检查帖子是否存在
		const post = await getPost(env, postId);
		if (!post) {
			return errors.notFound("帖子不存在");
		}

		// 获取评论列表
		const comments = await getComments(env, postId);

		return success(comments);
	} catch (error) {
		console.error("获取评论列表时出错:", error);
		return errors.internalError("获取评论失败");
	}
};

// POST /api/posts/:id/comments - 创建新评论
export const onRequestPost = async ({ request, env, params }: CFContext) => {
	const { JWT_SECRET } = env;
	const { id: postId } = params;

	if (!JWT_SECRET) {
		return errors.internalError("认证未配置");
	}

	if (!postId) {
		return errors.badRequest("帖子 ID 不能为空");
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

	try {
		// 检查帖子是否存在
		const post = await getPost(env, postId);
		if (!post) {
			return errors.notFound("帖子不存在");
		}

		// 解析请求体
		const body = await request.json();
		const { content } = body as { content?: string };

		// 验证内容
		if (!content || typeof content !== "string") {
			return errors.badRequest("评论内容不能为空");
		}

		const trimmedContent = content.trim();
		if (trimmedContent.length === 0) {
			return errors.badRequest("评论内容不能为空");
		}

		if (trimmedContent.length > 1000) {
			return errors.badRequest("评论内容超过最大长度限制（1000 字符）");
		}

		// 创建评论对象
		const comment: Comment = {
			id: generateId(),
			post_id: postId,
			user_id: payload.sub,
			content: trimmedContent,
			created_at: new Date().toISOString(),
		};

		// 保存评论
		const created = await createComment(env, comment);
		if (!created) {
			return errors.internalError("创建评论失败");
		}

		// 填充用户数据
		const user = await getUser(env, payload.sub);
		comment.user = user || undefined;

		return success(comment, 201);
	} catch (error) {
		console.error("创建评论时出错:", error);
		if (error instanceof SyntaxError) {
			return errors.badRequest("无效的 JSON 格式");
		}
		return errors.internalError("创建评论失败");
	}
};

// 处理 CORS 预检请求
export const onRequestOptions = () => handleCors();
