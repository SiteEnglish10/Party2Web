#!/usr/bin/env bash
# 云端服务器一键更新脚本（手动部署方式）
# 用法：在服务器上 chmod +x update.sh，然后 ./update.sh
# 作用：拉取最新代码 → 更新后端依赖 → 构建前端 → 部署 dist 到 nginx 目录 → 重启后端 + 重载 nginx
set -euo pipefail

# ==== 按你的实际路径修改这三项 ====
REPO="/root/opt/party2web"                       # 代码仓库位置
WEBROOT="/var/www/party2web/frontend/dist"       # nginx 静态根目录（须 nginx 可读，勿放 /root 下）
SERVICE="party2web"                              # 后端 systemd 服务名
# ==================================

echo "==> 拉取最新代码"
cd "$REPO"
git pull

echo "==> 更新后端依赖"
cd "$REPO/backend"
uv sync

echo "==> 构建前端"
cd "$REPO/frontend"
npm install
npm run build

echo "==> 部署前端到 $WEBROOT"
mkdir -p "$WEBROOT"
rm -rf "${WEBROOT:?}/"*
cp -r "$REPO/frontend/dist/." "$WEBROOT/"

echo "==> 重启后端 + 重载 nginx"
systemctl restart "$SERVICE"
nginx -t && systemctl reload nginx

echo "==> 完成 ✅"
