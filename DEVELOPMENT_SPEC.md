# 动态住宅代理管理平台开发规格书

> 实现状态对照（2026-06-18，QA-302）：本文档是冻结的设计基准（技术栈 / 代理格式 / 阶段顺序不随意更改）。当前真实实现进度以 `docs/01_PROJECT_STATE.md` 与 `docs/13_TASK_STATUS.md` 为准。
> 概要：阶段 1-9（骨架 / 网关原型 / 上游池 / 扫描器 / 调度绑定 / DB 驱动网关 / 管理后台 / 用户前台 / 流量额度）已基本实现；删除·停用闭环（FEAT-120）已落地、代理删除已用户验收；create-proxy 验收待跑（本地 18 条 free 上游已扫出 US/GB/FR/CA/AU）；阶段 10（自动重绑完整策略）仅最小实现；阶段 11（备份 / 部署 / HTTPS）未做。注意：当前线上前端入口是打包产物 `apps/web/src/generated-app.js`，干净 React 源码在 `apps/web/src/recovered/` 待接回。

## 1. 项目定位

本项目是一个自用或朋友合用的动态住宅代理管理平台。

系统用于管理几百条动态 HTTP 上游住宅代理。用户登录 Web 前台后，可以选择国家、州、城市，并生成一条或多条可复制代理。生成后的代理地址固定不变，但后台会自动维护其绑定的真实上游代理，使其尽量符合用户选择的地区。

用户最终复制到指纹浏览器里的格式：

```text
VPS_IP:18001:resi-us-ny-newyork-u102-p001-a8f3k9:password
```

真实访问链路：

```text
指纹浏览器
  -> VPS 统一代理网关
  -> 系统根据用户名查找代理条目
  -> 转发到当前绑定的上游 HTTP 住宅代理
  -> 目标网站
```

## 2. 核心目标

系统必须实现：

1. 管理几百条动态 HTTP 上游代理。
2. 定时检测每条上游代理当前出口 IP 和地区。
3. 支持用户选择国家、州、城市生成可复制代理。
4. 用户代理地址固定不变。
5. 后台可以自动绑定或重绑符合地区要求的上游代理。
6. 支持管理员创建用户，并设置流量 GB 限额。
7. 支持统一代理网关端口。
8. 支持 HTTP 请求和 HTTPS CONNECT。
9. 统计用户流量。
10. 用户流量超额后拒绝代理连接。
11. 用户不能看到真实上游代理信息。

## 2.1 部署和网络使用前提

系统最终部署在一台海外 VPS 上。

如果用户本地网络可以稳定直连该 VPS 的代理网关端口，则用户本地不需要再开启机场、VPN、Clash、v2rayN、Cloudflare One 或其他系统代理。

标准使用链路：

```text
用户本地指纹浏览器
  -> VPS_IP:18001
  -> VPS 代理网关
  -> 当前绑定的上游 HTTP 住宅代理
  -> 目标网站
```

本地指纹浏览器只需要填写系统生成的 HTTP 代理：

```text
类型：HTTP
主机：VPS_IP
端口：18001
账号：系统生成的 username
密码：系统生成的 password
```

本地不需要配置：

```text
v2rayN
Clash
Cloudflare One
TUN 模式
系统代理
本地 HTTP/SOCKS 代理
```

前提条件：

```text
1. 用户本地可以稳定访问 VPS_IP:18001。
2. VPS 可以稳定访问上游 HTTP 住宅代理。
3. 代理网关通过上游住宅代理访问目标网站时，最终出口 IP 必须是住宅 IP。
4. 代理网关不能把用户请求直接从 VPS 出口访问目标网站，除非没有上游代理且明确返回错误。
```

Windows 本地连通性测试：

```powershell
Test-NetConnection VPS_IP -Port 18001
```

成功标准：

```text
TcpTestSucceeded : True
```

平台代理链路测试：

```powershell
curl.exe -x http://生成用户名:生成密码@VPS_IP:18001 https://api.ipify.org
```

成功标准：

```text
返回上游住宅代理出口 IP。
不能返回 VPS IP。
不能返回用户本地 IP。
不能返回机场或 VPN 节点 IP。
```

## 3. 第一版固定技术栈

为了保证不同 AI 开发时产物一致，第一版固定使用以下技术栈。

```text
语言：TypeScript
运行环境：Node.js 20
后端 API：Express
代理网关：Node.js http + net 模块
数据库：SQLite
数据库访问：Prisma
前端：React + Vite
部署：Docker Compose
目标系统：Ubuntu 22.04
```

第一版不要使用：

```text
Redis
PostgreSQL
Kubernetes
复杂消息队列
多服务器集群
第三方商业代理 SDK
```

## 4. 项目目录结构

项目根目录建议如下：

```text
proxy-platform/
  apps/
    api/
      src/
      package.json
    web/
      src/
      package.json
    gateway/
      src/
      package.json
    worker/
      src/
      package.json
  packages/
    db/
      prisma/
        schema.prisma
      src/
      package.json
    shared/
      src/
      package.json
  docker-compose.yml
  .env.example
  README.md
  DEVELOPMENT_SPEC.md
```

各目录职责：

```text
apps/api：管理后台和用户前台 API。
apps/web：React Web 页面，包含管理员后台和用户前台。
apps/gateway：统一端口 HTTP 代理网关。
apps/worker：上游代理扫描器和定时任务。
packages/db：Prisma schema、迁移、数据库客户端。
packages/shared：共享类型、常量、工具函数。
```

## 5. 基础概念

### 5.1 上游代理

上游代理是用户已有的几百条 HTTP 住宅代理。

支持导入格式：

