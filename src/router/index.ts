import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: "/",
			name: "home",
			component: HomeView,
		},
		{
			path: "/post/:id",
			name: "post-detail",
			// Lazy load post detail page
			component: () => import("../views/PostDetailView.vue"),
		},
		{
			path: "/u/:username",
			name: "profile",
			// Lazy load profile page
			component: () => import("../views/ProfileView.vue"),
		},
		{
			path: "/admin",
			name: "admin",
			// Lazy load admin page
			component: () => import("../views/AdminView.vue"),
		},
		{
			path: "/login",
			name: "login",
			component: () => import("../views/LoginView.vue"),
		},
		{
			path: "/login/callback",
			name: "login-callback",
			component: () => import("../views/LoginCallbackView.vue"),
		},
		{
			path: "/new",
			name: "new-post",
			component: () => import("../views/NewPostView.vue"),
			meta: { requiresAuth: true },
		},
		{
			path: "/:pathMatch(.*)*",
			name: "not-found",
			component: () => import("../views/NotFoundView.vue"),
		},
	],
});

// Navigation guard for auth-required routes
router.beforeEach((to, _from, next) => {
	const requiresAuth = to.meta.requiresAuth;

	if (requiresAuth) {
		// Check if token exists in localStorage
		const token = localStorage.getItem("pulse_auth_token");
		if (!token) {
			next({ name: "login", query: { redirect: to.fullPath } });
			return;
		}
	}

	next();
});

export default router;
