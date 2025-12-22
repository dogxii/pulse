// GitHub OAuth 登录处理器
// GET /api/auth/github - 重定向到 GitHub 进行授权

import { errors, handleCors, redirect } from "../../_shared/response";
import type { Env } from "../../_shared/types";

interface CFContext {
	request: Request;
	env: Env;
	params: Record<string, string>;
}

export const onRequestGet = async ({ request, env }: CFContext) => {
	const { GITHUB_CLIENT_ID } = env;

	if (!GITHUB_CLIENT_ID) {
		return errors.internalError("GitHub OAuth 未配置");
	}

	// 生成随机 state 用于 CSRF 保护
	const state = crypto.randomUUID();

	// 构建回调 URL
	const url = new URL(request.url);
	const callbackUrl = `${url.origin}/api/auth/callback`;

	// 构建 GitHub OAuth URL
	const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
	githubAuthUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
	githubAuthUrl.searchParams.set("redirect_uri", callbackUrl);
	githubAuthUrl.searchParams.set("scope", "read:user");
	githubAuthUrl.searchParams.set("state", state);

	// 将 state 设置到 cookie 中，用于回调时验证
	const response = redirect(githubAuthUrl.toString());
	response.headers.set(
		"Set-Cookie",
		`oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
	);

	return response;
};

// 处理 CORS 预检请求
export const onRequestOptions = () => handleCors();
