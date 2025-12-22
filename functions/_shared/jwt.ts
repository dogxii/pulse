// JWT 工具函数 - 用于 Cloudflare Workers
// 使用 Web Crypto API（Workers 运行时可用）

import type { JWTPayload } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// 将 base64url 转换为 Uint8Array
function base64UrlDecode(str: string): Uint8Array {
	// 如果需要，添加填充
	const pad = str.length % 4;
	if (pad) {
		str += "=".repeat(4 - pad);
	}
	// 将 base64url 转换为 base64
	const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

// 将 Uint8Array 转换为 base64url
function base64UrlEncode(bytes: Uint8Array): string {
	const binary = String.fromCharCode(...bytes);
	const base64 = btoa(binary);
	// 将 base64 转换为 base64url
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// 从密钥创建 HMAC 密钥
async function createKey(secret: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
}

// 签发 JWT
export async function signJWT(
	payload: Omit<JWTPayload, "iat" | "exp">,
	secret: string,
	expiresInDays: number = 7,
): Promise<string> {
	const header = {
		alg: "HS256",
		typ: "JWT",
	};

	const now = Math.floor(Date.now() / 1000);
	const fullPayload: JWTPayload = {
		...payload,
		iat: now,
		exp: now + expiresInDays * 24 * 60 * 60,
	};

	const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
	const payloadB64 = base64UrlEncode(
		encoder.encode(JSON.stringify(fullPayload)),
	);
	const message = `${headerB64}.${payloadB64}`;

	const key = await createKey(secret);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(message),
	);
	const signatureB64 = base64UrlEncode(new Uint8Array(signature));

	return `${message}.${signatureB64}`;
}

// 验证并解码 JWT
export async function verifyJWT(
	token: string,
	secret: string,
): Promise<JWTPayload | null> {
	try {
		const parts = token.split(".");
		if (parts.length !== 3) {
			return null;
		}

		const [headerB64, payloadB64, signatureB64] = parts;
		const message = `${headerB64}.${payloadB64}`;

		const key = await createKey(secret);
		const signature = base64UrlDecode(signatureB64);
		const isValid = await crypto.subtle.verify(
			"HMAC",
			key,
			signature,
			encoder.encode(message),
		);

		if (!isValid) {
			return null;
		}

		const payload: JWTPayload = JSON.parse(
			decoder.decode(base64UrlDecode(payloadB64)),
		);

		// 检查是否过期
		const now = Math.floor(Date.now() / 1000);
		if (payload.exp && payload.exp < now) {
			return null;
		}

		return payload;
	} catch {
		return null;
	}
}

// 从 Authorization 请求头中提取 JWT
export function extractToken(request: Request): string | null {
	const authHeader = request.headers.get("Authorization");
	if (!authHeader) {
		return null;
	}

	const parts = authHeader.split(" ");
	if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
		return null;
	}

	return parts[1];
}
