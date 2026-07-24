# 部署到云端服务器（前后端一起）

本文档手把手把「便利工具站」部署到一台 Linux 云服务器（VPS）。推荐 **方案 A：Docker Compose 一键部署**（最省心，依赖都在容器里）。文末附 **方案 B：不用 Docker 的手动部署**。

---

## 0. 准备工作

- 一台云服务器（阿里云 / 腾讯云 / AWS EC2 / DigitalOcean 均可），系统建议 **Ubuntu 22.04 LTS**，配置 ≥ 1核2G（转换视频/Office 时越大越好）。
- 拿到服务器的 **公网 IP** 和 **SSH 登录方式**（密码或密钥）。
- （可选）一个 **域名**，并把它的 A 记录解析到服务器公网 IP。
- 在云厂商控制台的 **安全组 / 防火墙** 放行入站端口：**22（SSH）、80（HTTP）**，如需 HTTPS 再放行 **443**。

> 下面命令里的 `你的服务器IP`、`your-domain.com` 请替换成自己的。

---

## 方案 A：Docker Compose 一键部署（推荐）

### A1. 登录服务器

在你自己的电脑上（PowerShell / 终端）：

```bash
ssh root@你的服务器IP
```

### A2. 安装 Docker 与 Docker Compose

```bash
# 一条命令安装 Docker（官方脚本）
curl -fsSL https://get.docker.com | sh

# 验证
docker --version
docker compose version
```

> 若使用非 root 用户，把当前用户加入 docker 组：`sudo usermod -aG docker $USER`，然后重新登录。

### A3. 用 Git 把项目代码放到服务器（推荐）

**先在你的本地电脑**把代码推送到 Git 远程仓库（GitHub / Gitee / 自建 GitLab 均可）。项目已配好 `.gitignore`（自动排除 `node_modules`、`.venv`、`data`、`dist` 等，不会把这些传上去）。在项目根目录执行：

```bash
git init
git add .
git commit -m "init: party2web"
git branch -M main
git remote add origin <你的仓库地址>
git push -u origin main
```

> 以上 `git commit` / `git push` 由你自行执行。

**然后在服务器上** clone：

```bash
cd /opt
git clone <你的仓库地址> party2web
cd party2web
```

> 私有仓库需要在服务器配置访问凭据（HTTPS 用 token，或 SSH 部署密钥）。后续更新只需在服务器执行 `git pull`（见 A8）。

### A4. （重要）配置管理员密码与密钥（.env）

管理员账号密码与会话密钥**不写在代码里**，而是通过 `backend/.env` 提供（该文件已被 `.gitignore` 排除，不会进仓库）。在服务器上：

```bash
cd /opt/party2web/backend
cp .env.example .env
nano .env        # 填入强密码与随机密钥
```

`.env` 内容示例：

```ini
ADMIN_USERNAME=root
ADMIN_PASSWORD=你的强密码
SECRET_KEY=用下面命令生成的随机串
```

> 生成随机密钥：`python3 -c "import secrets;print(secrets.token_hex(32))"`

`docker-compose.yml` 已配置后端从 `backend/.env` 读取这些变量，因此**必须先创建 `.env` 再启动**（否则 compose 会因找不到 env 文件而报错）。

### A5. 一键构建并启动

```bash
cd /opt/party2web
docker compose up -d --build
```

- 首次构建会下载基础镜像、安装 LibreOffice/ffmpeg，**耗时约 5–15 分钟**，请耐心等待。
- 完成后查看状态：

```bash
docker compose ps          # 两个服务都应为 running/healthy
docker compose logs -f     # 看实时日志，Ctrl+C 退出
```

### A6. 访问

浏览器打开 **`http://你的服务器IP`** 即可看到网站。

- 左侧栏底部「设置」→ 打开管理员模式 → 用你在 A4 设置的账号密码登录。
- 首次进入可在「赞助页 → 站点信息」里修改网站名称、位置、月流量额度。

至此前后端都已部署完成 ✅（前端 nginx 容器对外，后端容器只在内网，由 nginx 反代 `/api` 和 `/uploads`）。

---

## A7. 绑定域名（让访问你的域名就能直接打开网站）

### 第一步：让域名解析到服务器（DNS A 记录）

这一步是「访问域名就能打开网站」的关键——把域名指向你服务器的公网 IP。

1. 登录你**购买域名的服务商**控制台（阿里云 / 腾讯云 / GoDaddy / Namecheap 等），找到 **「DNS 解析 / 域名解析 / DNS 管理」**。
2. 添加下面两条 **A 记录**（把 `你的服务器公网IP` 换成实际 IP）：

   | 主机记录(Host) | 类型(Type) | 记录值(Value) | 作用 |
   |---|---|---|---|
   | `@` | A | 你的服务器公网IP | 根域名 `your-domain.com` |
   | `www` | A | 你的服务器公网IP | `www.your-domain.com` |

   > `@` 代表根域名本身。也可把 `www` 设成 CNAME 指向 `your-domain.com`，效果一样。TTL 用默认（如 600 秒）即可。

