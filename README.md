# Dynamic Residential Proxy Management Platform

This is a private dynamic residential proxy management platform for personal or small-team use.

Current stage: MVP, deployed and live on a VPS (PostgreSQL + pm2 + Nginx + stunnel TLS). The proxy gateway, encrypted upstream pool, scanner, admin/user panels, and proxy-entry creation are working.

The project now has a monorepo (api/web/gateway/worker/db/shared), a database-driven proxy gateway (HTTP + HTTPS CONNECT, no direct VPS fallback), safe encrypted upstream import, a worker scanner (exit IP + geo + quality classification), real admin/user login with API isolation, full admin user management (status/quota/allowed-countries/limits) and password reset, admin/user proxy-entry creation without upstream leakage, operation logs without plaintext secrets, a safe delete/disable closure (FEAT-120: delete users/proxy-entries/upstreams + disable upstreams, double-confirmed), unified local startup scripts, and basic auto-rebind on idle geo drift.

User exit-IP control: the user "generate result" view is a table where each row can swap its exit IP on demand ("换一个 IP") — credentials stay the same, only the exit changes, so an already-copied client string keeps working. Datacenter exclusion: the scanner classifies each upstream's exit IP (`ip_type`: residential / hosting / proxy / unknown) and extraction/rebind hard-exclude datacenter (`hosting`) exits, keeping residential/unknown (fail-open) and auto-recovering an IP once a re-scan no longer flags it as datacenter.

## Deployment (VPS)

For production deployment on a VPS (clone + run), see **[docs/DEPLOY.md](docs/DEPLOY.md)**.
The recommended setup is **pm2** (3 backend services) + **Nginx** serving the two
static front-end builds + Nginx `/api` reverse proxy + Certbot HTTPS. The guide is
step-by-step for an unattended/AI deploy and marks every value to replace.

For client-facing hardening (especially behind strict networks): the gateway can sit
behind a TLS front (stunnel HTTPS proxy on `:18443`) so the proxy auth and target host
are encrypted, and a TCP-MSS / MTU clamp fixes the large-packet blackhole that otherwise
makes big sites (e.g. Google) hang. See DEPLOY.md §8.5③ (HTTPS proxy via TLS front) and
§8.6 (MSS/MTU fix). The operational scripts (TLS front, MSS fix, SQLite→Postgres
migration, diagnostics) are versioned under `scripts/` — see DEPLOY.md Appendix B.

All service ports are configurable via env vars (`API_PORT`, `PROXY_GATEWAY_PORT`,
`WEB_PORT`) in case other projects occupy the defaults — see DEPLOY.md "如何自定义端口".
A Docker Compose path is included as an appendix.

## Quick Local Start

Unified startup with correct ports and CORS:

```powershell
powershell -File scripts/start-local-stack.ps1
powershell -File scripts/health-check-local.ps1
```

Local entries after startup:

```text
API:         http://127.0.0.1:3110
Admin:       http://127.0.0.1:5180
User panel:  http://127.0.0.1:5181
Gateway:     http://127.0.0.1:18001
```

Legacy per-service scripts still exist under `scripts/start-*.ps1`, but prefer `start-local-stack.ps1` for acceptance work.

## Current Components

- `apps/api`: Express API service with health, auth, admin APIs, user APIs, upstream import/list, and proxy-entry creation.
- `apps/web`: React + Vite admin backend and user panel.
- `apps/gateway`: HTTP proxy gateway listening on `18001` by default.
- `apps/worker`: upstream proxy scanner.
- `packages/db`: Prisma schema; SQLite by default, optional PostgreSQL (`DATABASE_PROVIDER`).
- `packages/shared`: shared constants and normalization helpers.
- `docker-compose.yml`: API, Web, Gateway, and Worker service skeleton.

## Local Setup

Install dependencies:

```powershell
npm install
```

Generate Prisma client:

```powershell
npm run prisma:generate
```

Build all services:

```powershell
npm run build
```

Start API:

```powershell
npm run dev:api
```

Open:

```text
http://127.0.0.1:3110/api/health
```

Current local QA API entry:

```text
http://127.0.0.1:3110
```

Start Web:

```powershell
npm run dev:web
```

Open:

```text
http://127.0.0.1:5180
```

Current local admin and user web entries:

```text
http://127.0.0.1:5180
http://127.0.0.1:5181
```

