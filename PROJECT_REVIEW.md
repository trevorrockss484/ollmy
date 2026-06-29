# 项目审查报告

审查日期：2026-06-29  
项目：Pan Assistant / `pan-assistant`  
范围：前端 Vue/Vite/Pinia/Element Plus，后端 Express，本地 JSON 数据库，上传/下载与部署配置。

## 总体结论

项目功能覆盖较多，包含日报、周计划、素材库、资料库、图片/视频压缩等模块；当前主要风险集中在三类：

1. **认证与文件访问安全风险较高**：服务端 token 可以伪造，上传目录和多个下载/预览接口公开访问，部分文件路径校验不完整。
2. **数据可靠性不足**：JSON 数据库全量同步读写，没有原子写入、锁和稳定唯一 ID；并发或异常退出时可能丢数据或损坏文件。
3. **前端错误处理和资源清理不统一**：有运行时 bug、裸 `fetch` 绕过统一请求层、异步失败提示不一致、定时器/监听器泄漏。

建议先修安全和数据可靠性，再处理前端可维护性、性能和工程化。

## P0：必须优先修复

### 1. 认证 token 可被伪造

位置：

- `routes/auth.js:3`：账号和密码硬编码在源码中。
- `routes/auth.js:10`：token 只是 `base64(username + ':' + Date.now())`。
- `server.js:28` 到 `server.js:38`：认证中间件只解码 token，检查用户名和时间戳。
- `src/stores/auth.js:6`、`src/stores/auth.js:17`：前端把明文密码保存在 `localStorage`。

影响：

任何人只要构造 `15377581454:<当前时间戳>` 的 base64 字符串，就可以通过后端 API 认证。账号密码写在仓库中也不利于部署和轮换。前端持久化明文密码，一旦发生 XSS、浏览器扩展读取或共享设备泄露，账号密码会直接暴露。

建议：

- 用环境变量配置账号、密码哈希和 token 密钥，不把真实凭据写入代码。
- token 使用带签名的 JWT、HMAC token 或服务端 session，至少包含签名、过期时间和服务端密钥校验。
- 前端不要保存明文密码。自动登录可以改为 httpOnly secure cookie、refresh token 或服务端 session。
- 路由守卫不要只判断本地 token 是否存在，应在启动时验证 token 或统一处理 401。

### 2. 上传目录与下载/预览接口公开访问

位置：

- `server.js:23` 到 `server.js:26`：多个下载/预览接口跳过认证。
- `server.js:54` 和 `server.js:132`：`/uploads` 静态目录被公开挂载两次。
- `routes/assets.js:87`：资产下载只需记录 ID。
- `routes/library.js:73`、`routes/library.js:107`：资料预览和下载公开。
- `routes/tools.js:347`、`routes/tools.js:688`、`routes/tools.js:703`：素材和封面按文件名下载。

影响：

资料库文档、素材、压缩临时文件、视频文件可能只要知道 ID 或文件名就能访问。由于 `/uploads` 目录整体公开，即使接口加了鉴权，也可能被静态路径绕过。

建议：

- 生产环境不要直接公开整个 `/uploads` 目录。
- 下载、预览统一走后端接口，按数据库记录 ID 查询并做授权校验。
- 对确实需要公开分享的资源，生成单独的公开分享 token 或短链，并限制范围和有效期。
- 删除重复的 `/uploads` 静态挂载，明确哪些子目录可公开。

### 3. 视频保存接口存在路径穿越风险

位置：

- `routes/tools.js:568` 到 `routes/tools.js:578`：`save-video` 直接使用请求体中的 `compressedName` 拼接源路径。
- `routes/tools.js:186`：图片保存接口有 `..`、`/`、`\\` 校验，但视频保存接口缺少同等校验。

影响：

攻击者可提交带 `../` 的 `compressedName`，尝试把服务器可读文件复制到公开的视频素材目录。结合当前 token 可伪造问题，风险更高。

建议：

- 对 `compressedName` 使用白名单校验，例如只允许 `compressed_` 或 `original_` 前缀、固定扩展名、纯文件名。
- 使用 `path.basename()` 拒绝目录片段。
- 使用 `path.resolve()` 后确认目标路径仍在 `VIDEO_TEMP_DIR` 内。
- 保存时最好根据服务端压缩结果里的 session/文件记录查找，不完全相信客户端传入文件名。

