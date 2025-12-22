#!/bin/bash

# Pulse D1 数据库初始化脚本
# 用于创建和初始化 Cloudflare D1 数据库

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 数据库名称
DB_NAME="pulse-db"
SCHEMA_FILE="./schema.sql"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Pulse D1 数据库初始化脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查 wrangler 是否安装
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}错误: wrangler 未安装${NC}"
    echo "请运行: npm install -g wrangler"
    exit 1
fi

# 检查 schema.sql 是否存在
if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}错误: schema.sql 文件不存在${NC}"
    echo "请确保在项目根目录运行此脚本"
    exit 1
fi

# 检查是否已登录
echo -e "${YELLOW}检查 Cloudflare 登录状态...${NC}"
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}请先登录 Cloudflare...${NC}"
    wrangler login
fi

echo ""
echo -e "${GREEN}已登录 Cloudflare${NC}"
echo ""

# 选择操作模式
echo "请选择操作模式:"
echo "  1) 本地开发环境 (--local)"
echo "  2) 远程生产环境 (--remote)"
echo "  3) 创建新数据库并初始化 (远程)"
echo "  4) 退出"
echo ""
read -p "请输入选项 [1-4]: " choice

case $choice in
    1)
        echo ""
        echo -e "${YELLOW}正在初始化本地 D1 数据库...${NC}"
        wrangler d1 execute $DB_NAME --local --file=$SCHEMA_FILE
        echo ""
        echo -e "${GREEN}✅ 本地数据库初始化成功！${NC}"
        echo ""
        echo "验证表结构:"
        wrangler d1 execute $DB_NAME --local --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
        ;;
    2)
        echo ""
        echo -e "${YELLOW}正在初始化远程 D1 数据库...${NC}"
        echo -e "${RED}警告: 这将在生产环境执行 SQL 语句${NC}"
        read -p "确认继续? (y/N): " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            wrangler d1 execute $DB_NAME --remote --file=$SCHEMA_FILE
            echo ""
            echo -e "${GREEN}✅ 远程数据库初始化成功！${NC}"
            echo ""
            echo "验证表结构:"
            wrangler d1 execute $DB_NAME --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
        else
            echo "已取消"
            exit 0
        fi
        ;;
    3)
        echo ""
        echo -e "${YELLOW}正在创建新的 D1 数据库...${NC}"

        # 创建数据库
        OUTPUT=$(wrangler d1 create $DB_NAME 2>&1) || true

        if echo "$OUTPUT" | grep -q "already exists"; then
            echo -e "${YELLOW}数据库 '$DB_NAME' 已存在${NC}"
        else
            echo "$OUTPUT"
            echo ""
            echo -e "${GREEN}✅ 数据库创建成功！${NC}"
            echo ""
            echo -e "${YELLOW}请将上面输出的配置添加到 wrangler.toml 文件中${NC}"
            echo ""
        fi

        # 初始化表结构
        read -p "是否初始化表结构? (y/N): " init_schema
        if [ "$init_schema" = "y" ] || [ "$init_schema" = "Y" ]; then
            wrangler d1 execute $DB_NAME --remote --file=$SCHEMA_FILE
            echo ""
            echo -e "${GREEN}✅ 表结构初始化成功！${NC}"
            echo ""
            echo "验证表结构:"
            wrangler d1 execute $DB_NAME --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
        fi
        ;;
    4)
        echo "退出"
        exit 0
        ;;
    *)
        echo -e "${RED}无效选项${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}完成！${NC}"
echo -e "${BLUE}========================================${NC}"