```text
host:port:username:password
http://username:password@host:port
```

上游代理不是固定 IP。它当前可能是纽约，过一段时间可能变成洛杉矶。

### 5.2 代理条目

代理条目是用户在前台生成的一条可复制代理。

示例：

```text
VPS_IP:18001:resi-us-ny-newyork-u102-p001-a8f3k9:password
```

这条代理地址对用户是固定的。

### 5.3 绑定关系

一个代理条目绑定一条当前符合地区要求的上游代理。

示例：

```text
resi-us-ny-newyork-u102-p001-a8f3k9
  -> upstream_proxy_id = 188
```

如果 upstream_proxy_id 188 后续地区漂移或不可用，系统可以自动换绑到另一条符合纽约的上游代理。

## 6. 支持地区

第一版只支持以下 5 个国家：

```text
United States = us
United Kingdom = gb
France = fr
Canada = ca
Australia = au
```

注意：

```text
英国国家代码使用 gb，不使用 uk。
```

州和城市为可选条件。

只选择国家时：

```text
target_country = us
target_region = null
target_city = null
```

选择国家、州、城市时：

```text
target_country = us
target_region = ny
target_city = newyork
```

地区字段统一使用小写、无空格格式。

示例：

```text
New York -> newyork
Los Angeles -> losangeles
United Kingdom -> gb
New South Wales -> nsw
```

## 7. 代理条目用户名规则

代理条目用户名必须由系统生成，用户不能手写。

格式：

```text
resi-{country}-{regionOrAny}-{cityOrAny}-u{userId}-p{entryId}-{random}
```

示例：

```text
resi-us-ny-newyork-u102-p001-a8f3k9
resi-us-any-any-u102-p002-k7d9q2
resi-gb-london-london-u103-p001-r9t2bc
resi-fr-paris-paris-u104-p001-z6p1ny
resi-ca-on-toronto-u105-p001-m4x8aa
resi-au-nsw-sydney-u106-p001-h3v7lm
```

如果没有指定州或城市，使用 any：

```text
resi-us-any-any-u102-p003-b7m2q1
```

密码规则：

```text
每条代理条目独立生成随机密码。
密码长度至少 16 位。
数据库只保存密码 hash。
明文密码只在创建成功时返回前端一次。
后续无法查看明文，只能重置。
```

## 8. 数据库设计

使用 Prisma + SQLite。

### 8.1 users

用途：保存管理员和普通用户。

字段：

```text
id
username
password_hash
role: admin | user
status: active | disabled
traffic_quota_bytes
traffic_used_bytes
allowed_countries_json
max_proxy_entries
max_concurrent_connections
created_at
updated_at
quota_reset_at
```

说明：

```text
allowed_countries_json 保存用户允许使用的国家，例如 ["us","gb"]。
traffic_quota_bytes 表示用户总额度。
traffic_used_bytes 表示已使用流量。
```

### 8.2 upstream_proxies

用途：保存几百条上游 HTTP 代理。

字段：

```text
id
host
port
username
password_encrypted
status: free | locked | cooldown | bad | disabled
current_ip
country
region
city
isp
asn
latency_ms
score
locked_by_entry_id
fail_count
success_count
last_error_type
last_checked_at
last_changed_at
cooldown_until
created_at
updated_at
```

状态含义：

```text
free：可分配。
locked：已被某条代理条目绑定。
cooldown：刚失败或刚释放，暂不分配。
bad：连续失败较多。
disabled：管理员手动禁用。
```

### 8.3 proxy_entries

用途：保存用户生成的代理条目。

字段：

```text
id
user_id
username
password_hash
target_country
target_region
target_city
current_upstream_id
current_ip
current_country
current_region
current_city
status: active | inactive | mismatch | dead | disabled
traffic_used_bytes
active_connections
last_used_at
last_checked_at
expires_at
created_at
updated_at
```

状态含义：

```text
active：可用。
inactive：长时间未使用。
mismatch：当前绑定上游地区不匹配。
dead：当前无可用上游。
disabled：管理员或用户禁用。
```

### 8.4 traffic_daily

用途：保存每日流量汇总。

字段：

```text
id
user_id
proxy_entry_id
date
bytes_up
bytes_down
total_bytes
connections
```

### 8.5 scan_logs

用途：保存上游代理检测记录。

字段：

```text
id
upstream_proxy_id
success
exit_ip
country
region
city
latency_ms
error_type
message
created_at
```

### 8.6 operation_logs

用途：保存管理员和用户的重要操作。

字段：

```text
id
actor_user_id
action
target_type
target_id
detail_json
created_at
```

## 9. 后端 API 设计

### 9.1 管理员 API

```text
POST   /api/admin/login
GET    /api/admin/dashboard

POST   /api/admin/upstreams/import
GET    /api/admin/upstreams
POST   /api/admin/upstreams/:id/check
POST   /api/admin/upstreams/check-all
POST   /api/admin/upstreams/:id/disable
DELETE /api/admin/upstreams/:id

GET    /api/admin/geo-pools

GET    /api/admin/users
POST   /api/admin/users
PATCH  /api/admin/users/:id
POST   /api/admin/users/:id/reset-password
POST   /api/admin/users/:id/disable

GET    /api/admin/proxy-entries
POST   /api/admin/proxy-entries/:id/rebind
POST   /api/admin/proxy-entries/:id/disable
DELETE /api/admin/proxy-entries/:id

GET    /api/admin/logs
GET    /api/admin/settings
PATCH  /api/admin/settings
```

### 9.2 用户 API

