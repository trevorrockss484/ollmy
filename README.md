# 🐼 Pan助手

海外运营效率系统 — 仪表盘、周计划、日报生成、历史查询、VPS监控、全球时钟、AI资产管理、素材库、图片/视频压缩、话术库。

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Vue 3 + Vite + Pinia + Element Plus + ECharts + Three.js |
| 后端 | Express (Node.js) |
| 存储 | JSON 文件（自动多层备份） |
| 媒体处理 | Sharp（图片） · FFmpeg（视频） · Mammoth（文档） |

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

## 项目结构

```
├── server.js              # Express 服务器入口
├── routes/                # API 路由
│   ├── auth.js            # 登录认证
│   ├── config.js          # 周计划配置
│   ├── daily.js           # 日报 CRUD
│   ├── vps.js             # VPS 管理
│   ├── summary.js         # 月度/周汇总
│   ├── assets.js          # AI资产管理
│   ├── library.js         # 资料库（文档管理）
│   ├── tools.js           # 图片/视频压缩工具
│   └── prompts.js         # AI提示词模板
├── database/              # 数据存储
│   ├── db.js              # JSON 数据库层
│   └── data/              # 数据文件（gitignore）
├── src/                   # Vue3 前端源码
│   ├── views/             # 15 个页面组件
│   ├── stores/            # Pinia 状态管理
│   ├── router/            # Vue Router
│   ├── api/               # API 请求层
│   └── components/        # 公共组件
├── uploads/               # 上传文件目录（gitignore）
├── dist/                  # 构建产物（gitignore）
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
- FB/TX 双栏数据填写
- 粘贴历史日报自动识别解析
- 模版弹窗快速生成
- 自动计算均单价、转化率
- 一键复制日报文本
- 多国家切换，日期选择

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

### 🎨 AI资产管理 (3合1页面)
**AI资产** — 图片上传、预览、下载、分类标签管理
**资料库** — 文档上传、docx 预览（Mammoth 渲染）、下载、标签筛选
**AI提示词** — 按流程步骤分类、一键复制、在线编辑、拖拽排序

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
- 尺寸缩放（宽度限制）
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

### 🔗 分享预览
- 图片/视频分享页带 OG 元标签
- 微信/社交媒体分享卡片优化
- 显示尺寸、大小、时长等元信息

### 🔒 登录系统
- Token 认证，路由守卫
- Remember-me 自动登录
- 401 自动跳转登录页

## 部署

项目支持一键部署到支持 Node.js 的平台（Railway、Render、VPS 等）：

```bash
npm install
npm run build
npm start
```

`Procfile` 已配置：`web: node server.js`

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3456` |
