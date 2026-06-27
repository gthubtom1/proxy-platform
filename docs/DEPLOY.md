# VPS 部署教程（详细 · 准确 · 与本项目一致）

> 读者：零基础项目拥有者；实际操作时会让 AI 照着这份文档在一台全新 VPS 上部署。
> 因此本文每一步都给出**可直接复制的命令**，并标注**哪些值必须替换**（用 `【替换：...】` 标记）。
>
> 本项目是 monorepo（npm workspaces），包含：
> - `apps/api`：后端接口（Express），默认端口 **3000**（可用 `API_PORT` 改），本文统一用 **3110**。
> - `apps/gateway`：代理网关，默认端口 **18001**（`PROXY_GATEWAY_PORT`），监听 `0.0.0.0`。
> - `apps/worker`：上游扫描 + 长跑维护（月度 VACUUM、每小时连接对账）。
> - `apps/web`：前端，**同一套代码、构建时区分**管理后台 / 用户面板（见 §5，关键）。
> - 数据库：SQLite 单文件，路径由 `DATABASE_URL` 决定。
>
> 推荐架构：**后端 3 个服务用 pm2 守护 + 前端构建成静态文件用 Nginx 托管 + Nginx 反代 API**。文末附 Docker 方案。

---

## 给 AI 部署者的前置说明（务必先读）

1. 全程在一台全新 Ubuntu 22.04/24.04 VPS 上以 `root` 或具备 `sudo` 的用户执行。
2. 凡是 `【替换：xxx】` 的地方，必须换成真实值后再执行；不要原样跑。
3. 关键事实（来自源码，勿臆测）：
   - 前端 `VITE_APP_SURFACE` / `VITE_API_BASE_URL` 是 **vite 构建时变量**，`vite build` 时写死进产物。**管理后台和用户面板必须分别构建两次**，各自输出到不同目录。
   - 例外：**代理复制串的 host+端口由后端自动从 stunnel TLS 配置识别**（读 `STUNNEL_TLS_CONF`，默认 `/etc/stunnel/proxy-tls.conf`：域名取自 `cert` 路径、端口取自 `accept`，60s 缓存）。所以复制串默认是 HTTPS 域名串（如 `【替换：你的域名】:18443`）；**换域名只需换证书 + 改 stunnel 配置，后端自动跟随，无需重建前端**。`PUBLIC_PROXY_HOST` / `VITE_PUBLIC_PROXY_HOST` 退化为无 stunnel 时的回退值。
   - 统一登录：前端是**单一入口**（`RootApp`），一个登录页按账号角色自动进管理后台或用户面板；构建一份静态即可（`VITE_APP_SURFACE` 不再区分）。生产面板示例：`https://【替换：你的域名】:8443/`（nginx server 块 `proxy-panel`，复用已有证书，`/api` 反代 3110）。
   - 没有 prisma migrations 目录，建库用 `prisma db push`（不是 `migrate`）。
   - `DATABASE_URL` 必须用**绝对路径**；相对路径会因各服务工作目录不同而把数据拆成多个 .db。
   - `ENCRYPTION_KEY` 一旦确定必须长期保存；gateway / worker 启动会做加密自检。
4. 每完成一个阶段，用文末「验证」命令确认成功再继续。

---

## 1. 准备：两把密钥 + 一个对外地址

### 1.1 你要决定/准备

| 名称 | 用途 | 来源 |
| --- | --- | --- |
| `APP_SECRET` | 登录会话签名 | 第 1.3 步生成 |
| `ENCRYPTION_KEY` | 加密上游代理密码（**务必备份**） | 第 1.3 步生成 |
| `PUBLIC_PROXY_HOST` | 后端 .env 必填项（pm2 启动硬检查，且不能填 localhost）；**复制串实际 host 现由前端按访问域名自动决定**，此值仅作后端兜底 | 你 VPS 的公网 IP 或域名 |
| 管理员账号密码 | 后台登录 | 自定义强密码 |
| 域名（可选但推荐） | 给后台/面板配 HTTPS | 你自己的域名解析到 VPS |

### 1.2 域名解析（如果用域名）

把两个子域名解析到 VPS 公网 IP（A 记录）：
- `admin.【替换：你的域名】` → VPS IP（管理后台）
- `app.【替换：你的域名】` → VPS IP（用户面板）

API 不单独开域名，走 `admin`/`app` 域名下的 `/api` 路径反代（同域，免 CORS）。

### 1.3 生成两把密钥（装完 Node 后执行，各跑一次记下来）

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 2. 装基础环境

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install git nginx
# Node.js 20（项目要求 Node >= 20）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt -y install nodejs
# pm2 进程守护
sudo npm install -g pm2

# 验证
node -v   # v20.x
npm -v
git --version
nginx -v
pm2 -v
```

---

## 3. 拉取代码 + 安装依赖

```bash
sudo mkdir -p /opt && cd /opt
git clone 【替换：你的仓库地址，如 https://github.com/gthubtom1/proxy-vps2.git】 proxy-platform
cd /opt/proxy-platform

npm install
```

---

## 4. 配置 .env（后端用）

```bash
cd /opt/proxy-platform
cp .env.example .env
nano .env     # 改完 Ctrl+O 回车保存，Ctrl+X 退出
```

按下面填写（注释行 `#` 可保留）：

