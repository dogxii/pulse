// 图片上传 API 处理器
// POST /api/uploads - 上传图片（需要认证）

import { extractToken, verifyJWT } from "../../_shared/jwt";
import { getUser, uploadImage } from "../../_shared/r2";
import { errors, handleCors, success } from "../../_shared/response";
import type { Env } from "../../_shared/types";

interface CFContext {
	request: Request;
	env: Env;
	params: Record<string, string>;
}

// 允许的图片类型
const ALLOWED_TYPES = [
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/avif",
];

// 最大文件大小：5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// POST /api/uploads - 上传图片
export const onRequestPost = async ({ request, env }: CFContext) => {
	const { JWT_SECRET } = env;

	if (!JWT_SECRET) {
		return errors.internalError("认证未配置");
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

	// 验证用户存在
	const user = await getUser(env, payload.sub);
	if (!user) {
		return errors.notFound("用户不存在");
	}

	try {
		// 解析 multipart 表单数据
		const formData = await request.formData();
		const file = formData.get("file") as File | null;

		if (!file || typeof file === "string") {
			return errors.badRequest("未提供文件");
		}

		// 验证文件类型
		const fileObj = file;
		if (!ALLOWED_TYPES.includes(fileObj.type)) {
			return errors.badRequest(
				`无效的文件类型。允许的类型：${ALLOWED_TYPES.join(", ")}`,
			);
		}

		// 验证文件大小
		if (fileObj.size > MAX_FILE_SIZE) {
			return errors.badRequest(
				`文件过大。最大允许：${MAX_FILE_SIZE / 1024 / 1024}MB`,
			);
		}

		// 生成唯一文件名
		const ext = fileObj.name.split(".").pop() || "jpg";
		const filename = `${crypto.randomUUID()}.${ext}`;

		// 读取文件为 ArrayBuffer
		const arrayBuffer = await fileObj.arrayBuffer();

		// 上传到 R2
		const url = await uploadImage(env, arrayBuffer, filename, fileObj.type);

		if (!url) {
			return errors.internalError("上传文件失败");
		}

		return success({
			url,
			filename,
			size: fileObj.size,
			type: fileObj.type,
		});
	} catch (error) {
		console.error("上传文件时出错:", error);
		return errors.internalError("上传文件失败");
	}
};

// 处理 CORS 预检请求
export const onRequestOptions = () => handleCors();
