// 暗色模式管理 Composable
// 提供全局的暗色模式状态和控制

import { ref, watch } from "vue";

// ========== 类型定义 ==========

export type ThemeMode = "auto" | "light" | "dark";

// ========== 全局状态 ==========

const THEME_KEY = "pulse_theme";
const themeMode = ref<ThemeMode>("auto");
const isInitialized = ref(false);

// ========== 核心函数 ==========

/**
 * 应用主题到 DOM
 */
function applyTheme(mode: ThemeMode): void {
	const root = document.documentElement;

	if (mode === "dark") {
		root.classList.add("dark");
	} else if (mode === "light") {
		root.classList.remove("dark");
	} else {
		// auto: 根据系统偏好
		const prefersDark = window.matchMedia(
			"(prefers-color-scheme: dark)",
		).matches;
		if (prefersDark) {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}
	}
}

/**
 * 从 localStorage 读取主题设置
 */
function loadTheme(): ThemeMode {
	try {
		const saved = localStorage.getItem(THEME_KEY);
		if (saved && ["auto", "light", "dark"].includes(saved)) {
			return saved as ThemeMode;
		}
	} catch {
		// localStorage 不可用
	}
	return "auto";
}

/**
 * 保存主题设置到 localStorage
 */
function saveTheme(mode: ThemeMode): void {
	try {
		localStorage.setItem(THEME_KEY, mode);
	} catch {
		// localStorage 不可用
	}
}

/**
 * 全局初始化（应在应用启动时调用一次）
 */
export function initDarkMode(): void {
	if (isInitialized.value) return;

	// 加载保存的主题
	const savedTheme = loadTheme();
	themeMode.value = savedTheme;
	applyTheme(savedTheme);

	// 监听主题变化 - 立即生效
	watch(themeMode, (newMode) => {
		saveTheme(newMode);
		applyTheme(newMode);
	});

	// 监听系统主题变化
	const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
	mediaQuery.addEventListener("change", () => {
		if (themeMode.value === "auto") {
			applyTheme("auto");
		}
	});

	isInitialized.value = true;
}

// ========== Composable ==========

/**
 * 暗色模式 Composable
 */
export function useDarkMode() {
	// 确保已初始化
	if (!isInitialized.value) {
		initDarkMode();
	}

	/**
	 * 设置主题模式
	 */
	function setTheme(mode: ThemeMode): void {
		themeMode.value = mode;
	}

	/**
	 * 切换主题（auto -> light -> dark -> auto）
	 */
	function cycleTheme(): void {
		const modes: ThemeMode[] = ["auto", "light", "dark"];
		const currentIndex = modes.indexOf(themeMode.value);
		themeMode.value = modes[(currentIndex + 1) % modes.length] || "auto";
	}

	/**
	 * 获取当前实际的暗色状态
	 */
	function isDark(): boolean {
		if (themeMode.value === "dark") return true;
		if (themeMode.value === "light") return false;
		return window.matchMedia("(prefers-color-scheme: dark)").matches;
	}

	return {
		themeMode,
		isInitialized,
		setTheme,
		cycleTheme,
		isDark,
	};
}

export default useDarkMode;
