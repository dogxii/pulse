// 上传文件服务处理器
// GET /api/uploads/:year/:filename - 从 R2 提供上传的文件

import { getUpload } from "../../../_shared/r2";
import { errors, handleCors } from "../../../_shared/response";
import type { Env } from "../../../_shared/types";

interface CFContext {
	request: Request;
	env: Env;
	params: {
		year: string;
		filename: string;
	};
}

// GET /api/uploads/:year/:filename - 提供文件
export const onRequestGet = async ({ env, params }: CFContext) => {
	const { year, filename } = params;

	if (!year || !filename) {
		return errors.badRequest("年份和文件名不能为空");
	}

	// 验证年份格式（4 位数字）
	if (!/^\d{4}$/.test(year)) {
		return errors.badRequest("无效的年份格式");
	}

	// 验证文件名（只允许安全字符）
	if (!/^[a-zA-Z0-9-_.]+$/.test(filename)) {
		return errors.badRequest("无效的文件名");
	}

	try {
		const object = await getUpload(env, year, filename);

		if (!object) {
			return errors.notFound("文件不存在");
		}

		// 从存储的元数据获取内容类型，或从扩展名推断
		const contentType =
			object.httpMetadata?.contentType || getContentType(filename);

		// 返回带有适当请求头的文件
		return new Response(object.body, {
			status: 200,
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "public, max-age=31536000, immutable",
				"Access-Control-Allow-Origin": "*",
			},
		});
	} catch (error) {
		console.error("提供文件时出错:", error);
		return errors.internalError("提供文件失败");
	}
};

// 根据文件名推断内容类型的辅助函数
function getContentType(filename: string): string {
	const ext = filename.split(".").pop()?.toLowerCase();
	const types: Record<string, string> = {
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		gif: "image/gif",
		webp: "image/webp",
		avif: "image/avif",
		svg: "image/svg+xml",
	};
	return types[ext || ""] || "application/octet-stream";
}

// 处理 CORS 预检请求
export const onRequestOptions = () => handleCors();
