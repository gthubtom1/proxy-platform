# 交接 · AI 协作规则体系（独立线，不覆盖代理项目 handoff）

> 会话类型：ARCH（规则体系建设）+ 安全收口。日期：2026-06-28。
> 本文件只记「规则体系」这条线；代理项目状态见 `docs/12_SESSION_HANDOFF.md` 与 `REQ-113/114`。

## 解决的真实问题

1. 代理项目把**真实 IP/域名/默认管理员密码**提交进了**公开** git 仓库（事故）。
2. 缺一套**防再犯、可复用、能自进化**的 0 基础协作规则。

## 做了什么

### A. 代理项目安全收口（已完成、已核实）
- `DEPLOY.md` / `README.md` / `scripts/stunnel-proxy-tls.conf` 里的生产 IP、域名、默认管理员密码（具体值此处不复述，避免再泄露）→ 全部改占位符。
- 备份（`git bundle` 全历史 + 源码 zip）→ 重建干净 git 历史（孤儿分支单提交）→ 新建 **`github.com/gthubtom1/proxy-platform`**（公开、单干净提交、无敏感）→ 删除旧泄密库 `proxy-vps2`（已 404）。
- 本地 typecheck 6 包全过、全量测试 196/196 全过。

### B. AI 协作规则体系（v2.4 定稿）
- 写出「**AI 协作规则 · 0基础全托管万能版**」v2 → v2.4（总则 A1-A6 + 8 阶段 B + 横切 C1-C10）。
- 配 **9 个 skill**（superpowers：brainstorming/writing-plans/executing-plans/TDD/systematic-debugging/verification-before-completion + 新增 requesting/receiving-code-review、finishing-a-development-branch）。
- 建**正本套件** **`github.com/gthubtom1/ai-collab-rules`**（规则 + `skills/` + README；`git log` = 进化履历 v1→v2.4，6 commits）。
- **系统设置瘦指针**（自动下整套到 `.cursor/`，零手动）。

## 关键产物 / 位置

- 正本套件：`https://github.com/gthubtom1/ai-collab-rules`（v2.4）
- 工作副本：`.cursor/rules/ai-collab-zero-base.mdc` + `.cursor/skills/`
- 代理项目新库：`https://github.com/gthubtom1/proxy-platform`
- 本地备份：`d:\Program\Projects\proxy-vps-history-*.bundle`、`proxy-vps-files-*.zip`

## 验证（证据）

- 正本 GitHub 已是 v2.4、6 commits、9 skills（gh 实拉确认）。
- 代理：typecheck 全过、196 测试全过；旧库 `proxy-vps2` 返回 404。

## 未完 / 待办

1. **系统指针**：建议换成 v2.4 版（比 v2.3 多 1 行「供应链安全底线」）。
2. **代理项目**（另一条线，仍有效）：root 密码轮换 + SSH 密钥登录；接真静态/ISP 美国货源（REQ-113/114）。
3. **本地备份**：确认新库一切正常、用几天后可删。

## 下次新会话第一句话（可复制）

```
读 docs/RULE-SYSTEM-HANDOFF.md 恢复「规则体系」这条线。AI 协作规则 v2.4 已定稿，正本在 github.com/gthubtom1/ai-collab-rules（规则+9 skill，git log 是进化履历），工作副本在 .cursor/rules + .cursor/skills，系统设置放瘦指针自动下整套。代理项目已脱敏迁移到 github.com/gthubtom1/proxy-platform（旧泄密库 proxy-vps2 已删）。代理那条线的下一步见 docs/12_SESSION_HANDOFF.md（root 密码轮换、接真静态货源）。
```
