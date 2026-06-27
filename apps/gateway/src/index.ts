import http from "node:http";
import net from "node:net";
import stream from "node:stream";
import {
  configureSqlite,
  coolUpstreamOnGatewayThrottle,
  ensureIndexes,
  isProxyEntryServiceable,
  isProxyEntryOverQuota,
  recordGatewayTrafficUsage,
  resetActiveConnections,
  resolveGatewayBoundProxy,
  verifyEncryptionSelfCheck
} from "@proxy-platform/db";
import {
  DEFAULT_PROXY_GATEWAY_PORT,
  isProviderThrottleStatus,
  nowIso,
  PROVIDER_THROTTLE_RETRY_AFTER_SECONDS,
  SlidingWindowRateLimiter
} from "@proxy-platform/shared";

const port = Number(process.env.PROXY_GATEWAY_PORT ?? DEFAULT_PROXY_GATEWAY_PORT);
const connectTimeoutMs = Number(process.env.GATEWAY_CONNECT_TIMEOUT_MS ?? 20_000);

// Brute-force throttle for proxy authentication. Unlike the per-request HTTP
// proxy traffic (which a legitimate client sends a lot of), only FAILED auth
// attempts are counted, keyed by source IP, so a real user with valid
// credentials is never throttled no matter how many requests they make. State is
// per-process in-memory (no DB write on the hot path), matching the small-scale
// single-instance deployment this project targets.
const PROXY_AUTH_MAX_FAILURES = Number(process.env.GATEWAY_AUTH_RATE_MAX ?? 20);
const PROXY_AUTH_WINDOW_MS = Number(process.env.GATEWAY_AUTH_RATE_WINDOW_MS ?? 5 * 60_000);
const proxyAuthThrottle = new SlidingWindowRateLimiter({
  maxAttempts: PROXY_AUTH_MAX_FAILURES,
  windowMs: PROXY_AUTH_WINDOW_MS
});

// The gateway listens on 0.0.0.0 and is exposed directly (no trusted reverse
// proxy in front), so the socket peer address is the only trustworthy throttle
// key: an X-Forwarded-For header here would be attacker-controlled and let them
// rotate the key to bypass the limit. The CONNECT handler types its socket as a
// stream.Duplex, but at runtime Node always passes a net.Socket that carries
// remoteAddress, so read it defensively.
function gatewayClientIp(socket: stream.Duplex | net.Socket): string {
  const remoteAddress = (socket as Partial<net.Socket>).remoteAddress;
  return remoteAddress ?? "unknown";
}

type UpstreamProxy = {
  id: number;
  host: string;
  port: number;
  username: string;
  password: string;
};

type GatewayResolvedProxy = {
  proxyEntry: {
    id: number;
    userId: number;
  };
  upstream: UpstreamProxy;
};

function upstreamAuthorization(upstream: UpstreamProxy): string | null {
  if (!upstream.username) return null;
  const password = upstream.password ?? "";
  return `Basic ${Buffer.from(`${upstream.username}:${password}`).toString("base64")}`;
}

function writeBadGateway(res: http.ServerResponse, message: string): void {
  res.writeHead(502, { "content-type": "text/plain" });
  res.end(`${message}\n`);
}

function writeProxyAuthRequired(res: http.ServerResponse): void {
  res.writeHead(407, {
    "content-type": "text/plain",
    "proxy-authenticate": 'Basic realm="proxy-platform-gateway"'
  });
  res.end("Proxy authentication required\n");
}

function writeForbidden(res: http.ServerResponse, message: string): void {
  res.writeHead(403, { "content-type": "text/plain" });
  res.end(`${message}\n`);
}

function writeTooManyRequests(res: http.ServerResponse, message: string, retryAfter?: number): void {
  const headers: http.OutgoingHttpHeaders = { "content-type": "text/plain" };
  if (retryAfter && retryAfter > 0) {
    headers["retry-after"] = String(retryAfter);
  }
  res.writeHead(429, headers);
  res.end(`${message}\n`);
}

function writeGatewayAuthFailure(res: http.ServerResponse, failure: ResolveFailure): void {
  if (failure.statusCode === 429) {
    writeTooManyRequests(res, failure.message, failure.retryAfter);
    return;
  }

  if (failure.statusCode === 407) {
    writeProxyAuthRequired(res);
    return;
  }

  if (failure.statusCode === 403) {
    writeForbidden(res, failure.message);
    return;
  }

  writeBadGateway(res, failure.message);
}

