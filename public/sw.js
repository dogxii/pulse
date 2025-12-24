// Pulse Service Worker
// 提供离线支持和智能缓存策略

const CACHE_NAME = "pulse-v1";
const STATIC_CACHE_NAME = "pulse-static-v1";
const DYNAMIC_CACHE_NAME = "pulse-dynamic-v1";
const IMAGE_CACHE_NAME = "pulse-images-v1";

// 静态资源（预缓存）
const STATIC_ASSETS = ["/", "/favicon.svg", "/guest.svg", "/manifest.json"];

// 需要网络优先的 API 路径
const API_ROUTES = ["/api/posts", "/api/users", "/api/auth", "/api/comments"];

// 图片域名白名单
const IMAGE_HOSTS = ["avatars.githubusercontent.com", "api.dicebear.com"];

/**
 * 安装事件 - 预缓存静态资源
 */
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(STATIC_CACHE_NAME)
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
		caches
			.keys()
			.then((cacheNames) => {
				return Promise.all(
					cacheNames
						.filter((name) => {
							// 删除旧版本的缓存
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
 * 检查是否为静态资源
 */
function isStaticAsset(url) {
	const staticExtensions = [".js", ".css", ".woff", ".woff2", ".ttf", ".eot"];
	return staticExtensions.some((ext) => url.pathname.endsWith(ext));
}

/**
 * 网络优先策略（用于 API 请求）
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
			return cached;
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
 * 缓存优先策略（用于静态资源和图片）
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
 * Stale-While-Revalidate 策略（用于页面导航）
 */
async function staleWhileRevalidate(request, cacheName = DYNAMIC_CACHE_NAME) {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);

	// 在后台更新缓存
	const fetchPromise = fetch(request)
		.then((response) => {
			if (response.ok) {
				cache.put(request, response.clone());
			}
			return response;
		})
		.catch(() => null);

	// 如果有缓存，立即返回
	if (cached) {
		fetchPromise; // 后台更新
		return cached;
	}

	// 没有缓存，等待网络响应
	const response = await fetchPromise;
	if (response) {
		return response;
	}

	// 返回离线页面
	return caches.match("/") || new Response("离线", { status: 503 });
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

	// 静态资源 - 缓存优先
	if (isStaticAsset(url)) {
		event.respondWith(cacheFirst(event.request, STATIC_CACHE_NAME));
		return;
	}

	// 页面导航 - Stale-While-Revalidate
	if (event.request.mode === "navigate") {
		event.respondWith(staleWhileRevalidate(event.request));
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
						.map((name) => caches.delete(name)),
				);
			}),
		);
	}
});

/**
 * 后台同步（可选功能）
 */
self.addEventListener("sync", (event) => {
	if (event.tag === "sync-posts") {
		// 可以在这里实现离线发帖后的同步逻辑
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