### 4. 公开 HTML 输出存在 XSS 风险

位置：

- `server.js:63`、`server.js:84`、`server.js:87`：分享页直接把标题等字段插入 HTML。
- `routes/library.js:96`：文档预览页直接插入文件名。
- `routes/library.js:82` 到 `routes/library.js:90`：docx 转 HTML 后只用正则移除部分 `<script>` 和事件属性。

影响：

上传文件名、素材名称、文档内容等字段可能注入 HTML/JS。分享页和预览页如果公开访问，会扩大攻击面。

建议：

- 所有插入 HTML 的文本字段必须做 HTML escape。
- docx 预览使用成熟 sanitizer，例如 DOMPurify 的服务端版本或 sanitize-html。
- 给预览页加 CSP，必要时使用 sandbox iframe。
- 不要用正则作为 HTML 安全清理方案。

## P1：高优先级优化

### 5. JSON 数据库写入不具备原子性和并发保护

位置：

- `database/db.js:53` 到 `database/db.js:80`：每次读取整个 JSON 文件。
- `database/db.js:107` 到 `database/db.js:120`：每次写入整个 JSON 文件。
- `database/db.js:113` 到 `database/db.js:116`：备份文件名精度到秒，同一秒多次写入会互相覆盖。

影响：

并发请求、多进程部署、进程崩溃或磁盘异常时，可能出现丢更新、半截 JSON、备份不可用。当前数据量继续增长后，全量同步读写也会拖慢接口。

建议：

- 最低限度：写入临时文件，再 `rename` 替换主文件，备份文件名加入毫秒或随机后缀。
- 给写操作加进程内队列/锁，避免同时读改写覆盖。
- 如果后续多人使用或高频写入，迁移到 SQLite，比自维护 JSON 更稳。

### 6. 记录 ID 大量使用 `Date.now()`，存在碰撞风险

位置：

- `database/db.js:41`、`database/db.js:179`、`database/db.js:280`、`database/db.js:320`。
- `database/db.js:336`：删除时按 ID 过滤，重复 ID 会删除多条。

影响：

批量上传、快速连续新增、并发请求可能在同一毫秒生成相同 ID。后续更新、删除可能命中错误记录或误删多条。

建议：

- 改用 `crypto.randomUUID()` 或集中式自增 ID。
- 对已有数据做一次 ID 唯一性检查和迁移。
- 数据库层新增记录时强制保证唯一，而不是依赖调用方。

### 7. 上传文件校验主要依赖扩展名

位置：

- `routes/assets.js:30`。
- `routes/library.js:28`。
- `routes/tools.js:91`、`routes/tools.js:407`、`routes/tools.js:615`。

影响：

伪装扩展名的文件可能进入公开目录，并被浏览器、sharp、mammoth、ffmpeg 等解析，增加 XSS、解析器漏洞和资源消耗风险。

建议：

- 校验真实 MIME 和文件头，而不是只看扩展名。
- SVG、doc/docx、视频等复杂格式要单独限制和隔离。
- 对上传大小、数量、总磁盘占用、并发任务设置全局限制。

### 8. 视频处理接口可能造成资源耗尽

位置：

- `routes/tools.js:393` 到 `routes/tools.js:550`：视频压缩。
- `routes/tools.js:404`、`routes/tools.js:612`：单文件最大 1GB。
- `routes/tools.js:20`：`spawnSync` 获取视频信息，会阻塞 Node 事件循环。

影响：

大文件或多个并发视频压缩会占满 CPU、内存、磁盘和事件循环。当前没有任务队列、超时、用户级限流或全局限流。

建议：

- 把视频处理放到独立 worker/队列中，Web 进程只提交任务和查询状态。
- 设置并发上限、超时、磁盘配额和失败清理。
- 避免在请求路径中使用 `spawnSync`，改成异步进程或队列任务。

### 9. 前端请求封装不统一

位置：

- `src/api/index.js:22` 到 `src/api/index.js:52`：统一请求层只处理 JSON，缺少网络异常和非 JSON 响应兜底。
- 多处视图直接裸 `fetch`，例如 `src/views/AssetsView.vue`、`src/views/ImageCompressView.vue`、`src/views/VideoCompressView.vue`、`src/views/MediaLibraryView.vue`、`src/views/VideoLibraryView.vue`、`src/views/ScriptsView.vue`。

影响：

