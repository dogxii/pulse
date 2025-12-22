-- Pulse D1 Database Schema
-- 用于存储结构化数据（用户、帖子、评论、点赞）

-- ============ 用户表 ============
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,           -- GitHub user ID
    username TEXT NOT NULL UNIQUE, -- GitHub 用户名
    avatar_url TEXT NOT NULL,
    bio TEXT DEFAULT '',
    joined_at TEXT NOT NULL,       -- ISO 日期格式
    last_post_at TEXT,             -- ISO 日期格式
    post_count INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,    -- 0 = false, 1 = true
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 用户名索引（用于查找）
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ============ 帖子表 ============
CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,           -- UUID
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    images TEXT,                   -- JSON 数组字符串，如 '["url1", "url2"]'
    created_at TEXT NOT NULL,      -- ISO 日期格式
    comments_count INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 帖子按创建时间索引（用于分页查询）
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
-- 帖子按用户索引（用于获取用户的所有帖子）
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);

-- ============ 点赞表 ============
CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(post_id, user_id)       -- 每个用户只能给每篇帖子点一次赞
);

-- 点赞按帖子索引（用于获取帖子的所有点赞）
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
-- 点赞按用户索引（用于获取用户的所有点赞）
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

-- ============ 评论表 ============
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,           -- UUID
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,      -- ISO 日期格式
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 评论按帖子索引（用于获取帖子的所有评论）
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
-- 评论按用户索引（用于获取用户的所有评论）
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
-- 评论按创建时间索引
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