function writeConnectError(clientSocket: stream.Duplex, message: string): void {
  if (!clientSocket.destroyed && clientSocket.writable) {
    clientSocket.write(`HTTP/1.1 502 Bad Gateway\r\ncontent-type: text/plain\r\n\r\n${message}\n`);
    clientSocket.end();
  }
}

function writeConnectAuthRequired(clientSocket: stream.Duplex): void {
  if (!clientSocket.destroyed && clientSocket.writable) {
    clientSocket.write(
      'HTTP/1.1 407 Proxy Authentication Required\r\nproxy-authenticate: Basic realm="proxy-platform-gateway"\r\ncontent-type: text/plain\r\n\r\nProxy authentication required\n'
    );
    clientSocket.end();
  }
}

function writeConnectForbidden(clientSocket: stream.Duplex, message: string): void {
  if (!clientSocket.destroyed && clientSocket.writable) {
    clientSocket.write(`HTTP/1.1 403 Forbidden\r\ncontent-type: text/plain\r\n\r\n${message}\n`);
    clientSocket.end();
  }
}

function writeConnectTooManyRequests(clientSocket: stream.Duplex, message: string, retryAfter?: number): void {
  if (!clientSocket.destroyed && clientSocket.writable) {
    const retryHeader = retryAfter && retryAfter > 0 ? `retry-after: ${retryAfter}\r\n` : "";
    clientSocket.write(`HTTP/1.1 429 Too Many Requests\r\n${retryHeader}content-type: text/plain\r\n\r\n${message}\n`);
    clientSocket.end();
  }
}

function writeConnectGatewayAuthFailure(clientSocket: stream.Duplex, failure: ResolveFailure): void {
  if (failure.statusCode === 429) {
    writeConnectTooManyRequests(clientSocket, failure.message, failure.retryAfter);
    return;
  }

  if (failure.statusCode === 407) {
    writeConnectAuthRequired(clientSocket);
    return;
  }

  if (failure.statusCode === 403) {
    writeConnectForbidden(clientSocket, failure.message);
    return;
  }

  writeConnectError(clientSocket, failure.message);
}

function parseProxyAuthorization(req: http.IncomingMessage): { username: string; password: string } | null {
  const value = req.headers["proxy-authorization"];
  if (typeof value !== "string" || !value.startsWith("Basic ")) {
    return null;
  }

  try {
    const decoded = Buffer.from(value.slice("Basic ".length), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 1) {
      return null;
    }

    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1)
    };
  } catch {
    return null;
  }
}

type ResolveFailure = {
  ok: false;
  statusCode: 407 | 403 | 502 | 429;
  message: string;
  // Seconds until the throttle window frees up; only set for 429 responses so the
  // writers can emit a Retry-After header.
  retryAfter?: number;
};

async function resolveRequestUpstream(
  req: http.IncomingMessage,
  sourceIp: string
): Promise<{ ok: true; resolved: GatewayResolvedProxy } | ResolveFailure> {
  // Reject early if this source IP has too many recent failed auth attempts,
  // BEFORE the DB lookup + password hashing, so brute forcing cannot consume CPU.
  const blockedFor = proxyAuthThrottle.peek(sourceIp);
  if (blockedFor > 0) {
    return {
      ok: false,
      statusCode: 429,
      message: `Too many failed proxy authentication attempts. Try again in ${blockedFor} seconds.`,
      retryAfter: blockedFor
    };
  }

  const credentials = parseProxyAuthorization(req);
  if (!credentials) {
    // A missing/garbage Proxy-Authorization header is a typical brute-force probe.
    proxyAuthThrottle.record(sourceIp);
    return { ok: false, statusCode: 407, message: "Proxy authentication required" };
  }

  const result = await resolveGatewayBoundProxy({ ...credentials, sourceIp });
  if (!result.ok) {
    // Only count genuine authentication failures (407: wrong/unknown/inactive
    // credentials). A 403 (quota / concurrency / ip_not_allowed) or 502
    // (upstream) comes from a VALID credential, so it must not push a paying user
    // toward a lockout.
    if (result.statusCode === 407) {
      proxyAuthThrottle.record(sourceIp);
    }
    return { ok: false, statusCode: result.statusCode, message: result.error };
  }

  return {
    ok: true,
    resolved: {
      proxyEntry: {
        id: result.proxyEntry.id,
        userId: result.proxyEntry.userId
      },
      upstream: result.upstream
    }
  };
}

