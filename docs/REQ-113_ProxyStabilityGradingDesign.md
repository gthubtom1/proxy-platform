# REQ-113 代理稳定性分级 + 伪静态识别 + 行业分类提取 · 方案文档

> 状态：阶段1.0（稳定性评分 + 使用保护窗口 + 必修修复）+ 阶段1增强（最短间隔门控 + stableSince 连续稳定）均已实现、测试通过、**已部署生产并验证**。
> 生产实测：阶段1.0 评分 1779 生效；阶段1增强后 tier 由 static1284/quasi425/dynamic70 变为 static772/quasi643/dynamic364（最短间隔门控让"偶尔快变"的降级，static 更精准）。
> 阶段2（静态住宅档·targetStabilityTier 持久化 + 排序优先）已于 2026-06-26 部署生产并经用户实测通过（panel 选「静态住宅A」成功提取 Alabama 住宅 IP 68.185.251.98·未标记 proxy；静态住宅池 738，tier static754/quasi622/dynamic403）。
> 2026-06-26 续：行业分类细分为 **6 档互斥提取**（住宅 高级纯净/普通纯净/动态/代理标记IP + 机房 稳定/动态；新增 proxy_entries.target_grade 列 + 用户名档位前缀 resi-premium/dc-static 等），已部署生产并经用户验收；smoke 各档候选池(premium804/normal400/dynamic228/flagged35/dc_static14/dc_dynamic118)级别精确对应、互斥。
> 2026-06-26 再续：**机房档 ip_type 滞后修复 + 扫描实时记录 + geo 缓存 TTL 15min + admin 级别看板**，均已部署生产。机房档曾因 `ipType` 滞后（出口轮转回住宅但旧 hosting 标签不更新）发住宅 IP；修复 `recordUpstreamScanResult` 加 `IP_TYPE_STALE_MS`(默认60min) 降级陈旧非住宅标签（即使 IP 未变）+ `runScanBatch` 改逐条实时写库（被扫数 2→121 验证）。admin Upstreams 加「级别分布」看板 + 「级别」列。详见 `docs/12_SESSION_HANDOFF.md`。
> 下一步：漂移检测（方案 A，已部署待实测）；阶段2 剩余（综合定级 L1-L4 + 锁州 + 连续天数门）；**安全待办（高优先）**：轮换已暴露 root 密码 + SSH 密钥登录。
> 生产环境要点：PostgreSQL（非SQLite）；非 git 仓库（scp 部署）；部署须 `set -a && . ./.env && set +a` 加载 DATABASE_PROVIDER/DATABASE_URL 后再 prisma generate/push。
> 用途：本文件是该需求的长期记忆载体，防止跨会话记忆丢失。后续实现以本文为准。

---

## 一、背景与目标

- **业务场景**：问卷调查。需要"地理稳定、不跨州、IP 不频繁变"的代理，避免问卷平台风控判异常。
- **货源现状**：约 2000 个 FloppyData 凭证，全部是**动态住宅（rotating residential）**，转售封装、无后台。
- **核心目标**：从动态货源中，通过持续检测，**慢慢识别出"伪静态"（碰巧长期地理稳定、变动慢的）**，优先供给问卷；其他按真实表现分到其他级别。

---

## 二、现状约束（已实测确认）

1. **凭证不支持 smart parameter**：实测在 username 后追加 `-rotation-0` / `-country-US` / `-state-California` / `-session-xxx` / `type-` / `user-` 前缀，全部连接失败（curl exit 56）。只有原始凭证可用。
   - 结论：不能用 provider 原生 sticky / 锁州 / 锁 IP。
2. **无原生 / 静态 / ISP 货源**：用户确认转售商无此类凭证。
   - 结论："静态"只能靠检测筛"伪静态"，不是真静态。
3. **凭证本身有"准 sticky"**：实测原始凭证连续 3 次返回同一 IP（104.5.137.52，对应样本 proxy 1，主力 IP 占 91%、平均 54 分钟才换）。
   - 结论：每个凭证是一个"相对固定身份"，稳定性高低由其自身特性决定，适合用检测分级。
4. **provider 并发容忍度高**：12 凭证并发压测，1/3/6/12 并发，唯一失败是单个代理偶发 TimeoutError，**无任何 402/rate_limited**。
   - 结论：并发可大胆提到 15-20+，瓶颈不是 provider。

