// Single-shot health check for the proxy platform, meant to be run on a schedule
// (cron / Task Scheduler) so a dead API, dead gateway, or all-cold upstream pool
// gets noticed instead of silently failing over a long uptime.
//
// It probes the API and gateway health endpoints and, on any failure, POSTs a
// short JSON alert to a webhook (Slack/Discord/feishu/custom all accept a JSON
// body with a `text` field, which most of them render). Exits non-zero when any
// check fails so cron mail / external monitors can also catch it.
//
// Usage:
//   node scripts/health-monitor.mjs
//
// Env (all optional, sensible localhost defaults):
//   HEALTH_API_URL       default http://127.0.0.1:3110/api/health
//   HEALTH_GATEWAY_URL   default http://127.0.0.1:18001/health
//   HEALTH_ALERT_WEBHOOK if set, failures POST {text} here (no alert sent if unset)
//   HEALTH_TIMEOUT_MS    per-request timeout, default 10000
//   HEALTH_LABEL         a name for this deployment, included in the alert text

const API_URL = process.env.HEALTH_API_URL ?? "http://127.0.0.1:3110/api/health";
const GATEWAY_URL = process.env.HEALTH_GATEWAY_URL ?? "http://127.0.0.1:18001/health";
const WEBHOOK = process.env.HEALTH_ALERT_WEBHOOK?.trim();
const TIMEOUT_MS = Number(process.env.HEALTH_TIMEOUT_MS ?? 10_000);
const LABEL = process.env.HEALTH_LABEL?.trim() || "proxy-platform";

async function probe(name, url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) {
      return { name, ok: false, detail: `HTTP ${res.status}` };
    }
    // Both endpoints return JSON with an `ok` boolean; treat ok:false (e.g. DB
    // down) as a failure even though the HTTP status may be 200/503.
    let body = null;
    try {
      body = await res.json();
    } catch {
      // A non-JSON 200 still counts as reachable; only flag if the body was required.
    }
    if (body && body.ok === false) {
      const reason = body.database && body.database.ok === false ? "database down" : "service reports not ok";
      return { name, ok: false, detail: reason };
    }
    return { name, ok: true, detail: "ok" };
  } catch (error) {
    return { name, ok: false, detail: error instanceof Error ? error.message : "unreachable" };
  }
}

async function sendAlert(text) {
  if (!WEBHOOK) {
    console.error("(no HEALTH_ALERT_WEBHOOK configured; alert not sent)");
    return;
  }
  try {
    const res = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!res.ok) {
      console.error(`Alert webhook returned HTTP ${res.status}`);
    }
  } catch (error) {
    console.error(`Alert webhook failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

async function main() {
  const results = await Promise.all([probe("api", API_URL), probe("gateway", GATEWAY_URL)]);
  const failures = results.filter((r) => !r.ok);
  const stamp = new Date().toISOString();

  for (const r of results) {
    console.log(`[${stamp}] ${r.name}: ${r.ok ? "OK" : "FAIL"} (${r.detail})`);
  }

  if (failures.length > 0) {
    const text =
      `[${LABEL}] health check FAILED at ${stamp}: ` +
      failures.map((f) => `${f.name}=${f.detail}`).join(", ");
    await sendAlert(text);
    process.exit(1);
  }

  console.log(`[${stamp}] all healthy`);
}

main().catch((error) => {
  console.error(`health-monitor crashed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exit(1);
});