```ini
NODE_ENV=production

# 后端端口
API_PORT=3110
PROXY_GATEWAY_PORT=18001

# 允许访问 API 的前端来源（用你的真实域名或 http://IP）
# 用域名+HTTPS：
ADMIN_WEB_ORIGIN=https://admin.【替换：你的域名】
USER_WEB_ORIGIN=https://app.【替换：你的域名】
WEB_ALLOWED_ORIGINS=https://admin.【替换：你的域名】,https://app.【替换：你的域名】
# 若先用 IP 不用域名，则改成 http://【替换：VPS_IP】:8080 之类你实际开放的端口

# 对外代理主机（用户复制串里的 host）：填公网 IP 或域名
PUBLIC_PROXY_HOST=【替换：VPS公网IP或域名】

# 管理员账号（自定义强密码）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=【替换：强密码】

# 两把密钥（第 1.3 步生成的）
APP_SECRET=【替换：第一把】
ENCRYPTION_KEY=【替换：第二把】

# 走 Nginx 反代后开启，登录限流才按真实客户端 IP
TRUST_PROXY=true

# 数据库：绝对路径！
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:/opt/proxy-platform/data/proxy-platform.db

# 扫描周期（可选，默认 10 分钟）
WORKER_REPEAT=true
SCAN_INTERVAL_MS=600000
```

---

## 5. 构建（重点：后端 + 前端两次）

### 5.1 生成 Prisma 客户端 + 建数据库

```bash
cd /opt/proxy-platform
set -a
. ./.env
set +a
npm run prisma:generate
npm run prisma:push        # 在 data/ 下建出 SQLite 库与表
```

> 说明：`set -a; . ./.env; set +a` 的意思是把 `.env` 里的配置临时加载到当前命令窗口。Prisma 建库命令需要读到 `DATABASE_URL` / `DATABASE_PROVIDER`，所以这里要先加载一次。

> 默认用 SQLite（单文件、零额外服务），小规模/自用足够。**只有当你需要扛高并发**（同时在线隧道上百且持续高吞吐、日志里频繁出现 SQLITE_BUSY）时才考虑 Postgres——见下面 §5.1.1。不确定就用 SQLite，以后再切。

### 5.1.1 （可选）改用 PostgreSQL

> 何时需要：SQLite 是单写入（所有写串行），并发写顶不住时才迁。这是**并发**问题，不是稳定性问题；worker 的每日清理 + 月度 VACUUM 已让 SQLite 长期稳跑。
>
> 原理：Prisma 一份 schema 只能写死一种 provider，不能运行时切。所以用环境变量 `DATABASE_PROVIDER` 在**建库/生成客户端时**决定引擎——`npm run prisma:*` 会先跑 `scripts/set-db-provider.mjs` 按它改写 schema 的 provider 行。运行时各服务再按 `DATABASE_URL` 是 `file:` 还是 `postgresql://` 自动适配（SQLite 专属的 WAL PRAGMA、WAL checkpoint 在 Postgres 上自动跳过）。

**(a) 安装并初始化 Postgres**

```bash
sudo apt update && sudo apt install -y postgresql
sudo systemctl enable --now postgresql

# 建库 + 账号（把 【替换：密码】 换成强密码并记下来）
sudo -u postgres psql -c "CREATE USER proxy WITH PASSWORD '【替换：密码】';"
sudo -u postgres psql -c "CREATE DATABASE proxy_platform OWNER proxy;"
```

**(b) 改 .env 指向 Postgres**

把 §4 里的 `DATABASE_URL` 改成 Postgres 连接串，并设引擎为 postgresql：

```ini
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://proxy:【替换：密码】@127.0.0.1:5432/proxy_platform
```

**(c) 生成客户端 + 建表（注意 export 同样两个变量）**

```bash
cd /opt/proxy-platform
export DATABASE_PROVIDER=postgresql
export DATABASE_URL="postgresql://proxy:【替换：密码】@127.0.0.1:5432/proxy_platform"
npm run prisma:generate -w @proxy-platform/db    # 会先把 schema 的 provider 改成 postgresql
npm run prisma:push -w @proxy-platform/db        # 在 Postgres 里建表
```

**(d)（仅老用户）把已有 SQLite 数据搬到 Postgres**

> 全新部署跳过这步。只有你之前已用 SQLite 跑过、想保留数据时才做。**搬之前 `pm2 stop all` 停掉所有服务**，避免边搬边写。脚本只对**空的** Postgres 跑一次（不保证可重复执行）。

```bash
cd /opt/proxy-platform
export DATABASE_PROVIDER=postgresql
SQLITE_URL="file:/opt/proxy-platform/data/proxy-platform.db" \
DATABASE_URL="postgresql://proxy:【替换：密码】@127.0.0.1:5432/proxy_platform" \
node scripts/migrate-sqlite-to-postgres.mjs
```

它按外键安全顺序逐表拷贝、保留主键 id，并重置 Postgres 自增序列，避免之后插入撞 id。

> **Node 20 注意**：`migrate-sqlite-to-postgres.mjs` 用到 `node:sqlite`（需 Node ≥ 22）。生产 VPS 跑 Node 20 时改用本仓库的两步式脚本（不依赖原生 sqlite）：先在 SQLite provider 下 `node scripts/export-sqlite-json.mjs` 导出 JSON，切到 Postgres 并 `prisma generate` / `db push` 后再 `node scripts/import-json-pg.mjs` 导入。`scripts/pg-setup.sh`（装 PG + 建角色/库，密码随机写入 `/root/pg-pass.txt`）和 `scripts/pg-switch-import.sh`（一键切 .env + 建表 + 导入）封装了整个流程，停服后跑一次即可。

**(e) 让 pm2 启动时也使用 Postgres**

把 `.env` 里的 `DATABASE_PROVIDER=postgresql` 和 `DATABASE_URL=postgresql://...` 保存好，然后按 §6 启动或执行：

```bash
pm2 startOrReload ecosystem.config.cjs --update-env
```

> 切回 SQLite：把 `DATABASE_PROVIDER` 设回 `sqlite`、`DATABASE_URL` 改回 `file:...`，重跑 (c) 的 generate/push 即可。

### 5.2 构建后端三服务 + 公共包

```bash
cd /opt/proxy-platform
npm run build -w @proxy-platform/shared
npm run build -w @proxy-platform/db
npm run build -w @proxy-platform/api
npm run build -w @proxy-platform/gateway
npm run build -w @proxy-platform/worker
```

### 5.3 构建前端两次（管理后台 + 用户面板，关键）