---

## 三、已验证的关键技术结论

| 结论 | 证据 |
| --- | --- |
| 凭证不支持锁 IP / 锁州 | 逐参数实测全 exit 56 |
| 并发可提到 15-20+ | 12 并发压测零限流（只偶发超时） |
| 真瓶颈是 scanBatchSize=40 不是检测速度 | 单次检测 ~2.5s，2000 个调大 batchSize 后约 4 分钟轮一遍 |
| 检测有 10 分钟观测盲区 | 多数代理"最短变动间隔"=采样间隔 10 分钟，真实变动可能更快但看不到 |
| 12 条样本里真伪静态 = proxy 2 / 12 | 同州、142 分钟变一次、最短也长、规律 |

### 12 条样本变动规律（采样间隔固定 ~10 分钟）

- 定时轮换（机房型，卡 61 分钟）：proxy 7（60.8-61.1）、6
- 较规律：proxy 8（45min）、9（51min）
- 不规律（住宅随机续租）：proxy 1（54min，min10/max193）、3、4、5、10
- 最稳（变动少 + 间隔长）：proxy 2 / 12（142min）、11（但跨州）
- 全局：12 代理 7.8 小时共换 58 次，平均 ~97 分钟/次

---

## 四、核心设计：一个核心 + 三根支柱

**核心**：把检测系统从"看 IP 新不新鲜"升级为"给每个上游持续定级、捞出伪静态供问卷"。

**三根支柱**（对应三个痛点）：
1. **定级**（治 IP 乱跳）：用检测把杂牌动态货源按真实表现分 L1-L4。
2. **保护**（治使用时断）：用户在用 / 最近用过的上游不被检测干扰。
3. **供给**（满足问卷要稳）：问卷只拿 L1 伪静态池，动态升降级。

### 4.1 定级模型（两层）

**第一层 原子检测指标**（每个上游持续测得）：
- 类型（住宅 / 机房 / proxy 标记）、跨州数、同城占比
- 平均变动间隔、**最短变动间隔**、连续稳定天数
- 成功率、延迟

**第二层 综合等级**：

| 级别 | 条件 | 用途 |
| --- | --- | --- |
| L1 伪静态优选 | 住宅 + 未标记 proxy + 不跨州 + 平均≥60min + 最短≥30min + 连续≥2天稳 | 问卷专用（"静态住宅"档） |
| L2 准稳定 | 住宅 + 不跨州 + 平均≥30min | 一般稳定需求 |
| L3 一般动态 | 住宅但跨州 / 频繁变 | 普通爬取 |
| L4 不推荐 | 机房 / 标记 proxy / 高失败 | 兜底 |

> 关键：L1 卡"最短间隔"和"连续天数"，是揪出真伪静态、排除"偶尔稳"的核心。

### 4.2 检测策略

1. **使用保护窗口**（已实现，建议默认 10-15min）：在用（activeConnections>0）或最近 N 分钟用过（lastUsedAt）的上游不检测。
2. **分层检测频率**：新上游优先高频测（快速定级）；L1/L2 候选正常频率持续盯；L4 低频（省流量）。
3. **batchSize 调大**（阶段0）：全池快速轮询，定级数据积累快。
4. **多窗口确认**：连续 2-3 天稳才升 L1，避免偶然稳误判。

### 4.3 使用期保障

- 绑定锁定（已有）+ 使用保护窗口（已做）。
- 使用中跨州漂移 → **提示用户手动换**（不自动换绑：换到的新上游同样会轮转，自动换=打地鼠，且换上游本身就 = IP 变）。
- 默认锁州不锁城（问卷够用）。

---

## 五、行业分类页面设计（定稿）

页面用行业分类术语 = "类型轴 × 稳定性轴"二维矩阵，背后用检测定级填货。

| 页面档位 | 标注 | 检测映射 | 状态 |
| --- | --- | --- | --- |
| 静态住宅 | 检测认证·准静态（高稳定，IP 长时间不变，非永久固定） | 住宅 + L1 伪静态 | 有货 |
| 动态住宅 | — | 住宅 + L3 动态 | 有货（主力） |
| 动态机房 | — | 机房（geo-dc）+ 动态 | 有货（少量） |
| 静态 ISP | — | ISP 类型 | 灰显·即将上线 |
| 静态机房 | — | 机房 + 静态 | 灰显·即将上线 |
| 移动 | — | mobile | 灰显·即将上线 |

