import { connect as netConnect } from "node:net";
import {
  classifyScanError,
  compactDatabase,
  configureSqlite,
  ensureIndexes,
  fetchExitIpThroughHttpProxy,
  getFreshIpGeoCache,
  getUpstreamScanCandidates,
  prisma,
  pruneOldRecords,
  recomputeStabilityScores,
  reconcileActiveConnections,
  recordUpstreamScanResult,
  releaseIdleUpstreamBindings,
  resolveGeoForExitIp,
  verifyEncryptionSelfCheck,
  type ScanCandidate,
  type UpstreamScanResult
} from "@proxy-platform/db";
import {
  AdaptiveConcurrencyController,
  isValidIpv4,
  mapAdaptive,
  nowIso,
  readAppSettings,
  shouldBackoffOnThrottle,
  type AppSettings,
  type ScanErrorType
} from "@proxy-platform/shared";

type ScannerConfig = AppSettings & {
  repeat: boolean;
};

const databaseStatus = await configureSqlite();
const repeat = process.env.WORKER_REPEAT === "true";
const PRUNE_INTERVAL_MS = 24 * 60 * 60_000;
// Connection-counter reconciliation cadence: hourly is frequent enough to free a
// stuck user well before they notice, cheap enough to ignore.
const RECONCILE_INTERVAL_MS = Number(process.env.CONN_RECONCILE_INTERVAL_MS ?? 60 * 60_000);
// VACUUM is heavy (rewrites the whole DB), so compact on a slow monthly cadence.
const COMPACT_INTERVAL_MS = Number(process.env.DB_COMPACT_INTERVAL_MS ?? 30 * 24 * 60 * 60_000);
// Polled while waiting between batches so an admin interval change (or a shutdown
// signal) takes effect within roughly one tick instead of only after the
// previous, possibly much longer, interval has fully elapsed. Declared up here
// (before the top-level await that starts the loops) to avoid a temporal dead
// zone when waitForNextRun runs.
const SCHEDULE_WAIT_TICK_MS = 1_000;

// Lowest concurrency the adaptive budget drops to (keeps scanning alive even
// while a provider is throttling). Overridable for tuning without a redeploy.
const SCAN_CONCURRENCY_FLOOR = Math.max(1, Number(process.env.SCAN_CONCURRENCY_FLOOR ?? 3));
// The fast lane only refreshes the few in-use (locked) upstreams, so cap its
// slice of the shared budget small: it must never, on its own, burst the single
// upstream provider into a 402.
const FAST_LANE_CONCURRENCY_CAP = Math.max(1, Number(process.env.FAST_LANE_CONCURRENCY_CAP ?? 6));
// Cross-batch backoff threshold: persistently halve the shared budget only when
// the throttled (402/429/503) FRACTION of a full sweep crosses this ratio. Set
// clearly above the steady retry-tail level (~0.2 in mapAdaptive) so a small tail
// of already-throttled upstreams being retried can no longer permanently suppress
// the budget and starve healthy detection. Overridable for tuning without redeploy.
const THROTTLE_BACKOFF_RATIO = Math.min(1, Math.max(0.01, Number(process.env.THROTTLE_BACKOFF_RATIO) || 0.3));

// One PERSISTENT adaptive concurrency budget shared by BOTH scan lanes (full +
// fast). It starts at the floor and ramps toward the configured scanConcurrency
// only while the single upstream provider stays clean; any throttled (402/429/503)
// batch halves it. This is what stops a high scanConcurrency setting from firing
// one full-size burst every batch and self-inflicting a provider 402 storm.
const concurrencyController = new AdaptiveConcurrencyController({
  min: SCAN_CONCURRENCY_FLOOR,
  max: SCAN_CONCURRENCY_FLOOR,
  start: SCAN_CONCURRENCY_FLOOR
});

// Reference host used to decide whether THIS machine currently has outbound
// internet before scanning upstreams. The scanner already depends on this geo
// API, so reachability here is a good proxy for "we can reach the outside".
// Overridable so a deployment behind a different egress can point it elsewhere.
const GEO_PROBE_HOST = process.env.WORKER_NET_PROBE_HOST ?? "ip-api.com";
const GEO_PROBE_PORT = Number(process.env.WORKER_NET_PROBE_PORT ?? 80);