401 重登、错误提示、token header、FormData 处理分散。部分接口失败时会静默失败，或页面仍提示成功。

建议：

- 抽一个支持 JSON 和 FormData 的统一请求层。
- 统一处理 `res.ok`、`content-type`、网络错误、401 跳转和后端标准错误结构。
- 页面层只关心业务结果，不重复写认证和错误解析。

### 10. 部分异步操作未检查后端结果

位置：

- `src/views/LibraryView.vue:237`：删除后直接提示成功。
- `src/views/MonitorView.vue:574`、`src/views/MonitorView.vue:583`：续费/删除后直接提示成功。

影响：

后端失败时，前端仍显示成功，用户会误以为数据已经变更。

建议：

- 所有写操作都检查 `success` 或 HTTP 状态。
- 失败时保留当前 UI 状态并显示错误原因。
- 删除、更新等操作统一走 helper，避免重复漏检。

## P2：中期修复与体验优化

### 11. 日报粘贴解析存在运行时 bug

位置：

- `src/views/ReportView.vue:364`：调用 `extractBetween()`。
- `src/views/ReportView.vue:374` 到 `src/views/ReportView.vue:378`：`extractBetween()` 使用未定义变量 `endM`。

影响：

当粘贴文本包含“总结:”字段时，可能触发 `ReferenceError: endM is not defined`，导致解析中断。

建议：

- 明确 `extractBetween(text, startRe, endRe)` 的函数签名。
- 如果没有结束规则，直接返回剩余文本；如果有结束规则，再计算 `endM`。
- 给粘贴解析补充样例测试，覆盖有/无总结、有/无优化方向等文本。

### 12. 定时器、监听器和图表实例清理不完整

位置：

- `src/views/ClockView.vue:360`：`ResizeObserver` 是局部变量，卸载时无法断开。
- `src/views/ClockView.vue:371`：地图刷新 `setInterval` 没有保存 ID，卸载时无法清理。
- `src/views/PlanView.vue:518`：resize 监听使用匿名函数，卸载时无法 remove。
- `src/views/DashboardView.vue:237`、`src/views/DashboardView.vue:253`：每次初始化图表可能重复 `echarts.init()`。

影响：

反复切换页面后，可能留下定时器、observer、resize listener 或 ECharts 实例，造成内存泄漏和重复渲染。

建议：

- 所有 `setInterval`、`addEventListener`、`ResizeObserver` 都保存引用，在 `onUnmounted` 清理。
- ECharts 初始化前先复用实例或 dispose 旧实例。
- 抽一个小的图表生命周期 helper，统一 resize 和 dispose。

### 13. 历史页 URL 状态持久化没有实际写 URL

位置：

- `src/views/HistoryView.vue:510` 到 `src/views/HistoryView.vue:521`。

影响：

代码注释是“URL 状态持久化”，也实现了从 URL 恢复，但 watch 里只构造了 `q` 对象，没有调用 `router.replace` 或 `history.replaceState`。刷新/分享不能保留筛选条件。

建议：

- 在筛选变化时调用 `router.replace({ query: q })` 或 `history.replaceState`。
- 月份、日期范围、国家筛选都应纳入同一套 query 状态。

### 14. 分享链接硬编码端口

位置：

- `src/views/MediaLibraryView.vue:302`。
- `src/views/VideoLibraryView.vue:311`。

影响：

部署到非 3456 端口、HTTPS、反向代理或正式域名时，复制出的分享链接可能不可用。

建议：

- 使用 `window.location.origin` 或后端返回公开 base URL。
- 如果前后端域名不同，通过环境变量配置 `PUBLIC_BASE_URL`。

### 15. Dashboard 等页面吞错过多

位置：

- `src/views/DashboardView.vue:317`、`src/views/DashboardView.vue:328`、`src/views/DashboardView.vue:339`、`src/views/DashboardView.vue:357`、`src/views/DashboardView.vue:379`。

影响：

接口失败时页面显示默认 0 或空状态，用户无法区分“确实没有数据”和“加载失败”。

建议：

- 页面维护 `loading/error/empty` 状态。
- 至少在控制台记录错误，并在关键数据区显示“加载失败，可重试”。
- 对多个数据源可以局部失败，不要让单个接口影响整页。

## P3：工程化与性能优化

### 16. 缺少测试、lint、格式化和 CI 脚本

位置：

