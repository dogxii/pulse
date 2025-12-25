// Pulse Service Worker
// 提供离线支持和智能缓存策略
// 版本号从 version.json 动态加载

// 默认版本（会被 version.json 覆盖）
let CACHE_VERSION = "1.0.0";

// 缓存名称（会在获取版本后更新）
let STATIC_CACHE_NAME = `pulse-static-${CACHE_VERSION}`;
let DYNAMIC_CACHE_NAME = `pulse-dynamic-${CACHE_VERSION}`;
let IMAGE_CACHE_NAME = `pulse-images-${CACHE_VERSION}`;

// 静态资源（预缓存）
const STATIC_ASSETS = ["/favicon.svg", "/guest.svg", "/manifest.json"];

// 图片域名白名单
const IMAGE_HOSTS = ["avatars.githubusercontent.com", "api.dicebear.com"];

/**
 * 更新缓存名称
 */
function updateCacheNames(version) {
	CACHE_VERSION = version;
	STATIC_CACHE_NAME = `pulse-static-${version}`;
	DYNAMIC_CACHE_NAME = `pulse-dynamic-${version}`;
	IMAGE_CACHE_NAME = `pulse-images-${version}`;
}

/**
 * 获取版本信息
 */
async function fetchVersion() {
	try {
		const response = await fetch("/version.json?t=" + Date.now());
		if (response.ok) {
			const data = await response.json();
			if (data.version) {
				updateCacheNames(data.version);
				console.log("[SW] 版本:", CACHE_VERSION);
			}
		}
	} catch (e) {
		console.warn("[SW] 获取版本失败，使用默认版本:", CACHE_VERSION);
	}
}

/**
 * 安装事件 - 预缓存静态资源
 */
self.addEventListener("install", (event) => {
	event.waitUntil(
		fetchVersion()
			.then(() => caches.open(STATIC_CACHE_NAME))
			.then((cache) => {
				console.log("[SW] 预缓存静态资源");
				return cache.addAll(STATIC_ASSETS);
			})
			.then(() => {
				// 立即激活新的 Service Worker
				return self.skipWaiting();
			}),
	);
});

/**
 * 激活事件 - 清理旧缓存
 */
self.addEventListener("activate", (event) => {
	event.waitUntil(
		fetchVersion()
			.then(() => caches.keys())
			.then((cacheNames) => {
				return Promise.all(
					cacheNames
						.filter((name) => {
							// 删除所有旧版本的 pulse 缓存
							return (
								name.startsWith("pulse-") &&
								name !== STATIC_CACHE_NAME &&
								name !== DYNAMIC_CACHE_NAME &&
								name !== IMAGE_CACHE_NAME
							);
						})
						.map((name) => {
							console.log("[SW] 删除旧缓存:", name);
							return caches.delete(name);
						}),
				);
			})
			.then(() => {
				// 立即接管所有客户端
				return self.clients.claim();
			}),
	);
});

/**
 * 检查是否为 API 请求
 */
function isApiRequest(url) {
	return url.pathname.startsWith("/api/");
}

/**
 * 检查是否为图片请求
 */
function isImageRequest(request) {
	const url = new URL(request.url);

	// 检查是否为图片文件扩展名
	const imageExtensions = [
		".jpg",
		".jpeg",
		".png",
		".gif",
		".webp",
		".svg",
		".ico",
	];
	if (imageExtensions.some((ext) => url.pathname.toLowerCase().endsWith(ext))) {
		return true;
	}

	// 检查是否为图片 Accept 头
	const acceptHeader = request.headers.get("Accept");
	if (acceptHeader && acceptHeader.includes("image/")) {
		return true;
	}

	// 检查是否为已知图片域名
	if (IMAGE_HOSTS.some((host) => url.hostname.includes(host))) {
		return true;
	}

	return false;
}

/**
 * 检查是否为静态资源（JS/CSS 等）
 */
function isStaticAsset(url) {
	const staticExtensions = [".js", ".css", ".woff", ".woff2", ".ttf", ".eot"];
	return staticExtensions.some((ext) => url.pathname.endsWith(ext));
}

/**
 * 检查是否为带 hash 的静态资源（可以长期缓存）
 * Vite 构建的资源通常带有 hash，如 index-abc123.js
 */
function isHashedAsset(url) {
	// 匹配带 hash 的文件名模式：name-hash.ext 或 name.hash.ext
	const hashedPattern = /[-.][\da-f]{8,}\.(js|css|woff2?|ttf|eot)$/i;
	return hashedPattern.test(url.pathname);
}

/**
 * 网络优先策略（用于 API 请求和 HTML 页面）
 * 总是尝试获取最新内容，失败时才使用缓存
 */