3. 保存。DNS 生效通常几分钟，最长可能几小时。
4. **验证解析是否生效**（在你自己电脑上）：
   ```bash
   ping your-domain.com          # 看返回的 IP 是不是你的服务器 IP
   # 或
   nslookup your-domain.com
   ```
5. 确认云厂商**安全组 / 防火墙**已放行入站 **80**（HTTP）和 **443**（HTTPS）。

做完这一步，因为前端 nginx 容器监听 80 端口，浏览器访问 **`http://your-domain.com`** 就能直接打开网站了。

> 没有域名时，直接用 **`http://你的服务器公网IP`** 访问也一样能用。

### 第二步：开启 HTTPS（强烈建议，让地址变成 https://）

最简单的方式是在前面再加一层 **Caddy**（自动申请并续期免费证书）。在服务器上：

```bash
# 1. 安装 Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

把 compose 里前端端口改成不占用 80（例如 `8080:80`），然后重启：

```bash
# 编辑 docker-compose.yml，把 frontend 的 ports 改为 "8080:80"
docker compose up -d
```

编辑 `/etc/caddy/Caddyfile`：

```
your-domain.com {
    reverse_proxy localhost:8080
}
```

重载 Caddy：

```bash
systemctl reload caddy
```

现在访问 **`https://your-domain.com`** 即为自动 HTTPS。

> 说明：ffmpeg.wasm 依赖的跨源隔离头（COOP/COEP）已在前端 nginx 里发送，Caddy 反代会透传，无需额外配置。

---

## A8. 日常运维

**更新代码后重新部署：**
```bash
cd /opt/party2web
git pull                       # 拉取最新代码（本地已 push 后）
docker compose up -d --build
```

**数据备份**（SQLite + 上传文件都在 `backend/data/`）：
```bash
tar czf party2web-backup-$(date +%F).tar.gz /opt/party2web/backend/data
```

**查看/重启/停止：**
```bash
docker compose logs -f backend     # 后端日志（转换报错在这里看）
docker compose restart backend
docker compose down                # 停止全部（数据保留在 data 卷）
```

---

## 方案 B：不用 Docker 的手动部署

适合不想用 Docker 的情况。以 Ubuntu 22.04 为例。

### B1. 安装系统依赖

```bash
apt update
apt install -y python3 python3-venv nginx git \
    libreoffice ffmpeg fonts-noto-cjk curl
# 安装 uv
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env
# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### B2. 部署后端

```bash
cd /opt/party2web/backend
uv sync
# 创建 .env 配置管理员密码与 SECRET_KEY（同 A4）： cp .env.example .env 并编辑
```

用 systemd 常驻后端，新建 `/etc/systemd/system/party2web.service`：

```ini
[Unit]
Description=Party2Web Backend
After=network.target

[Service]
WorkingDirectory=/opt/party2web/backend
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
systemctl status party2web       # 应为 active (running)
```

### B3. 构建前端

```bash
cd /opt/party2web/frontend
npm ci
npm run build                    # 产物在 dist/
```

### B4. 配置 nginx

新建 `/etc/nginx/sites-available/party2web`：

```nginx
server {
    listen 80;
    server_name your-domain.com;   # 或直接用 _ 匹配 IP 访问
    root /opt/party2web/frontend/dist;
    index index.html;

    add_header Cross-Origin-Opener-Policy same-origin always;
    add_header Cross-Origin-Embedder-Policy credentialless always;
    client_max_body_size 120m;

    location /api/     { proxy_pass http://127.0.0.1:8000; proxy_read_timeout 300s; }
    location /uploads/ { proxy_pass http://127.0.0.1:8000; }
    location /         { try_files $uri $uri/ /index.html; }
}
```

启用并重载：

```bash
ln -s /etc/nginx/sites-available/party2web /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### B5.（可选）HTTPS

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

访问 `http://你的服务器IP` 或 `https://your-domain.com` 即可。

---

## 常见问题排查

| 现象 | 原因 / 解决 |
|---|---|
| 打开网站空白 | 看浏览器控制台；确认 `docker compose ps` 两个服务都在跑 |
| Office→PDF 报错 | 容器已内置 LibreOffice；手动部署需确认 `soffice` 在 PATH（`which soffice`） |
| 音视频工具无反应 | ffmpeg.wasm 需要 COOP/COEP 头 + HTTPS（或 localhost）。确认用的是 nginx/Caddy 而非直接开文件 |
| 上传大文件 413 | 提高 nginx `client_max_body_size` 和后端 `MAX_CONVERT_BYTES` |
| 端口 80 被占用 | 改 compose 里 `ports: "8080:80"`，再用域名反代 |
| 想重置管理员密码 | 改 `backend/.env` 里的 `ADMIN_PASSWORD` 后 `docker compose up -d backend`（重启即可，无需 rebuild） |

---

## 安全清单（上线前务必检查）

- [ ] 已修改默认管理员密码（`ADMIN_PASSWORD`）
- [ ] 已修改 `SECRET_KEY` 为随机值
- [ ] 服务器防火墙仅放行 22/80/443
- [ ] 已开启 HTTPS（生产强烈建议）
- [ ] 定期备份 `backend/data/`
