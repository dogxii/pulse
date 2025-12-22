// GitHub OAuth 回调处理器
// GET /api/auth/callback - 处理来自 GitHub OAuth 的回调

import { signJWT } from "../../_shared/jwt";
import { upsertUser } from "../../_shared/r2";
import { errors, handleCors, redirect } from "../../_shared/response";
import type {
	Env,
	GitHubTokenResponse,
	GitHubUser,
	User,
} from "../../_shared/types";

interface CFContext {
	request: Request;
	env: Env;
	params: Record<string, string>;
}

export const onRequestGet = async ({ request, env }: CFContext) => {
	const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, JWT_SECRET, FRONTEND_URL } =
		env;

	if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !JWT_SECRET) {
		return errors.internalError("GitHub OAuth 未配置");
	}

	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const errorParam = url.searchParams.get("error");

	// 处理来自 GitHub 的 OAuth 错误
	if (errorParam) {
		const errorDescription =
			url.searchParams.get("error_description") || "OAuth 错误";
		return redirect(
			`${FRONTEND_URL || ""}/login?error=${encodeURIComponent(errorDescription)}`,
		);
	}

	if (!code) {
		return errors.badRequest("缺少授权码");
	}

	// 验证来自 cookie 的 state
	const cookieHeader = request.headers.get("Cookie") || "";
	const cookies = Object.fromEntries(
		cookieHeader.split(";").map((c) => {
			const [key, ...val] = c.trim().split("=");
			return [key, val.join("=")];
		}),
	);

	if (!state || cookies.oauth_state !== state) {
		return errors.badRequest("无效的 state 参数");
	}

	try {
		// 用授权码换取访问令牌
		const tokenResponse = await fetch(
			"https://github.com/login/oauth/access_token",
			{
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					client_id: GITHUB_CLIENT_ID,
					client_secret: GITHUB_CLIENT_SECRET,
					code,
				}),
			},
		);

		if (!tokenResponse.ok) {
			return errors.internalError("换取令牌失败");
		}

		const tokenData = (await tokenResponse.json()) as GitHubTokenResponse & {
			error?: string;
		};

		if (tokenData.error) {
			return errors.badRequest(`GitHub 错误: ${tokenData.error}`);
		}

		// 从 GitHub 获取用户信息
		const userResponse = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `Bearer ${tokenData.access_token}`,
				Accept: "application/vnd.github.v3+json",
				"User-Agent": "Pulse-App",
			},
		});

		if (!userResponse.ok) {
			return errors.internalError("获取 GitHub 用户信息失败");
		}

		const githubUser = (await userResponse.json()) as GitHubUser;

		// 在 R2 中创建或更新用户
		const existingUser = await import("../../_shared/r2").then((r2) =>
			r2.getUser(env, githubUser.id.toString()),
		);

		const user: User = {
			id: githubUser.id.toString(),
			username: githubUser.login,
			avatar_url: githubUser.avatar_url,
			bio: existingUser?.bio || githubUser.bio || "",
			joined_at: existingUser?.joined_at || new Date().toISOString(),
			last_post_at: existingUser?.last_post_at || "",
			post_count: existingUser?.post_count || 0,
			is_admin: existingUser?.is_admin || false,
		};

		await upsertUser(env, user);

		// 生成 JWT
		const token = await signJWT(
			{
				sub: user.id,
				username: user.username,
			},
			JWT_SECRET,
			7, // 7 天有效期
		);

		// 清除 state cookie 并重定向到前端携带 token
		const frontendUrl = FRONTEND_URL || url.origin;
		const response = redirect(`${frontendUrl}/login/callback?token=${token}`);

		// 清除 oauth_state cookie
		response.headers.append(
			"Set-Cookie",
			"oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
		);

		return response;
	} catch (error) {
		console.error("OAuth 回调错误:", error);
		return errors.internalError("认证失败");
	}
};

// 处理 CORS 预检请求
export const onRequestOptions = () => handleCors();