Local development admin login:

```text
username: admin
password: 【替换：你的管理员密码，勿用默认】
```

Admin can create ordinary users in the admin backend. The ordinary user's initial password is shown once after creation. If the user forgets it later, admin can reset that ordinary user's password by typing a new one or letting the system generate one. Initial and reset passwords are shown only once. User passwords are hash-saved, so old plaintext passwords cannot be viewed later.

Start Gateway:

```powershell
npm run dev:gateway
```

Open:

```text
http://127.0.0.1:18001/health
```

## Gateway Prototype

FEAT-102 introduced a fixed-test-upstream prototype from environment variables. The live gateway is now database-driven (FEAT-106): it authenticates proxy-entry username/password and forwards through the proxy entry's bound upstream. The fixed-upstream env vars below remain only for isolated gateway testing.

Supported now:

- HTTP proxy request forwarding.
- HTTPS CONNECT tunnel forwarding.
- Gateway test login, default `test:test`.
- Upstream failure returns `502 Bad Gateway`.
- Gateway does not fall back to direct VPS/local outbound access.

Set one of these in `.env` or the process environment before starting Gateway:

```text
GATEWAY_TEST_UPSTREAM_URL=http://upstreamUser:upstreamPassword@upstream-host:upstream-port
```

Or:

```text
GATEWAY_TEST_UPSTREAM_HOST=
GATEWAY_TEST_UPSTREAM_PORT=
GATEWAY_TEST_UPSTREAM_USERNAME=
GATEWAY_TEST_UPSTREAM_PASSWORD=
```

Do not commit real upstream credentials.

Local test format:

```powershell
curl.exe -x http://test:test@127.0.0.1:18001 http://api.ipify.org
curl.exe -v -x http://test:test@127.0.0.1:18001 https://api.ipify.org
```

## Upstream Pool Import

FEAT-103 adds a minimal API import path for upstream HTTP proxy entries.

Supported formats:

```text
host:port:username:password
http://username:password@host:port
geolocation://username:password@host:port:United States
```

Notes:

- Empty lines are ignored.
- `host:port:username:password` keeps extra password colons as part of the password.
- URL format requires special characters in username/password to be URL encoded.
- `geolocation://...:Country` keeps username, password, host, and port; the country suffix is accepted as provider metadata for import compatibility.
- Duplicate entries are detected by `host + port + username`.
- Upstream passwords are encrypted before database storage.
- Import and list responses do not return plaintext upstream passwords.

Start API with `DATABASE_URL` and `ENCRYPTION_KEY` set, then import:

```powershell
$env:DATABASE_URL='file:../../../data/proxy-platform.db'
$env:ENCRYPTION_KEY='replace-with-long-random-secret-and-back-it-up'
npm run dev:api
```

Example request:

```powershell
$body = @{ text = "proxy.example.com:10080:user:pa:ss:word" } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://127.0.0.1:3110/api/admin/upstreams/import' -Method Post -ContentType 'application/json' -Body $body
```

List imported upstreams:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:3110/api/admin/upstreams' -Method Get
```

## Upstream Scanner

FEAT-104 adds a minimal worker scanner for imported upstream proxies.

The scanner:

- Reads upstream proxies from SQLite.
- Decrypts upstream passwords only in memory.
- Uses the upstream HTTP proxy with HTTPS CONNECT to request `https://api.ipify.org`.
- Resolves the exit IP geolocation **local-first**: an offline MaxMind GeoLite2
  database (`packages/db/src/geo-local.ts`) answers country/region/city/ASN
  instantly with no rate limit; only IPs missing from the local database fall
  back to the online providers with failover (`ip-api.com`, `ipwho.is`,
  `geojs.io`, `freeipapi.com`). This lets a several-thousand-upstream sweep finish
  in minutes instead of being throttled by the free online geo APIs. If no local
  database file is present, the scanner automatically uses the online providers.
- Classifies the exit IP into `ip_type` (residential / hosting / proxy / unknown),
  stored on the upstream and used to keep datacenter IPs out of extraction. The
  local database conservatively flags only `hosting`/`unknown` (never guesses
  residential); the richer residential/proxy signal comes from the online
  providers (e.g. ip-api `hosting`/`proxy` flags).
