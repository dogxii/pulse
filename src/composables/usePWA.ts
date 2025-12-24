// PWA 相关功能组合式函数
// 提供应用更新检测、安装提示等 PWA 功能

import { onMounted, onUnmounted, ref } from "vue";

// ========== 类型定义 ==========

interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[];
	readonly userChoice: Promise<{
		outcome: "accepted" | "dismissed";
		platform: string;
	}>;
	prompt(): Promise<void>;
}

// ========== 状态 ==========

// 是否有新版本可用
const hasUpdate = ref(false);
// 是否可以安装 PWA
const canInstall = ref(false);
// 安装提示事件
let deferredPrompt: BeforeInstallPromptEvent | null = null;
// Service Worker 注册
let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * PWA 功能组合式函数
 */
export function usePWA() {
	// ========== 方法 ==========

	/**
	 * 检查 Service Worker 更新
	 */
	async function checkForUpdates(): Promise<boolean> {
		if (!swRegistration) {
			return false;
		}

		try {
			await swRegistration.update();
			return swRegistration.waiting !== null;
		} catch (e) {
			globalThis.console.warn("检查更新失败:", e);
			return false;
		}
	}

	/**
	 * 应用更新（刷新页面以加载新版本）
	 */
	function applyUpdate(): void {
		if (swRegistration?.waiting) {
			// 通知 Service Worker 跳过等待并激活
			swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
		}

		// 刷新页面
		globalThis.window.location.reload();
	}

	/**
	 * 显示安装提示
	 */
	async function promptInstall(): Promise<boolean> {
		if (!deferredPrompt) {
			return false;
		}

		try {
			// 显示安装提示
			await deferredPrompt.prompt();

			// 等待用户选择
			const { outcome } = await deferredPrompt.userChoice;

			// 清除提示事件
			deferredPrompt = null;
			canInstall.value = false;

			return outcome === "accepted";
		} catch (e) {
			globalThis.console.warn("安装提示失败:", e);
			return false;
		}
	}

	/**
	 * 清除所有缓存
	 */
	async function clearCache(): Promise<void> {
		if (swRegistration?.active) {
			swRegistration.active.postMessage({ type: "CLEAR_CACHE" });
		}

		// 也清除浏览器缓存
		if ("caches" in globalThis.window) {
			const cacheNames = await globalThis.caches.keys();
			await Promise.all(
				cacheNames
					.filter((name) => name.startsWith("pulse-"))
					.map((name) => globalThis.caches.delete(name)),
			);
		}
	}

	/**
	 * 检查是否作为 PWA 运行
	 */
	function isPWA(): boolean {
		// 检查是否在 standalone 模式下运行
		const isStandalone = globalThis.window.matchMedia(
			"(display-mode: standalone)",
		).matches;
		// iOS Safari 检查
		const isIosStandalone =
			"standalone" in globalThis.navigator &&
			(globalThis.navigator as unknown as { standalone: boolean }).standalone;

		return isStandalone || isIosStandalone;
	}

	// ========== 事件处理 ==========

	/**
	 * 处理 beforeinstallprompt 事件
	 */
	function handleBeforeInstallPrompt(e: Event): void {
		// 阻止默认的安装提示
		e.preventDefault();
		// 保存事件以便稍后使用
		deferredPrompt = e as BeforeInstallPromptEvent;
		canInstall.value = true;
	}

	/**
	 * 处理 appinstalled 事件
	 */
	function handleAppInstalled(): void {
		deferredPrompt = null;
		canInstall.value = false;
		globalThis.console.log("PWA 已安装");
	}

	/**
	 * 处理 Service Worker 控制器变化
	 */
	function handleControllerChange(): void {
		// 新的 Service Worker 已激活，刷新页面
		globalThis.window.location.reload();
	}

	// ========== 生命周期 ==========

	onMounted(() => {
		// 监听安装提示事件
		globalThis.window.addEventListener(
			"beforeinstallprompt",
			handleBeforeInstallPrompt,
		);

		// 监听应用已安装事件
		globalThis.window.addEventListener("appinstalled", handleAppInstalled);

		// 获取 Service Worker 注册
		if ("serviceWorker" in globalThis.navigator) {
			globalThis.navigator.serviceWorker.ready.then((registration) => {
				swRegistration = registration;

				// 检查是否有等待中的更新
				if (registration.waiting) {
					hasUpdate.value = true;
				}

				// 监听新的 Service Worker 安装
				registration.addEventListener("updatefound", () => {
					const newWorker = registration.installing;
					if (newWorker) {
						newWorker.addEventListener("statechange", () => {
							if (
								newWorker.state === "installed" &&
								globalThis.navigator.serviceWorker.controller
							) {
								hasUpdate.value = true;
							}
						});
					}
				});
			});

			// 监听控制器变化
			globalThis.navigator.serviceWorker.addEventListener(
				"controllerchange",
				handleControllerChange,
			);
		}
	});

	onUnmounted(() => {
		globalThis.window.removeEventListener(
			"beforeinstallprompt",
			handleBeforeInstallPrompt,
		);
		globalThis.window.removeEventListener("appinstalled", handleAppInstalled);

		if ("serviceWorker" in globalThis.navigator) {
			globalThis.navigator.serviceWorker.removeEventListener(
				"controllerchange",
				handleControllerChange,
			);
		}
	});

	return {
		// 状态
		hasUpdate,
		canInstall,

		// 方法
		checkForUpdates,
		applyUpdate,
		promptInstall,
		clearCache,
		isPWA,
	};
}

export default usePWA;
