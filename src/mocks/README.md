# Pulse Mock System

本地开发测试系统，提供模拟数据和 API 拦截功能，用于 UI 开发和测试。

## 快速开始

### 启动 Mock 模式

```bash
# 使用 mock 模式启动开发服务器
npm run dev:mock
```

### 访问方式

也可以通过 URL 参数启用/禁用 Mock：

```
# 启用 Mock
http://localhost:5173/?mock=true

# 禁用 Mock
http://localhost:5173/?mock=false
```

## 功能特性

### 1. 模拟数据

Mock 系统提供了丰富的测试数据：

- **6 个模拟用户** - 包含管理员和普通用户
- **8 篇模拟帖子** - 包含 Markdown、代码块、图片等多种内容
- **多条模拟评论** - 覆盖各种评论场景
- **模拟当前登录用户** - 默认以 `zhangsan` (管理员) 身份登录

### 2. API 拦截

Mock 系统会拦截以下 API 请求：

| API | 方法 | 说明 |
|-----|------|------|
| `/api/auth/me` | GET | 获取当前用户 |
| `/api/users` | GET | 获取用户列表 |
| `/api/users/:id` | GET | 获取单个用户 |
| `/api/users/:id` | PATCH | 更新用户资料 |
| `/api/posts` | GET | 获取帖子列表（支持分页） |
| `/api/posts` | POST | 创建帖子 |
| `/api/posts/:id` | GET | 获取单个帖子 |
| `/api/posts/:id` | PATCH | 更新帖子 |
| `/api/posts/:id` | DELETE | 删除帖子 |
| `/api/posts/:id/like` | POST | 切换点赞 |
| `/api/posts/:id/comments` | GET | 获取评论列表 |
| `/api/posts/:id/comments` | POST | 创建评论 |
| `/api/posts/:postId/comments/:commentId` | DELETE | 删除评论 |
| `/api/uploads` | POST | 模拟图片上传 |

### 3. 开发者工具

启用 Mock 后，可以在浏览器控制台使用以下命令：

```javascript
// 查看 Mock 状态
window.__pulse_mock__.isEnabled()

// 禁用 Mock（需刷新页面）
window.__pulse_mock__.disable()

// 重置数据到初始状态
window.__pulse_mock__.reset()

// 查看模拟数据
window.__pulse_mock__.data.users    // 用户列表
window.__pulse_mock__.data.posts    // 帖子列表
window.__pulse_mock__.data.comments // 评论数据
window.__pulse_mock__.data.currentUser // 当前登录用户
```

## 文件结构

```
src/mocks/
├── README.md      # 本文档
├── index.ts       # 模块入口，自动初始化
├── data.ts        # 模拟数据定义
└── handlers.ts    # API 请求处理器
```

## 模拟数据说明

### 用户

| 用户名 | 角色 | 说明 |
|--------|------|------|
| zhangsan | 管理员 | 默认登录用户，全栈开发工程师 |
| lisi | 普通用户 | 设计师 & 前端开发 |
| wangwu | 普通用户 | 后端工程师 |
| zhaoliu | 普通用户 | 产品经理 |
| sunqi | 普通用户 | 新用户，无帖子 |
| zhouba | 普通用户 | iOS 开发者 |

### 帖子内容类型

- Markdown 标题、列表、引用
- 代码块（Go、Swift、通用）
- 单图片、多图片（2张、3张）
- 纯文本
- Emoji 表情

## 自定义配置

### 持久化 Mock 状态

```javascript
// 保存启用状态（刷新后保持）
localStorage.setItem('pulse_mock_enabled', 'true')

// 保存禁用状态
localStorage.setItem('pulse_mock_enabled', 'false')

// 清除设置（使用默认行为）
localStorage.removeItem('pulse_mock_enabled')
```

### 修改模拟数据

编辑 `src/mocks/data.ts` 文件可以自定义：

- 添加/修改用户
- 添加/修改帖子
- 添加/修改评论
- 更改默认登录用户

### 网络延迟

默认模拟 150-400ms 的网络延迟，可在 `handlers.ts` 中修改：

```typescript
// 修改延迟范围
await randomDelay(100, 300) // 最小 100ms，最大 300ms
```

## 注意事项

1. **数据不持久化** - 刷新页面后数据会重置
2. **仅拦截 /api 请求** - 其他请求正常发送
3. **生产环境自动禁用** - Mock 代码不会打包到生产版本
4. **图片上传模拟** - 上传返回 Unsplash 随机图片 URL

## 常见问题

### Q: Mock 模式下如何测试未登录状态？

目前 Mock 系统默认以 `zhangsan` 身份登录。如需测试未登录状态，可以修改 `data.ts` 中的 `mockCurrentUser` 为 `undefined`。

### Q: 如何添加更多测试数据？

编辑 `data.ts` 文件，按照现有数据格式添加新的用户、帖子或评论。

### Q: Mock 和真实 API 如何切换？

- 使用 `npm run dev` 启动 - 连接真实 API
- 使用 `npm run dev:mock` 启动 - 使用 Mock 数据
- 或通过 URL 参数 `?mock=true/false` 切换
