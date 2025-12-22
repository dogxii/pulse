// 获取当前用户接口
// GET /api/auth/me - 返回已认证用户的个人资料

import { getUser } from "../../_shared/db";
import { extractToken, verifyJWT } from "../../_shared/jwt";
import { errors, handleCors, success } from "../../_shared/response";
import type { Env } from "../../_shared/types";

interface CFContext {
	request: Request;
	env: Env;
	params: Record<string, string>;
}

export const onRequestGet = async ({ request, env }: CFContext) => {
	const { JWT_SECRET } = env;

	if (!JWT_SECRET) {
		return errors.internalError("JWT 未配置");
	}

	// 提取并验证 JWT
	const token = extractToken(request);
	if (!token) {
		return errors.unauthorized("未提供认证令牌");
	}

	const payload = await verifyJWT(token, JWT_SECRET);
	if (!payload) {
		return errors.unauthorized("令牌无效或已过期");
	}

	// 从 D1 获取用户
	const user = await getUser(env, payload.sub);
	if (!user) {
		return errors.notFound("用户不存在");
	}

	return success(user);
};

// 处理 CORS 预检请求
export const onRequestOptions = () => handleCors();