function withoutHopByHopHeaders(headers: http.IncomingHttpHeaders): http.OutgoingHttpHeaders {
  const result: http.OutgoingHttpHeaders = {};
  const blocked = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade"
  ]);

  for (const [key, value] of Object.entries(headers)) {
    if (!blocked.has(key.toLowerCase())) {
      result[key] = value;
    }
  }

  return result;
}

function createTrafficRecorder(proxyEntry: GatewayResolvedProxy["proxyEntry"]) {
  // bytesUp/bytesDown hold the bytes not yet persisted. Every flush writes the
  // pending delta and zeroes it, so periodic flushes during a long-lived tunnel
  // and the final flush at close never double-count the same bytes.
  let bytesUp = 0n;
  let bytesDown = 0n;
  let finalized = false;
  let writing = false;

  async function persist(connectionCompleted: boolean): Promise<void> {
    // Single-flight: a periodic flush and the close-time flush can fire at the
    // same time; without this guard both could read+send the same pending bytes.
    if (writing) return;
    writing = true;
    const pendingUp = bytesUp;
    const pendingDown = bytesDown;
    bytesUp = 0n;
    bytesDown = 0n;

    try {
      await recordGatewayTrafficUsage({
        userId: proxyEntry.userId,
        proxyEntryId: proxyEntry.id,
        bytesUp: pendingUp,
        bytesDown: pendingDown,
        connectionCompleted
      });
    } catch (error) {
      // Put the bytes back so the next flush retries them instead of losing them.
      bytesUp += pendingUp;
      bytesDown += pendingDown;
      console.warn(`Gateway traffic accounting failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      writing = false;
    }
  }

  return {
    addUp(chunk: Buffer | string) {
      bytesUp += BigInt(Buffer.byteLength(chunk));
    },
    addDown(chunk: Buffer | string) {
      bytesDown += BigInt(Buffer.byteLength(chunk));
    },
    // Persist the bytes seen so far without releasing the connection slot. Used
    // by the periodic mid-connection flush so quota usage keeps moving and a long
    // tunnel cannot silently run past its limit.
    async flushDelta(): Promise<void> {
      if (finalized) return;
      await persist(false);
    },
    // Final flush at connection close: persist remaining bytes and release the
    // live-connection slot exactly once.
    async flush(connectionCompleted: boolean) {
      if (finalized) return;
      finalized = true;
      await persist(connectionCompleted);
    }
  };
}

type TrafficRecorder = ReturnType<typeof createTrafficRecorder>;

const TUNNEL_FLUSH_INTERVAL_MS = Number(process.env.GATEWAY_TRAFFIC_FLUSH_INTERVAL_MS ?? 30_000);

// Periodically persist mid-connection traffic, enforce quota, and re-check that
// the proxy entry is still serviceable for a long-lived connection, tearing it
// down once the user is over quota or an admin has disabled the entry/user.
// Returns a stop() callback the caller must run when the connection ends. The
// timer is unref'd so it never keeps the process alive on its own.
function startTunnelQuotaWatch(
  traffic: TrafficRecorder,
  proxyEntryId: number,
  onTerminate: (reason: string) => void
): () => void {
  let stopped = false;
  const timer = setInterval(() => {
    void (async () => {
      if (stopped) return;
      await traffic.flushDelta();
      try {
        if (!stopped && (await isProxyEntryOverQuota(proxyEntryId))) {
          onTerminate("Traffic quota exceeded");
          return;
        }
        // Connect-time validation only runs once; if an admin disables the entry
        // or the user mid-session, drop the still-open tunnel here.
        if (!stopped) {
          const serviceable = await isProxyEntryServiceable(proxyEntryId);
          if (!serviceable.serviceable) {
            onTerminate(`Proxy entry no longer serviceable: ${serviceable.reason}`);
          }
        }
      } catch {
        // A transient quota/status-check failure must not crash the gateway; the
        // next tick retries.
      }
    })();
  }, Math.max(5_000, TUNNEL_FLUSH_INTERVAL_MS));
  timer.unref();

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

const server = http.createServer(async (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        service: "gateway",
        mode: "database",
        time: nowIso()
      })
    );
    return;
  }

  let resolved: Awaited<ReturnType<typeof resolveRequestUpstream>>;
  try {
    resolved = await resolveRequestUpstream(req, gatewayClientIp(req.socket));
  } catch (error) {
    console.warn(`Gateway request resolve failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    if (!res.headersSent) {
      writeBadGateway(res, "Gateway error");
    } else {
      res.end();
    }
    return;
  }

  if (!resolved.ok) {
    writeGatewayAuthFailure(res, resolved);
    return;
  }
  const { proxyEntry, upstream } = resolved.resolved;
  const traffic = createTrafficRecorder(proxyEntry);

  const targetUrl = req.url;
  if (!targetUrl?.startsWith("http://")) {
    writeBadGateway(res, "Only absolute HTTP proxy requests are supported");
    await traffic.flush(true);
    return;
  }

  const headers = withoutHopByHopHeaders(req.headers);
  const auth = upstreamAuthorization(upstream);
  if (auth) {
    headers["proxy-authorization"] = auth;
  }

  const upstreamReq = http.request({
    host: upstream.host,
    port: upstream.port,
    method: req.method,
    path: targetUrl,
    headers,
    timeout: connectTimeoutMs
  });
  upstreamReq.on("socket", (socket) => {
    socket.setNoDelay(true);
  });

  let stopWatch: (() => void) | null = null;

  req.on("data", (chunk: Buffer) => {
    traffic.addUp(chunk);
  });

  upstreamReq.on("response", (upstreamRes) => {
    // The timeout guards connection + first byte. Once the response is streaming,
    // clear it so large/slow downloads are not aborted mid-transfer.
    upstreamReq.setTimeout(0);
    // A streaming response can be long-lived; enforce quota and entry status
    // mid-transfer so it cannot run far past the limit or keep serving after the
    // entry is disabled, and persist traffic periodically.
    stopWatch = startTunnelQuotaWatch(traffic, proxyEntry.id, (reason) => {
      upstreamReq.destroy(new Error(reason));
      if (!res.destroyed) res.destroy();
    });
    // Provider throttle (402/429) from the bound upstream on a live request. That
    // status is about OUR shared provider account (payment/quota/rate-limit), NOT
    // the end user, so it must never pass through verbatim — a raw 402 "Payment
    // Required" makes the user think THEY owe money and leaks the upstream provider.
    // Cool the upstream (non-blocking) so the entry rebinds to a different upstream
    // on the next connect, then surface a uniform transient 503 + Retry-After and
    // drain the provider body so its payment page never reaches the user.
    const upstreamStatus = upstreamRes.statusCode ?? 0;
    if (isProviderThrottleStatus(upstreamStatus)) {
      void coolUpstreamOnGatewayThrottle(upstream.id).catch(() => undefined);
      upstreamRes.resume();
      res.writeHead(503, {
        "content-type": "text/plain",
        "retry-after": String(PROVIDER_THROTTLE_RETRY_AFTER_SECONDS)
      });
      res.end("Upstream temporarily unavailable, please retry.\n");
      return;
    }
    res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.statusMessage, withoutHopByHopHeaders(upstreamRes.headers));
    upstreamRes.on("data", (chunk: Buffer) => {
      traffic.addDown(chunk);
    });
    upstreamRes.pipe(res);
  });

  res.on("finish", () => {
    stopWatch?.();
    void traffic.flush(true);
  });

  res.on("close", () => {
    stopWatch?.();
    void traffic.flush(true);
  });

  upstreamReq.on("timeout", () => {
    upstreamReq.destroy(new Error("Upstream proxy timeout"));
  });

  upstreamReq.on("error", () => {
    stopWatch?.();
    if (!res.headersSent) {
      writeBadGateway(res, "Upstream proxy connection failed");
    } else {
      res.end();
    }
    void traffic.flush(true);
  });

  req.pipe(upstreamReq);
});