```text
POST   /api/user/login
GET    /api/user/me
GET    /api/user/dashboard

POST   /api/user/proxy-entries
GET    /api/user/proxy-entries
POST   /api/user/proxy-entries/:id/check
POST   /api/user/proxy-entries/:id/rebind
DELETE /api/user/proxy-entries/:id

GET    /api/user/traffic
```

### 9.3 创建代理条目请求

请求：

```json
{
  "country": "us",
  "region": "ny",
  "city": "newyork",
  "count": 5
}
```

响应：

```json
{
  "entries": [
    {
      "host": "VPS_IP",
      "port": 18001,
      "username": "resi-us-ny-newyork-u102-p001-a8f3k9",
      "password": "plain-password-only-once",
      "format": "VPS_IP:18001:resi-us-ny-newyork-u102-p001-a8f3k9:plain-password-only-once"
    }
  ],
  "failed_count": 0,
  "message": "created"
}
```

如果目标地区资源不足，可以部分成功：

```json
{
  "entries": [
    {
      "host": "VPS_IP",
      "port": 18001,
      "username": "resi-us-ny-newyork-u102-p001-a8f3k9",
      "password": "plain-password-only-once",
      "format": "VPS_IP:18001:resi-us-ny-newyork-u102-p001-a8f3k9:plain-password-only-once"
    }
  ],
  "failed_count": 4,
  "message": "Only 1 matching upstream proxy is available."
}
```

## 10. 上游代理导入规则

支持格式：

```text
host:port:username:password
http://username:password@host:port
```

导入要求：

```text
逐行解析。
自动去除空行。
自动去除首尾空格。
校验 host 不为空。
校验 port 为 1-65535。
校验 username/password 不为空。
对 host + port + username 做去重。
上游密码加密保存。
重复代理不重复插入。
返回成功数量、重复数量、失败数量。
```

导入响应示例：

```json
{
  "created": 230,
  "duplicated": 12,
  "failed": 3,
  "errors": [
    {
      "line": 15,
      "reason": "Invalid port"
    }
  ]
}
```

## 11. 扫描器设计

扫描器由 apps/worker 实现。

### 11.1 检测步骤

每条上游代理检测流程：

```text
1. 从数据库取一批需要检测的 upstream_proxies。
2. 解密上游代理密码。
3. 通过该上游代理请求 https://api.ipify.org。
4. 成功后得到出口 IP。
5. 调用 IP 地理信息接口查询 country/region/city/isp/asn。
6. 更新 upstream_proxies 当前状态。
7. 写入 scan_logs。
```

第一版只使用一个 IP 查询源，后期可扩展多源比对。

### 11.2 检测成功条件

必须同时满足：

```text
可以通过上游代理访问 https://api.ipify.org。
返回合法 IPv4。
IP 地理信息查询成功。
country 属于 us/gb/fr/ca/au。
```

如果国家不属于支持范围：

```text
status 保持 free 或 cooldown，last_error_type = unsupported_country。
不要分配给用户。
```

### 11.3 失败分类

必须尽量分类失败原因：

```text
auth_failed
connect_timeout
connect_aborted
empty_reply
dns_failed
ip_lookup_failed
unsupported_country
unknown_error
```

### 11.4 扫描频率

建议：

```text
未绑定上游：每 10-20 分钟检测一次。
已绑定上游：每 2-5 分钟检测一次。
失败代理：进入 cooldown，5-15 分钟后再检测。
连续失败 3 次：status = bad。
管理员禁用：永不扫描。
```

## 12. 调度器设计

调度器负责给代理条目选择上游代理。

### 12.1 选择条件

候选上游必须满足：

```text
status = free。
country 必须匹配 target_country。
不能被其他 proxy_entry 锁定。
不能是 disabled/bad。
last_checked_at 不能太旧，建议 10 分钟内。
```

如果 target_region 不为空：

```text
优先选择 region 匹配的上游。
```

如果 target_city 不为空：

```text
优先选择 city 匹配的上游。
```

### 12.2 排序规则

候选排序：

```text
城市完全匹配优先。
州匹配优先。
score 高优先。
latency_ms 低优先。
last_checked_at 新优先。
success_count 高优先。
fail_count 低优先。
```

### 12.3 绑定规则

绑定成功后：

```text
upstream.status = locked
upstream.locked_by_entry_id = entry.id
entry.current_upstream_id = upstream.id
entry.current_ip = upstream.current_ip
entry.current_country = upstream.country
entry.current_region = upstream.region
entry.current_city = upstream.city
entry.status = active
```

### 12.4 无可用上游

如果没有符合地区要求的上游代理：

```text
创建时返回部分成功或失败。
重绑时 entry.status = dead。
前端提示当前暂无该地区代理。
```

## 13. 自动重绑规则

不要每个请求都重绑。

代理网关收到请求时：

```text
1. 校验 username/password。
2. 找到 proxy_entry。
3. 如果 entry disabled/dead，拒绝。
4. 如果 current_upstream 存在且 status = locked，直接使用。
5. 如果没有 current_upstream，调用调度器绑定。
6. 如果绑定失败，返回 502。
```

后台扫描发现绑定上游地区漂移时：

```text
第一次不匹配：entry.status = mismatch，但不立即换。
连续 2-3 次不匹配：允许重绑。
如果 active_connections > 0，延迟重绑。
如果用户手动点击重新匹配，立即重绑。
```

使用中保护：

```text
如果代理条目正在活跃连接中，不要主动重绑。
如果无活跃连接超过 3-5 分钟，可以重绑。
如果当前上游完全不可用，可以紧急重绑或返回错误。
```

## 14. 代理网关设计

代理网关由 apps/gateway 实现。

监听：

```text
0.0.0.0:18001
```

必须支持：

