// 调试端点 - 检查环境变量配置状态
// GET /api/debug - 返回环境变量配置状态（不暴露实际值）
// 注意：生产环境中应删除此文件

import { handleCors } from "../_shared/response";
import type { Env } from "../_shared/types";

interface CFContext {
	request: Request;
	env: Env;
	params: Record<string, string>;
}

export const onRequestGet = async ({ env }: CFContext) => {
	const config = {
		GITHUB_CLIENT_ID: {
			configured: !!env.GITHUB_CLIENT_ID,
			length: env.GITHUB_CLIENT_ID?.length || 0,
			preview: env.GITHUB_CLIENT_ID
				? `${env.GITHUB_CLIENT_ID.substring(0, 4)}...`
				: null,
		},
		GITHUB_CLIENT_SECRET: {
			configured: !!env.GITHUB_CLIENT_SECRET,
			length: env.GITHUB_CLIENT_SECRET?.length || 0,
		},
		JWT_SECRET: {
			configured: !!env.JWT_SECRET,
			length: env.JWT_SECRET?.length || 0,
		},
		FRONTEND_URL: {
			configured: !!env.FRONTEND_URL,
			value: env.FRONTEND_URL || null,
		},
		R2_BUCKET: {
			configured: !!env.R2_BUCKET,
			type: typeof env.R2_BUCKET,
		},
	};

	const allConfigured =
		config.GITHUB_CLIENT_ID.configured &&
		config.GITHUB_CLIENT_SECRET.configured &&
		config.JWT_SECRET.configured;

	return new Response(
		JSON.stringify(
			{
				success: true,
				message: allConfigured
					? "所有必需的环境变量已配置"
					: "部分环境变量未配置",
				config,
				timestamp: new Date().toISOString(),
			},
			null,
			2,
		),
		{
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
		},
	);
};

// 处理 CORS 预检请求
export const onRequestOptions = () => handleCors();