let shuttingDown = false;

// Last-resort process guards: a long-running background worker must log and keep
// going rather than die silently on an unexpected throw/rejection.
process.on("uncaughtException", (error) => {
  console.error(`Worker uncaughtException: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
});
process.on("unhandledRejection", (reason) => {
  console.error(`Worker unhandledRejection: ${reason instanceof Error ? reason.stack ?? reason.message : String(reason)}`);
});

// Graceful shutdown: stop the self-rescheduling loops at the next safe point and
// disconnect the DB so a deploy/restart does not kill the worker mid-transaction.
function shutdownWorker(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`Worker received ${signal}, shutting down after current batch`);
  const timer = setTimeout(() => {
    console.warn("Worker graceful shutdown timed out; forcing exit");
    process.exit(0);
  }, 15_000);
  timer.unref();
}
process.on("SIGTERM", () => shutdownWorker("SIGTERM"));
process.on("SIGINT", () => shutdownWorker("SIGINT"));

console.info(`Worker started at ${nowIso()}`);
console.info(`Database status: ${databaseStatus.ok ? "ok" : "unavailable"}`);

// Early ENCRYPTION_KEY sanity check. A wrong/changed key would otherwise only
// surface as per-connection decrypt_failed in the gateway; here we catch it at
// startup. Warn-only by design: a key mismatch must not stop the worker from
// running its other maintenance loops.
if (databaseStatus.ok) {
  try {
    const selfCheck = await verifyEncryptionSelfCheck();
    if (selfCheck.ok) {
      console.info(`Encryption self-check: ${selfCheck.message}`);
    } else {
      console.warn(`Encryption self-check FAILED: ${selfCheck.message}`);
    }
  } catch (error) {
    console.warn(
      `Encryption self-check could not run: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // Make sure hot-path indexes exist even if prisma db push was never run here.
  try {
    const indexResult = await ensureIndexes();
    if (!indexResult.ok) {
      console.warn(`Worker could not ensure database indexes: ${indexResult.error}`);
    }
  } catch (error) {
    console.warn(`Worker index check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

if (!databaseStatus.ok) {
  console.error(`Worker cannot scan because database is unavailable: ${databaseStatus.error}`);
} else if (repeat) {
  // Self-rescheduling loops re-read settings each cycle so admin changes take
  // effect after at most one interval, without restarting the worker. Awaiting all
  // loops lets a SIGTERM stop them at the next safe point and then disconnect the DB.
  await Promise.all([
    scheduleLoop("scan", (config) => runScanBatch(config), (config) => config.scanIntervalMs),
    // Fast lane: re-scan only the in-use (locked) upstreams on a tighter interval
    // so an active user's displayed exit IP stays fresh between full-pool sweeps.
    scheduleLoop(
      "scan-fast",
      (config) => runScanBatch(config, { onlyLocked: true, label: "Fast-lane scanner" }),
      (config) => config.lockedScanIntervalMs
    ),
    scheduleLoop("idle-release", (config) => runIdleReleaseBatch(config), (config) => config.idleReleaseIntervalMs),
    // Stability scoring sweep: recompute each upstream's geo-stability tier from
    // recent scan_logs so extraction can prefer survey-friendly (stable) upstreams.
    scheduleLoop("stability", (config) => runStabilityBatch(config), (config) => config.stabilityIntervalMs),
    // Daily retention sweep so scan/operation/traffic logs do not grow unbounded.
    scheduleLoop("prune", () => runPruneBatch(), () => PRUNE_INTERVAL_MS),
    // Hourly safety net so a lost connection-counter decrement cannot lock a user
    // out until the next restart.
    scheduleLoop("reconcile", () => runReconcileBatch(), () => RECONCILE_INTERVAL_MS),
    // Monthly compaction: reclaim disk freed by pruning and truncate the WAL.
    scheduleLoop("compact", () => runCompactBatch(), () => COMPACT_INTERVAL_MS)
  ]);
  await prisma.$disconnect();
  console.info("Worker loops stopped; exiting");
} else {
  const config = await loadScannerConfig();
  await runScanBatch(config);
  await runIdleReleaseBatch(config);
  await runStabilityBatch(config);
  await runPruneBatch();
  await runReconcileBatch();
  await prisma.$disconnect();
}

async function loadScannerConfig(): Promise<ScannerConfig> {
  const settings = await readAppSettings();
  return { ...settings, repeat };
}

async function scheduleLoop(
  name: string,
  run: (config: ScannerConfig) => Promise<void>,
  intervalOf: (config: ScannerConfig) => number
): Promise<void> {
  while (!shuttingDown) {
    const config = await loadScannerConfig();
    try {
      await run(config);
    } catch (error) {
      console.error(`${name} batch failed: ${toSafeMessage(error)}`);
    }
    if (shuttingDown) break;
    await waitForNextRun(intervalOf);
  }
}

// Wait until the configured interval has elapsed since now, re-reading the
// interval on every tick. Previously the delay was computed once from the config
// at the start of the cycle and slept in a single timer, so shortening an
// interval from the admin UI (e.g. idle-release 10min -> 2min) only took effect
// after the in-progress long sleep finished. Re-evaluating each tick makes the
// effective interval track the latest setting and keeps shutdown responsive.
async function waitForNextRun(intervalOf: (config: ScannerConfig) => number): Promise<void> {
  const startedAt = Date.now();
  while (!shuttingDown) {
    const config = await loadScannerConfig();
    const interval = Math.max(1_000, intervalOf(config));
    const elapsed = Date.now() - startedAt;
    if (elapsed >= interval) {
      return;
    }
    await sleep(Math.min(SCHEDULE_WAIT_TICK_MS, interval - elapsed));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function runScanBatch(
  scannerConfig: ScannerConfig,
  options: { onlyLocked?: boolean; label?: string } = {}
): Promise<void> {
  const label = options.label ?? "Scanner";
  const loaded = await getUpstreamScanCandidates({
    limit: scannerConfig.scanBatchSize,
    onlyLocked: options.onlyLocked,
    usageProtectMinutes: scannerConfig.usageProtectMinutes
  });
  if (loaded.candidates.length === 0 && loaded.failures.length === 0) {
    console.info(`${label} found no upstream proxies to check at ${nowIso()}`);
    return;
  }

  // When this machine itself has no outbound internet (DNS down, proxy off,
  // link dropped), every upstream connection fails with the same connect/dns
  // errors a genuinely dead upstream would produce, so scanning would wrongly
  // push the whole pool into cooldown and lock every user out. Probe local
  // connectivity first; if we are offline, skip scanning the upstreams this
  // cycle and leave their status untouched. Decrypt failures below are real
  // key problems (not network), so they are still recorded.
  if (loaded.candidates.length > 0) {
    const online = await probeLocalInternet(scannerConfig.scanTimeoutMs);
    if (!online) {
      console.warn(
        `${label} skipping ${loaded.candidates.length} upstream checks: local machine appears offline ` +
          `(cannot reach ${GEO_PROBE_HOST}:${GEO_PROBE_PORT}). Upstream statuses left unchanged to avoid ` +
          `false cooldown.`
      );
      for (const failure of loaded.failures) {
        await recordUpstreamScanResult(failure, {
          maxScanFailures: scannerConfig.maxScanFailures,
          cooldownMs: scannerConfig.cooldownMs,
          rateLimitedCooldownMs: scannerConfig.rateLimitedCooldownMs,
          ipTypeStaleMs: scannerConfig.ipTypeStaleMs
        });
      }
      return;
    }
  }

  // Cross-batch AIMD budget shared by both lanes. setBounds tracks admin changes
  // to the scanConcurrency ceiling without resetting the learned level. The full
  // lane may use the whole current budget; the fast lane takes only a small capped
  // slice so the two lanes together stay within the provider's tolerance.
  concurrencyController.setBounds(
    SCAN_CONCURRENCY_FLOOR,
    Math.max(SCAN_CONCURRENCY_FLOOR, scannerConfig.scanConcurrency)
  );
  const laneConcurrency = options.onlyLocked
    ? Math.min(FAST_LANE_CONCURRENCY_CAP, concurrencyController.current())
    : concurrencyController.current();

  console.info(
    `${label} checking ${loaded.candidates.length} upstream proxy entries ` +
      `(concurrency=${laneConcurrency}, budget=${concurrencyController.current()})`
  );

  const recordConfig = {
    maxScanFailures: scannerConfig.maxScanFailures,
    cooldownMs: scannerConfig.cooldownMs,
    rateLimitedCooldownMs: scannerConfig.rateLimitedCooldownMs,
    ipTypeStaleMs: scannerConfig.ipTypeStaleMs
  };

  let succeeded = 0;
  let failed = 0;

  // Real-time recording: persist each result the moment its scan finishes instead
  // of buffering the whole round and writing at the end. Data freshness (and the
  // ip_type re-classification) then lands progressively, and a mid-batch restart
  // no longer discards everything already scanned. Records are serialized through
  // one promise chain so that, no matter how concurrent the scans are, at most one
  // write transaction is open at a time — recording stays well within the DB
  // connection budget. A per-record failure is logged and skipped (the upstream is
  // retried next round) so a transient write error never aborts the whole batch.
  let recordChain: Promise<void> = Promise.resolve();
  const recordResult = (result: UpstreamScanResult): void => {
    recordChain = recordChain.then(async () => {
      try {
        await recordUpstreamScanResult(result, recordConfig);
      } catch (error) {
        console.warn(`Failed to record scan result for upstream=${result.upstreamProxyId}: ${toSafeMessage(error)}`);
        return;
      }
      if (result.success) {
        succeeded += 1;
        console.info(
          `Scan ok upstream=${result.upstreamProxyId} ip=${result.exitIp} ${result.country}/${result.region ?? "any"}/${result.city ?? "any"} latency=${result.latencyMs}ms`
        );
      } else {
        failed += 1;
        console.warn(
          `Scan failed upstream=${result.upstreamProxyId} error=${result.errorType} latency=${result.latencyMs ?? "n/a"}`
        );
      }
    });
  };

  // Pre-scan failures (e.g. decrypt failures) have no scan step; queue them now.
  for (const failure of loaded.failures) {
    recordResult(failure);
  }

  // Within-batch adaptive concurrency: if the provider starts rate-limiting us
  // (402/429/503) mid-batch, shrink + back off instead of hammering it. The
  // batch starts at laneConcurrency (the persistent learned-safe level), NOT at
  // the configured maximum, so it no longer bursts the provider every cycle.
  const scanResults = await mapAdaptive(
    loaded.candidates,
    async (candidate) => {
      const result = await scanOneUpstream(candidate, scannerConfig);
      recordResult(result);
      return result;
    },
    (result) => !result.success && result.errorType === "rate_limited",
    { maxConcurrency: laneConcurrency, minConcurrency: 1 }
  );

  // Drain any still-pending records before reporting the batch as finished.
  await recordChain;

  // Feed the batch outcome back into the shared budget (cross-batch AIMD): back
  // off only when the throttled FRACTION of the sweep crosses THROTTLE_BACKOFF_RATIO
  // (not on a single 402), so the steady retry-tail no longer permanently
  // suppresses the budget; a sub-threshold FULL-lane sweep nudges it up. The fast
  // lane is capped and not representative of the safe ceiling, so it only reports
  // throttling and must not, on its own, ramp the budget up.
  const rateLimitedCount = scanResults.filter(
    (result) => !result.success && result.errorType === "rate_limited"
  ).length;
  const throttled = shouldBackoffOnThrottle(rateLimitedCount, scanResults.length, THROTTLE_BACKOFF_RATIO);
  if (options.onlyLocked) {
    if (throttled) concurrencyController.record(true);
  } else {
    concurrencyController.record(throttled);
  }

  console.info(`${label} batch finished: success=${succeeded}, failed=${failed}`);
}

async function runIdleReleaseBatch(scannerConfig: ScannerConfig): Promise<void> {
  const result = await releaseIdleUpstreamBindings({
    idleReleaseMinutes: scannerConfig.idleReleaseMinutes,
    minHoldMinutes: scannerConfig.minHoldMinutes
  });

  if (result.released === 0) {
    console.info(`Idle upstream release found no eligible entries at ${nowIso()}`);
    return;
  }

  console.info(
    `Idle upstream release finished: released=${result.released}, entryIds=${result.entryIds.join(",")}`
  );
}

async function runPruneBatch(): Promise<void> {
  const result = await pruneOldRecords();
  console.info(
    `Retention sweep finished: scanLogs=${result.scanLogs}, operationLogs=${result.operationLogs}, trafficDaily=${result.trafficDaily}, geoCache=${result.geoCache}`
  );
}

async function runStabilityBatch(config: ScannerConfig): Promise<void> {
  const result = await recomputeStabilityScores({
    windowMs: config.stabilityWindowMs,
    premiumSharePct: config.geoPremiumSharePct,
    normalSharePct: config.geoNormalSharePct,
    minSamples: config.geoMinSamples
  });
  console.info(`Stability scoring finished: updated=${result.updated} upstreams`);
}

async function runReconcileBatch(): Promise<void> {
  const fixed = await reconcileActiveConnections();
  if (fixed > 0) {
    console.warn(`Connection-counter reconcile: reset activeConnections on ${fixed} stale entr${fixed === 1 ? "y" : "ies"}.`);
  }
}

async function runCompactBatch(): Promise<void> {
  const result = await compactDatabase();
  if (result.ok) {
    console.info("Database compaction finished: WAL checkpointed and VACUUM completed.");
  } else {
    console.warn(`Database compaction failed: ${result.error}`);
  }
}

async function scanOneUpstream(candidate: ScanCandidate, scannerConfig: ScannerConfig): Promise<UpstreamScanResult> {
  const startedAt = Date.now();

  try {
    const exitIp = await fetchExitIpThroughHttpProxy(candidate, scannerConfig.scanTimeoutMs);
    const latencyMs = Date.now() - startedAt;

    if (!isValidIpv4(exitIp)) {
      return scanFailure(candidate.id, "empty_reply", `Invalid IPv4 returned by ipify`, latencyMs);
    }

    // Local-first geo: the offline MaxMind database resolves city/ASN instantly
    // with no rate limit, so a 2000-upstream sweep is no longer throttled by the
    // free online geo APIs. resolveGeoForExitIp falls back to the online providers
    // only when an IP is missing from the local database (or it is disabled).
    const cachedGeo = await getFreshIpGeoCache(exitIp, scannerConfig.geoCacheTtlMs);
    const geoResult = cachedGeo ? ({ ok: true, value: cachedGeo } as const) : await resolveGeoForExitIp(exitIp);

    if (!geoResult.ok) {
      return scanFailure(candidate.id, geoResult.errorType, geoResult.message, latencyMs, {
        exitIp,
        country: geoResult.country,
        region: geoResult.region,
        city: geoResult.city
      });
    }

    const geo = geoResult.value;

    return {
      success: true,
      upstreamProxyId: candidate.id,
      exitIp,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      isp: geo.isp,
      asn: geo.asn,
      ipType: geo.ipType,
      latencyMs
    };
  } catch (error) {
    return scanFailure(candidate.id, classifyScanError(error), toSafeMessage(error), Date.now() - startedAt);
  }
}

// Returns true if this machine can open a TCP connection to the reference geo
// host. A failure (DNS error, refused, timeout) means local outbound internet
// is down, so upstream scan failures this cycle would be false negatives. Only a
// successful connect counts as online; the connection is closed immediately
// (no data exchanged).
async function probeLocalInternet(timeoutMs: number): Promise<boolean> {
  return new Promise((resolveProbe) => {
    let settled = false;
    const finish = (online: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolveProbe(online);
    };

    const socket = netConnect(GEO_PROBE_PORT, GEO_PROBE_HOST);
    const timer = setTimeout(() => finish(false), Math.max(1_000, timeoutMs));
    socket.setTimeout(Math.max(1_000, timeoutMs));
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function scanFailure(
  upstreamProxyId: number,
  errorType: ScanErrorType,
  message: string,
  latencyMs: number | null,
  extra?: { exitIp?: string | null; country?: string | null; region?: string | null; city?: string | null }
): UpstreamScanResult {
  return {
    success: false,
    upstreamProxyId,
    errorType,
    message,
    latencyMs,
    ...extra
  };
}

function toSafeMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown scanner error";
}