server.on("connect", async (req, clientSocket, head) => {
  // A CONNECT handler runs as an async listener: any thrown error or rejected
  // promise here would otherwise surface as an unhandledRejection and could take
  // the whole gateway process down. Guard the socket-level errors so a single bad
  // tunnel never crashes the server.
  clientSocket.on("error", () => {
    clientSocket.destroy();
  });

  let resolved: Awaited<ReturnType<typeof resolveRequestUpstream>>;
  try {
    resolved = await resolveRequestUpstream(req, gatewayClientIp(clientSocket));
  } catch (error) {
    console.warn(`Gateway CONNECT resolve failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    writeConnectError(clientSocket, "Gateway error");
    return;
  }

  if (!resolved.ok) {
    writeConnectGatewayAuthFailure(clientSocket, resolved);
    return;
  }
  const { proxyEntry, upstream } = resolved.resolved;
  const traffic = createTrafficRecorder(proxyEntry);

  if (!req.url || !req.url.includes(":")) {
    writeConnectError(clientSocket, "Invalid CONNECT target");
    await traffic.flush(true);
    return;
  }

  const upstreamSocket = net.connect(upstream.port, upstream.host);
  // Proxied browsing is many small round-trips through this tunnel; Nagle's
  // algorithm batches them and interacts badly with delayed-ACK, adding tens of
  // ms per round-trip. Disable it so interactive page loads are not stalled.
  upstreamSocket.setNoDelay(true);
  upstreamSocket.setTimeout(connectTimeoutMs);

  const auth = upstreamAuthorization(upstream);
  const connectLines = [
    `CONNECT ${req.url} HTTP/1.1`,
    `Host: ${req.url}`,
    "Proxy-Connection: keep-alive"
  ];

  if (auth) {
    connectLines.push(`Proxy-Authorization: ${auth}`);
  }

  upstreamSocket.once("connect", () => {
    upstreamSocket.write(`${connectLines.join("\r\n")}\r\n\r\n`);
  });

  let responseBuffer = Buffer.alloc(0);

  let tunnelEstablished = false;
  let stopWatch: (() => void) | null = null;

  const fail = () => {
    stopWatch?.();
    upstreamSocket.destroy();
    if (!tunnelEstablished) {
      writeConnectError(clientSocket, "Upstream proxy connection failed");
    }
  };

  upstreamSocket.on("data", function onUpstreamData(chunk) {
    responseBuffer = Buffer.concat([responseBuffer, chunk]);
    const headerEnd = responseBuffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) return;

    upstreamSocket.off("data", onUpstreamData);
    const headerText = responseBuffer.subarray(0, headerEnd).toString("latin1");
    const firstLine = headerText.split("\r\n")[0] ?? "";

    if (!/^HTTP\/1\.[01] 200\b/.test(firstLine)) {
      // Provider throttle (402/429) during tunnel setup: cool the upstream so the
      // entry rebinds away on the next connect instead of repeatedly failing here.
      if (/^HTTP\/1\.[01] (402|429)\b/.test(firstLine)) {
        void coolUpstreamOnGatewayThrottle(upstream.id).catch(() => undefined);
      }
      fail();
      return;
    }

    tunnelEstablished = true;
    // The connect timeout only guards tunnel setup. Once established, clear it so
    // long-lived or idle tunnels (large downloads, streaming, SSH, websockets)
    // are not torn down after connectTimeoutMs of inactivity.
    upstreamSocket.setTimeout(0);
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    const extra = responseBuffer.subarray(headerEnd + 4);
    if (extra.length > 0) {
      clientSocket.write(extra);
    }
  if (head.length > 0) {
      traffic.addUp(head);
      upstreamSocket.write(head);
    }

    upstreamSocket.on("data", (chunk: Buffer) => {
      traffic.addDown(chunk);
    });
    clientSocket.on("data", (chunk: Buffer) => {
      traffic.addUp(chunk);
    });

    // A CONNECT tunnel is long-lived by nature; enforce quota, re-check entry
    // status, and persist traffic periodically so it cannot run far past the
    // limit nor keep serving after the entry/user is disabled.
    stopWatch = startTunnelQuotaWatch(traffic, proxyEntry.id, () => {
      upstreamSocket.destroy();
      clientSocket.destroy();
    });

    upstreamSocket.pipe(clientSocket);
    clientSocket.pipe(upstreamSocket);
  });

  upstreamSocket.on("timeout", fail);
  upstreamSocket.on("error", fail);
  clientSocket.on("error", () => upstreamSocket.destroy());
  clientSocket.on("close", () => {
    stopWatch?.();
    upstreamSocket.destroy();
    void traffic.flush(true);
  });
  upstreamSocket.on("close", () => {
    stopWatch?.();
    void traffic.flush(true);
  });
});

const sqliteConfig = await configureSqlite();
if (!sqliteConfig.ok) {
  console.warn(`Gateway SQLite tuning failed: ${sqliteConfig.error}`);
}

// Ensure hot-path indexes exist even if prisma db push was never run in this
// environment (it can fail on some Windows/Node setups). Idempotent.
try {
  const indexResult = await ensureIndexes();
  if (!indexResult.ok) {
    console.warn(`Gateway could not ensure database indexes: ${indexResult.error}`);
  }
} catch (error) {
  console.warn(`Gateway index check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
}

// Verify the encryption key actually decrypts a stored upstream password at
// startup. Without this, a wrong/missing ENCRYPTION_KEY only surfaces later as a
// generic 502 "no available upstream", which looks identical to an empty pool and
// sends operators down the wrong debugging path. Warn-only: a key mismatch must
// not stop the gateway from serving entries that may still resolve.
try {
  const keyCheck = await verifyEncryptionSelfCheck();
  if (keyCheck.ok) {
    console.info(`Gateway encryption self-check: ${keyCheck.message}`);
  } else {
    console.error(`Gateway encryption self-check FAILED: ${keyCheck.message}`);
  }
} catch (error) {
  console.warn(
    `Gateway encryption self-check could not run: ${error instanceof Error ? error.message : "Unknown error"}`
  );
}

// No tunnels are held by this process at startup, so any leftover live-connection
// counts are phantoms from a previous unclean shutdown. Reset them so users do not
// get permanently stuck at the concurrent-connection limit.
try {
  const cleared = await resetActiveConnections();
  if (cleared > 0) {
    console.info(`Gateway reset stale active connection counters on ${cleared} proxy entries`);
  }
} catch (error) {
  console.warn(`Gateway could not reset active connection counters: ${error instanceof Error ? error.message : "Unknown error"}`);
}

// Harden the HTTP server against slow/idle clients so sockets do not pile up over
// time: bound how long a client may take to send headers / the full request, and
// how long an idle keep-alive socket is kept around.
server.requestTimeout = Number(process.env.GATEWAY_REQUEST_TIMEOUT_MS ?? 30_000);
server.headersTimeout = Number(process.env.GATEWAY_HEADERS_TIMEOUT_MS ?? 20_000);
server.keepAliveTimeout = Number(process.env.GATEWAY_KEEPALIVE_TIMEOUT_MS ?? 10_000);

// Disable Nagle's algorithm on every incoming client socket (regular HTTP proxy
// requests and CONNECT tunnels both arrive as server connections). Proxied
// browsing is latency-sensitive small round-trips, so coalescing them with Nagle
// stalls interactive page loads.
server.on("connection", (socket) => {
  socket.setNoDelay(true);
});

// A malformed client request emits "clientError"; without a listener Node closes
// the socket but the default 400 reply may differ, and any exception bubbles up.
server.on("clientError", (_error, socket) => {
  if (socket.writable && !socket.destroyed) {
    socket.end("HTTP/1.1 400 Bad Request\r\nconnection: close\r\n\r\n");
  } else {
    socket.destroy();
  }
});

server.on("error", (error) => {
  console.error(`Gateway server error: ${error instanceof Error ? error.message : "Unknown error"}`);
});

// Last-resort process guards. A proxy gateway handles untrusted client traffic and
// many concurrent sockets; a single unexpected throw/rejection in an async socket
// handler must not take the whole process down and disconnect every user.
process.on("uncaughtException", (error) => {
  console.error(`Gateway uncaughtException: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
});
process.on("unhandledRejection", (reason) => {
  console.error(`Gateway unhandledRejection: ${reason instanceof Error ? reason.stack ?? reason.message : String(reason)}`);
});

// Graceful shutdown: stop accepting new connections and let in-flight transfers
// finish before exiting so a deploy/restart does not hard-cut active tunnels.
let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`Gateway received ${signal}, shutting down gracefully`);
  const timer = setTimeout(() => {
    console.warn("Gateway graceful shutdown timed out; forcing exit");
    process.exit(0);
  }, 10_000);
  timer.unref();
  server.close(() => {
    console.info("Gateway closed all connections, exiting");
    process.exit(0);
  });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

server.listen(port, "0.0.0.0", () => {
  console.info(`Gateway listening on ${port}`);
});