async function networkFirst(request, cacheName = DYNAMIC_CACHE_NAME) {
	try {
		const response = await fetch(request);

		// 只缓存成功的 GET 请求
		if (response.ok && request.method === "GET") {
			const cache = await caches.open(cacheName);
			cache.put(request, response.clone());
		}

		return response;
	} catch (error) {
		// 网络失败，尝试从缓存获取
		const cached = await caches.match(request);
		if (cached) {
			console.log("[SW] 使用缓存（离线）:", request.url);
			return cached;
		}

		// 对于 HTML 页面，返回根页面（SPA fallback）
		if (
			request.mode === "navigate" ||
			request.headers.get("Accept")?.includes("text/html")
		) {
			const fallback = await caches.match("/");
			if (fallback) {
				return fallback;
			}
		}

		// 返回离线响应
		return new Response(
			JSON.stringify({
				success: false,
				error: "您当前处于离线状态",
			}),
			{
				status: 503,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}

/**
 * 缓存优先策略（用于带 hash 的静态资源和图片）
 * 这些资源内容不会变化，可以长期缓存
 */
async function cacheFirst(request, cacheName = STATIC_CACHE_NAME) {
	const cached = await caches.match(request);
	if (cached) {
		return cached;
	}

	try {
		const response = await fetch(request);

		// 缓存成功的响应
		if (response.ok) {
			const cache = await caches.open(cacheName);
			cache.put(request, response.clone());
		}

		return response;
	} catch (error) {
		// 对于图片，返回占位符（如果有的话）
		if (isImageRequest(request)) {
			const placeholder = await caches.match("/guest.svg");
			if (placeholder) {
				return placeholder;
			}
		}

		throw error;
	}
}

/**
 * 网络优先 + 快速回退策略（用于不带 hash 的静态资源）
 * 设置较短的网络超时，避免用户等待太久
 */
async function networkFirstWithTimeout(
	request,
	cacheName = STATIC_CACHE_NAME,
	timeout = 3000,
) {
	const cached = await caches.match(request);

	// 创建一个带超时的 fetch promise
	const fetchPromise = new Promise(async (resolve, reject) => {
		const timeoutId = setTimeout(() => {
			reject(new Error("Network timeout"));
		}, timeout);

		try {
			const response = await fetch(request);
			clearTimeout(timeoutId);

			// 缓存成功的响应
			if (response.ok) {
				const cache = await caches.open(cacheName);
				cache.put(request, response.clone());
			}

			resolve(response);
		} catch (error) {
			clearTimeout(timeoutId);
			reject(error);
		}
	});

	try {
		return await fetchPromise;
	} catch (error) {
		// 网络失败或超时，使用缓存
		if (cached) {
			console.log("[SW] 网络超时，使用缓存:", request.url);
			return cached;
		}
		throw error;
	}
}

/**
 * Fetch 事件 - 拦截网络请求
 */
self.addEventListener("fetch", (event) => {
	const url = new URL(event.request.url);

	// 只处理同源请求和白名单域名
	if (
		url.origin !== location.origin &&
		!IMAGE_HOSTS.some((host) => url.hostname.includes(host))
	) {
		return;
	}

	// 跳过非 GET 请求
	if (event.request.method !== "GET") {
		return;
	}

	// 跳过 version.json（始终获取最新）
	if (url.pathname === "/version.json") {
		return;
	}

	// API 请求 - 网络优先
	if (isApiRequest(url)) {
		event.respondWith(networkFirst(event.request));
		return;
	}

	// 图片请求 - 缓存优先
	if (isImageRequest(event.request)) {
		event.respondWith(cacheFirst(event.request, IMAGE_CACHE_NAME));
		return;
	}

	// 带 hash 的静态资源 - 缓存优先（内容不变）
	if (isHashedAsset(url)) {
		event.respondWith(cacheFirst(event.request, STATIC_CACHE_NAME));
		return;
	}

	// 不带 hash 的静态资源 - 网络优先 + 超时回退
	if (isStaticAsset(url)) {
		event.respondWith(
			networkFirstWithTimeout(event.request, STATIC_CACHE_NAME, 2000),
		);
		return;
	}

	// 页面导航（HTML）- 始终网络优先
	if (event.request.mode === "navigate") {
		event.respondWith(networkFirst(event.request, DYNAMIC_CACHE_NAME));
		return;
	}

	// 其他请求 - 网络优先
	event.respondWith(networkFirst(event.request));
});

/**
 * 消息事件 - 处理来自页面的消息
 */
self.addEventListener("message", (event) => {
	if (event.data && event.data.type === "SKIP_WAITING") {
		self.skipWaiting();
	}

	if (event.data && event.data.type === "CLEAR_CACHE") {
		event.waitUntil(
			caches.keys().then((cacheNames) => {
				return Promise.all(
					cacheNames
						.filter((name) => name.startsWith("pulse-"))
						.map((name) => {
							console.log("[SW] 清除缓存:", name);
							return caches.delete(name);
						}),
				);
			}),
		);
	}

	// 获取版本信息
	if (event.data && event.data.type === "GET_VERSION") {
		event.ports[0].postMessage({
			version: CACHE_VERSION,
			caches: {
				static: STATIC_CACHE_NAME,
				dynamic: DYNAMIC_CACHE_NAME,
				images: IMAGE_CACHE_NAME,
			},
		});
	}
});

/**
 * 后台同步（可选功能）
 */
self.addEventListener("sync", (event) => {
	if (event.tag === "sync-posts") {
		console.log("[SW] 后台同步: sync-posts");
	}
});

/**
 * 推送通知（可选功能）
 */
self.addEventListener("push", (event) => {
	if (event.data) {
		const data = event.data.json();

		event.waitUntil(
			self.registration.showNotification(data.title || "Pulse", {
				body: data.body || "您有新消息",
				icon: "/favicon.svg",
				badge: "/favicon.svg",
				tag: data.tag || "pulse-notification",
				data: data.url || "/",
			}),
		);
	}
});

/**
 * 点击通知
 */
self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	event.waitUntil(clients.openWindow(event.notification.data || "/"));
});

console.log("[SW] Service Worker 已加载");
