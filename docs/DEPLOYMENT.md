# Pulse 部署配置指南

## 目录

- [环境变量配置](#环境变量配置)
- [访问控制配置](#访问控制配置)
- [存储架构](#存储架构)
- [D1 数据库设置](#d1-数据库设置)
- [R2 存储桶设置](#r2-存储桶设置)
- [部署步骤](#部署步骤)

---

## 环境变量配置

在 Cloudflare Pages 控制台中配置以下环境变量：

**Settings > Environment variables > Production/Preview**

### 必需的密钥（设置为 Encrypted/Secret）

| 变量名                 | 说明                              | 示例                                      |
| ---------------------- | --------------------------------- | ----------------------------------------- |
| `GITHUB_CLIENT_ID`     | GitHub OAuth App 的 Client ID     | `Iv1.xxxxxxxxxx`                          |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App 的 Client Secret | `xxxxxxxxxxxxxxxx`                        |
| `JWT_SECRET`           | JWT 签名密钥（至少 32 个字符）    | `your-super-secret-key-at-least-32-chars` |

### 可选配置

| 变量名          | 说明                                     | 默认值   |
| --------------- | ---------------------------------------- | -------- |
| `FRONTEND_URL`  | 前端 URL，用于 OAuth 回调                | 自动检测 |
| `ADMIN_USERS`   | 管理员列表（逗号分隔的 GitHub 用户名）   | 空       |
| `ACCESS_MODE`   | 访问模式：`open`/`whitelist`/`blacklist` | `open`   |
| `ALLOWED_USERS` | 白名单用户（逗号分隔）                   | 空       |
| `BLOCKED_USERS` | 黑名单用户（逗号分隔）                   | 空       |

---

## 访问控制配置

### 管理员配置

通过环境变量 `ADMIN_USERS` 配置管理员，多个用户用逗号分隔：

```
ADMIN_USERS=dogxi,admin2,admin3
```

管理员权限：

- 删除任意用户的帖子
- 删除任意用户的评论
- 在白名单模式下自动获得访问权限
- 在黑名单模式下不受限制

### 访问模式

#### 1. 开放模式（默认）

```
ACCESS_MODE=open
```

- 所有 GitHub 用户都可以登录和使用
- 适合公开社区

#### 2. 白名单模式

```
ACCESS_MODE=whitelist
ALLOWED_USERS=user1,user2,user3
ADMIN_USERS=admin1
```

- 只有白名单中的用户可以登录
- 管理员自动包含在白名单中
- 适合小团队、私有社区

#### 3. 黑名单模式

```
ACCESS_MODE=blacklist
BLOCKED_USERS=spammer1,baduser2
```

- 黑名单中的用户无法登录
- 其他用户正常访问
- 适合需要封禁特定用户的公开社区

### 配置示例

**小团队私有部署：**

```
ADMIN_USERS=team-leader
ACCESS_MODE=whitelist
ALLOWED_USERS=alice,bob,charlie
```

**公开社区，封禁违规用户：**

```
ADMIN_USERS=moderator1,moderator2
ACCESS_MODE=blacklist
BLOCKED_USERS=spammer,troll
```

---

## 存储架构

Pulse 使用 **R2 + D1 混合存储** 方案：

| 数据类型               | 存储服务                   | 原因                           |
| ---------------------- | -------------------------- | ------------------------------ |
| 用户、帖子、评论、点赞 | **Cloudflare D1** (SQLite) | 结构化数据，需要查询、事务支持 |
| 图片上传               | **Cloudflare R2**          | 二进制文件，大对象存储         |

### Cloudflare D1 优势

- **免费套餐**：5GB 存储，500 万行读取/天，10 万行写入/天
- **原生 SQL 查询**：支持复杂查询、JOIN、索引
- **事务支持**：保证数据一致性
- **低延迟**：边缘分布式数据库
- **与 Pages Functions 完美集成**

### Cloudflare R2 优势

- **免费套餐**：10GB 存储，100 万次 Class A 操作/月
- **无出口费用**：下载不计费
- **与 Cloudflare Pages 无缝集成**
- **适合存储图片等二进制文件**

---

## D1 数据库设置

### 1. 创建 D1 数据库

使用 Wrangler CLI 创建数据库：

```bash
# 安装 wrangler（如果尚未安装）
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 创建数据库
wrangler d1 create pulse-db
```

创建成功后，会输出类似以下内容：

```
✅ Successfully created DB 'pulse-db' in region APAC
Created your database using D1's new storage backend. The new storage backend is not yet recommended
for production workloads, but backs up your data via point-in-time recovery.

[[d1_databases]]
binding = "DB"
database_name = "pulse-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**重要**：记录 `database_id`，后续需要更新 `wrangler.toml`。

### 2. 更新 wrangler.toml

将获得的 `database_id` 更新到 `wrangler.toml` 文件：

```toml
# D1 数据库绑定（用于结构化数据）
[[d1_databases]]
binding = "DB"
database_name = "pulse-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # 替换为你的实际 ID
```

### 3. 初始化数据库 Schema

使用项目中的 `schema.sql` 文件初始化数据库表结构：

```bash
# 本地开发环境
wrangler d1 execute pulse-db --local --file=./schema.sql

# 远程生产环境
wrangler d1 execute pulse-db --remote --file=./schema.sql
```

### 4. 验证数据库

```bash
# 检查表是否创建成功
wrangler d1 execute pulse-db --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

预期输出：

```
┌──────────┐
│ name     │
├──────────┤
│ users    │
│ posts    │
│ likes    │
│ comments │
└──────────┘
```

### 数据库 Schema 说明

数据库包含以下表：

**users 表**

- `id` - GitHub 用户 ID（主键）
- `username` - GitHub 用户名（唯一）
- `avatar_url` - 头像 URL
- `bio` - 个人简介
- `joined_at` - 加入时间
- `last_post_at` - 最后发帖时间
- `post_count` - 帖子数量
- `is_admin` - 是否为管理员

**posts 表**

- `id` - UUID（主键）
- `user_id` - 作者 ID（外键）
- `content` - 帖子内容
- `images` - 图片 URL 数组（JSON 字符串）
- `created_at` - 创建时间
- `comments_count` - 评论数量

**likes 表**

- `post_id` - 帖子 ID（外键）
- `user_id` - 用户 ID（外键）
- `created_at` - 点赞时间
- 联合唯一约束：每个用户只能给每篇帖子点一次赞

**comments 表**

- `id` - UUID（主键）
- `post_id` - 帖子 ID（外键）
- `user_id` - 评论者 ID（外键）
- `content` - 评论内容
- `created_at` - 创建时间

---

## R2 存储桶设置

### 1. 创建 R2 存储桶

**方式一：使用 Cloudflare Dashboard**

1. 登录 Cloudflare Dashboard
2. 前往 R2 > Create bucket
3. 创建名为 `pulse-data` 的存储桶

**方式二：使用 Wrangler CLI**

```bash
wrangler r2 bucket create pulse-data
```

### 2. 验证 wrangler.toml 配置

确保 `wrangler.toml` 中有以下配置：

```toml
# R2 存储桶绑定（用于文件上传）
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "pulse-data"
```

---

## 部署步骤

### 1. 创建 GitHub OAuth App

1. 前往 GitHub Settings > Developer settings > OAuth Apps
2. 点击 "New OAuth App"
3. 填写信息：
   - Application name: `Pulse`
   - Homepage URL: `https://your-domain.pages.dev`
   - Authorization callback URL: `https://your-domain.pages.dev/api/auth/callback`
4. 记录 Client ID 和 Client Secret

### 2. 设置 D1 数据库

按照上述 [D1 数据库设置](#d1-数据库设置) 步骤完成数据库创建和初始化。

### 3. 设置 R2 存储桶

按照上述 [R2 存储桶设置](#r2-存储桶设置) 步骤完成存储桶创建。

### 4. 部署到 Cloudflare Pages

1. 连接 GitHub 仓库到 Cloudflare Pages
2. 构建设置：
   - Framework preset: `None`
   - Build command: `bun run build`
   - Build output directory: `dist`
3. 配置环境变量（见上文）
4. 绑定资源：
   - **D1 数据库**：
     - Variable name: `DB`
     - D1 database: `pulse-db`
   - **R2 存储桶**：
     - Variable name: `R2_BUCKET`
     - R2 bucket: `pulse-data`

### 5. 验证部署

1. 访问你的域名
2. 尝试使用 GitHub 登录
3. 发布一条测试帖子
4. 上传图片测试
5. 检查管理员权限是否生效

---

## 本地开发

### 启动开发服务器

```bash
# 安装依赖
bun install

# 启动前端开发服务器
bun run dev

# 在另一个终端启动 Pages Functions（带本地 D1 和 R2）
wrangler pages dev dist --d1=DB --r2=R2_BUCKET
```

### 本地 D1 数据库

Wrangler 会在 `.wrangler/state/v3/d1` 目录下创建本地 SQLite 数据库文件。

初始化本地数据库：

```bash
wrangler d1 execute pulse-db --local --file=./schema.sql
```

查看本地数据：

```bash
wrangler d1 execute pulse-db --local --command="SELECT * FROM users;"
```

---

## 常见问题

### Q: 如何将现有用户设为管理员？

在 Cloudflare Pages 控制台添加环境变量：

```
ADMIN_USERS=username1,username2
```

用户下次登录时会自动获得管理员权限。

### Q: 白名单模式下，新用户如何申请访问？

1. 新用户尝试登录会看到 "您不在白名单中" 的提示
2. 用户联系管理员
3. 管理员将用户名添加到 `ALLOWED_USERS` 环境变量
4. 用户重新登录即可

### Q: D1 数据库连接失败怎么办？

1. 确认 `wrangler.toml` 中的 `database_id` 正确
2. 确认已在 Cloudflare Pages 设置中绑定 D1 数据库
3. 检查 Pages Functions 日志查看具体错误

### Q: 图片上传失败怎么办？

1. 确认 R2 存储桶已创建
2. 确认已在 Cloudflare Pages 设置中绑定 R2 存储桶
3. 检查文件大小是否超过 5MB 限制
4. 检查文件类型是否为允许的图片格式

### Q: 如何备份数据？

**D1 数据库备份：**

```bash
# 导出所有数据
wrangler d1 export pulse-db --remote --output=backup.sql
```

**R2 文件备份：**
使用 rclone 或其他 S3 兼容工具同步 R2 存储桶。

### Q: 如何重置数据库？

```bash
# 删除所有表（谨慎操作！）
wrangler d1 execute pulse-db --remote --command="DROP TABLE IF EXISTS comments; DROP TABLE IF EXISTS likes; DROP TABLE IF EXISTS posts; DROP TABLE IF EXISTS users;"

# 重新创建表结构
wrangler d1 execute pulse-db --remote --file=./schema.sql
```

---

## 性能优化建议

1. **启用 Cloudflare 缓存**：为静态资源配置缓存规则
2. **图片优化**：考虑使用 Cloudflare Images 进行图片压缩和 CDN 分发
3. **数据库索引**：Schema 已包含常用查询的索引
4. **分页加载**：前端已实现分页，避免一次性加载大量数据

---

## 联系与支持

- GitHub: https://github.com/dogxii/pulse
- Issues: https://github.com/dogxii/pulse/issues
