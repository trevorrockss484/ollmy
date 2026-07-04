# 🐼 Pan助手 — Docker 部署指南

## 前置条件

- 一台带公网 IP 的 Linux 服务器（CentOS 7+ / Ubuntu 20.04+ / Debian 11+）
- 内存 ≥ 1GB（不用视频功能；用视频功能需 ≥ 2GB）
- 安全组/防火墙放行端口：**3456**（TCP）

---

## 一、服务器初始化

### 1.1 SSH 登录服务器

```bash
ssh root@你的服务器IP
```

### 1.2 安装 Docker

```bash
curl -fsSL https://get.docker.com | bash

# 启动并设置开机自启
systemctl enable docker
systemctl start docker

# 验证
docker --version
docker compose version
```

---

## 二、上传项目代码

### 方式 A：Git 克隆（服务器能访问 GitHub 时）

```bash
cd /root
git clone https://github.com/trevorrockss484/ollmy.git pan-assistant
cd pan-assistant
```

### 方式 B：本机打包 + SCP 上传（推荐国内服务器）

**在你的 Windows 电脑上操作（PowerShell）：**

```powershell
# 1. 进入项目目录
cd G:\claude-codeDemo\个人管理

# 2. 打包（排除不需要的文件）
tar --exclude='node_modules' --exclude='dist' --exclude='.git' --exclude='ngrok.exe' --exclude='ngrok.zip' -czf pan.tar.gz .
```

**上传到服务器：**

```powershell
# 替换成你的实际 IP
scp pan.tar.gz root@你的服务器IP:/root/
```

**SSH 进服务器解压：**

```bash
ssh root@你的服务器IP

mkdir -p /root/pan-assistant
cd /root/pan-assistant
tar -xzf /root/pan.tar.gz
```

---

## 三、构建并启动

```bash
cd /root/pan-assistant

# 构建镜像 + 后台启动
docker compose up -d --build
```

首次构建约 3-5 分钟（下载基础镜像 + npm install）。

看到以下输出说明成功：
```
✔ Container pan-assistant  Started
```

### 查看日志确认：

```bash
docker compose logs -f
```

看到 `🐼 Pan助手 → http://localhost:3456` 即启动成功。

按 `Ctrl+C` 退出日志查看，容器继续在后台运行。

---

## 四、验证

```bash
# 本地 curl 测试
curl http://localhost:3456/

# 返回 HTML 页面内容 → 正常
```

浏览器访问：

```
http://你的服务器IP:3456
```

---

## 五、防火墙放行（云服务器必做）

登录云服务商控制台 → 安全组/防火墙规则 → 添加入站规则：

| 方向 | 协议 | 端口 | 来源 |
|------|------|------|------|
| 入站 | TCP | 3456 | 0.0.0.0/0 |

如果服务器开了系统防火墙（iptables/firewalld）：

```bash
# Ubuntu/Debian (ufw)
ufw allow 3456/tcp

# CentOS (firewalld)
firewall-cmd --add-port=3456/tcp --permanent
firewall-cmd --reload
```

---

## 六、日常运维命令

### 容器管理

```bash
docker compose ps              # 查看运行状态
docker compose logs -f         # 实时日志
docker compose logs --tail=100 # 最近 100 行日志
docker compose restart         # 重启容器
docker compose stop            # 停止容器
docker compose start           # 启动容器（不重建）
docker compose down            # 停止并删除容器
```

### 代码更新后重新部署

```bash
cd /root/pan-assistant
git pull                        # 拉取最新代码（方式A）
# 或从本机重新打包上传（方式B）

docker compose down             # 停止旧容器
docker compose up -d --build    # 重建并启动
```

### 数据备份

```bash
# 数据库和上传文件在宿主机，直接备份即可
tar -czf backup-$(date +%Y%m%d).tar.gz \
  /root/pan-assistant/database/data \
  /root/pan-assistant/uploads
```

---

## 七、可选：配置域名 + HTTPS

### 7.1 用 Nginx 反代

安装 Nginx：

```bash
# Ubuntu/Debian
apt update && apt install -y nginx

# CentOS
yum install -y nginx
```

创建配置 `/etc/nginx/conf.d/pan.conf`：

```nginx
server {
    listen 80;
    server_name pan.你的域名.com;

    client_max_body_size 1024m;

    location / {
        proxy_pass http://127.0.0.1:3456;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
nginx -t                # 检查配置
systemctl reload nginx  # 重载生效
```

### 7.2 用 Certbot 免费申请 SSL 证书

```bash
# 安装 certbot
apt install -y certbot python3-certbot-nginx   # Ubuntu/Debian

# 自动配置 HTTPS
certbot --nginx -d pan.你的域名.com

# 设置自动续期
certbot renew --dry-run
```

---

## 八、项目文件说明

| 文件 | 作用 |
|------|------|
| `Dockerfile` | 多阶段构建：先 Vite 打包前端，再装生产依赖 |
| `.dockerignore` | 排除 node_modules、dist、git 等不必要的文件 |
| `docker-compose.yml` | 容器编排：端口映射 + 数据卷持久化 |

### 数据持久化卷

| 容器路径 | 宿主机路径 | 内容 |
|----------|-----------|------|
| `/app/database/data` | `./database/data` | JSON 数据库 + 自动备份 |
| `/app/uploads` | `./uploads` | 上传的图片、视频、压缩产物 |

容器删除后数据不丢失，重建容器自动恢复。

---

## 九、故障排查

### 端口被占用

```bash
# 查看 3456 端口占用
lsof -i :3456
# 或
netstat -tlnp | grep 3456

# 杀进程
kill -9 PID
```

### 容器启动失败

```bash
# 查看详细日志
docker compose logs pan-assistant

# 进入容器手动排查
docker exec -it pan-assistant sh
```

### 内存不足导致容器被杀

```bash
# 查看容器内存使用
docker stats pan-assistant

# 解决方案：升级 VPS 内存，或在 docker-compose.yml 加限制
#   deploy:
#     resources:
#       limits:
#         memory: 512M
```

### Sharp 编译失败

Alpine 镜像的 Sharp 使用预编译二进制，如果遇到 `sharp` 报错，在 Dockerfile 的 RUN 加上：

```dockerfile
RUN apk add --no-cache vips-dev
```

---

## 十、清理旧镜像

```bash
# 清理无用的 Docker 镜像和缓存
docker system prune -a
```

---

部署完成后访问 `http://你的IP:3456`，看到登录页面即成功。初始账号在 `database/data/database.json` 中查看或通过注册接口创建。
