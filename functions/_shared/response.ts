// API 响应帮助函数 - 用于 Cloudflare Functions

import type { APIResponse, PaginatedResponse } from "./types";

// CORS 跨域请求头
const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
	"Access-Control-Max-Age": "86400",
};

/**
 * 返回带有正确请求头的 JSON 响应
 */
export function json<T>(
	data: T,
	status: number = 200,
	headers: Record<string, string> = {},
): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json",
			...corsHeaders,
			...headers,
		},
	});
}

/**
 * 返回成功响应
 */
export function success<T>(data: T, status: number = 200): Response {
	const response: APIResponse<T> = {
		success: true,
		data,
	};
	return json(response, status);
}

/**
 * 返回分页响应
 */
export function paginated<T>(
	items: T[],
	total: number,
	page: number,
	limit: number,
): Response {
	const response: PaginatedResponse<T> = {
		items,
		total,
		page,
		limit,
		has_more: page * limit < total,
	};
	return json(response);
}

/**
 * 返回错误响应
 */
export function error(message: string, status: number = 400): Response {
	const response: APIResponse = {
		success: false,
		error: message,
	};
	return json(response, status);
}

// 常用错误响应
export const errors = {
	badRequest: (message: string = "请求参数错误") => error(message, 400),
	unauthorized: (message: string = "未授权") => error(message, 401),
	forbidden: (message: string = "禁止访问") => error(message, 403),
	notFound: (message: string = "未找到") => error(message, 404),
	methodNotAllowed: (message: string = "方法不允许") => error(message, 405),
	conflict: (message: string = "冲突") => error(message, 409),
	internalError: (message: string = "服务器内部错误") => error(message, 500),
};

/**
 * 处理 CORS 预检请求
 */
export function handleCors(): Response {
	return new Response(null, {
		status: 204,
		headers: corsHeaders,
	});
}

/**
 * 返回重定向响应
 */
export function redirect(url: string, status: number = 302): Response {
	return new Response(null, {
		status,
		headers: {
			Location: url,
			...corsHeaders,
		},
	});
}
