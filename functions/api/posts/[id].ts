// 单个帖子 API 处理器
// GET /api/posts/:id - 获取单个帖子
// PATCH /api/posts/:id - 更新帖子（仅作者）
// DELETE /api/posts/:id - 删除帖子（作者或管理员）

import { extractToken, verifyJWT } from "../../_shared/jwt";
import { deletePost, getPost, getUser, updatePost } from "../../_shared/r2";
import { errors, handleCors, success } from "../../_shared/response";
import type { Env } from "../../_shared/types";

interface CFContext {
	request: Request;
	env: Env;
	params: {
		id: string;
	};
}

// GET /api/posts/:id - 获取单个帖子
export const onRequestGet = async ({ env, params }: CFContext) => {
	const { id } = params;

	if (!id) {
		return errors.badRequest("帖子 ID 不能为空");
	}

	try {
		const post = await getPost(env, id);
		if (!post) {
			return errors.notFound("帖子不存在");
		}

		// 填充用户数据
		const user = await getUser(env, post.user_id);
		post.user = user || undefined;

		return success(post);
	} catch (error) {
		console.error("获取帖子时出错:", error);
		return errors.internalError("获取帖子失败");
	}
};

// PATCH /api/posts/:id - 更新帖子
export const onRequestPatch = async ({ request, env, params }: CFContext) => {
	const { JWT_SECRET } = env;
	const { id } = params;

	if (!JWT_SECRET) {
		return errors.internalError("认证未配置");
	}

	if (!id) {
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
		// 获取帖子
		const post = await getPost(env, id);
		if (!post) {
			return errors.notFound("帖子不存在");
		}

		// 检查用户是否为作者
		if (post.user_id !== payload.sub) {
			return errors.forbidden("只能编辑自己的帖子");
		}

		// 解析请求体
		const body = await request.json();
		const { content } = body as { content?: string };

		// 验证内容（如果提供）
		if (content !== undefined) {
			if (typeof content !== "string") {
				return errors.badRequest("内容必须是字符串");
			}

			const trimmedContent = content.trim();
			if (trimmedContent.length === 0) {
				return errors.badRequest("内容不能为空");
			}

			if (trimmedContent.length > 5000) {
				return errors.badRequest("内容超过最大长度限制（5000 字符）");
			}
		}

		// 更新帖子
		const updatedPost = await updatePost(env, id, {
			content: content?.trim(),
		});

		if (!updatedPost) {
			return errors.internalError("更新帖子失败");
		}

		// 填充用户数据
		const user = await getUser(env, updatedPost.user_id);
		updatedPost.user = user || undefined;

		return success(updatedPost);
	} catch (error) {
		console.error("更新帖子时出错:", error);
		if (error instanceof SyntaxError) {
			return errors.badRequest("无效的 JSON 格式");
		}
		return errors.internalError("更新帖子失败");
	}
};

// DELETE /api/posts/:id - 删除帖子
export const onRequestDelete = async ({ request, env, params }: CFContext) => {
	const { JWT_SECRET } = env;
	const { id } = params;

	if (!JWT_SECRET) {
		return errors.internalError("认证未配置");
	}

	if (!id) {
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
		// 获取帖子
		const post = await getPost(env, id);
		if (!post) {
			return errors.notFound("帖子不存在");
		}

		// 获取当前用户以检查管理员状态
		const currentUser = await getUser(env, payload.sub);
		if (!currentUser) {
			return errors.notFound("用户不存在");
		}

		// 检查用户是否为作者或管理员
		if (post.user_id !== payload.sub && !currentUser.is_admin) {
			return errors.forbidden("只能删除自己的帖子");
		}

		// 删除帖子
		const deleted = await deletePost(env, id);
		if (!deleted) {
			return errors.internalError("删除帖子失败");
		}

		return success({ deleted: true });
	} catch (error) {
		console.error("删除帖子时出错:", error);
		return errors.internalError("删除帖子失败");
	}
};

// 处理 CORS 预检请求
export const onRequestOptions = () => handleCors();