```text
HTTP 普通请求。
HTTPS CONNECT。
Proxy-Authorization Basic。
上游 HTTP 代理 Basic Auth。
流量统计。
并发连接统计。
错误返回。
```

### 14.1 认证流程

```text
1. 解析客户端请求中的 Proxy-Authorization。
2. 提取 username/password。
3. 在 proxy_entries 中查找 username。
4. 校验 password hash。
5. 查找所属 user。
6. 检查 user.status = active。
7. 检查 proxy_entry.status != disabled。
8. 检查用户剩余流量 > 0。
9. 检查用户并发未超限。
10. 获取 current_upstream。
11. 转发请求到上游代理。
```

### 14.2 HTTP 普通请求转发

客户端请求示例：

```text
GET http://api.ipify.org/ HTTP/1.1
Host: api.ipify.org
Proxy-Authorization: Basic ...
```

网关需要：

```text
连接上游代理 host:port。
给上游代理发送同样的 HTTP proxy 请求。
添加上游代理认证头。
转发上游响应给客户端。
```

### 14.3 HTTPS CONNECT 转发

客户端请求示例：

```text
CONNECT api.ipify.org:443 HTTP/1.1
Host: api.ipify.org:443
Proxy-Authorization: Basic ...
```

网关需要：

```text
连接上游代理 host:port。
向上游代理发送 CONNECT api.ipify.org:443。
添加上游代理认证头。
如果上游返回 200，网关向客户端返回 200 Connection Established。
之后进行 TCP 双向 pipe。
```

### 14.4 流量统计

必须统计：

```text
客户端 -> 网关 -> 上游 的字节数，记为 bytes_up。
上游 -> 网关 -> 客户端 的字节数，记为 bytes_down。
```

更新：

```text
users.traffic_used_bytes
proxy_entries.traffic_used_bytes
traffic_daily.bytes_up
traffic_daily.bytes_down
traffic_daily.total_bytes
traffic_daily.connections
```

### 14.5 超额处理

如果用户流量用完：

```text
拒绝新连接。
返回 HTTP 403 Forbidden。
响应内容：Traffic quota exceeded。
```

### 14.6 常见错误返回

```text
缺少认证：407 Proxy Authentication Required
认证失败：407 Proxy Authentication Required
用户被禁用：403 Forbidden
流量超额：403 Forbidden
无可用上游：502 Bad Gateway
上游连接失败：502 Bad Gateway
```

## 15. 管理员后台页面

管理员后台必须包含以下页面。

### 15.1 登录

```text
管理员用户名密码登录。
登录失败限速。
```

### 15.2 Dashboard

显示：

```text
上游代理总数。
可用代理数量。
不可用代理数量。
US/GB/FR/CA/AU 当前可用数量。
用户数量。
今日总流量。
今日检测次数。
今日失败数。
地区漂移次数。
```

### 15.3 上游代理池

功能：

```text
上传代理。
批量导入。
批量检测。
检测单条。
启用/禁用。
删除。
查看当前 IP。
查看国家、州、城市。
查看 ISP、ASN。
查看延迟。
查看状态。
查看最近检测时间。
查看失败原因。
```

### 15.4 地区池

按地区统计当前可用上游数量：

```text
United States
  New York: 12
  Los Angeles: 8

United Kingdom
  London: 6

France
  Paris: 5

Canada
  Toronto: 4

Australia
  Sydney: 3
```

### 15.5 用户管理

功能：

```text
创建用户。
设置用户密码。
设置 GB 流量额度。
设置允许国家。
设置最大代理条目数量。
设置最大并发连接数。
启用/禁用用户。
重置用户密码。
查看用户已用流量。
```

### 15.6 代理条目管理

管理员可以查看所有用户生成的代理条目。

功能：

```text
查看用户名。
查看所属用户。
查看目标地区。
查看当前出口 IP。
查看当前地区。
查看当前绑定上游 ID。
查看流量。
手动重绑。
禁用。
删除。
```

注意：

```text
管理员可查看上游代理信息。
普通用户不能查看上游代理信息。
```

### 15.7 日志

显示：

```text
扫描日志。
操作日志。
失败原因。
用户流量日志汇总。
```

### 15.8 系统设置

配置：

```text
代理网关端口，默认 18001。
扫描间隔。
已分配代理复检间隔。
失败重试次数。
自动清理周期。
IP 查询接口。
支持国家。
默认密码长度。
是否允许自动重绑。
```

## 16. 用户前台页面

普通用户只能看到自己的内容。

### 16.1 登录

普通用户用户名密码登录。

### 16.2 Dashboard

显示：

```text
剩余流量。
已用流量。
总额度。
已生成代理数量。
最大可生成数量。
允许国家。
当前启用代理数量。
```

### 16.3 生成代理

表单：

```text
国家：必选，只能选管理员允许的国家。
州/城市：可选。
数量：1/5/10/自定义。
```

点击生成后返回可复制代理列表：

```text
VPS_IP:18001:username:password
```

### 16.4 我的代理

列表字段：

```text
代理格式。
当前出口 IP。
当前国家/州/城市。
状态。
已用流量。
创建时间。
最后使用时间。
复制按钮。
检测按钮。
重新匹配按钮。
删除按钮。
```

### 16.5 流量记录

显示：

```text
今日用量。
本月用量。
每条代理用量。
每日流量图表。
```

## 17. 用户额度和限制

管理员可以为用户设置：

```text
总 GB 流量额度。
允许国家。
最大代理条目数量。
最大并发连接数。
账号状态。
```

网关必须执行：

```text
流量超额禁止新连接。
并发超限禁止新连接。
用户禁用后禁止代理。
代理条目禁用后禁止代理。
```

