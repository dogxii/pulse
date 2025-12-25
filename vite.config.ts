import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

// 读取 package.json 版本号
const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
const version = pkg.version;

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		tailwindcss(),
		// 自定义插件：生成版本文件供 Service Worker 使用
		{
			name: "generate-version",
			buildStart() {
				// 生成 version.json 到 public 目录
				const versionInfo = {
					version,
					buildTime: new Date().toISOString(),
				};
				writeFileSync(
					resolve(__dirname, "public/version.json"),
					JSON.stringify(versionInfo, null, 2),
				);
			},
		},
	],
	// 注入版本号到应用
	define: {
		__APP_VERSION__: JSON.stringify(version),
	},
});
