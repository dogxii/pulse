// 本地测试模拟数据
// 提供丰富的测试数据用于 UI 开发和测试

import type { Comment, Post, User } from "../types";

// ========== 模拟用户数据 ==========

export const mockUsers: User[] = [
	{
		id: "user-1",
		username: "zhangsan",
		avatar_url: "https://api.dicebear.com/9.x/avataaars/svg?seed=zhangsan",
		bio: "全栈开发工程师 | Vue.js 爱好者 | 开源贡献者",
		joined_at: "2024-01-15T08:00:00.000Z",
		last_post_at: new Date().toISOString(),
		post_count: 42,
		is_admin: true,
	},
	{
		id: "user-2",
		username: "lisi",
		avatar_url: "https://api.dicebear.com/9.x/avataaars/svg?seed=lisi",
		bio: "设计师 & 前端开发 | 热爱创造美好的用户体验",
		joined_at: "2024-02-20T10:30:00.000Z",
		last_post_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
		post_count: 28,
		is_admin: false,
	},
	{
		id: "user-3",
		username: "wangwu",
		avatar_url: "https://api.dicebear.com/9.x/avataaars/svg?seed=wangwu",
		bio: "后端工程师 | Go & Rust | 云原生",
		joined_at: "2024-03-10T14:20:00.000Z",
		last_post_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
		post_count: 15,
		is_admin: false,
	},
	{
		id: "user-4",
		username: "zhaoliu",
		avatar_url: "https://api.dicebear.com/9.x/avataaars/svg?seed=zhaoliu",
		bio: "产品经理 | 用户体验研究 | 数据驱动决策",
		joined_at: "2024-04-05T09:15:00.000Z",
		last_post_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
		post_count: 8,
		is_admin: false,
	},
	{
		id: "user-5",
		username: "sunqi",
		avatar_url: "https://api.dicebear.com/9.x/avataaars/svg?seed=sunqi",
		bio: "",
		joined_at: "2024-05-01T16:45:00.000Z",
		last_post_at: "",
		post_count: 0,
		is_admin: false,
	},
	{
		id: "user-6",
		username: "zhouba",
		avatar_url: "https://api.dicebear.com/9.x/avataaars/svg?seed=zhouba",
		bio: "iOS 开发者 | Swift 忠实粉丝 | Apple 生态",
		joined_at: "2024-01-20T11:00:00.000Z",
		last_post_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
		post_count: 23,
		is_admin: false,
	},
];

// ========== 模拟帖子数据 ==========

