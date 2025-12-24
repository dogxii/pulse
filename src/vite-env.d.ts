/// <reference types="vite/client" />

// Vite 环境变量类型定义

interface ImportMetaEnv {
	/** 是否为开发模式 */
	readonly DEV: boolean;
	/** 是否为生产模式 */
	readonly PROD: boolean;
	/** 应用模式 (development/production) */
	readonly MODE: string;
	/** 基础 URL */
	readonly BASE_URL: string;
	/** 是否启用 Mock API */
	readonly VITE_MOCK?: string;
	/** API 基础 URL (可选) */
	readonly VITE_API_BASE?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

// Vue 单文件组件类型声明
declare module "*.vue" {
	import type { DefineComponent } from "vue";
	const component: DefineComponent<object, object, unknown>;
	export default component;
}
