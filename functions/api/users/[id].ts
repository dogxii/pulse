// 单个用户 API 处理器
// GET /api/users/:id - 通过 ID 或用户名获取用户
// PATCH /api/users/:id - 更新用户资料（仅本人）

import { extractToken, verifyJWT } from "../../_shared/jwt";
import { getUser, getUserByUsername, updateUser } from "../../_shared/r2";
import { errors, handleCors, success } from "../../_shared/response";
import type { Env } from "../../_shared/types";

interface CFContext {
	request: Request;
	env: Env;
	params: {
		id: string;
	};
}

// GET /api/users/:id - 通过 ID 或用户名获取用户
export const onRequestGet = async ({ env, params }: CFContext) => {
	const { id } = params;

	if (!id) {
		return errors.badRequest("用户 ID 或用户名不能为空");
	}

	try {
		// 先尝试通过 ID 查找，然后通过用户名查找
		let user = await getUser(env, id);

		if (!user) {
			// 尝试通过用户名查找（不区分大小写）
			user = await getUserByUsername(env, id);
		}

		if (!user) {
			return errors.notFound("用户不存在");
		}

		return success(user);
	} catch (error) {
		console.error("获取用户时出错:", error);
		return errors.internalError("获取用户失败");
	}
};

// PATCH /api/users/:id - 更新用户资料
export const onRequestPatch = async ({ request, env, params }: CFContext) => {
	const { JWT_SECRET } = env;
	const { id } = params;

	if (!JWT_SECRET) {
		return errors.internalError("认证未配置");
	}

	if (!id) {
		return errors.badRequest("用户 ID 不能为空");
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

	// 检查用户是否在更新自己的资料
	if (payload.sub !== id) {
		return errors.forbidden("只能更新自己的资料");
	}

	try {
		// 获取现有用户
		const existingUser = await getUser(env, id);
		if (!existingUser) {
			return errors.notFound("用户不存在");
		}

		// 解析请求体
		const body = await request.json();
		const { bio } = body as { bio?: string };

		// 验证 bio（如果提供）
		const updates: { bio?: string } = {};

		if (bio !== undefined) {
			if (typeof bio !== "string") {
				return errors.badRequest("简介必须是字符串");
			}

			if (bio.length > 500) {
				return errors.badRequest("简介超过最大长度限制（500 字符）");
			}

			updates.bio = bio.trim();
		}

		// 更新用户
		const updatedUser = await updateUser(env, id, updates);
		if (!updatedUser) {
			return errors.internalError("更新用户失败");
		}

		return success(updatedUser);
	} catch (error) {
		console.error("更新用户时出错:", error);
		if (error instanceof SyntaxError) {
			return errors.badRequest("无效的 JSON 格式");
		}
		return errors.internalError("更新用户失败");
	}
};

// 处理 CORS 预检请求
export const onRequestOptions = () => handleCors();