- `package.json:4` 到 `package.json:10`：只有 `dev/build/start/postinstall/preview`。
- `package.json:31`：有 `playwright` 依赖，但没有测试脚本和配置。

建议：

- 增加 `lint`、`format:check`、`test`、`test:e2e`、`ci` 脚本。
- 最小测试范围建议覆盖：登录鉴权、文件下载鉴权、上传限制、JSON 写入恢复、日报粘贴解析、SPA fallback。
- CI 中至少执行 `npm ci`、`npm run build` 和关键测试。

### 17. 依赖体积和首包可优化

位置：

- `src/main.js:2` 到 `src/main.js:6`：全量引入 Element Plus、全量样式、全量图标。
- `src/main.js:13` 到 `src/main.js:15`：全局注册所有 Element Plus 图标。
- `package.json:14` 到 `package.json:25`：FFmpeg、Sharp、Three、ECharts、Element Plus 等重依赖都在同一个应用包里。

建议：

- Element Plus 组件和图标按需引入，至少只注册实际使用的图标。
- ECharts 按需注册图表模块。
- 媒体处理依赖可以考虑拆成独立服务/worker，避免主 Web 应用部署包过重。

### 18. 构建和部署配置偏隐式

位置：

- `package.json:8`：`postinstall` 自动执行 `npx vite build`。
- `server.js:135` 到 `server.js:148`：只有 dist 存在时才托管前端。
- `vite.config.mjs:19` 到 `vite.config.mjs:21`：构建配置只有 `outDir`。

建议：

- 部署平台显式配置 build command 和 start command，不依赖 `postinstall` 隐式构建。
- 增加 `engines.node`，固定 Node 版本范围。
- 为生产环境明确 `/api`、`/uploads`、持久化存储和反向代理规则。
- Vite 可补充 chunk 拆分、chunk size 警戒、sourcemap 策略。

### 19. 仓库本地文件和运行时目录需要继续收敛

位置：

- `.gitignore:1` 到 `.gitignore:11` 已忽略 `node_modules/`、`dist/`、`database/data/`、`uploads/`、日志、ngrok 和截图。
- 当前项目还存在 `.claude/` 等本地工具目录。

建议：

- 将 `.claude/` 或至少 `.claude/worktrees/` 加入忽略。
- 保持 `database/data/` 和 `uploads/` 不进入仓库，但要为生产环境设计备份和迁移方案。
- 本地隧道工具、日志、截图继续不要纳入版本控制。

## 建议修复路线

### 第 1 阶段：安全止血

1. 修复认证：移除硬编码账号密码，token 增加签名或改 session。
2. 停止公开整个 `/uploads`，下载/预览改为鉴权接口。
3. 修复 `save-video` 的路径校验和 `path.resolve` 目录约束。
4. 分享页、预览页增加 HTML escape 和 sanitizer。

### 第 2 阶段：数据可靠性

1. JSON 写入改为临时文件 + rename 的原子写入。
2. 写操作加队列或锁。
3. ID 改为 UUID，并检查历史数据是否有重复 ID。
4. 周计划、删除接口、上传接口补齐输入校验和目标存在性判断。

### 第 3 阶段：前端稳定性

1. 修复 `ReportView.vue` 的 `endM` 运行时 bug。
2. 统一请求层，消除裸 `fetch` 的认证和错误处理差异。
3. 清理 Clock/Plan/Dashboard 的定时器、监听器和图表生命周期。
4. 修复历史页 URL 状态、分享链接硬编码和失败提示。

### 第 4 阶段：工程化

1. 增加 lint、format、测试和 CI。
2. 优化 Element Plus、图标和 ECharts 的按需加载。
3. 明确生产部署流程、Node 版本、持久化存储和媒体处理策略。

## 可先落地的小修清单

这些改动成本低，建议优先穿插处理：

- `ReportView.vue`：修复 `extractBetween()` 的 `endM` 未定义。
- `PlanView.vue`：resize handler 提取成具名函数，并在卸载时移除。
- `ClockView.vue`：保存地图刷新 interval 和 ResizeObserver，在卸载时清理。
- `HistoryView.vue`：筛选变化时实际更新 URL query。
- `.gitignore`：补充 `.claude/` 或 `.claude/worktrees/`。
- `server.js`：移除重复的 `/uploads` 静态挂载，并把 `/api/*` 404 放在 SPA fallback 前。