export const mockPosts: Post[] = [
	{
		id: "post-1",
		user_id: "user-1",
		content: `# 🎉 Pulse 项目正式上线！

经过几周的开发，我们的社区平台终于完成了！

## 主要功能

- **Markdown 支持** - 支持完整的 Markdown 语法
- **图片上传** - 支持拖拽上传图片
- **暗色模式** - 自动跟随系统或手动切换
- **PWA 支持** - 可以安装为本地应用

## 技术栈

\`\`\`
Vue 3 + TypeScript + Tailwind CSS + Cloudflare Pages
\`\`\`

感谢大家的支持！🙏`,
		images: [
			"https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
		],
		created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
		likes: ["user-2", "user-3", "user-4", "user-6"],
		comments_count: 3,
		user: mockUsers[0],
	},
	{
		id: "post-2",
		user_id: "user-2",
		content: `今天完成了一个新的设计稿，分享给大家看看 ✨

使用了最新的设计趋势：
- 玻璃拟态效果
- 渐变色背景
- 圆角卡片设计

希望大家喜欢！`,
		images: [
			"https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80",
			"https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&q=80",
		],
		created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
		likes: ["user-1", "user-3"],
		comments_count: 1,
		user: mockUsers[1],
	},
	{
		id: "post-3",
		user_id: "user-3",
		content: `分享一个 Go 语言的并发技巧：

使用 \`errgroup\` 来优雅地处理多个 goroutine 的错误：

\`\`\`go
g, ctx := errgroup.WithContext(context.Background())

g.Go(func() error {
    return fetchData(ctx, "api1")
})

g.Go(func() error {
    return fetchData(ctx, "api2")
})

if err := g.Wait(); err != nil {
    log.Fatal(err)
}
\`\`\`

这样可以同时处理多个任务，任何一个出错都会取消其他任务。`,
		images: [],
		created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
		likes: ["user-1"],
		comments_count: 2,
		user: mockUsers[2],
	},
	{
		id: "post-4",
		user_id: "user-4",
		content: `用户调研小技巧 📝

> 好的问题不是问用户想要什么，而是观察他们做什么。

今天做了一轮用户访谈，发现了几个有趣的洞察：

1. 用户更喜欢简洁的界面
2. 加载速度是最重要的体验指标
3. 移动端使用占比达到 70%

数据驱动，用户至上！`,
		images: [],
		created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
		likes: ["user-1", "user-2", "user-6"],
		comments_count: 0,
		user: mockUsers[3],
	},
	{
		id: "post-5",
		user_id: "user-6",
		content: `SwiftUI 真的太棒了！🍎

今天用 SwiftUI 写了一个动画效果：

\`\`\`swift
struct PulseAnimation: View {
    @State private var animate = false

    var body: some View {
        Circle()
            .fill(Color.blue)
            .frame(width: 100, height: 100)
            .scaleEffect(animate ? 1.2 : 1.0)
            .opacity(animate ? 0.5 : 1.0)
            .animation(.easeInOut(duration: 1).repeatForever(), value: animate)
            .onAppear { animate = true }
    }
}
\`\`\`

声明式 UI 写起来真的很舒服！`,
		images: [
			"https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80",
		],
		created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
		likes: ["user-1", "user-2"],
		comments_count: 1,
		user: mockUsers[5],
	},
	{
		id: "post-9",
		user_id: "user-1",
		content: `# Markdown 功能测试 📝

测试一下所有支持的 Markdown 语法：

## 文本样式

**粗体文字** 和 __另一种粗体__

*斜体文字* 和 _另一种斜体_

~~删除线文字~~

\`行内代码\` 示例

## 引用块

> 这是一个引用块的例子
> 可以包含多行内容
> 非常适合引用他人的话

## 列表

### 无序列表
- 苹果
- 香蕉
- 橙子

### 有序列表
1. 第一步
2. 第二步
3. 第三步

### 任务列表
- [x] 完成 UI 设计
- [x] 实现前端功能
- [ ] 编写测试用例
- [ ] 部署到生产环境

## 表格

| 功能 | 状态 | 优先级 |
|------|:----:|-------:|
| Markdown | ✅ 完成 | 高 |
| 图片上传 | ✅ 完成 | 高 |
| 评论系统 | ✅ 完成 | 中 |
| 通知 | ⏳ 进行中 | 低 |

## 链接

访问我们的网站：https://github.com

或者使用 [链接文字](https://example.com)

---

以上就是 Markdown 的常用功能！`,
		images: [],
		created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
		likes: ["user-2", "user-3", "user-6"],
		comments_count: 2,
		user: mockUsers[0],
	},
	{
		id: "post-6",
		user_id: "user-1",
		content: `周末去了趟咖啡馆 ☕️

安静地写了一下午代码，效率出奇地高。

有时候换个环境真的能带来不一样的灵感。`,
		images: [
			"https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80",
			"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
			"https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&q=80",
		],
		created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
		likes: ["user-2", "user-4"],
		comments_count: 2,
		user: mockUsers[0],
	},
	{
		id: "post-7",
		user_id: "user-2",
		content: `设计师的日常：

- 09:00 看需求文档
- 10:00 开始画原型
- 11:00 需求变了
- 12:00 午饭
- 14:00 继续画原型
- 15:00 需求又变了
- 16:00 开会讨论
- 17:00 需求定了
- 18:00 加班重新画

😂 你们是不是也这样？`,
		images: [],
		created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
		likes: ["user-1", "user-3", "user-4", "user-6"],
		comments_count: 5,
		user: mockUsers[1],
	},
	{
		id: "post-8",
		user_id: "user-3",
		content: `Rust 学习笔记 🦀

今天学习了所有权系统，终于理解了为什么 Rust 能保证内存安全：

**三条规则：**
1. 每个值都有一个所有者
2. 同一时间只能有一个所有者
3. 所有者离开作用域时，值被丢弃

虽然学习曲线陡峭，但真的值得！`,
		images: [],
		created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
		likes: ["user-1"],
		comments_count: 1,
		user: mockUsers[2],
	},
];

// ========== 模拟评论数据 ==========