用户创建代理时必须检查：

```text
用户是否启用。
国家是否在 allowed_countries_json 中。
创建数量是否超过 max_proxy_entries。
当前是否有足够可用上游。
```

## 18. 安全要求

第一版必须实现：

```text
用户密码 hash 存储。
代理条目密码 hash 存储。
上游代理密码加密存储。
用户不能看到真实上游代理。
用户只能操作自己的代理条目。
管理员操作写 operation_logs。
登录失败限速。
代理认证失败限速。
.env 管理密钥。
Web 后台支持 HTTPS 部署。
```

不要记录：

```text
用户访问的完整网址。
用户请求内容。
上游代理明文密码。
代理条目明文密码。
```

建议部署时：

```text
VPS 防火墙只开放 Web 端口和 18001。
后台 Web 使用 HTTPS。
定期备份 SQLite 数据库。
定期轮换 .env 密钥。
```

## 19. 数据清理

必须有定时清理任务。

规则：

```text
proxy_entries 7 天未使用：标记 inactive。
proxy_entries 30 天未使用：自动删除或管理员可配置。
scan_logs 保留 7 天。
operation_logs 保留 90 天。
traffic_daily 保留 180 天。
cooldown 到期自动回 free。
```

不要长期保存每个请求明细。

长期保存的是：

```text
每日流量汇总。
代理条目状态。
上游代理当前状态。
必要操作日志。
```

## 20. 开发阶段和验收标准

开发顺序必须遵守一个原则：

```text
先证明核心代理链路能跑，再开发管理后台，再补长期稳定性。
```

本项目技术风险最高的部分是代理网关，尤其是：

```text
VPS 代理网关 -> 上游 HTTP 住宅代理 -> HTTPS CONNECT -> 目标网站
```

因此代理网关最小原型必须提前验证，不能等整个后台完成后才开发。

### 阶段 0：需求和规则冻结

实现内容：

```text
确认技术栈。
确认目录结构。
确认数据库 schema 草案。
确认用户名格式。
确认代理格式。
确认支持国家。
确认统一代理端口 18001。
确认不允许 VPS 直连兜底。
确认 DEVELOPMENT_SPEC.md 为开发基准。
```

验收：

```text
DEVELOPMENT_SPEC.md 存在。
后续 AI 开发必须先阅读该文档。
任何 AI 不允许随意更换技术栈、代理格式或开发顺序。
```

### 阶段 1：项目骨架

实现内容：

```text
Docker Compose。
Node.js 20 + TypeScript。
Express API 服务。
React + Vite Web 服务。
Gateway 服务。
Worker 服务。
Prisma + SQLite。
SQLite 持久化 volume。
.env.example。
初始管理员创建。
基础健康检查。
```

验收：

```text
docker compose up -d 后能启动所有服务。
Web 能打开。
GET /api/health 正常。
数据库能初始化。
管理员能登录。
重启容器后数据库不丢失。
```

### 阶段 2：代理网关最小原型

此阶段必须早做，用来验证核心代理链路。

实现内容：

```text
Gateway 监听 0.0.0.0:18001。
先使用一条写在 .env 或测试配置中的固定上游 HTTP 代理。
支持 HTTP 普通请求。
支持 HTTPS CONNECT。
支持简单测试账号，例如 test:test。
禁止上游失败后使用 VPS 直连目标网站。
```

此阶段暂时不需要：

```text
用户系统。
代理条目。
调度器。
流量统计。
自动重绑。
漂亮前端。
```

验收命令：

```powershell
curl.exe -x http://test:test@VPS_IP:18001 http://api.ipify.org
curl.exe -v -x http://test:test@VPS_IP:18001 https://api.ipify.org
```

成功标准：

```text
HTTP 请求返回住宅代理出口 IP。
HTTPS CONNECT 返回住宅代理出口 IP。
返回结果不是 VPS IP。
没有 Empty reply。
没有 Proxy CONNECT aborted。
上游代理不可用时返回 502，不允许直连兜底。
```

### 阶段 3：上游代理池

实现内容：

```text
导入上游代理。
支持 host:port:username:password。
支持 http://username:password@host:port。
正确处理密码中的冒号。
去重。
加密保存上游密码。
列表展示。
禁用。
删除。
```

验收：

```text
导入 100 条代理后，页面显示正确数量。
重复导入不会重复增加。
无效格式能显示错误行。
上游代理密码不会明文显示。
数据库中不保存明文上游密码。
```

### 阶段 4：扫描器

实现内容：

```text
批量检测上游代理。
测试 HTTPS CONNECT。
获取出口 IP。
查询国家、州、城市、ISP、ASN。
保存 current_ip/country/region/city/latency/status。
失败原因分类。
扫描并发限制。
检测超时。
IP 查询缓存。
地区字段规范化。
```

验收：

```text
页面能看到每条代理 current_ip/country/region/city/latency/status。
失败代理能看到 last_error_type。
系统能筛出 US / GB / FR / CA / AU。
扫描几百条代理时不会一次性无限并发。
重复出口 IP 不会反复请求 IP 查询接口。
```

### 阶段 5：调度器和绑定逻辑

实现内容：

```text
按国家、州、城市选择上游。
实现 free/locked/cooldown/bad/disabled 状态。
实现事务锁，防止同一上游被重复分配。
创建 proxy_entry。
绑定 proxy_entry -> upstream_proxy。
释放绑定。
释放后进入 cooldown。
库存不足时支持部分成功。
```

验收：