- Caches IP geo results (incl. `ip_type`) in `ip_geo_cache`.
- Updates `current_ip`, `country`, `region`, `city`, `isp`, `asn`, `ip_type`, `latency_ms`, `status`, and error counters.
- Writes `scan_logs` only when the exit IP changed or the scan failed (a
  successful re-check of an unchanged IP just updates the upstream row), so
  frequent re-scans do not flood the log table on SQLite's single writer.
- Runs two lanes: a full-pool sweep on `scanIntervalMs`, plus a fast lane that
  re-scans only the in-use (locked) upstreams on `lockedScanIntervalMs` (default
  2 min) so active users' displayed exit IP stays fresh.
- The worker and the admin "re-test" action share one scan implementation in
  `@proxy-platform/db` (no duplicated scanner code).
- Limits scan concurrency (`scanConcurrency`, up to 500; `scanBatchSize` up to 5000).
- Does not log plaintext upstream passwords.

### Local IP geolocation database (MaxMind GeoLite2)

The local database makes city/ASN lookups instant and unthrottled. It is optional
(the scanner falls back to the online providers when it is absent) but strongly
recommended for large pools.

1. Get a free license key: <https://www.maxmind.com/en/geolite2/signup>
2. Download / refresh the databases into `data/geoip/` (the files are gitignored):

```powershell
$env:MAXMIND_LICENSE_KEY='your_key'; node scripts/update-geoip.mjs
```

3. Schedule that command (e.g. weekly cron) so the data stays current. Set
   `GEOIP_ENABLED=false` to force the online providers. On the VPS, run the same
   command (or copy the two `.mmdb` files) so `/opt/proxy-platform/data/geoip/`
   holds `GeoLite2-City.mmdb` and `GeoLite2-ASN.mmdb`.

Run one scan batch:

```powershell
$env:DATABASE_URL='file:../../../data/proxy-platform.db'
$env:ENCRYPTION_KEY='replace-with-long-random-secret-and-back-it-up'
$env:SCAN_BATCH_SIZE='50'
$env:SCAN_CONCURRENCY='10'
$env:SCAN_TIMEOUT_MS='15000'
npm run dev:worker
```

Run repeated scan batches:

```powershell
$env:WORKER_REPEAT='true'
$env:SCAN_INTERVAL_MS='600000'
npm run dev:worker
```

Scan results are visible in:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:3110/api/admin/upstreams' -Method Get
```

## Environment Variables

Copy `.env.example` to `.env` before filling real values. Do not commit `.env`.

Important:

- `ADMIN_PASSWORD` must only live in `.env`.
- `APP_SECRET` must only live in `.env`.
- `ENCRYPTION_KEY` must be backed up long term. Future upstream proxy password decryption will depend on it.
- `GATEWAY_TEST_UPSTREAM_URL` may contain real upstream credentials and must not be committed.
- Scanner settings: `SCAN_BATCH_SIZE`, `SCAN_CONCURRENCY`, `SCAN_TIMEOUT_MS`, `GEO_CACHE_TTL_MS`, `WORKER_REPEAT`, `SCAN_INTERVAL_MS`. Runtime scan tuning (batch / concurrency / intervals incl. the fast-lane `lockedScanIntervalMs`) is also editable from the admin Settings page and stored in `data/app-settings.json`.
- Local geo database: `MAXMIND_LICENSE_KEY` (only for `scripts/update-geoip.mjs`), `GEOIP_DB_DIR`, `GEOIP_CITY_DB`, `GEOIP_ASN_DB`, `GEOIP_ENABLED`. See "Local IP geolocation database" above.

## Current Limits

- Delete/disable is implemented (FEAT-120: delete users/proxy-entries/upstreams + disable upstreams, double-confirmed). Other dangerous operations (manual rebind UI, exit-IP check, traffic reset, bulk export) are intentionally not enabled yet.
- The admin Settings page can trigger a scan on demand ("立即扫描") and tune scan / idle-release parameters; the Worker also scans on its own interval.
- Run `prisma db push` on the deployment target (Node.js 20). The Windows / Node 24 dev environment may hit a Prisma schema-engine error, so build / migrate on Node 20 (the VPS) instead.

The platform is deployed and live on a VPS (pm2 + Nginx + Certbot HTTPS, with an optional HTTPS-proxy TLS front and MSS/MTU hardening). See `docs/DEPLOY.md` for the full, reproducible setup.