export const mockComments: Record<string, Comment[]> = {
	"post-1": [
		{
			id: "comment-1-1",
			post_id: "post-1",
			user_id: "user-2",
			content: "太棒了！期待已久的功能终于上线了 🎉",
			created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
			user: mockUsers[1],
		},
		{
			id: "comment-1-2",
			post_id: "post-1",
			user_id: "user-3",
			content: "技术栈选得很好，Cloudflare Pages 部署确实方便",
			created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
			user: mockUsers[2],
		},
		{
			id: "comment-1-3",
			post_id: "post-1",
			user_id: "user-6",
			content: "暗色模式做得很漂亮！",
			created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
			user: mockUsers[5],
		},
	],
	"post-2": [
		{
			id: "comment-2-1",
			post_id: "post-2",
			user_id: "user-1",
			content: "设计很有质感，玻璃拟态效果用得恰到好处",
			created_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
			user: mockUsers[0],
		},
	],
	"post-3": [
		{
			id: "comment-3-1",
			post_id: "post-3",
			user_id: "user-1",
			content: "errgroup 确实好用，比自己管理 WaitGroup 方便多了",
			created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
			user: mockUsers[0],
		},
		{
			id: "comment-3-2",
			post_id: "post-3",
			user_id: "user-6",
			content: "学到了！正好项目里可以用上",
			created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
			user: mockUsers[5],
		},
	],
	"post-5": [
		{
			id: "comment-5-1",
			post_id: "post-5",
			user_id: "user-1",
			content: "SwiftUI 的动画 API 设计得真的很优雅",
			created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
			user: mockUsers[0],
		},
	],
	"post-6": [
		{
			id: "comment-6-1",
			post_id: "post-6",
			user_id: "user-2",
			content: "这家咖啡馆在哪里？看起来环境很不错",
			created_at: new Date(
				Date.now() - 1.5 * 24 * 60 * 60 * 1000,
			).toISOString(),
			user: mockUsers[1],
		},
		{
			id: "comment-6-2",
			post_id: "post-6",
			user_id: "user-1",
			content: "在市中心的那家独立咖啡馆，周末人比较少很安静",
			created_at: new Date(
				Date.now() - 1.4 * 24 * 60 * 60 * 1000,
			).toISOString(),
			user: mockUsers[0],
		},
	],
	"post-7": [
		{
			id: "comment-7-1",
			post_id: "post-7",
			user_id: "user-1",
			content: "哈哈哈，开发的日常也差不多 😂",
			created_at: new Date(
				Date.now() - 2.8 * 24 * 60 * 60 * 1000,
			).toISOString(),
			user: mockUsers[0],
		},
		{
			id: "comment-7-2",
			post_id: "post-7",
			user_id: "user-3",
			content: "需求变更是永恒的主题",
			created_at: new Date(
				Date.now() - 2.7 * 24 * 60 * 60 * 1000,
			).toISOString(),
			user: mockUsers[2],
		},
		{
			id: "comment-7-3",
			post_id: "post-7",
			user_id: "user-4",
			content: "产品经理表示我也很无奈啊 🤷",
			created_at: new Date(
				Date.now() - 2.6 * 24 * 60 * 60 * 1000,
			).toISOString(),
			user: mockUsers[3],
		},
		{
			id: "comment-7-4",
			post_id: "post-7",
			user_id: "user-6",
			content: "敏捷开发的精髓：拥抱变化",
			created_at: new Date(
				Date.now() - 2.5 * 24 * 60 * 60 * 1000,
			).toISOString(),
			user: mockUsers[5],
		},
		{
			id: "comment-7-5",
			post_id: "post-7",
			user_id: "user-2",
			content: "只要能准时下班，变就变吧 😊",
			created_at: new Date(
				Date.now() - 2.4 * 24 * 60 * 60 * 1000,
			).toISOString(),
			user: mockUsers[1],
		},
	],
	"post-8": [
		{
			id: "comment-8-1",
			post_id: "post-8",
			user_id: "user-1",
			content: "Rust 的学习曲线确实陡峭，但一旦掌握就很难回去了",
			created_at: new Date(
				Date.now() - 3.5 * 24 * 60 * 60 * 1000,
			).toISOString(),
			user: mockUsers[0],
		},
	],
	"post-9": [
		{
			id: "comment-9-1",
			post_id: "post-9",
			user_id: "user-2",
			content: "Markdown 支持真的太完善了！表格和任务列表特别实用 👍",
			created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
			user: mockUsers[1],
		},
		{
			id: "comment-9-2",
			post_id: "post-9",
			user_id: "user-3",
			content: "引用块的样式很好看，代码高亮也很清晰",
			created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
			user: mockUsers[2],
		},
	],
};

// ========== 当前登录用户（模拟） ==========

export const mockCurrentUser = mockUsers[0];

// ========== 辅助函数 ==========

/**
 * 获取指定帖子的评论
 */
export function getCommentsForPost(postId: string): Comment[] {
	return mockComments[postId] || [];
}

/**
 * 获取指定用户的帖子
 */
export function getPostsForUser(userId: string): Post[] {
	return mockPosts.filter((post) => post.user_id === userId);
}

/**
 * 根据 ID 获取用户
 */
export function getUserById(userId: string): User | undefined {
	return mockUsers.find((user) => user.id === userId);
}

/**
 * 根据用户名获取用户
 */
export function getUserByUsername(username: string): User | undefined {
	return mockUsers.find((user) => user.username === username);
}

/**
 * 根据 ID 获取帖子
 */
export function getPostById(postId: string): Post | undefined {
	return mockPosts.find((post) => post.id === postId);
}

/**
 * 模拟分页获取帖子
 */
export function getPaginatedPosts(
	page: number = 1,
	limit: number = 20,
): {
	items: Post[];
	total: number;
	page: number;
	limit: number;
	has_more: boolean;
} {
	const start = (page - 1) * limit;
	const end = start + limit;
	const items = mockPosts.slice(start, end);

	return {
		items,
		total: mockPosts.length,
		page,
		limit,
		has_more: end < mockPosts.length,
	};
}

/**
 * 生成随机延迟（模拟网络请求）
 */
export function randomDelay(
	min: number = 100,
	max: number = 500,
): Promise<void> {
	const delay = Math.random() * (max - min) + min;
	return new Promise((resolve) => globalThis.setTimeout(resolve, delay));
}