```text
选择 New York 生成 5 条，系统只绑定当前匹配纽约的上游。
同一上游不会被多个 proxy_entry 重复绑定。
库存不足时返回部分成功和 failed_count。
删除代理条目后，上游进入 cooldown，不会立刻分配给其他用户。
```

### 阶段 6：数据库驱动的代理网关

将阶段 2 的网关从固定上游代理升级为数据库驱动。

实现内容：

```text
解析 Proxy-Authorization。
校验 proxy_entries.username/password。
校验用户状态。
校验代理条目状态。
查找 current_upstream。
解密上游代理密码。
转发 HTTP 请求。
转发 HTTPS CONNECT。
缺少可用上游时返回 502。
禁止 VPS 直连兜底。
```

验收命令：

```powershell
curl.exe -x http://生成用户名:生成密码@VPS_IP:18001 http://api.ipify.org
curl.exe -v -x http://生成用户名:生成密码@VPS_IP:18001 https://api.ipify.org
```

成功标准：

```text
返回绑定上游的住宅出口 IP。
返回结果不是 VPS IP。
无效账号返回 407。
无可用上游返回 502。
HTTPS CONNECT 正常。
```

完成本阶段后，核心业务链路已经可用。

### 阶段 7：管理员后台

实现内容：

```text
Dashboard。
上游代理池。
地区池。
用户管理。
代理条目管理。
手动重绑。
禁用和删除。
扫描日志。
操作日志。
系统设置。
```

验收：

```text
管理员不用 SSH、不改数据库，也能管理代理池、用户和绑定关系。
管理员可以查看失败原因。
管理员可以手动禁用上游代理。
管理员可以手动重绑代理条目。
普通用户无法访问 /api/admin/*。
```

### 阶段 8：用户前台

实现内容：

```text
用户登录。
用户 Dashboard。
选择国家、州、城市。
选择生成数量。
生成代理。
我的代理。
复制代理。
检测代理。
重新匹配。
删除代理。
流量展示基础页面。
```

验收：

```text
普通用户只能看到自己的代理。
普通用户不能看到真实上游代理。
普通用户能生成多条代理。
普通用户能复制代理到指纹浏览器使用。
检测按钮必须检测完整链路，而不是只读数据库状态。
```

### 阶段 9：流量统计和额度限制

实现内容：

```text
用户 GB 限额。
每条代理条目流量统计。
每日流量汇总。
最大并发连接限制。
超额拒绝新连接。
连接结束时汇总写库。
长连接定时 flush。
SQLite WAL 和 busy_timeout。
```

验收：

```text
curl 通过代理访问时，用户流量增加。
每条代理条目的流量增加。
traffic_daily 正确汇总。
用户流量超额后，新连接返回 403 Traffic quota exceeded。
频繁请求时 SQLite 不会明显锁死。
```

### 阶段 10：自动重绑和稳定策略

实现内容：

```text
地区漂移检测。
mismatch 状态。
连续 2-3 次不匹配才允许自动重绑。
active_connections 使用中保护。
手动重绑优先。
失败冷却。
代理质量评分。
长期未使用自动 inactive。
```

验收：

```text
绑定上游地区漂移后，系统能标记 mismatch。
用户点击重新匹配后，能换到新的匹配上游。
正在使用中的代理不会被频繁强制切换。
上游连续失败后进入 bad 或 cooldown。
长期未使用代理会被自动清理或标记 inactive。
```

### 阶段 11：安全、备份和部署完善

实现内容：

```text
登录失败限速。
代理认证失败限速。
日志脱敏。
数据库每日备份。
恢复说明。
健康检查。
Nginx HTTPS。
Docker volume。
操作日志。
数据清理任务。
防火墙部署说明。
ENCRYPTION_KEY 备份提醒。
```

验收：

```text
重启服务不丢数据。
日志没有明文密码。
服务健康状态可检查。
数据库可备份和恢复。
普通用户无法越权访问其他用户代理。
后台 Web 可以通过 HTTPS 访问。
```

## 21. AI 开发约束

给任何 AI 开发时必须遵守：

```text
一次只实现一个 MVP 或一个小功能。
不能重写整个项目。
不能删除已有功能。
不能随意更换技术栈。
不能把上游代理明文密码写进日志。
不能让普通用户看到上游代理。
每次修改后必须提供：
1. 修改文件列表。
2. 启动命令。
3. 测试命令。
4. 验收标准。
5. 已知限制。
```

每次开发前，AI 必须先阅读：

```text
DEVELOPMENT_SPEC.md
README.md
package.json
prisma/schema.prisma
```

## 22. 测试命令

测试上游代理：

```powershell
curl.exe -x http://上游用户名:上游密码@上游host:port https://api.ipify.org
```

测试平台生成的代理：

```powershell
curl.exe -x http://生成用户名:生成密码@VPS_IP:18001 https://api.ipify.org
```

测试 HTTP 普通请求：

```powershell
curl.exe -x http://生成用户名:生成密码@VPS_IP:18001 http://api.ipify.org
```

测试 HTTPS CONNECT：

```powershell
curl.exe -v -x http://生成用户名:生成密码@VPS_IP:18001 https://api.ipify.org
```

成功标准：

```text
必须返回住宅出口 IP。
不应返回 VPS IP。
不应返回机场节点 IP。
不应出现 Proxy CONNECT aborted。
不应出现 Empty reply from server。
```

## 23. 最终验收标准

系统合格必须满足：

```text
管理员可以导入几百条上游 HTTP 代理。
系统可以检测这些代理当前出口 IP 和地区。
管理员可以创建用户并设置 GB 流量额度。
管理员可以限制用户允许使用的国家。
用户可以登录并生成多条代理。
生成的代理可以复制到指纹浏览器。
curl 通过生成代理访问 https://api.ipify.org 返回住宅 IP。
用户流量会被统计。
流量超额后代理不可用。
用户看不到真实上游代理。
管理员可以手动重绑和禁用代理。
系统可以处理地区漂移和上游失效。
系统不会长期保存用户访问明细。
```

