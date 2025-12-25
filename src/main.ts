import { createPinia } from "pinia";
import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { initDarkMode } from "./composables/useDarkMode";
import router from "./router";

// 初始化暗色模式（必须在应用挂载前，避免闪烁）
initDarkMode();

// 初始化 Mock 系统（仅在开发模式或启用 mock 时）
async function initApp() {
	// 动态导入 mock 模块，避免在生产环境中打包
	if (import.meta.env.DEV || import.meta.env.VITE_MOCK === "true") {
		const { initMock } = await import("./mocks");
		initMock();
	}

	const app = createApp(App);

	app.use(createPinia());
	app.use(router);

	app.mount("#app");
}

initApp();
