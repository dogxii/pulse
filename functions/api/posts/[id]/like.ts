// 帖子点赞切换处理器
// POST /api/posts/:id/like - 切换帖子的点赞状态

import { extractToken, verifyJWT } from "../../../_shared/jwt";
import { getPost, getUser, toggleLike } from "../../../_shared/r2";
import { errors, handleCors, success } from "../../../_shared/response";
import type { Env } from "../../../_shared/types";

interface CFContext {
	request: Request;
	env: Env;
	params: {
		id: string;
	};
}

// POST /api/posts/:id/like - 切换点赞
export const onRequestPost = async ({ request, env, params }: CFContext) => {
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
		// 验证用户存在
		const user = await getUser(env, payload.sub);
		if (!user) {
			return errors.notFound("用户不存在");
		}

		// 验证帖子存在
		const post = await getPost(env, id);
		if (!post) {
			return errors.notFound("帖子不存在");
		}

		// 切换点赞
		const result = await toggleLike(env, id, payload.sub);
		if (!result) {
			return errors.internalError("切换点赞失败");
		}

		return success({
			liked: result.liked,
			likes_count: result.likes.length,
			likes: result.likes,
		});
	} catch (error) {
		console.error("切换点赞时出错:", error);
		return errors.internalError("切换点赞失败");
	}
};

// 处理 CORS 预检请求
export const onRequestOptions = () => handleCors();
