// 单个评论 API 处理器
// DELETE /api/posts/:id/comments/:commentId - 删除评论

import { extractToken, verifyJWT } from "../../../../_shared/jwt";
import {
	deleteComment,
	getComment,
	getPost,
	getUser,
} from "../../../../_shared/r2";
import { errors, handleCors, success } from "../../../../_shared/response";
import type { Env } from "../../../../_shared/types";

interface CFContext {
	request: Request;
	env: Env;
	params: {
		id: string;
		commentId: string;
	};
}

// DELETE /api/posts/:id/comments/:commentId - 删除评论
export const onRequestDelete = async ({ request, env, params }: CFContext) => {
	const { JWT_SECRET } = env;
	const { id: postId, commentId } = params;

	if (!JWT_SECRET) {
		return errors.internalError("认证未配置");
	}

	if (!postId) {
		return errors.badRequest("帖子 ID 不能为空");
	}

	if (!commentId) {
		return errors.badRequest("评论 ID 不能为空");
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

		// 获取评论
		const comment = await getComment(env, postId, commentId);
		if (!comment) {
			return errors.notFound("评论不存在");
		}

		// 获取当前用户
		const currentUser = await getUser(env, payload.sub);
		if (!currentUser) {
			return errors.notFound("用户不存在");
		}

		// 检查权限：评论作者、帖子作者或管理员可以删除
		const isCommentAuthor = comment.user_id === payload.sub;
		const isPostAuthor = post.user_id === payload.sub;
		const isAdmin = currentUser.is_admin;

		if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
			return errors.forbidden("没有权限删除此评论");
		}

		// 删除评论
		const deleted = await deleteComment(env, postId, commentId);
		if (!deleted) {
			return errors.internalError("删除评论失败");
		}

		return success({ deleted: true });
	} catch (error) {
		console.error("删除评论时出错:", error);
		return errors.internalError("删除评论失败");
	}
};

// 处理 CORS 预检请求
export const onRequestOptions = () => handleCors();
