# 🐼 Pan助手

海外运营效率系统 — 周计划、日报生成、历史查询、月度总结、VPS监控、汇率计算。

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Vue 3 + Element Plus + Vite |
| 后端 | Express (Node.js) |
| 存储 | JSON 文件（自动多层备份） |

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

访问 `http://localhost:5173`（Vite 自动代理 API）

## 项目结构

```
├── server.js          # Express 服务器
├── routes/            # API 路由
│   ├── auth.js        # 登录认证
│   ├── config.js      # 周计划配置
│   ├── daily.js       # 日报 CRUD
│   ├── vps.js         # VPS 管理
│   └── summary.js     # 月度/周汇总
├── database/          # 数据存储
│   ├── db.js          # JSON 数据库层
│   └── data/          # 数据文件（gitignore）
├── src/               # Vue3 前端源码
│   ├── views/         # 页面组件
│   ├── stores/        # Pinia 状态管理
│   ├── router/        # Vue Router
│   └── api/           # API 请求层
└── dist/              # 构建产物（gitignore）
```

## 功能模块

- 📋 **周计划** — 多周tabs切换、进度条、每日完成表、国家树选择
- 📝 **日报生成** — FB/TX双栏、粘贴识别、模版弹窗、自动计算均单价
- 🔍 **历史查询** — 日期/国家筛选、CSV导出
- 📊 **月度总结** — 自动汇总、月度报告生成
- 🖥️ **监控中心** — VPS卡片、月度进度条、成本锁、国旗UI
- 🧮 **工具** — 汇率计算、计算器
- 🔒 **登录系统** — remember-me、auto-re-login
