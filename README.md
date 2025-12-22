# Pulse

一个极简、内容优先的社交动态应用，基于 Vue 3、Tailwind CSS v4 和 Cloudflare Pages 构建。

## 技术栈

### 前端

- **Vue 3** - 组合式 API，使用 `<script setup>` 单文件组件
- **TypeScript** - 完整的类型安全
- **Vite** - 快速构建工具
- **Tailwind CSS v4** - 原子化 CSS 框架
- **Pinia** - 状态管理
- **Vue Router** - 客户端路由
- **Lucide Vue** - 图标库
- **date-fns** - 日期格式化

### 后端

- **Cloudflare Pages Functions** - 无服务器 API
- **Cloudflare R2** - 对象存储（数据持久化）
- **GitHub OAuth** - 用户认证

## 项目结构

```
pulse/
├── src/                      # 前端源码
│   ├── components/           # 可复用 Vue 组件
│   ├── layouts/              # 布局组件
│   ├── router/               # Vue Router 配置
│   ├── services/             # API 服务层
│   │   ├── api.ts           # Fetch 封装和 API 方法
│   │   └── useAuth.ts       # 认证 Composable
│   ├── stores/               # Pinia 状态仓库
│   │   └── auth.ts          # 认证状态
│   ├── types/                # TypeScript 类型定义
│   ├── views/                # 页面组件
│   └── main.ts              # 应用入口
├── functions/                # Cloudflare Pages Functions（后端）
│   ├── _shared/             # 共享工具
│   │   ├── jwt.ts           # JWT 签名/验证
│   │   ├── r2.ts            # R2 存储操作
│   │   ├── response.ts      # 响应帮助函数
│   │   └── types.ts         # 后端类型定义
│   └── api/
│       ├── auth/            # 认证接口
│       ├── posts/           # 帖子 CRUD 接口
│       ├── users/           # 用户接口
│       └── uploads/         # 图片上传接口
├── wrangler.toml            # Cloudflare 配置
└── .env.example             # 环境变量模板
```

## API 接口

### 认证

| 方法 | 接口                 | 描述                  |
| ---- | -------------------- | --------------------- |
| GET  | `/api/auth/github`   | 重定向到 GitHub OAuth |
| GET  | `/api/auth/callback` | OAuth 回调处理        |
| GET  | `/api/auth/me`       | 获取当前登录用户信息  |

### 帖子

| 方法   | 接口                  | 描述                     |
| ------ | --------------------- | ------------------------ |
| GET    | `/api/posts`          | 获取帖子列表（分页）     |
| POST   | `/api/posts`          | 创建新帖子               |
| GET    | `/api/posts/:id`      | 获取单个帖子             |
| PATCH  | `/api/posts/:id`      | 更新帖子（仅作者）       |
| DELETE | `/api/posts/:id`      | 删除帖子（作者或管理员） |
| POST   | `/api/posts/:id/like` | 切换点赞状态             |

### 用户

| 方法  | 接口             | 描述                     |
| ----- | ---------------- | ------------------------ |
| GET   | `/api/users`     | 获取所有用户列表         |
| GET   | `/api/users/:id` | 通过 ID 或用户名获取用户 |
| PATCH | `/api/users/:id` | 更新用户资料（仅本人）   |

### 上传

| 方法 | 接口                           | 描述           |
| ---- | ------------------------------ | -------------- |
| POST | `/api/uploads`                 | 上传图片       |
| GET  | `/api/uploads/:year/:filename` | 获取上传的图片 |

## 快速开始

### 环境要求

