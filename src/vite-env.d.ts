/// <reference types="vite/client" />

// 全局常量（Vite define 注入）
declare const __APP_VERSION__: string;

// Vite 环境变量类型
interface ImportMetaEnv {
	readonly DEV: boolean;
	readonly PROD: boolean;
	readonly MODE: string;
	readonly BASE_URL: string;
	readonly VITE_MOCK?: string;
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
