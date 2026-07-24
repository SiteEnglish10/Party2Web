# 部署到云端服务器（手动部署）

本文档手把手把「便利工具站」部署到一台 **Ubuntu 22.04** 云服务器（VPS）。采用**手动部署**（不使用 Docker——国内网络下 Docker 拉取依赖极慢，基本无法完成）。

> 更新已部署的站点：直接看最后的 **[八、日常更新](#八日常更新一键脚本)**。

---

## 一、准备工作

- 一台云服务器，系统建议 **Ubuntu 22.04 LTS**，配置 ≥ 1核2G（转换视频/Office 时越大越好）。
- 拿到服务器 **公网 IP** 和 SSH 登录方式。
- （可选但推荐）一个 **域名** + 一份 **SSL 证书**（云厂商可免费申请下载）。
- 云厂商 **安全组/防火墙** 放行入站：**22（SSH）、80（HTTP）、443（HTTPS）**。

SSH 登录服务器：

```bash
ssh root@你的服务器IP
```

---

## 二、安装系统依赖

```bash
apt update
apt install -y python3 python3-venv git nginx \
    libreoffice ffmpeg fonts-noto-cjk curl

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# uv（Python 包管理）
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env
```

**国内加速（强烈建议，避免下载慢）：**

```bash
# npm 使用国内镜像
npm config set registry https://registry.npmmirror.com

# uv/pip 使用清华镜像（写入环境变量，当前会话与后续都生效）
echo 'export UV_DEFAULT_INDEX=https://pypi.tuna.tsinghua.edu.cn/simple' >> ~/.bashrc
source ~/.bashrc
```

验证：`node -v`（应 v20.x）、`uv --version`、`soffice --version`、`ffmpeg -version`。

---

## 三、获取代码

```bash
mkdir -p /root/opt
cd /root/opt
git clone <你的仓库地址> party2web
cd party2web
```

> 私有仓库需配置访问凭据（HTTPS 用 token，或 SSH 部署密钥）。
> ⚠️ 代码放在 `/root/opt/...` 下没问题，但**前端静态文件不能直接由 nginx 从 `/root` 读取**（`/root` 权限受限，会 403）。所以第五步会把前端产物复制到 `/var/www/...`。

---

## 四、部署后端

### 4.1 配置密码与密钥（.env）

管理员账号密码与会话密钥**不写在代码里**，通过 `backend/.env` 提供（已被 `.gitignore` 排除）：

```bash
cd /root/opt/party2web/backend
cp .env.example .env
nano .env
```

填入（生产务必用强口令与随机密钥）：

```ini
ADMIN_USERNAME=root
ADMIN_PASSWORD=你的强密码
SECRET_KEY=用下面命令生成的随机串
```

生成随机密钥：`python3 -c "import secrets;print(secrets.token_hex(32))"`

### 4.2 安装依赖并用 systemd 常驻

```bash
cd /root/opt/party2web/backend
uv sync
```

新建 `/etc/systemd/system/party2web.service`：

```ini
[Unit]
Description=Party2Web Backend
After=network.target

[Service]
WorkingDirectory=/root/opt/party2web/backend
ExecStart=/root/.local/bin/uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
User=root

[Install]
WantedBy=multi-user.target
```

启动：

```bash
systemctl daemon-reload
systemctl enable --now party2web
systemctl status party2web        # 应为 active (running)
curl http://127.0.0.1:8000/api/health   # 应返回 {"ok":true}
```

> 首次启动会自动建库并写入初始分类/工具/站点信息（数据库文件在 `backend/data/`）。

---

## 五、构建并部署前端

```bash
cd /root/opt/party2web/frontend
npm install
npm run build          # 产物在 dist/（构建脚本会自动把 ffmpeg 核心复制进去）

# 复制到 nginx 可读目录
mkdir -p /var/www/party2web/frontend/dist
cp -r dist/. /var/www/party2web/frontend/dist/
chown -R www-data:www-data /var/www/party2web
```

> 说明：本项目的音视频转换用浏览器内的 ffmpeg.wasm，其核心文件已**自托管**（构建时复制到 `dist/ffmpeg/`），不依赖国外 CDN；PDF 缩略图用 pdf.js（worker 是 `.mjs`，nginx 配置里已处理其 MIME）。

---

## 六、让域名指向服务器（DNS 解析）

在你**购买域名的服务商**控制台 → 「DNS 解析」，添加两条 **A 记录**：

| 主机记录 | 类型 | 记录值 |
|---|---|---|
| `@` | A | 你的服务器公网IP |
| `www` | A | 你的服务器公网IP |

保存后等待生效（几分钟到几小时）。验证：本地 `ping your-domain.com` 看是否返回你的 IP。没有域名时也可直接用 `https://服务器IP`（证书会告警）。

---

## 七、配置 nginx + HTTPS

### 7.1 放置 SSL 证书

从云厂商下载 Nginx 版证书（通常是 `xxx_bundle.crt` + `xxx.key`），上传到服务器，例如：

```bash
mkdir -p /etc/ssl/your-domain
# 把 your-domain_bundle.crt 和 your-domain.key 放进该目录
```

> 也可用 Let's Encrypt 免费证书：`apt install -y certbot python3-certbot-nginx && certbot --nginx -d your-domain.com`（会自动改 nginx 配置并续期）。

### 7.2 写站点配置

仓库根目录提供了参考文件 **`nginx.conf.example`**，直接用它：

```bash
cp /root/opt/party2web/nginx.conf.example /etc/nginx/sites-available/party2web
nano /etc/nginx/sites-available/party2web     # 改 server_name 和证书路径
```

该配置已包含所有踩过的坑的修复：

- **强制 HTTP→HTTPS**，避免混合内容；
- `root` 指向 `/var/www/party2web/frontend/dist`（nginx 可读）；
- **`.mjs` MIME 修复**（否则 pdf.js worker 加载失败）；
- **COOP/COEP 跨源隔离头**（ffmpeg.wasm 需要）；
- `client_max_body_size 120m`（大文件上传）；
- `/api/`、`/uploads/` 反代到后端 `127.0.0.1:8000`；
- SPA 路由回退到 `index.html`。

启用并重载：

```bash
ln -sf /etc/nginx/sites-available/party2web /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default      # 去掉默认站点（可选）
nginx -t                                     # 语法检查
systemctl reload nginx
```

浏览器打开 **`https://your-domain.com`** 即可访问 ✅。左侧栏底部「设置」→ 开启管理员模式 → 用 4.1 里设置的账号密码登录。

---

## 八、日常更新（一键脚本）

仓库里只提供**模板** `update.sh.example`（不含机器专属路径）。**首次**在服务器上生成你自己的本地脚本（`update.sh` 已被 `.gitignore` 忽略，不会进仓库、也不会被 `git pull` 覆盖）：

```bash
cd /root/opt/party2web
cp update.sh.example update.sh
nano update.sh            # 按你的实际路径改顶部 REPO / WEBROOT / SERVICE 三个变量
chmod +x update.sh
```

以后本地改完代码 `git push` 后，在**服务器**上更新只需一条命令：

```bash
cd /root/opt/party2web && ./update.sh
```

它会自动完成：拉取代码 → `uv sync` → `npm install && npm run build` → 把 `dist` 同步到 `/var/www/...` → 重启后端 → 重载 nginx。

---

## 九、常见问题排查

| 现象 | 原因 / 解决 |
|---|---|
| 前端 403 Forbidden | 静态文件在 `/root` 下 nginx 无权读。确认 `root` 指向 `/var/www/party2web/frontend/dist` 且 `chown -R www-data:www-data /var/www/party2web` |
| 页面白屏、控制台报 `.mjs` MIME 错误 | nginx 缺少 `.mjs` 的 MIME 处理。用仓库的 `nginx.conf.example`（含 `location ~ \.mjs$` 块） |
| 音视频工具报 `failed to import ffmpeg-core.js` | 旧版本从国外 CDN 加载核心。**本版本已自托管**：确认 `npm run build` 跑过、`/var/www/.../dist/ffmpeg/` 下有 `ffmpeg-core.js/.wasm`，且用 HTTPS 访问 |
| 音视频工具无反应/报 SharedArrayBuffer | 缺 COOP/COEP 头或非 HTTPS。用仓库 nginx 配置并通过 https 访问 |
| 上传大文件 413 | 提高 nginx `client_max_body_size` 和后端 `MAX_CONVERT_BYTES` |
| Office→PDF 报错 | 确认已装 LibreOffice：`which soffice`；中文乱码则装 `fonts-noto-cjk` |
| 后端起不来 | `systemctl status party2web` 和 `journalctl -u party2web -n 50` 看日志；确认 `.env` 存在、`uv sync` 成功 |
| npm/uv 下载太慢 | 用第二步的国内镜像 |
| 想重置管理员密码 | 改 `backend/.env` 的 `ADMIN_PASSWORD`，`systemctl restart party2web` |

---

## 十、数据备份 & 安全清单

**备份**（SQLite 数据库 + 上传文件都在 `backend/data/`）：

```bash
tar czf party2web-backup-$(date +%F).tar.gz /root/opt/party2web/backend/data
```

**上线前检查：**

- [ ] `backend/.env` 已设置强 `ADMIN_PASSWORD` 与随机 `SECRET_KEY`
- [ ] 防火墙仅放行 22/80/443
- [ ] 已启用 HTTPS
- [ ] 定期备份 `backend/data/`
