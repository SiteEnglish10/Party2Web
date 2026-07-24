# 便利工具站（Party2Web）

一个前后端分离的**公益向生活工具聚合站**。工具以「盒子」呈现，点击即用；名称/位置由管理员自定义。左侧可伸缩导航含三个页面：**工具合集**、**分享与建议**、**赞助**。

---

## 一、原始需求要点

- 便利服务网站，提供各种生活简易工具，每个工具是一个盒子模型，点击即用。
- 后端 Python，前端 React。左侧可伸缩导航：工具合集 / 分享与建议 / 赞助。
- 首页=工具合集：顶部搜索框；下方推荐栏展示最常用 Top10（可切换 全部/7天/一月/一年）；再下方按功能类型分类展示工具。
- 工具盒子：图标、标题、简介、使用次数（每次成功使用 +1，Top10 进推荐）。
- 分享与建议：上部左=公告栏（可点开详情），右=互动表单（收集信息）；下部=留言区（富文本、图片、点赞，按赞降序）。
- 赞助页：感谢文字 + 本月流量（已用/剩余，共 300GB/月）+ 赞助二维码。
- 管理员模式：导航底部「设置」→ 滑块开启 → 输入账号密码（凭据通过环境变量配置，见 `backend/.env.example`）。可维护三页内容。

---

## 二、已确认的设计决策

| 项 | 决定 |
|---|---|
| 后端框架 | **FastAPI**（uv 管理依赖） |
| 数据库 | **SQLite**（SQLModel/SQLAlchemy） |
| 前端 | **Vite + React + TypeScript + Ant Design** |
| 国际化 | **中 / 英 双语**（i18next） |
| 管理员形态 | **就地切换管理模式**（同一前端内编辑，非独立后台） |
| 工具架构 | **混合**：PDF/音频/视频 → 浏览器 WASM（0 流量）；Office→PDF → 后端 LibreOffice |
| 后端任务 | Office→PDF 走**异步任务 + 轮询进度** |
| 使用次数 | **成功使用**才 +1，前端上报 |
| 推荐时间段 | 记录**每次点击时间戳**，按 全部/7天/一月/一年 聚合 Top10 |
| 留言媒体 | **富文本 + 图片（≤5MB）**；视频用外链嵌入 |
| 留言删除/点赞 | 本期删除**仅管理员**；点赞**不去重** |
| 流量数字 | 后端**真实统计**（本地 WASM 工具天然不计入） |
| 互动表单 | 管理员**自定义字段**（单行/多行/单选/多选）+ 结果导出 CSV |
| 工具打开方式 | **弹窗**（Modal） |
| 站点名称/位置 | 管理员在设置中填写，全站生效 |
| 部署 | Linux VPS 手动部署（uv + systemd + nginx；系统装 LibreOffice + ffmpeg） |

> 前端线稿（低保真，11 屏）已确认。

---

## 三、目录结构

```
Party2Web/
├── README.md
├── backend/                # FastAPI + uv
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py         # 应用入口、CORS、静态、流量中间件
│   │   ├── db.py           # SQLite 引擎/会话
│   │   ├── models.py       # SQLModel 数据模型
│   │   ├── schemas.py      # Pydantic I/O 模型
│   │   ├── auth.py         # 管理员登录/会话校验
│   │   ├── seed.py         # 初始分类/工具/站点信息
│   │   ├── deps.py         # 依赖注入
│   │   ├── traffic.py      # 流量统计中间件
│   │   ├── conversions.py  # Office→PDF 异步任务 (LibreOffice)
│   │   └── routers/
│   │       ├── tools.py        # 工具/分类 CRUD、使用上报、推荐
│   │       ├── announcements.py
│   │       ├── forms.py        # 表单定义 + 提交 + 导出
│   │       ├── comments.py     # 留言 + 点赞 + 图片上传
│   │       ├── sponsor.py      # 赞助内容 + 流量
│   │       ├── site.py         # 站点信息
│   │       └── convert.py      # 后端转换任务提交/轮询/下载
│   ├── data/               # SQLite 文件、上传目录（运行时生成）
│   └── .env.example        # 管理员密码/密钥模板（复制为 .env）
├── nginx.conf.example      # 服务器 nginx 站点配置参考
├── update.sh.example       # 服务器一键更新脚本模板（服务器上复制为 update.sh 并改路径）
└── frontend/               # Vite + React + TS + AntD
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx / App.tsx
        ├── api/            # axios 客户端 + 各资源接口
        ├── i18n/           # zh.json / en.json
        ├── store/          # 管理员会话、站点信息 (zustand)
        ├── layout/         # 可伸缩侧栏 + 顶栏
        ├── components/     # ToolCard、AdminBar、RichEditor 等
        ├── tools/          # 前端 WASM 工具实现（pdf/audio/video）
        └── pages/
            ├── Tools/      # 工具合集(首页) + 工具弹窗
            ├── Share/      # 公告 + 表单 + 留言
            ├── Sponsor/
            └── admin/      # 就地编辑组件
```

---

## 四、数据模型（SQLite）