## 24. 后期可扩展功能

第一版完成后再考虑：

```text
多 IP 库地区比对。
代理质量评分模型。
管理员 2FA。
用户 API。
批量导出代理。
更细的带宽限制。
更详细的流量图表。
PostgreSQL 迁移。
Go 重写代理网关。
多 VPS 节点。
```

第一版不要做这些，避免项目失控。

## 25. 长期真实使用补充要求

本节是为了避免系统在真实部署和长期使用中出现隐藏问题。后续 AI 开发时必须阅读本节。

### 25.1 不允许直连兜底

代理网关在任何情况下都不能绕过上游住宅代理直接访问目标网站。

如果当前代理条目没有可用上游代理，必须返回错误：

```text
502 Bad Gateway
No available upstream proxy
```

禁止实现以下逻辑：

```text
上游失败 -> 直接使用 VPS 出口访问目标网站
上游失败 -> 使用用户本地出口
上游失败 -> 静默切换到未知代理
```

验收要求：

```powershell
curl.exe -x http://username:password@VPS_IP:18001 https://api.ipify.org
```

返回 IP 必须是住宅代理出口 IP。不能是 VPS IP。

### 25.2 端口和服务部署约定

第一版建议端口：

```text
Web/API 内部端口：3000
代理网关端口：18001
Nginx HTTP：80
Nginx HTTPS：443
```

公网建议只开放：

```text
80
443
18001
```

其他内部服务端口不能直接暴露到公网。

Docker Compose 至少包含：

```text
api
web
gateway
worker
nginx
```

SQLite 数据库必须挂载到持久化 volume，不能放在容器临时层。

### 25.3 初始管理员创建

系统第一次启动时必须支持创建初始管理员。

推荐方式：

```text
如果数据库中没有 admin 用户，则读取 .env 中的 ADMIN_USERNAME 和 ADMIN_PASSWORD 创建管理员。
创建成功后日志只记录 admin username，不记录密码。
如果数据库已有 admin 用户，则忽略 .env 初始密码。
```

.env.example 必须包含：

```text
ADMIN_USERNAME=
ADMIN_PASSWORD=
APP_SECRET=
ENCRYPTION_KEY=
PUBLIC_PROXY_HOST=
PROXY_GATEWAY_PORT=18001
```

### 25.4 密钥和加密要求

上游代理密码必须加密保存，不能只做 hash，因为系统需要解密后连接上游代理。

要求：

```text
password_hash：用于用户登录和代理条目认证，不能反解。
password_encrypted：用于上游代理密码，必须可解密。
ENCRYPTION_KEY：从 .env 读取，不能写死在代码里。
```

如果 ENCRYPTION_KEY 变化，旧的上游代理密码将无法解密。文档和 README 必须提醒备份该密钥。

### 25.5 上游代理凭证解析

上游代理导入时必须正确处理特殊字符。

支持：

```text
host:port:username:password
http://username:password@host:port
```

注意：

```text
如果 username 或 password 中包含 @、:、#、%、/ 等字符，URL 格式必须要求用户进行 URL encode。
host:port:username:password 格式只按前 3 个冒号切分，剩余内容全部视为 password。
```

示例：

```text
proxy.example.com:10080:user:pa:ss:word
```

应解析为：

```text
host = proxy.example.com
port = 10080
username = user
password = pa:ss:word
```

### 25.6 地区字段规范化

系统必须对国家、州、城市做统一规范化，否则同一个城市会被存成多个名字。

规范：

```text
全部小写。
去除空格、点、逗号、撇号。
常见缩写映射到统一值。
```

示例：

```text
United States -> us
USA -> us
US -> us
United Kingdom -> gb
UK -> gb
Great Britain -> gb
New York -> newyork
NY -> ny
Los Angeles -> losangeles
L.A. -> losangeles
```

建议在 packages/shared 中实现：

```text
normalizeCountry()
normalizeRegion()
normalizeCity()
```

所有 API、扫描器、调度器都必须使用同一套规范化函数。

### 25.7 IP 查询接口和缓存

扫描器不能无限制请求 IP 查询接口。

要求：

```text
对相同 exit_ip 的地理信息做缓存。
缓存时间建议 24 小时。
同一个 IP 在缓存有效期内不重复请求第三方 IP 查询 API。
IP 查询失败时记录 ip_lookup_failed。
```

建议增加表：

```text
ip_geo_cache
- ip
- country
- region
- city
- isp
- asn
- provider
- created_at
- updated_at
```

第一版可以只接一个 IP 查询源，但代码结构要允许后期增加多个查询源。

### 25.8 扫描并发和限速

扫描几百条上游代理时不能一次性全部并发。

要求：

```text
默认扫描并发：10
单条代理检测超时：15 秒
HTTPS CONNECT 检测超时：20 秒
IP 查询 API 并发：5
```

系统设置中必须可以调整：

```text
scan_concurrency
scan_timeout_seconds
geo_lookup_concurrency
```

### 25.9 网关连接超时

代理网关必须设置连接超时，避免连接泄漏。

建议默认值：

```text
连接上游超时：15 秒
CONNECT 建立超时：20 秒
空闲连接超时：120 秒
单连接最大生命周期：30 分钟
```

连接关闭、错误、超时时必须：

```text
减少 active_connections
写入流量统计
释放内存和 socket
```

### 25.10 事务和并发安全

