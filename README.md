# 🐼 Pan助手

海外运营效率系统 — 仪表盘、周计划、日报生成、历史查询、VPS监控、全球时钟、AI资产管理、素材库、图片/视频压缩、话术库。

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Vue 3 + Vite + Pinia + Element Plus + ECharts + Three.js |
| 后端 | Express (Node.js) |
| 存储 | JSON 文件（自动多层备份） |
| 媒体处理 | Sharp（图片） · FFmpeg（视频） · Mammoth（文档） |
| 部署 | Docker + Docker Compose |

## 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 构建前端
npm run build

# 3. 启动服务
npm start
```

访问 `http://localhost:3456`

## 开发模式

```bash
# 终端1: 启动后端
node server.js

# 终端2: 启动前端
npx vite --host
```

访问 `http://localhost:5173`（Vite 自动代理 API 到后端 3456 端口）

## Docker 部署

```bash
# 构建并启动
docker compose up -d --build

# 查看日志
docker compose logs -f

# 停止
docker compose down
```

详细部署指南见 [DEPLOY.md](./DEPLOY.md)，涵盖：服务器初始化、代码上传、Nginx 反代、HTTPS 配置、数据备份、故障排查。

## 项目结构

```
├── server.js              # Express 服务器入口
├── routes/                # API 路由
│   ├── auth.js            # 登录认证 + HMAC Token
│   ├── config.js          # 周计划配置
│   ├── daily.js           # 日报 CRUD
│   ├── vps.js             # VPS 管理
│   ├── summary.js         # 月度/周汇总
│   ├── assets.js          # AI资产管理（图片+视频+音频）
│   ├── library.js         # 资料库（文档管理）
│   ├── tools.js           # 图片/视频压缩工具
│   ├── prompts.js         # AI提示词模板
│   ├── scripts.js         # 剧本与分镜
│   ├── customer-stats.js  # 客户统计
│   ├── users.js           # 用户管理
│   ├── roles.js           # 角色管理
│   ├── sales-persons.js   # 销售名单
│   └── logs.js            # 操作日志
├── database/              # 数据存储
│   ├── db.js              # JSON 数据库层（自动备份）
│   └── data/              # 数据文件（gitignore）
├── src/                   # Vue3 前端源码
│   ├── views/             # 页面组件
│   ├── stores/            # Pinia 状态管理
│   ├── router/            # Vue Router（路由守卫）
│   ├── api/               # API 请求层
│   ├── data/              # 共享数据（国家树、账号列表）
│   ├── utils/             # 工具函数（ECharts主题）
│   └── components/        # 公共组件
├── uploads/               # 上传文件目录（gitignore）
│   ├── compress/saved/    # 压缩后图片
│   ├── video/library/     # 视频素材库
│   └── video/covers/      # 视频封面
├── dist/                  # 构建产物（gitignore）
├── Dockerfile             # 多阶段构建
├── docker-compose.yml     # 容器编排
├── DEPLOY.md              # 完整部署指南
└── vite.config.mjs        # Vite 配置（含 API 代理）
```

## 功能模块

### 📊 仪表盘 Dashboard
- 本周概览：消耗、询盘、新客户、拉群、客均成本
- 昨日数据修正提醒
- 近七日消耗趋势 ECharts 图表
- 国家分布统计
- 一键跳转写日报

### 📋 周计划 Plan
- 多周 Tabs 切换，进度条可视化
- 每日完成表（询盘/拉群/新客户/消耗）
- 国家树选择器，目标设置
- 新增/删除/恢复/永久删除周计划
- 过期周自动标记

### 📝 日报生成 Report
- FB 多国家日报填写，卡片式布局
- 国家排序（A→Z / 客资 / 消耗 / 拉群）
- 拉群及客户详情 — 每个国家展开填写，拉群数=详情数校验
- 粘贴历史日报自动识别解析
- 从客户统计同步国家客资（自动替换国家列表）
- 实时预览 + 一键复制日报文本
- 自动保存（1.2秒去抖）

### 🔍 历史查询 History
- 日期范围筛选 + 国家筛选
- 月度汇总摘要
- CSV 数据导出
- 日报列表查看

### 📈 月度总结 Summary
- 按月自动汇总消耗、询盘、拉群、新客户
- 周均/日均计算
- 支持周维度查询

### 🖥️ VPS监控中心 Monitor
- VPS 卡片：到期倒计时、月度进度条
- 过期/7天内到期/正常 分类统计
- 成本锁功能（利润/成本/售价展示）
- 续费按钮 + 自动化续费计算
- 国旗 UI 标识，搜索筛选

### 🌍 全球时钟 Clock
- 3D 地球 Three.js 渲染
- 全球城市实时时间卡片
- 北京时间为基准的时差显示
- 区域分组（亚太/欧洲/美洲/中东）
- 全球运营指挥中心视图
- 国旗图标展示