- **Category**：`id, name_zh, name_en, icon, sort_order`
- **Tool**：`id, key, name_zh, name_en, desc_zh, desc_en, icon, runtime(front|backend), tool_type(pdf-merge/word-to-pdf/...), config(JSON)`
- **ToolCategory**（多对多 + 排序）：`tool_id, category_id, sort_order` —— 支持一个工具属于多个分类（复制移动）
- **UsageEvent**：`id, tool_id, created_at` —— 每次成功使用一条，用于时间段 Top10
- **Announcement**：`id, title_zh, title_en, body_zh, body_en(富文本), image_url, created_at, sort_order`
- **FormDef**：`id, title_zh, title_en, active`
- **FormField**：`id, form_id, label_zh, label_en, field_type(text/textarea/radio/checkbox), options(JSON), required, sort_order`
- **FormSubmission**：`id, form_id, data(JSON), created_at`
- **Comment**：`id, author_token, author_name, body(富文本HTML), likes, created_at`
- **SiteConfig**（单行）：`site_name, location, sponsor_text_zh/en, sponsor_qr_url, traffic_limit_gb(默认300)`
- **TrafficStat**：按月累计 `year_month, bytes_used`

---

## 五、后端 API（前缀 `/api`）

**站点/认证**
- `GET /site` 站点信息 · `PUT /site`（管理员）
- `POST /auth/login` `{username,password}` → 会话 token · `POST /auth/logout` · `GET /auth/me`

**工具 & 分类**
- `GET /categories`（含各分类下工具，按排序）
- `GET /tools/recommended?range=all|7d|30d|365d` → Top10
- `GET /tools/search?q=`
- `POST /tools/{id}/use` 使用次数 +1（写 UsageEvent）
- 管理员：`POST/PUT/DELETE /categories`、`POST/PUT/DELETE /tools`、`POST /tools/{id}/assign`（移动/复制到分类）、`PUT /categories/reorder`、`PUT /categories/{id}/tools/reorder`

**分享页**
- `GET/POST/PUT/DELETE /announcements`
- `GET /forms/active`（访客）· 管理员 `GET/POST/PUT/DELETE /forms` + 字段
- `POST /forms/{id}/submit` · 管理员 `GET /forms/{id}/submissions`、`GET /forms/{id}/export.csv`
- `GET /comments`（按赞降序）· `POST /comments` · `POST /comments/{id}/like` · 管理员 `DELETE /comments/{id}`
- `POST /uploads/image`（留言/公告配图，≤5MB，存 `data/uploads/`）

**赞助**
- `GET /sponsor`（文字+二维码+流量已用/剩余）· 管理员 `PUT /sponsor`、`POST /uploads/qr`

**后端转换（Office→PDF）**
- `POST /convert/{tool_type}` 上传文件 → 返回 `job_id`
- `GET /convert/jobs/{job_id}` 轮询状态/进度
- `GET /convert/jobs/{job_id}/download` 下载结果（结果定时清理）

**流量**：中间件累加请求/响应字节到当月 `TrafficStat`，供赞助页展示。

---

## 六、前端工具（混合架构）

- **浏览器 WASM（0 流量）**
  - PDF 合并 / 插入 / 删除页：`pdf-lib`
  - 音频转换（MP3 等常见格式）：`@ffmpeg/ffmpeg`（ffmpeg.wasm）
  - 视频：MP4→GIF、MP4→MP3：`@ffmpeg/ffmpeg`
  - 进度本地实时显示，完成直接下载，随后调 `/tools/{id}/use`。
- **后端（走流量）**
  - PPT / Word / Excel → PDF：上传 → 轮询 job → 下载。

> 每个工具在数据库以 `runtime` + `tool_type` 标识，前端据此渲染对应弹窗组件。

---

## 七、国际化

- `i18next` + `react-i18next`，语言包 `zh.json` / `en.json`。
- 内容型数据（工具名、简介、公告、表单字段、赞助文字）在数据库存 `_zh/_en` 双字段，按当前语言返回。
- 顶栏语言切换，持久化到 localStorage。

---

## 八、开发 & 运行

**后端**
```bash
cd backend
uv sync                       # 安装依赖
uv run uvicorn app.main:app --reload --port 8000
```
- 首次启动自动建库并 seed 初始分类/工具/站点信息。
- Office→PDF 需系统安装 LibreOffice（`soffice` 在 PATH）；缺失时该类工具返回明确错误，不影响其余功能。

**前端**
```bash
cd frontend
npm install
npm run dev                   # 默认 http://localhost:5173，代理 /api → :8000
```

**管理员**：任意页 → 侧栏底部「设置」→ 开启管理员模式 → 输入账号密码。凭据由环境变量配置：复制 `backend/.env.example` 为 `backend/.env` 并填入 `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `SECRET_KEY`（未配置时本地默认 `root` / `admin`）。

**部署（Linux VPS）**：采用**手动部署**（后端 uv + systemd，前端构建产物由 nginx 托管并反代 `/api`、`/uploads`）。完整分步指南见 **[DEPLOYMENT.md](./DEPLOYMENT.md)**，含域名 DNS、HTTPS、nginx 配置（`.mjs` MIME 与 COOP/COEP 已处理）、以及一键更新脚本 `update.sh`。ffmpeg.wasm 核心与 pdf.js 均自托管/同源，不依赖国外 CDN。

---

## 九、实现路线

1. ✅ 需求确认 + 前端线稿
2. 后端脚手架（uv、FastAPI、SQLite、模型、seed）
3. 后端核心 API（站点/认证/分类/工具/使用统计/推荐）
4. 后端 分享/赞助/流量/上传/转换任务
5. 前端脚手架（Vite/AntD/i18n/布局/路由/侧栏）
6. 前端 工具合集页 + 工具弹窗（WASM + 后端）
7. 前端 分享页（公告/表单/留言）+ 赞助页
8. 前端 设置 + 管理员就地编辑态
9. 联调、双语校对、README 补充部署细节