前端身份是构建时写死的，所以构建两遍、各放一个目录。`VITE_API_BASE_URL` 填**用户浏览器能访问到的 API 地址**（走 Nginx 同域反代就是 `https://域名/api`，注意**不带结尾斜杠**，代码会自己拼 `/api/...`，所以这里填到域名根即可）。

> 说明：前端请求路径形如 `${VITE_API_BASE_URL}/api/user/login`。若用同域 `/api` 反代，`VITE_API_BASE_URL` 就填 `https://admin.域名`（管理）/`https://app.域名`（用户）。

```bash
cd /opt/proxy-platform

# ---- 构建管理后台 ----
export VITE_APP_SURFACE=admin
export VITE_API_BASE_URL=https://admin.【替换：你的域名】
export VITE_PUBLIC_PROXY_HOST=【替换：VPS公网IP或域名】   # 可选回退；运行时优先用浏览器访问地址，换域名免重建
export VITE_PUBLIC_PROXY_PORT=18001          # 网关端口，若改了 PROXY_GATEWAY_PORT 这里要一致
npm run build -w @proxy-platform/web
sudo rm -rf /var/www/proxy-admin && sudo mkdir -p /var/www/proxy-admin
sudo cp -r apps/web/dist/* /var/www/proxy-admin/

# ---- 构建用户面板 ----
export VITE_APP_SURFACE=user
export VITE_API_BASE_URL=https://app.【替换：你的域名】
export VITE_PUBLIC_PROXY_HOST=【替换：VPS公网IP或域名】   # 可选回退；运行时优先用浏览器访问地址，换域名免重建
export VITE_PUBLIC_PROXY_PORT=18001          # 同上，与 .env 的 PROXY_GATEWAY_PORT 保持一致
npm run build -w @proxy-platform/web
sudo rm -rf /var/www/proxy-user && sudo mkdir -p /var/www/proxy-user
sudo cp -r apps/web/dist/* /var/www/proxy-user/
```

> 如果暂时不用域名、只用 IP 测试：把 `VITE_API_BASE_URL` 换成 `http://【替换：VPS_IP】:8080`（或你给 Nginx 开的端口），并相应改 Nginx `server_name`/`listen`。但生产强烈建议上域名 + HTTPS。

---

## 6. 用 pm2 启动后端三服务

项目自带 `ecosystem.config.cjs`（已配置崩溃自启、月度 VACUUM、每小时连接对账）。它会自动读取项目根目录的 `.env`，然后再启动 3 个后端服务。

启动前会做硬检查：如果 `.env` 不存在，或 `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `APP_SECRET` / `ENCRYPTION_KEY` / `WEB_ALLOWED_ORIGINS` / `PUBLIC_PROXY_HOST` / `TRUST_PROXY` / `DATABASE_URL` 缺失，pm2 会直接启动失败。这样可以避免生产环境偷偷用默认密钥或本地地址跑起来。

```bash
cd /opt/proxy-platform

pm2 install pm2-logrotate          # 日志轮转，防止磁盘写满
pm2 start ecosystem.config.cjs
pm2 status                         # proxy-api / proxy-gateway / proxy-worker 应为 online
pm2 save                           # 记住进程列表
pm2 startup                        # 按提示复制它打印的 sudo 命令执行一次（开机自启）
```

> 注意：`.env` 是 VPS 生产配置的唯一标准入口。临时 `export XXX=...` 仍然可以覆盖 `.env`，但正常部署不要依赖临时 export，避免重启或开机自启后丢配置。

后端验证：

```bash
curl http://127.0.0.1:3110/api/health     # 期望 {"ok":true,...,"database":{"ok":true}}
curl http://127.0.0.1:18001/health        # 网关健康
```

---

## 6.5 如何自定义端口（其他项目占用时）

三个端口都能改，但**改一个要同步改好几处**，否则会对不上。下面是每个端口的「联动链」。

### 改 API 端口（默认 3110）

假设要改成 `3210`：

1. `.env`：`API_PORT=3210`
2. `.env` 改完后执行：`pm2 startOrReload ecosystem.config.cjs --update-env`
3. Nginx 两个站点的 `proxy_pass`：`http://127.0.0.1:3210/api/;`（§7 里两处都改）
4. 改完 `sudo nginx -t && sudo systemctl reload nginx`

> API 只在本机被 Nginx 反代，不对外开端口，所以防火墙不用动。前端 `VITE_API_BASE_URL` 填的是域名（走 Nginx），**不含** API 端口，所以前端不用重建。

### 改网关端口（默认 18001，客户端连代理用）

假设要改成 `28001`：

1. `.env`：`PROXY_GATEWAY_PORT=28001`
2. pm2：执行 `pm2 startOrReload ecosystem.config.cjs --update-env`
3. **前端要重建**：§5.3 两次构建时 `export VITE_PUBLIC_PROXY_PORT=28001`，再 cp 到 `/var/www/...`
   - 真实「复制串」端口由后端按 `PROXY_GATEWAY_PORT` 生成，本来就会变；`VITE_PUBLIC_PROXY_PORT` 只是让前端**显示的端口**也一致。
4. **防火墙**：放行新端口 `sudo ufw allow 28001/tcp`（并可删掉旧的 `sudo ufw delete allow 18001/tcp`）
5. 验证：`curl http://127.0.0.1:28001/health`

### 改前端端口

生产用 Nginx 托管静态文件，前端不占独立端口（Nginx 走 80/443）。只有用 `vite preview` 调试才用 `WEB_PORT`（默认 5173）。所以正式部署一般无需关心前端端口。

### 一句话总结