### 🎨 AI资产管理 Assets（3 Tab 页面）
- **AI提示词** — 按流程步骤分类、一键复制、在线编辑、拖拽排序、自定义步骤、导入/导出
- **剧本与分镜** — 双栏编辑器（剧本+分镜）、Markdown预览、自动保存、文档上传提取
- **AI资产** — 图片/视频/音频上传、预览、批量下载、批量删除、分类标签管理
- **多用户隔离** — 数据按 userId 隔离，admin 可看全部，非 admin 只看自己
- **Tab 可见性** — 角色可按 Tab 控制（只开提示词/只开剧本），精细权限

### 💬 话术库 Scripts
- 英文+中文话术卡片
- 分类筛选（开发信/跟进/催单/售后等）
- 搜索标题或内容
- 一键复制，使用次数统计
- 新增/编辑/删除

### 🖼️ 图片压缩 Image Compress
- 拖拽上传，批量处理（最多20张）
- 格式转换：支持 WebP/JPEG/PNG/AVIF/TIFF
- 质量调节（1-100%）
- 尺寸缩放（宽度限制）+ 裁切功能
- 压缩前后对比（体积/尺寸/格式）
- 保存到素材库
- Sharp 服务端压缩

### 🎬 视频压缩 Video Compress
- 拖拽上传，单文件 ≤ 1GB
- 格式支持：MP4/MOV/AVI/MKV/WebM
- 码率/分辨率/帧率调节
- 实时压缩进度
- 压缩前后对比预览
- 保存到视频库
- FFmpeg 服务端处理

### 📹 视频素材库 Video Library
- 双 Tab：工厂展厅视频 / TikTok发布视频
- 视频预览播放、封面提取
- 分类筛选、搜索、排序
- 分享链接（微信/社交 OG 卡片）
- 上传/删除/下载

### 📁 素材库 Media Library
- 统一媒体浏览（图片+视频）
- 分类标签管理
- 搜索、排序（最新/最旧/名称/体积）
- 大图预览 + 信息面板（尺寸/体积/格式）
- 分享链接生成
- 上传/下载/删除

### 🔗 分享预览 Share
- 图片/视频分享页带 OG 元标签
- 微信/社交媒体分享卡片优化
- 显示尺寸、大小、时长等元信息

### 🔒 登录认证 & RBAC
- HMAC-SHA256 Token 认证，7天有效期
- 路由守卫 + API 中间件双重拦截
- Remember-me 自动登录，登录页 Three.js 3D 背景
- 管理员 / 自定义角色 两级 RBAC
- 全局权限控制：可编辑 / 可新增 / 可删除
- 逐模块权限覆盖（perPagePerms）
- AI资产管理 Tab 级别可见性开关
- 每 2 分钟自动从服务端刷新权限

## 路由表

| 路径 | 页面 | 说明 |
|------|------|------|
| `/login` | 登录 | 公开访问 |
| `/` | 仪表盘 | Dashboard |
| `/plan` | 周计划 | 多周管理 |
| `/report` | 日报生成 | FB/TX 双栏 |
| `/history` | 历史查询 | 筛选+导出 |
| `/monitor` | VPS监控 | 到期提醒 |
| `/clock` | 全球时钟 | 3D 地球 |
| `/assets` | AI资产管理 | 提示词+剧本+资产 三Tab |
| `/customer-stats` | 客户统计 | 每日+月度汇总 |
| `/role-manage` | 角色管理 | RBAC 权限配置 |
| `/user-manage` | 用户管理 | 用户增删改 |
| `/settings` | 系统设置 | 全局配置 |
| `/logs` | 操作日志 | 审计查看 |
| `/compress` | 图片压缩 | Sharp 批量处理 |
| `/video-compress` | 视频压缩 | FFmpeg |
| `/video-library` | 视频素材库 | 分类管理 |
| `/media` | 素材库 | 统一浏览 |

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3456` |
| `PAN_USER` | 初始管理员账号 | `admin` |
| `PAN_PASSWORD` | 初始管理员密码 | `admin123` |
| `PAN_TOKEN_SECRET` | Token 签名密钥 | `pan-secret-change-me` |
| `PAN_COST_PIN` | 成本锁初始密码 | `default-change-me` |

## 数据持久化

Docker 部署时以下目录映射到宿主机，容器删除后数据不丢失：

| 容器路径 | 宿主机路径 | 内容 |
|----------|-----------|------|
| `/app/database/data` | `./database/data` | JSON 数据库 + 自动备份 |
| `/app/uploads` | `./uploads` | 上传的图片、视频、压缩产物 |

## License

Private — 个人使用项目
