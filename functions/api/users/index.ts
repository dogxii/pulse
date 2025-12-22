// 用户列表 API 处理器
// GET /api/users - 获取所有用户列表

import { getUsers } from "../../_shared/db";
import { errors, handleCors, success } from "../../_shared/response";
import type { Env } from "../../_shared/types";

interface CFContext {
	request: Request;
	env: Env;
	params: Record<string, string>;
}

// GET /api/users - 获取所有用户列表
export const onRequestGet = async ({ env }: CFContext) => {
	try {
		const users = await getUsers(env);

		// 按 last_post_at 排序（最近活跃的在前），然后按 joined_at 排序
		const sortedUsers = [...users].sort((a, b) => {
			// 有最近发帖的用户排在前面
			if (a.last_post_at && b.last_post_at) {
				return (
					new Date(b.last_post_at).getTime() -
					new Date(a.last_post_at).getTime()
				);
			}
			if (a.last_post_at) return -1;
			if (b.last_post_at) return 1;

			// 然后按加入时间排序
			return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime();
		});

		return success(sortedUsers);
	} catch (error) {
		console.error("获取用户列表时出错:", error);
		return errors.internalError("获取用户列表失败");
	}
};

// 处理 CORS 预检请求
export const onRequestOptions = () => handleCors();
