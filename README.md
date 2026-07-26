# LIVE v2 — 现代化直播平台

基于 NestJS + Nuxt 3 + SRS + MySQL + Redis 的完整直播系统，替代原有 PHP 实现。

## 功能

- 直播播放（RTMP 接入 → HTTP-FLV / HLS 分发；WebRTC 底层已预留，播放端暂未接入）
- 实时聊天（WebSocket）+ 弹幕叠加
- 用户系统：邀请码注册、邮箱验证、密码重置、修改密码、删除账号
- 后台管理：直播间管理（创建/开播/停播/推流密钥）、用户管理、邀请码生成
- 管理员两步验证（TOTP）
- 邮件订阅 + 开播通知 + 一键退订
- 多路直播（PVP）分屏模式（最多 4 路）
- 深色/浅色主题、响应式布局
- CSRF 防护、速率限制、argon2 密码哈希、JWT httpOnly cookie

---

## 🚀 生产部署（Docker Compose，约 10 分钟）

### 前提
- 一台公网服务器（Linux，2C4G 起步）
- 已安装 **Docker** 和 **Docker Compose v2**（`docker compose version` 能输出版本号）
- 域名已解析到服务器 IP（如 `live.example.com` → 你的 IP）
- 开放端口：**80, 443, 1935**（TCP）+ **8000/udp**（WebRTC，可选）

### 步骤 1：上传代码到服务器
```bash
# 本地：把 v2/ 目录整个上传到服务器
rsync -avz --exclude node_modules --exclude dist --exclude .output \
  ./v2/  user@your-server:/opt/live/

ssh user@your-server
cd /opt/live
```

### 步骤 2：配置环境变量
```bash
cp .env.example .env
nano .env    # 或 vim
```
**必须修改的项**（不改完不要启动）：
| 变量 | 说明 | 示例 |
|------|------|------|
| `APP_URL` | 你的站点完整 HTTPS 地址 | `https://live.example.com` |
| `BACKEND_CORS_ORIGINS` | 同 APP_URL | `https://live.example.com` |
| `PUBLIC_API_BASE` | 浏览器调用的 API 基址（**不含** `/api` 后缀） | `https://live.example.com` |
| `PUBLIC_WS_BASE` | 浏览器 WebSocket 地址 | `wss://live.example.com` |
| `MYSQL_ROOT_PASSWORD` | 数据库 root 密码（强密码） | 随机 32 位 |
| `MYSQL_PASSWORD` | 数据库业务密码（强密码） | 随机 32 位 |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | 生成：`openssl rand -hex 48` | 随机 |
| `CSRF_SECRET` | 生成：`openssl rand -hex 32` | 随机 |
| `SMTP_*` | 你企业邮箱的 SMTP | 见模板 |
| `SRS_CANDIDATE` | 服务器公网 IP（WebRTC 预留用） | `203.0.113.10` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | 初始管理员账号 | 自定义强密码 |
| `ADMIN_INVITE_CODE` | 初始注册邀请码 | 自定义 |

**可选**：
| 变量 | 说明 |
|------|------|
| `ICP_NUMBER` | ICP 备案号（国内服务器填自有备案号，页脚展示；留空不显示） |
| `MPS_NUMBER` | 公安备案号（可选，页脚展示；留空不显示） |
| `PUBLIC_RTMP_HOST` | OBS 推流地址里显示的主机名（留空则取 `APP_URL` 的域名） |
| `PUBLIC_STREAM_BASE` | 播放地址前缀（留空则用相对路径经 nginx 代理，推荐） |

> `DATABASE_URL` 无需配置：Docker Compose 会由 `MYSQL_*` 自动拼出，仅本地（无 Docker）开发时才手动设置。

> 查公网 IP：`curl -s ifconfig.me`

### 步骤 3：配置 SSL 证书
```bash
cd nginx/certs

# 方式 A：自签名（测试用，浏览器会警告）
openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -keyout privkey.pem -out fullchain.pem \
  -subj "/CN=live.example.com"

# 方式 B：Let's Encrypt（正式上线用）—— 首次签发用 standalone
#（此时 nginx 尚未启动，80 端口空闲）
certbot certonly --standalone -d live.example.com
cp /etc/letsencrypt/live/live.example.com/fullchain.pem .
cp /etc/letsencrypt/live/live.example.com/privkey.pem .

cd ../..
```

**证书续期（webroot 方式，无需停机）**：nginx 已将 `nginx/certbot/`
挂载为 ACME webroot（`/.well-known/acme-challenge/` 走 80 端口），续期无需停 nginx：
```bash
certbot certonly --webroot -w /opt/live/nginx/certbot -d live.example.com
cp /etc/letsencrypt/live/live.example.com/{fullchain,privkey}.pem /opt/live/nginx/certs/
docker compose exec nginx nginx -s reload
```
建议放进 cron（每月执行一次即可，certbot 会自行判断是否需要续期）。