**决策记录**：
- 决策1：静态住宅用行业名 + 小字标注准静态（方案 A）。
- 决策2：缺货分类灰显"即将上线"（展示规划、预留位置、不误导）。

**可扩展**：将来进真静态 / ISP / 移动货源，对应格子直接上架，不改架构。

---

## 六、已完成：阶段1（稳定性评分 + 使用保护窗口）

状态：已实现，自动化测试全绿（lint / typecheck / 单测 27 / 集成测试 45 / 真实数据验证 static=同州、dynamic=跨州），code-audit 通过。**待 VPS 部署验证**。

改动文件（5 个，全增量）：
1. `packages/shared/src/index.ts`：AppSettings 加 `stabilityIntervalMs`(默认30min) / `usageProtectMinutes`(默认10min) + `computeStabilityScore` 纯函数（地理50 + 速度30，满分80，tier 阈值 static≥60 / quasi≥40）+ tier 常量。
2. `packages/db/prisma/schema.prisma`：UpstreamProxy 加 `stabilityScore` / `stabilityTier` / `regionChanges24h` / `stabilityCheckedAt`（都有默认值）。
3. `packages/db/src/index.ts`：新增 `recomputeStabilityScores()`（读 scan_logs 算分写回）+ `getUpstreamScanCandidates` 加使用保护窗口排除条件（`usageProtectMinutes` 参数）。
4. `apps/worker/src/index.ts`：加 `scheduleLoop("stability", ...)` 评分 loop + 扫描传 `usageProtectMinutes`。
5. `packages/shared/src/index.test.ts`：加 6 个评分单测。

部署步骤（VPS）：`git pull` → `npm install`(若需) → `npm run prisma:generate` → `npm run prisma:push`(给 upstream 加 4 列，安全) → `npm run build` → `pm2 restart all`。

**生产级审查后已修必修项（阶段1.0 收口）**：
- 评分纳入可用性门控：`computeStabilityScore` 增 `successRate` 入参（<0.7→dynamic；0.7-0.9→封顶 quasi），`recomputeStabilityScores` 用 upstream 累计 `successCount/failCount` 算成功率传入。防"经常连不上但 IP 没变"的上游被误判 static。
- 评分批量写：`recomputeStabilityScores` 由 N 次串行 update 改为分批 `$transaction`（每 200 一批），减少 SQLite fsync、批间隙释放写锁，避免评分时阻塞 gateway。
- 验证：build/typecheck 通过；shared 单测 30 + db 集成 45 全过；新增 3 个可用性门控测试。

---

## 七、待做路线图

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| 阶段0 | admin 调参：scanBatchSize 40→2000、scanConcurrency 5→15-20 | 用户自调，0 代码 |
| 阶段1增强 | 评分纳入"最短间隔 + 连续稳定天数"，精准识别 L1 伪静态 | 待开始（静态住宅档地基） |
| 阶段2 | 综合定级 L1-L4 + 行业分类提取页 + proxy 标记过滤 + 锁州 | 待开始 |
| 阶段3 | 使用中跨州漂移提示（不做自动换绑） | 可选 |

### 阶段1增强具体改动
- `recomputeStabilityScores` 增算"最短变动间隔" + "连续稳定天数"。
- `computeStabilityScore` 速度分改用"最短间隔"（更保守）。
- schema 加 `minChangeIntervalMin` / `stableStreakDays`。
- L1 判定加"最短≥30min + 连续≥2天"。
- 补单测 + code-audit。

### 关键扩展点（改这 2 个咽喉函数，提取/换IP/漂移/locations 全场景生效）
- `buildAvailableFreeUpstreamWhere`（db ~1522）：加级别 / proxy 过滤。
- `matchingUpstreamOrderBy`（db ~1511）：加 stabilityScore 排序。

---

## 八、各页面改动清单（全部增量，不推倒重来）

- **必改**：
  - User/Extract：加行业分类档、质量列加稳定等级标签、默认锁州、proxy 标记过滤。
  - Admin/Upstreams：加「级别」列(含稳定分) + 顶部「级别分布」看板（6 档计数）✅已部署(2026-06-26)；按等级筛选待做。
  - Admin/Settings：加 `usageProtectMinutes` / `stabilityIntervalMs` 入口。
