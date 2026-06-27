// PM2 process manager config for long-running deployment of the proxy platform.
//
// Goal: keep api / gateway / worker alive across crashes and machine reboots for
// small-scale long-term use. PM2 restarts a process if it exits, caps restart
// storms with exponential backoff, and (with `pm2 startup` + `pm2 save`) brings
// everything back after a reboot.
//
// Prerequisites (run once):
//   npm install -g pm2
//   npm run build                       # compile every workspace to dist/
//   pm2 install pm2-logrotate           # rotate logs so disk never fills (see #3)
//
// Start / manage:
//   pm2 start ecosystem.config.cjs
//   pm2 status
//   pm2 logs
//   pm2 save                            # remember the process list
//   pm2 startup                         # print the OS command to enable boot-start
//
// Each app's `start` script is `node dist/index.js`, so we point PM2 at the
// compiled entry and set `cwd` to the app folder. This config loads the project
// root .env first, then lets shell exports override it. DATABASE_URL is an
// ABSOLUTE file: path: a relative path resolves differently per service cwd
// (Prisma uses the schema dir, app code used process.cwd()), which silently
// splits data into several .db files.

const fs = require("fs");
const path = require("path");

const projectRoot = __dirname;
const envPath = path.join(projectRoot, ".env");
const dataDir = path.join(projectRoot, "data");
// Absolute file: URL with forward slashes (works for SQLite on Windows too).
const dbUrl = "file:" + path.join(dataDir, "proxy-platform.db").replace(/\\/g, "/");

function parseDotEnv(text) {
  const parsed = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

function loadProjectEnv() {
  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing required .env file at ${envPath}. Copy .env.example to .env and fill production values before pm2 start.`);
  }

  const fileEnv = parseDotEnv(fs.readFileSync(envPath, "utf8"));
  for (const [key, value] of Object.entries(fileEnv)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function envValue(key, fallback) {
  const value = process.env[key];
  if (value === undefined || value.trim() === "") return fallback;
  return value.trim();
}

function looksLikePlaceholder(value) {
  const lowered = value.toLowerCase();
  return (
    lowered.includes("change_me") ||
    lowered.includes("replace-with") ||
    lowered.includes("replace_me") ||
    lowered.includes("replace-this") ||
    lowered.includes("placeholder") ||
    lowered.includes("example.com") ||
    value.includes("\u3010") ||
    value.includes("\u66ff\u6362")
  );
}

function requireEnv(key) {
  const value = envValue(key);
  if (!value) {
    throw new Error(`Missing required production env ${key}. Fill it in .env before pm2 start.`);
  }
  if (looksLikePlaceholder(value)) {
    throw new Error(`Production env ${key} still looks like a placeholder. Replace it in .env before pm2 start.`);
  }
  return value;
}

function assertNoLocalhost(key, value) {
  if (/(^|[/:,])(?:127\.0\.0\.1|localhost)(?=$|[/:,])/.test(value)) {
    throw new Error(`Production env ${key} must not use localhost or 127.0.0.1. Set the real VPS IP or domain in .env.`);
  }
}

loadProjectEnv();

const databaseUrl = requireEnv("DATABASE_URL");
if (databaseUrl.startsWith("file:") && !databaseUrl.startsWith("file:/")) {
  throw new Error("DATABASE_URL must be an absolute file: URL in production, for example file:/opt/proxy-platform/data/proxy-platform.db");
}
requireEnv("ADMIN_USERNAME");
requireEnv("ADMIN_PASSWORD");
requireEnv("APP_SECRET");
requireEnv("ENCRYPTION_KEY");
const webAllowedOrigins = requireEnv("WEB_ALLOWED_ORIGINS");
const publicProxyHost = requireEnv("PUBLIC_PROXY_HOST");
assertNoLocalhost("WEB_ALLOWED_ORIGINS", webAllowedOrigins);
assertNoLocalhost("PUBLIC_PROXY_HOST", publicProxyHost);
if (!["true", "false"].includes(requireEnv("TRUST_PROXY"))) {
  throw new Error("TRUST_PROXY must be exactly true or false.");
}

// Shared env for all backend services. ENCRYPTION_KEY and APP_SECRET are required
// above, so production cannot silently start with generated or placeholder keys.
const sharedEnv = {
  NODE_ENV: envValue("NODE_ENV", "production"),
  DATABASE_PROVIDER: envValue("DATABASE_PROVIDER", "sqlite"),
  DATABASE_URL: databaseUrl || dbUrl,
  APP_SECRET: requireEnv("APP_SECRET"),
  ENCRYPTION_KEY: requireEnv("ENCRYPTION_KEY")
};

module.exports = {
  apps: [
    {
      name: "proxy-api",
      cwd: path.join(projectRoot, "apps", "api"),
      script: "dist/index.js",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      // Exponential backoff between restarts so a crash-looping process does not
      // hammer the machine; resets once the process stays up for `min_uptime`.
      restart_delay: 2000,
      exp_backoff_restart_delay: 200,
      min_uptime: "30s",
      // Raised from 300M: a burst of extractions runs verifyAndStabilizeEntryGeo
      // (per-entry network I/O) concurrently and briefly spiked past 300M, which
      // pm2 turned into a graceful restart mid-burst. 600M absorbs the spike on
      // this VPS (gateway 400M, worker 300M) without masking a real leak.
      max_memory_restart: "600M",
      kill_timeout: 12000, // give graceful shutdown time (server.close)
      env: {
        ...sharedEnv,
        API_PORT: envValue("API_PORT", "3110"),
        // If the API runs behind a trusted reverse proxy (Nginx, etc.), set
        // TRUST_PROXY=true so login rate-limiting keys off the real client IP.
        TRUST_PROXY: requireEnv("TRUST_PROXY"),
        ADMIN_USERNAME: requireEnv("ADMIN_USERNAME"),
        ADMIN_PASSWORD: requireEnv("ADMIN_PASSWORD"),
        PUBLIC_PROXY_HOST: publicProxyHost,
        ADMIN_WEB_ORIGIN: envValue("ADMIN_WEB_ORIGIN", "http://127.0.0.1:5180"),
        USER_WEB_ORIGIN: envValue("USER_WEB_ORIGIN", "http://127.0.0.1:5181"),
        WEB_ALLOWED_ORIGINS: webAllowedOrigins
      }
    },
    {
      name: "proxy-gateway",
      cwd: path.join(projectRoot, "apps", "gateway"),
      script: "dist/index.js",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      exp_backoff_restart_delay: 200,
      min_uptime: "30s",
      max_memory_restart: "400M",
      kill_timeout: 12000, // gateway drains in-flight tunnels on graceful shutdown
      env: {
        ...sharedEnv,
        PROXY_GATEWAY_PORT: envValue("PROXY_GATEWAY_PORT", "18001")
      }
    },
    {
      name: "proxy-worker",
      cwd: path.join(projectRoot, "apps", "worker"),
      script: "dist/index.js",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      exp_backoff_restart_delay: 500,
      min_uptime: "30s",
      max_memory_restart: "300M",
      kill_timeout: 17000, // worker finishes the current batch before exiting
      env: {
        ...sharedEnv,
        // The worker only runs its self-rescheduling scan/idle-release/prune loops
        // when WORKER_REPEAT=true; otherwise it does a single pass and exits.
        WORKER_REPEAT: envValue("WORKER_REPEAT", "true"),
        SCAN_INTERVAL_MS: envValue("SCAN_INTERVAL_MS", "600000")
      }
    }
  ]
};