- [Bun](https://bun.sh/)（v1.0+）
- [Cloudflare 账号](https://dash.cloudflare.com/)
- [GitHub OAuth App](https://github.com/settings/developers)

### 开发环境配置

1. **克隆仓库**

   ```bash
   git clone <repo-url>
   cd pulse
   ```

2. **安装依赖**

   ```bash
   bun install
   ```

3. **配置环境变量**

   ```bash
   cp .env.example .env
   # 编辑 .env 文件填入你的配置
   ```

4. **启动开发服务器**
   ```bash
   bun dev
   ```

### 环境变量说明

创建 `.env` 文件（或在 Cloudflare Pages 中设置为 Secrets）：

```env
# GitHub OAuth
GITHUB_CLIENT_ID=你的_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=你的_github_oauth_app_client_secret

# JWT 密钥（至少 32 个字符）
JWT_SECRET=你的_jwt_密钥_至少32个字符

# 前端 URL
FRONTEND_URL=http://localhost:5173
```

## 本地测试

### 方法一：仅测试前端（使用 Mock 数据）

如果只想测试前端 UI，可以暂时在 `HomeView.vue` 中恢复 mock 数据。

### 方法二：使用 Wrangler 本地模拟

安装 Wrangler CLI：

```bash
bun add -D wrangler
```

创建本地 R2 存储并启动：

```bash
# 启动本地开发服务器（包含 Functions 和 R2 模拟）
npx wrangler pages dev dist --r2=R2_BUCKET --binding GITHUB_CLIENT_ID=xxx --binding GITHUB_CLIENT_SECRET=xxx --binding JWT_SECRET=xxx --binding FRONTEND_URL=http://localhost:8788
```

或者使用配置文件，在 `wrangler.toml` 中添加：

```toml
[vars]
FRONTEND_URL = "http://localhost:8788"

# 本地开发时的 secrets（生产环境请在 Dashboard 中设置）
# GITHUB_CLIENT_ID = "xxx"
# GITHUB_CLIENT_SECRET = "xxx"
# JWT_SECRET = "xxx"
```

然后运行：

```bash
# 先构建前端
bun run build

# 启动本地 Pages 开发服务器
npx wrangler pages dev dist
```

### 方法三：前后端分离开发

1. 启动前端开发服务器：

   ```bash
   bun dev
   ```

2. 在另一个终端启动后端：

   ```bash
   bun run build
   npx wrangler pages dev dist --port 8788
   ```

3. 修改 `src/services/api.ts` 中的 `API_BASE`：
   ```typescript
   const API_BASE = 'http://localhost:8788/api'
   ```

## Cloudflare 部署

### 1. 创建 R2 存储桶

```bash
# 使用 wrangler CLI
npx wrangler r2 bucket create pulse-data
```

### 2. 配置 Pages 项目

1. 在 Cloudflare Dashboard 中连接你的 Git 仓库
2. 设置构建配置：
   - 构建命令：`bun run build`
   - 构建输出目录：`dist`
3. 添加环境变量（作为 Secrets）：
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `JWT_SECRET`
   - `FRONTEND_URL`（你的 Pages 域名）

### 3. 配置 R2 绑定

在 Pages 项目设置中添加 R2 存储桶绑定：

- 变量名：`R2_BUCKET`
- R2 存储桶：`pulse-data`

### 4. 配置 GitHub OAuth

1. 前往 GitHub Developer Settings → OAuth Apps
2. 创建新的 OAuth App：
   - Homepage URL：`https://your-domain.pages.dev`
   - Callback URL：`https://your-domain.pages.dev/api/auth/callback`
3. 将 Client ID 和 Client Secret 复制到环境变量中

## 数据存储结构

Pulse 使用 Cloudflare R2 进行数据持久化，存储结构如下：

```
data/
├── users.json           # 用户索引
├── posts_index.json     # 帖子 ID 索引（按时间排序）
└── posts/
    └── {post-id}.json   # 单个帖子数据
uploads/
└── {year}/
    └── {uuid}.{ext}     # 上传的图片
```

## 常用命令

| 命令          | 描述           |
| ------------- | -------------- |
| `bun dev`     | 启动开发服务器 |
| `bun build`   | 构建生产版本   |
| `bun preview` | 预览生产构建   |

## 许可证

MIT