- **建议**：Admin/Overview：加"L1 静态住宅池余量"监控。
- **可选**：Admin/Users 档位权限、Admin/Proxies 与 User/Overview 展示等级。
- **不改**：Admin/Logs。

> 备注：`apps/web/src/recovered/` 是反编译的历史草稿，未被引用，不用动。

---

## 九、盲点清单（按优先级）

- **高**：ENCRYPTION_KEY 必须备份（丢了 2000 凭证密码全部无法解密）；proxy 标记要纳入过滤（住宅池目前 `ipType:{not:"hosting"}` 含 proxy 标记的）。
- **中**：SQLite → PostgreSQL（2000 代理 + 多用户并发写锁竞争，可能也是"使用卡顿"的另一主因，项目已支持 DATABASE_PROVIDER）；静态池库存监控；WebRTC / DNS / 时区使用规范（代理外泄露）。
- **低（用户已表态不在乎）**：检测流量成本（FloppyData 按 GB 计费，检测烧流量）；新上游 unknown 冷启动策略。

---

## 九点五、生产级审查（发现与修复状态）

以上线标准审查文档 + 阶段1 代码，发现并分级：

### 必修（已修复）
1. [逻辑缺陷] 评分未纳入可用性 → 低质量上游误判 static。**已修**：successRate 门控 + recomputeStabilityScores 传累计成功率 + 单测。
2. [性能] 评分 2000 次串行写可能阻塞 gateway。**已修**：分批 $transaction（每 200）。

### 高（待办）
3. [架构] SQLite 规模瓶颈，可能是"使用卡"根因 → 升"高"优先级，规模化前迁 PostgreSQL。

### 应修（阶段1增强 / 阶段2）
4. 保护窗口让热门上游"评分饿死"（常被保护→少检测）→ 加"最久未检测强制探测一次"。
5. 保护窗口的 `NOT:{lockedByEntry:{...}}` 关系查询需确认走索引，否则大池慢。
6. proxy 标记过滤 + 连续稳定天数未实现（当前 tier=static ≠ 完整 L1，仍可能含被标记 proxy 的）。

### 设计张力
7. 保护（不扰使用）vs 定级（要持续检测）天然矛盾，需明确取舍（保护窗口别太长 + 强制探测兜底）。

## 九点六、验收标准（量化）

- 单代理检测间隔：从 ~8.3 小时 降到 ≤ 10 分钟（调大 batchSize 后）。
- 使用断连率：部署使用保护窗口后明显下降（与部署前对比）。
- 问卷池 L1 数量：≥ 业务所需并发数。
- 评分准确性：抽样核对 L1 上游确为同州 + 高成功率 + 变动慢。

## 九点七、上线监控指标

- 评分 loop 耗时与规模（runStabilityBatch 日志 `updated=N` + 时长）。
- SQLite 写锁等待 / 事务超时计数。
- L1（静态住宅）池余量。
- worker 日志 `rate_limited` 计数（判断并发是否过高）。
- 各 tier 分布变化趋势。

## 九点八、灰度与回滚

- `usageProtectMinutes` 上线即改变检测行为：建议先设小值（5min）灰度观察断连，再调到 10-15min。
- 回滚：`usageProtectMinutes=0` 关闭保护；停 stability loop 停止评分（字段保留无害）；评分异常可重跑覆盖。
- `prisma db push` 加列向后兼容；回滚代码后旧列不影响运行。

## 十、核心认知与诚实边界

1. **检测定级 = 贴真实标签**，比供应商声明更真实（戳穿声称），但**不改变上游本质**：伪静态 ≠ 真静态，是"概率优选"不是"保证"。
2. **伪静态是金矿**，是本系统的核心价值。
3. **诚实底线**：单 IP 绝对不变做不到（凭证不支持 sticky）；能做到的是"地理稳定 + 优选 + 动态盯防"。对客户标"稳定 / 准静态"，不承诺"永不变"。

---

## 十一、设计哲学（一句话）

**"动态货源 + 检测定级 + 伪静态优选 + 动态盯防"** —— 用检测的"勤"换出问卷要的"稳"，且永远诚实（优选非保证）。