> 如果暂时不要 HTTPS：编辑 `nginx/nginx.conf`，把 80 端口的 server 块改成直接反代（不重定向到 443），并注释掉 443 server 块。

### 步骤 4：构建并启动
```bash
# 首次启动（构建镜像 + 拉取依赖镜像 + 跑数据库迁移 + 种子）
docker compose up -d --build

# 查看启动日志（确认 backend 跑通）
docker compose logs -f backend
# 看到 "Backend listening on :3001" 即成功。Ctrl+C 退出查看。
```

### 步骤 5：验证
```bash
# 健康检查
curl https://live.example.com/api/health
# → {"ok":true,...}

# 浏览器访问
open https://live.example.com
```

### 步骤 6：开始直播
1. 浏览器访问 `https://live.example.com/login`，用 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 登录
2. **强烈建议**立刻去 `/account` 启用两步验证（2FA）
3. 进 `/admin/streams`：
   - 种子已创建一个「主直播间」，点「推流地址」查看 server + stream key
   - 也可以「新建直播间」创建新的
4. OBS 设置（两项都从后台「推流地址」面板原样复制）：
   - 服务：自定义
   - 服务器：`rtmp://live.example.com:1935/live/`
   - 推流密钥：`<slug>?key=<streamKey>`（如 `main?key=a1b2c3...`）
   - 推流由后端校验 key，key 不对会被 SRS 拒绝；播放地址只含 slug，不会泄露 key
5. 后台点「开播」→ 观众在首页即可观看

### 日常运维
```bash
# 查看所有服务状态（backend/frontend/srs 均带健康检查，STATUS 列会显示 healthy）
docker compose ps

# 查看某服务日志
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f srs

# 重启某服务（不改代码，仅重启进程）
docker compose restart backend

# 停止全部
docker compose down

# 停止并清空数据（⚠️ 危险，会删数据库）
docker compose down -v
```

---

## 🔁 版本更新流程（发布新版本到生产环境）

仓库：https://github.com/Hi-Kite/live-v2  · 分支 `main`

### A. 服务器侧用 git 管理代码（推荐）

首次部署时把仓库克隆到服务器：
```bash
ssh user@your-server
cd /opt/live
git clone git@github.com:Hi-Kite/live-v2.git .     # 注意结尾的点
cp .env.example .env && nano .env                  # 填配置（见首次部署）
# 放 SSL 证书到 nginx/certs/
docker compose up -d --build
```

之后每次发布新版本，**在服务器上**执行：

```bash
cd /opt/live

# 1. 拉取新代码
git fetch origin
git log --oneline HEAD..origin/main              # 预览将要更新的提交
git pull --ff-only origin main

# 2. 如 .env.example 有新增配置项，对照同步到 .env
diff -u .env .env.example | less

# 3. 重新构建并滚动重启
#    --build 重新构建镜像（代码改动必需）
#    后端镜像内会自动跑 prisma migrate deploy 应用数据库迁移
docker compose up -d --build

# 4. 观察启动是否成功
docker compose logs -f backend     # 看到 "Backend listening on :3001" 即成功
docker compose logs -f frontend
```

> **零停机提示**：上面的命令会先构建新镜像，再原子替换容器，过程中网站短暂不可用（通常 5~15 秒）。如果直播进行中需要零停机，可分服务更新：先 `docker compose up -d --build backend`，确认健康后再 `... frontend`。

### B. 只更新某个服务（如只改了前端）

```bash
cd /opt/live
git pull --ff-only
docker compose build frontend          # 仅重建前端镜像
docker compose up -d frontend          # 仅替换前端容器
```

> nginx 通过 Docker 内置 DNS 动态解析上游（`resolver 127.0.0.11`），
> 单独重建某个服务后**无需**重启 nginx。

### C. 前端「构建时配置」变更（必须重建前端镜像）

以下变量是 build 时注入到客户端 bundle 的，改了 `.env` 后必须重建前端（`up -d` 不够，因为镜像没变）：
- `PUBLIC_API_BASE` / `PUBLIC_WS_BASE`
- `APP_NAME`
- `ICP_NUMBER` / `ICP_URL` / `MPS_NUMBER` / `MPS_URL`

```bash
# 改完 .env 后
docker compose build frontend && docker compose up -d frontend
```

而后端 / MySQL / Redis 的变量都是运行时读取的，改 `.env` 后 `docker compose up -d` 即可（compose 会检测到 env 变化重建对应容器）。