| 改谁 | 要同步改的地方 |
| --- | --- |
| API 端口 | `.env` + `pm2 startOrReload ecosystem.config.cjs --update-env` + Nginx `proxy_pass`（×2） |
| 网关端口 | `.env` + `pm2 startOrReload ecosystem.config.cjs --update-env` + **前端重建 `VITE_PUBLIC_PROXY_PORT`** + 防火墙 |
| 前端端口 | 仅 `WEB_PORT`（只在 vite preview 调试时） |
| 对外域名 | **前端无需重建**：新域名解析到 VPS + 配好 Nginx/证书后，用新域名访问面板即可，复制串 host 会自动跟随（见前置说明「例外」） |

---

## 7. 配置 Nginx（托管两个前端 + 反代 API）

### 7.1 管理后台站点

```bash
sudo nano /etc/nginx/sites-available/proxy-admin
```

粘贴（把域名替换掉）：

```nginx
server {
    listen 80;
    server_name admin.【替换：你的域名】;

    root /var/www/proxy-admin;
    index index.html;

    # 单页应用：找不到文件回退到 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 同域反代后端 API
    location /api/ {
        proxy_pass http://127.0.0.1:3110/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7.2 用户面板站点

```bash
sudo nano /etc/nginx/sites-available/proxy-user
```

```nginx
server {
    listen 80;
    server_name app.【替换：你的域名】;

    root /var/www/proxy-user;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3110/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7.3 启用 + 重载

```bash
sudo ln -s /etc/nginx/sites-available/proxy-admin /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/proxy-user  /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 7.4 上 HTTPS（强烈推荐）

```bash
sudo apt -y install certbot python3-certbot-nginx
sudo certbot --nginx -d admin.【替换：你的域名】 -d app.【替换：你的域名】
```

certbot 会自动改 Nginx 配置为 443 + 自动续期。完成后 `ADMIN_WEB_ORIGIN`/`USER_WEB_ORIGIN`/前端构建里的 `VITE_API_BASE_URL` 都应是 `https://`（若之前填的是 http，改完 `.env` 后执行 `pm2 startOrReload ecosystem.config.cjs --update-env`，并按 §5.3 用 https 重新构建前端两次）。

> **自动续期**：certbot 安装即自带 systemd `certbot.timer`（`systemctl status certbot.timer` 可查），每天自动尝试续期，**无需额外 cron**。Nginx 用的证书续期后会自动 reload；给 **stunnel HTTPS 代理**（§8.5③）用的证书续期后需要重载 stunnel，这一步由 `/etc/letsencrypt/renewal-hooks/deploy/` 里的 deploy-hook 自动完成。

---

## 8. 防火墙端口

```bash
sudo ufw allow 22/tcp        # SSH，别把自己关外面
sudo ufw allow 80/tcp        # HTTP（certbot 验证 + 跳转）
sudo ufw allow 443/tcp       # HTTPS
sudo ufw allow 18001/tcp     # 代理网关（客户端连代理用）
sudo ufw enable
sudo ufw status
```

> 后端 3110、前端静态都走 Nginx 本机回环，不用对外开。网关 18001 必须对外开，否则客户端连不上代理。

---

## 8.5 代理网关安全加固（重要）

代理网关（18001）直接对公网开放，下面三项是对外正式售卖前应了解/处理的安全点。前两项**已内置在代码里**，第三项是**部署层加固（按需）**。

### ① 代理认证暴力破解限流（已内置）

网关对 `Proxy-Authorization` 做了**按来源 IP 的失败限流**：同一 IP 在时间窗内累计太多次认证失败（缺凭证 / 密码错 / 未知账号），后续请求会直接返回 **429 Too Many Requests**（带 `Retry-After`），且不再走数据库 / 密码哈希，避免被刷爆 CPU。**只统计认证失败**，配额 / 并发（403）和上游故障（502）这类「合法凭证」的结果不计入，所以正常用户不会被误封。

可调环境变量（pm2 启动前 `export`，或写进 `ecosystem.config.cjs`）：

```ini
GATEWAY_AUTH_RATE_MAX=20            # 时间窗内允许的认证失败次数，默认 20
GATEWAY_AUTH_RATE_WINDOW_MS=300000  # 时间窗毫秒，默认 5 分钟
```

> 状态是单进程内存：网关重启会清零；这与本项目「单实例小规模」定位一致。多实例部署时各实例各自计数。

### ② 按用户的来源 IP 白名单（已内置）

可以给某个用户限定「只有这些来源 IP / 网段能用该账号连代理」。在**管理后台 → 用户 → 新建/编辑**里有「允许来源 IP（可选）」输入框：

- **留空 = 不限制**（任意 IP 都能用，行为同以前）。
- 支持**单个 IPv4/IPv6** 或 **CIDR 网段**，逗号或换行分隔，例如：`203.0.113.5, 10.0.0.0/24, 2001:db8::/32`。
- 命中白名单才放行；不命中返回 **403**。客户端通过 IPv4 连双栈监听时常表现为 `::ffff:a.b.c.d`，白名单里写普通 IPv4 即可匹配。

> 这是「账号被盗也限制使用范围」的纵深防御，建议给固定办公网 / 固定出口 IP 的客户开启。

### ③ 代理协议明文凭证 → 用 TLS 前置（按需，部署层）

**风险**：客户端连 `IP:18001` 用的是**明文 HTTP 代理认证**，用户名/密码在「客户端 → 网关」这一段可被中间人看到（访问目标网站的流量走 CONNECT 隧道是加密的，但**代理认证协议本身不是**）。这是 HTTP 代理协议的通病，**小范围自用可接受**；对外正式售卖建议加 TLS 前置。

**推荐做法（不改代码）：在网关前放一层 TLS 终结（stunnel 或 Nginx stream）**，对外暴露 HTTPS 代理端口、内部明文转发到网关 18001。以 stunnel 为例：

```bash
sudo apt -y install stunnel4
sudo nano /etc/stunnel/proxy-tls.conf
```

```ini
[proxy-tls]
accept = 0.0.0.0:18443          ; 对外的 TLS 代理端口
connect = 127.0.0.1:18001        ; 本机明文网关
cert = /etc/letsencrypt/live/【替换：你的域名】/fullchain.pem
key  = /etc/letsencrypt/live/【替换：你的域名】/privkey.pem
```

```bash
sudo systemctl enable --now stunnel4
sudo ufw allow 18443/tcp
```

之后让客户端连 **HTTPS 代理** `域名:18443`（多数客户端 / 浏览器扩展 / 指纹浏览器如 AdsPower 支持 HTTPS 代理）。这样代理认证那段也被 TLS 包住，国内连接还能绕开 GFW 按明文 `CONNECT 域名` 的识别 / 按域名拦截。原 18001 可只对内网开放或关掉对外。

**生产化（本仓库已带现成文件，照抄即可，把 `【替换：你的域名】` 换成你的子域名）**：

```bash
sudo apt -y install stunnel4
# 1) TLS 配置：18443(HTTPS) -> 127.0.0.1:18001(网关)
sudo cp scripts/stunnel-proxy-tls.conf /etc/stunnel/proxy-tls.conf
# 2) systemd 服务（崩溃自启），用独立服务名 stunnel-proxy，不与系统 stunnel4 冲突
sudo cp scripts/stunnel-proxy.service /etc/systemd/system/stunnel-proxy.service
sudo systemctl daemon-reload && sudo systemctl enable --now stunnel-proxy
# 3) 证书续期后自动重载 stunnel（stunnel 把证书缓存在内存，续期后必须重启才生效）
sudo install -m 0755 scripts/restart-stunnel-deploy-hook.sh /etc/letsencrypt/renewal-hooks/deploy/restart-stunnel
sudo ufw allow 18443/tcp
```

> 子域名证书：若只有子域名权限，可单独给该子域名签证书 `sudo certbot certonly --webroot -w /var/www/certbot -d 【替换：你的域名】`（或 `--nginx`），证书路径与 `scripts/stunnel-proxy-tls.conf` 里的 `cert`/`key` 对齐即可。

> 为什么不在 Node 网关里直接做 TLS：HTTP 代理的 TLS 入口是部署层关注点，交给 stunnel / Nginx stream 比塞进网关进程更易于证书轮换和运维，网关代码保持单一职责。要做 Nginx `stream {}` TLS 终结也是同理。

---

## 8.6 客户端能测速但大网站（google 等）打不开 / 被墙：MSS/MTU 黑洞修复

**现象**：走代理后，IP 检测站这类小响应能开，但 google / facebook / youtube 这类 **TLS 证书 / 页面大包**的网站一直转圈、`ERR_TIMED_OUT` / `ERR_TUNNEL_CONNECTION_FAILED`；而在 VPS 本机直接测同样的网站却正常。

**根因**：客户端 ↔ VPS 这条链路存在 **PMTU 黑洞**——大包（带 DF 标志）在中途被丢、ICMP「需要分片」又被防火墙过滤，于是大包静默丢失、TLS 握手卡死。WARP / 机场客户端能开，是因为它们把 MTU 压到 1280 把大包切小绕开了黑洞。

**修复（钳制 TCP MSS + 开启 MTU 探测，幂等、可持久化）**：本仓库带 `scripts/mtu-fix.sh`，在 `PREROUTING` 与 `POSTROUTING` 两个方向把 SYN 的 MSS 钳到 1240，并开 `net.ipv4.tcp_mtu_probing=1`，再用 iptables-persistent 持久化。

```bash
sudo bash scripts/mtu-fix.sh
# 校验：应看到两条 --set-mss 1240 规则 + tcp_mtu_probing = 1
```

> 双向钳制是关键：只钳 POSTROUTING 只能压「VPS→上游」和「客户端→VPS」，压不到「VPS→客户端」这条真正出问题的方向（本机终结的 socket，iptables 在 INPUT 链改不了对端 MSS），所以必须连 PREROUTING 一起钳。

---

## 9. 验证整条链路

```bash
# 1) 后端
curl http://127.0.0.1:3110/api/health
curl http://127.0.0.1:18001/health

# 2) 前端（域名通了之后，浏览器打开）
#   https://admin.你的域名  -> 管理后台登录页
#   https://app.你的域名    -> 用户面板登录页

# 3) 管理员登录：用 .env 里的 ADMIN_USERNAME / ADMIN_PASSWORD
```

业务流程：登录后台 → 上游池导入上游（格式见 README「Upstream Pool Import」）→ worker 自动扫描 → 用户管理建普通用户 → 用户登录面板自助提取代理 → 复制串形如 `公网IP:18001:用户名:密码` → 客户端用它连代理。

---

## 10. 以后更新（git 拉取部署）

```bash
cd /opt/proxy-platform
git pull
npm install
set -a
. ./.env
set +a
npm run prisma:generate
npm run prisma:push           # 如有 schema 变化
# 重新构建后端
npm run build -w @proxy-platform/shared
npm run build -w @proxy-platform/db
npm run build -w @proxy-platform/api
npm run build -w @proxy-platform/gateway
npm run build -w @proxy-platform/worker
# 重新构建前端两次（同 §5.3，记得 export 三个 VITE_ 变量），再 cp 到 /var/www/...
# 重启后端
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
```

---

## 11. 备份与维护

- **务必备份 `ENCRYPTION_KEY`**（密码管理器存一份）。丢了已存上游密码全解不开。
- 数据库备份（`scripts/backup-db.mjs` 会按 `DATABASE_URL` 自动选方式）：
  - SQLite（默认）：`node scripts/backup-db.mjs /opt/proxy-platform/data/proxy-platform.db ~/db-backup-$(date +%F).db`（一致性快照，可加进 crontab 每日跑）。
  - PostgreSQL：`DATABASE_URL="postgresql://proxy:【替换：密码】@127.0.0.1:5432/proxy_platform" node scripts/backup-db.mjs ~/db-backup-$(date +%F).sql`（内部调 `pg_dump`，需 `pg_dump` 在 PATH 上）。
- worker 已内置**每日**保留清理（scan/operation/traffic 日志 + 陈旧 geo 缓存）、**每月** VACUUM、**每小时**连接对账，无需手动维护，长期运行不会让 .db 无限增长。

### 健康告警（强烈推荐长期运行时加）

只有日志没有主动告警：服务挂了 / 上游全冷却 / 磁盘满了不会通知你。项目带 `scripts/health-monitor.mjs`，探测 API + 网关健康，失败就 POST 一条告警到 webhook（Slack/Discord/飞书/自建都收 `{text}` JSON）。失败时退出码非 0，cron 邮件也能兜底。

```bash
# 手动跑一次（应输出 all healthy）
node /opt/proxy-platform/scripts/health-monitor.mjs

# 加进 crontab，每 5 分钟一次，失败发到你的 webhook
# crontab -e 里加一行（换成你的 webhook 地址）：
*/5 * * * * HEALTH_ALERT_WEBHOOK='https://【替换：你的webhook】' node /opt/proxy-platform/scripts/health-monitor.mjs >> /var/log/proxy-health.log 2>&1
```

可调环境变量：`HEALTH_API_URL`（默认 `http://127.0.0.1:3110/api/health`）、`HEALTH_GATEWAY_URL`（默认 `http://127.0.0.1:18001/health`）、`HEALTH_ALERT_WEBHOOK`（不设则只打印不发）、`HEALTH_LABEL`（告警里标注是哪台机器）。

---

## 12. pm2 常用命令

```bash
pm2 status
pm2 logs proxy-api          # 看某服务日志
pm2 startOrReload ecosystem.config.cjs --update-env  # 改 .env 后重新读取配置
pm2 stop all
pm2 delete all              # 删进程（不删代码）
```

---

## 13. 常见问题（排障）

| 现象 | 原因 / 处理 |
| --- | --- |
| 浏览器打开面板但登录请求失败/CORS | 前端构建时 `VITE_API_BASE_URL` 没填对，或 `.env` 的 `WEB_ALLOWED_ORIGINS` 没含该域名。改完执行 `pm2 startOrReload ecosystem.config.cjs --update-env`，并重新构建前端。 |
| 管理后台和用户面板长一样 | 两次构建的 `VITE_APP_SURFACE` 没分别设成 admin/user，或 cp 到目录搞混了。 |
| 提取代理报「该地点暂时没有可用上游」 | 上游全在冷却（网络/DNS 抖动）。后台「上游池」批量恢复；检查 VPS 出网与 DNS 能否解析上游域名。 |
| 网关 502 | 上游不可用或凭证错误；后台重扫该上游。 |
| 数据被拆成多个 .db | `DATABASE_URL` 用了相对路径。改绝对路径后重启。 |
| pm2 里 gateway/worker 反复重启 | `.env` 里的 `ENCRYPTION_KEY` 不对，加密自检失败。修正 `.env` 后执行 `pm2 startOrReload ecosystem.config.cjs --update-env`。 |
| 登录限流按错 IP | 走了 Nginx 但 `.env` 没设 `TRUST_PROXY=true`。 |
| 客户端连代理报 429 Too Many Requests | 触发了网关认证暴力破解限流（§8.5①）：该来源 IP 认证失败太多次。等 `Retry-After` 秒数后重试；若是正常用户被误伤，检查客户端配的代理密码是否正确，或调大 `GATEWAY_AUTH_RATE_MAX`。 |
| 客户端连代理报 403（凭证正确） | 可能命中了该用户的「来源 IP 白名单」（§8.5②）：当前出口 IP 不在白名单内。在后台编辑该用户，加上其出口 IP/网段，或清空白名单解除限制。 |

---

## 14. 出口质量池（机房 IP 排除）+ 运维加固（2026-06-21）

### 14.1 机房 IP 排除（datacenter exclusion）

- `upstream_proxies` 新增 `ip_type`（默认 `unknown`）+ `ip_type_checked_at`；`ip_geo_cache` 新增 `ip_type`。属**只加列**的兼容迁移：`prisma db push` 即可，旧行回填为 `unknown`、无数据丢失。
- worker 扫描时顺带读 ip-api 的 `hosting`/`proxy` 标志，按 `hosting > proxy > residential > unknown` 归类写入 `ip_type`（只写明确分类，`unknown` 不覆盖已知值，避免抖动）。
- 提取与换 IP（`buildAvailableFreeUpstreamWhere`）**硬排除** `ip_type = hosting`；`residential / proxy / unknown` 都放行（**失败开放**，避免 API 抖动或未分类把池子缩没）。
- 复检自动回流：某 IP 被重新分类为非机房后，下一轮扫描即恢复可分配，无需独立池子。
- 注意：上线后现有上游先全是 `unknown`（可提取），随扫描逐轮打标；机房占比高时某地区可能缺货，盯 `ip_type` 分布与提取失败率，必要时调策略（`proxy` 默认不排除，作软信号）。

### 14.2 用户换 IP

- 面板「生成结果」为表格，逐条 / 批量「换一个 IP」：账号密码不变只换出口，已复制的串照常可用。后端 `POST /api/user/proxy-entries/:id/regenerate`（登录 + 条目归属校验）。

### 14.3 运维加固（cron + 防火墙）

- **健康告警**：`crontab` 每 5 分钟跑 `scripts/health-monitor.mjs`（日志 `/var/log/proxy-health.log`）。要主动推送就在该 cron 行前加 `HEALTH_ALERT_WEBHOOK='https://...'`。
- **每日备份**：`/root/pg-backup.sh`（`crontab` 每日 03:30，`pg_dump | gzip` 到 `/root/backups/`，保留 14 天）。**`ENCRYPTION_KEY` 要单独备份**（pg 备份不含它，丢了上游密码解不开）。
- **防火墙**：`ufw` 已启用（默认 deny incoming）。本机为共享机（同跑多个 app），启用前必须 `ss -tlnH` 枚举所有公网端口并逐一 `ufw allow`，再 `ufw --force enable`，否则会误伤其它服务或锁死 SSH。当前放行：22/80/443/8443/18001/18080/18081/18443/2053/2096/3110。

---

## 15. 本部署实例更新运维速查（给未来 AI / 更新者，务必先读）

> 这一节是**当前线上实例**（HK VPS）的具体事实与更新流程，避免下一个人再从零摸索。
> **秘密不入库**：root 密码、PG 密码、`ENCRYPTION_KEY`、token 一律只在 `/opt/proxy-platform/.env` 或机主处，**不要写进本文件**。

### 15.1 实例事实（先记这些）

- **VPS**：`【替换：VPS公网IP】`，`root`，SSH 端口 `22`。SSH host key 指纹（非密钥，可公开，供非交互连接校验）：`SHA256:AbsdmW34PSeT0uihnN0IH+89I9nY8R0cBNsP025ya5s`。
- **代码目录**：`/opt/proxy-platform` —— **不是 git 仓库**（当初直传部署）。更新只能 `scp/pscp` 传文件 + 远端重建，**不能 `git pull`**。
- **共享机**：同机还跑 cpa / newapi / sub2api / free / cheapapi 等多个 app（nginx 多 server_name，`8443` 复用）。任何整机操作（ufw、重启 nginx、改防火墙）**先确认不影响它们**。
- **数据库**：PostgreSQL，连接串在 `.env` 的 `DATABASE_URL`。schema 的 datasource provider 由 `scripts/set-db-provider.mjs` 按 `.env` 的 `DATABASE_PROVIDER=postgresql` 在 prisma 命令前切换（本地默认 sqlite，VPS 必须 postgresql）。
- **后端 pm2**：`proxy-api`(`API_PORT=3110`)、`proxy-gateway`(`18001`)、`proxy-worker`。`ecosystem.config.cjs` 读 `.env` 并硬校验必填项（缺 `APP_SECRET`/`ENCRYPTION_KEY`/`PUBLIC_PROXY_HOST` 等会拒启）。`pm2 startup` 已 enabled（开机自启）。
- **前端三个静态站（同一份构建、构建时 `VITE_API_BASE_URL` 不同，必须各构建一次）**：
  - `/var/www/proxy-panel` ← `VITE_API_BASE_URL=https://【替换：你的域名】:8443`（**生产面板**，nginx `8443 ssl`，证书 `【替换：你的域名】`）
  - `/var/www/proxy-admin` ← `VITE_API_BASE_URL=http://【替换：VPS公网IP】:18080`
  - `/var/www/proxy-user`  ← `VITE_API_BASE_URL=http://【替换：VPS公网IP】:18081`
  - 三者都带 `VITE_PUBLIC_PROXY_HOST=【替换：VPS公网IP】` `VITE_PUBLIC_PROXY_PORT=18001`
- **复制串 host:port**：后端按 stunnel TLS 配置自动识别为 `【替换：你的域名】:18443`（stunnel `18443` → 网关 `18001`，systemd `stunnel-proxy` active）。换域名只换证书+stunnel 配置，**前端免重建**。
- **防火墙 ufw**：已启用（default deny incoming）。放行 `22/80/443/8443/18001/18080/18081/18443/2053/2096/3110`（v4+v6）。新增对外端口要先 `ufw allow` 再说。
- **cron**：acme.sh 续证、`health-monitor.mjs`（每 5 分钟，日志 `/var/log/proxy-health.log`，未配 webhook=仅日志）、`/root/pg-backup.sh`（每日 03:30，`/root/backups/pg-*.sql.gz`，留 14 天）。
- **备份位置**：`/root/pgbackup-*.sql`、`/root/backups/pg-*.sql.gz`、`/root/src-backup-*.tar.gz`、`/root/dist-backup-*.tar.gz`、`/var/www/*.bak.<ts>`。
- **必须长期保管 `ENCRYPTION_KEY`**（在 `.env`）：pg 备份不含它，丢了上游密码全解不开。

### 15.2 标准更新流程（在 `/opt/proxy-platform` 上）

```bash
# 0) 本地先 typecheck + test + build 全绿，再把改动源码打包传到 /tmp 解压到 /opt/proxy-platform
set -a; . ./.env; set +a                       # 加载 DATABASE_URL / DATABASE_PROVIDER 等
# 1) 备份（必做）
pg_dump "$DATABASE_URL" -f /root/pgbackup-$(date +%F-%H%M%S).sql
for r in proxy-panel proxy-admin proxy-user; do cp -r /var/www/$r /var/www/$r.bak.$(date +%F-%H%M%S); done
# 2) 只有 schema 改了才跑（只加列安全；不要加 --accept-data-loss，让它拒绝破坏性变更）
npm run prisma:generate
npm run prisma:push
# 2.5) 本地 IP 地理库（首次部署或定期更新时）：让扫描器本地查城市/ASN，不被在线 API 限流。
#      没有库文件时扫描器自动回退到在线源（功能不受影响，只是慢/可能被限流）。
#      免费 key 注册：https://www.maxmind.com/en/geolite2/signup
MAXMIND_LICENSE_KEY=【替换：你的key】 node scripts/update-geoip.mjs   # 生成 data/geoip/GeoLite2-City.mmdb + GeoLite2-ASN.mmdb
#      建议加每周 cron 保持数据新鲜，例如：
#      0 4 * * 1 cd /opt/proxy-platform && MAXMIND_LICENSE_KEY=【替换：你的key】 node scripts/update-geoip.mjs >> /var/log/geoip-update.log 2>&1
# 3) 重建后端（按改动；shared/db/api/gateway/worker）
npm run build -w @proxy-platform/db
npm run build -w @proxy-platform/api
# 4) 重建前端 3 次 + 部署到 3 个站点
export VITE_PUBLIC_PROXY_HOST=【替换：VPS公网IP】 VITE_PUBLIC_PROXY_PORT=18001
for pair in "https://【替换：你的域名】:8443 proxy-panel" "http://【替换：VPS公网IP】:18080 proxy-admin" "http://【替换：VPS公网IP】:18081 proxy-user"; do
  set -- $pair; export VITE_API_BASE_URL="$1"; npm run build -w @proxy-platform/web
  rm -rf /var/www/$2/* && cp -r apps/web/dist/* /var/www/$2/
done
# 5) 重载后端
pm2 startOrReload ecosystem.config.cjs --update-env
# 6) 健康
curl -s http://127.0.0.1:3110/api/health; curl -s http://127.0.0.1:18001/health
# 公网冒烟：https://【替换：你的域名】:8443/  与  https://【替换：你的域名】:8443/api/health
```

### 15.3 已知坑（踩过的）

- **Windows → plink/pscp 非交互**：`plink -ssh -batch -hostkey SHA256:<上面指纹> -pw <pw> root@【替换：VPS公网IP】 "<cmd>"`。远端命令在 PowerShell 里用**双引号外层 + 单引号内层 + 反引号转义 `$`**；复杂多行脚本写成本地 `.sh`，pscp 上去后 `tr -d '\r' < f.sh > f.run.sh && bash f.run.sh`（去 CRLF）。
- **prisma provider**：本地 schema 是 `sqlite`，VPS 必须先 `set -a; . ./.env` 让 `DATABASE_PROVIDER=postgresql` 生效，`set-db-provider.mjs` 才会把 provider 切到 postgresql；否则 provider 与 `DATABASE_URL` 协议不符报错。
- **质量池 `ip_type`**：迁移只加列；新行 `unknown` = 可提取（失败开放）；机房随 worker 扫描打标后才被排除，效果**逐轮生效**不是瞬间。
- **回滚**：代码用 `/root/dist-backup-*` 或 `*.bak` 还原后重建+reload；DB 新列 `drop column` 即可（旧版不读）；`pg_dump` 可全量恢复。
- **共享机**：别 `pm2 delete all` / 别随意重启 nginx / 别改 ufw 默认策略——会波及其它 app。

---

## 附录 A：Docker Compose 方案（可选，替代 pm2 + Nginx 静态）

项目带 `docker-compose.yml` + 4 个 Dockerfile。注意它默认端口与上文 pm2 不同：

| 服务 | compose 暴露 | 说明 |
| --- | --- | --- |
| api | `3000:3000` | 容器内 API 默认 3000；`.env` 里设 `API_PORT=3000` 与之对齐 |
| gateway | `18001:18001` | 一致 |
| web | `5173:5173` | vite preview |
| worker | 无端口 | 后台扫描 |

**重要差异**：
- web 容器用 `vite preview`，且**只有一份构建**——无法同时出 admin/user 两个面板。要双面板，仍建议走 §7 的 Nginx 双静态方案；Docker 方案更适合「只跑后端 + 自己另配前端」或单面板试跑。
- 容器内数据库路径要用容器内路径：`.env` 里 `DATABASE_URL=file:/app/data/proxy-platform.db`（compose 给 api/gateway/worker 挂了共享卷 `proxy_data:/app/data`）。

装 Docker 并启动：

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo systemctl enable --now docker

cd /opt/proxy-platform
# 确认 .env：API_PORT=3000、DATABASE_URL=file:/app/data/proxy-platform.db
docker compose up -d --build
docker compose ps
docker compose logs -f api

# 首次建库（容器内执行一次）
docker compose exec api npm run prisma:push
docker compose restart api gateway worker

# 验证
curl http://127.0.0.1:3000/api/health
```

更新：`git pull && docker compose up -d --build`。

> 结论：**双面板生产部署用「pm2 + Nginx 双静态」（正文 §1–§13）最准确**；Docker 方案作为后端容器化的备选。

---

## 附录 B：运维 / 诊断脚本索引（scripts/）

> 这些是历次线上排障 / 部署沉淀下来的脚本，已纳入版本控制以便复现。**均不含密钥**：凭证在运行时从 `.env` 或 `/root/pg-pass.txt` 读取（`.env`、`*.txt`、TLS 证书、DNS 仍只留在服务器，不进 git）。

| 脚本 | 用途 |
| --- | --- |
| `mtu-fix.sh` | 修 PMTU 黑洞：双向钳制 TCP MSS=1240 + 开 mtu_probing + 持久化（见 §8.6） |
| `stunnel-proxy-tls.conf` | stunnel TLS 配置：18443(HTTPS) → 18001(网关)（见 §8.5③） |
| `stunnel-proxy.service` | stunnel 的 systemd 单元（崩溃自启） |
| `restart-stunnel-deploy-hook.sh` | certbot 续期后自动重载 stunnel 的 deploy-hook |
| `pg-setup.sh` | 装 PostgreSQL + 建 proxy 角色 / 库（密码随机写入 /root/pg-pass.txt） |
| `pg-switch-import.sh` | 把 .env 切到 Postgres + 建表 + 导入 SQLite 导出的数据（见 §5.1.1） |
| `export-sqlite-json.mjs` | Node20 兼容：从 SQLite 导出全表为 JSON |
| `import-json-pg.mjs` | Node20 兼容：把 JSON 导入空 Postgres（保留主键、重置序列） |
| `app-settings.hk.json` | 运行时可调参数快照（扫描节流 / 闲置解绑等），供参考默认值 |
| `gw-test.sh` | 诊断：建临时 US 条目，经网关测小 / 大请求连通性后删除 |
| `gw-make-test-entry.sh` | 诊断：建 US 条目并打印客户端代理串（不自动删，调用方清理） |
| `bw-test.sh` | 诊断：在 VPS 本机经网关测下载带宽，隔离「上游慢」vs「客户端→VPS 慢」 |
| `pool-stats.sql` | 上游池统计查询（状态分布 / 延迟分位 / 可用美国节点） |