调度器绑定上游代理时必须使用数据库事务，避免同一条上游代理被同时分配给多个代理条目。

绑定必须是原子操作：

```text
1. 查询候选 upstream。
2. 确认 status = free 且 locked_by_entry_id 为空。
3. 更新 upstream.status = locked。
4. 更新 upstream.locked_by_entry_id。
5. 更新 proxy_entry.current_upstream_id。
```

如果事务失败，必须重新选择候选代理。

流量扣减也必须考虑并发：

```text
用户剩余额度检查和流量增加不能出现明显超卖。
```

第一版允许小幅统计延迟，但不能允许用户在额度耗尽后长时间继续使用。

### 25.11 流量统计写入策略

代理网关不能每收到几个字节就写数据库，否则 SQLite 容易频繁锁表。

推荐：

```text
每个连接结束时汇总写入一次。
长连接每 30-60 秒 flush 一次累计流量。
traffic_daily 使用 upsert 累加。
users.traffic_used_bytes 和 proxy_entries.traffic_used_bytes 使用原子递增。
```

如果写入失败：

```text
记录错误日志。
不要崩溃网关。
尽量在内存中保留短时间重试。
```

### 25.12 SQLite 限制

SQLite 适合第一版，但必须明确限制：

```text
适合几百条上游代理、少量用户、低到中等并发。
如果用户数量、连接数量或扫描任务明显增加，需要迁移 PostgreSQL。
```

必须启用：

```text
WAL 模式。
busy_timeout。
定期备份。
```

### 25.13 备份和恢复

系统必须提供基本备份方案。

至少支持：

```text
每日自动备份 SQLite 数据库。
备份 .env.example 中要求用户自行保存 ENCRYPTION_KEY。
保留最近 7-14 天备份。
支持管理员手动下载数据库备份。
```

恢复说明必须写入 README：

```text
停止服务。
替换数据库文件。
确保 ENCRYPTION_KEY 与备份时一致。
重新启动服务。
```

### 25.14 健康检查

Docker Compose 必须为服务提供 healthcheck。

至少包括：

```text
api health：GET /api/health
worker health：检查进程存活和最近扫描时间
gateway health：检查 18001 端口监听
web health：页面可访问
```

API 的健康检查响应：

```json
{
  "ok": true,
  "time": "2026-06-16T00:00:00.000Z"
}
```

### 25.15 日志要求

日志必须有级别：

```text
debug
info
warn
error
```

禁止日志输出：

```text
上游代理明文密码
代理条目明文密码
用户请求内容
完整 Proxy-Authorization
```

允许日志输出脱敏信息：

```text
username 前 6 位 + 后 4 位
upstream id
error_type
latency_ms
country/region/city
```

### 25.16 用户删除代理条目时的释放规则

用户删除代理条目时：

```text
proxy_entry.status = inactive 或删除。
如果绑定了 upstream，则释放 upstream。
释放后的 upstream.status = cooldown。
设置 cooldown_until = now + 10 分钟。
```

不要立刻把刚释放的上游代理分配给另一个用户。

### 25.17 用户生成数量和库存不足

用户一次生成多条代理时，系统必须支持部分成功。

示例：

```text
用户请求生成 10 条 London。
当前只有 3 条可用 London。
系统生成 3 条，返回 failed_count = 7。
```

前端必须明确提示：

```text
已生成 3 条，7 条因库存不足未生成。
```

### 25.18 代理检测按钮的真实含义

用户前台的“检测”按钮必须检测完整链路：

```text
用户生成代理 -> VPS 网关 -> 当前绑定上游代理 -> https://api.ipify.org
```

检测结果必须显示：

```text
是否连通。
当前出口 IP。
当前国家/州/城市。
是否匹配目标地区。
失败原因。
```

不能只检测数据库状态。

### 25.19 管理后台和用户前台权限隔离

权限要求：

```text
admin 可以访问 /admin 页面和 /api/admin/*。
user 不能访问 /admin 页面。
user 不能访问 /api/admin/*。
user 只能访问自己的 proxy_entries。
user 不能看到 upstream_proxies 的 host、port、username、password。
```

后端 API 必须强制校验权限，不能只靠前端隐藏页面。

### 25.20 合规和使用边界

系统定位为自用或朋友合用的代理管理工具。

第一版不实现：

```text
公开注册
公开售卖
在线支付
自动计费结算
对外开放 API 售卖
```

如后期要公开商业化，需要重新评估：

```text
服务条款
滥用处理
用户实名或风控
投诉处理
合规风险
日志留存策略
```

## 26. AI 实现时最容易跑偏的点

后续 AI 开发时，必须避免以下错误：

```text
1. 把代理网关做成普通反向代理，而不是 HTTP proxy。
2. 只支持 HTTP，不支持 HTTPS CONNECT。
3. 上游失败后直接用 VPS 出口访问目标网站。
4. 普通用户可以看到上游代理。
5. 每个请求都重新扫描或重新绑定，导致很慢。
6. 多个用户代理条目绑定到同一条上游代理。
7. 代理密码明文保存或写入日志。
8. 流量统计每个数据包都写数据库，导致 SQLite 锁死。
9. 没有 active_connections 保护，使用中突然换 IP。
10. 没有事务锁，生成多条代理时重复分配同一个上游。
11. 没有处理 Proxy-Authorization 缺失或错误。
12. 没有设置 socket 超时，连接泄漏。
13. 没有 Docker volume，重启后数据库丢失。
14. 没有备份 ENCRYPTION_KEY，导致上游密码无法解密。
15. 前端隐藏按钮但后端没有权限校验。
```

这些问题出现任意一个，都视为实现不合格。