### D. 数据库迁移说明

- **普通代码更新**：后端容器启动时 entrypoint 会自动执行 `prisma migrate deploy`，无需手动操作。
- **schema 未改**：迁移无操作，秒过。
- **迁移失败**（极少数情况，如手改了数据库）：
  ```bash
  docker compose exec backend npx prisma migrate deploy
  # 查看迁移状态
  docker compose exec backend npx prisma migrate status
  ```
- **⚠️ 破坏性迁移**（删字段/改类型）：发布前先备份
  ```bash
  docker compose exec mysql mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" livedb > backup_$(date +%F).sql
  ```

### E. 回滚到上一个版本

```bash
cd /opt/live

# 1. 回退代码
git log --oneline -10                    # 找到上一个稳定 commit SHA
git checkout <previous-sha>

# 2. 如有破坏性数据库迁移，先恢复备份：
# docker compose exec -T mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" livedb < backup_YYYY-MM-DD.sql

# 3. 重建回退版本
docker compose up -d --build

# 4. 确认 OK 后，回 main 分支
git checkout main
```

> 旧版本镜像也可以保留复用（不必重新 build）：`docker compose up -d` 会复用上次 build 的镜像层，前提是没 `docker compose down`（down 不删镜像）。

### F. 推荐的发布工作流（开发机 → GitHub → 服务器）

```
开发机                         GitHub                生产服务器
──────                        ──────                ──────────
改代码、本地测好
git add -A
git commit -m "feat: ..."
git push origin main   ───►   main 分支更新
                                                    git pull --ff-only
                                                    docker compose up -d --build
                                                    docker compose logs -f backend
```

**版本标签**（建议每个稳定版本打 tag，便于回溯）：
```bash
# 开发机
git tag -a v2.1.0 -m "弹幕速度调节 + 性能优化"
git push origin v2.1.0

# 服务器回溯到某版本
git fetch --tags
git checkout v2.1.0
docker compose up -d --build
```

### G. 健康检查脚本（可选，发布后自动验证）

```bash
#!/bin/bash
# deploy-check.sh
URL="${1:-https://live.example.com}"
echo "checking $URL ..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  code=$(curl -sk -o /dev/null -w "%{http_code}" "$URL/api/health")
  if [ "$code" = "200" ]; then
    echo "✓ backend healthy ($code)"
    exit 0
  fi
  echo "  attempt $i: status=$code, retrying in 3s…"
  sleep 3
done
echo "✗ backend not healthy after 30s"
exit 1
```
```bash
chmod +x deploy-check.sh
./deploy-check.sh https://live.example.com
```

---

### 常见问题

**Q：改了 `PUBLIC_API_BASE` / `PUBLIC_WS_BASE` / `ICP_NUMBER` 但前端没生效？**
A：这些是构建时注入到客户端 bundle 的。必须重建前端：
```bash
docker compose build frontend && docker compose up -d frontend
```

**Q：页脚不显示备案号？**
A：`.env` 里 `ICP_NUMBER` 留空就是默认不显示。国内服务器运营需填写自有备案号，填好后重建前端（见上一问）。`MPS_NUMBER`（公安备案）同理，可选。

**Q：有 WebRTC 播放吗？**
A：播放端目前只接入了 HTTP-FLV 和 HLS。SRS 侧已预留 WebRTC（`SRS_CANDIDATE` + `8000/udp`），
但前端播放器与 `/rtc` 信令代理尚未接入，后续版本再启用。

**Q：OBS 推流连不上？**
A：检查 1935 端口是否开放：`telnet live.example.com 1935`。

**Q：邮件发不出去？**
A：检查 `SMTP_*` 配置，看 backend 日志：`docker compose logs backend | grep -i mail`。

**Q：数据库迁移失败？**
A：手动进容器执行：`docker compose exec backend npx prisma migrate deploy`

---

## 本地开发（无 Docker）

后端：
```bash
cd backend
pnpm install
# 需要 MySQL + Redis 在 localhost 跑着
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev        # http://localhost:3001
```

前端：
```bash
cd frontend
pnpm install
pnpm dev        # http://localhost:3000
```

---

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 | NestJS 10 + TypeScript + Prisma 5 |
| 前端 | Nuxt 3 + Vue 3 + Tailwind CSS + Pinia |
| 播放器 | ArtPlayer 5 + flv.js + hls.js |
| 实时 | Socket.IO |
| 数据库 | MySQL 8 + Redis 7 |
| 媒体 | SRS 5（RTMP/HLS/WebRTC/HTTP-FLV） |
| 邮件 | Nodemailer |
| 反代 | Nginx |
| 容器 | Docker Compose |

架构与设计详见 `PLAN.md`。
