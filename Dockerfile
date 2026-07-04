# ===== 阶段 1：构建前端 =====
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制依赖文件（利用 Docker 缓存层）
COPY package.json package-lock.json ./

# 安装全部依赖（含 vite、sharp 的编译工具链）
# --ignore-scripts 防止 postinstall 在 index.html 未复制时提前构建
RUN npm ci --ignore-scripts

# 复制源码并构建前端
COPY vite.config.mjs ./
COPY index.html ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

# ===== 阶段 2：生产运行 =====
FROM node:20-alpine

WORKDIR /app

# sharp 需要 libc 底层库（alpine 用 musl，sharp 自带预编译二进制，不需要额外装）
# ffmpeg 由 @ffmpeg-installer/ffmpeg 打包提供，无需系统安装

# 复制 package.json，仅装生产依赖（跳过 postinstall 避免重复构建）
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# 从构建阶段复制产物
COPY --from=builder /app/dist ./dist

# 复制服务端文件
COPY server.js ./
COPY routes/ ./routes/
COPY database/ ./database/
COPY scripts/ ./scripts/

# 创建持久化目录（运行时挂载卷覆盖）
RUN mkdir -p uploads database/data

EXPOSE 3456

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3456/',r=>{process.exit(r.statusCode===200?0:1)})"

CMD ["node", "server.js"]
