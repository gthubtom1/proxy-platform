// Source-IP allowlist matching for the proxy gateway. An allowlist entry is
// either a single IPv4/IPv6 address or a CIDR range (e.g. 203.0.113.0/24,
// 2001:db8::/32). An empty allowlist means "no restriction" (any source IP is
// allowed) — the caller is responsible for that short-circuit.
//
// Pure logic, no Node networking APIs, so it is fully unit-testable. IPv6 is
// normalized to a 128-bit BigInt (handling :: compression and IPv4-mapped
// ::ffff:a.b.c.d); IPv4 to a 32-bit number. A client connecting over IPv4 to a
// dual-stack listener often appears as ::ffff:a.b.c.d, so an IPv4 allowlist
// entry must still match that mapped form.

function ipv4ToInt(parts: number[]): number {
  // Unsigned 32-bit. >>> 0 keeps it non-negative.
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}

function parseIpv4(input: string): number[] | null {
  const parts = input.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    // Reject leading zeros and out-of-range, matching isValidIpv4's strictness.
    if (value < 0 || value > 255 || String(value) !== part) return null;
    octets.push(value);
  }
  return octets;
}

// Returns the address as a 128-bit BigInt, or null if not a valid IPv6 literal.
// IPv4-mapped (::ffff:a.b.c.d) and plain dotted tails inside IPv6 are supported.
function parseIpv6ToBigInt(input: string): bigint | null {
  let text = input.trim();
  if (text.includes(".")) {
    // Handle an embedded IPv4 tail (e.g. ::ffff:192.0.2.1) by converting the
    // trailing dotted quad into two hextets.
    const lastColon = text.lastIndexOf(":");
    if (lastColon === -1) return null;
    const tail = text.slice(lastColon + 1);
    const v4 = parseIpv4(tail);
    if (!v4) return null;
    const high = ((v4[0]! << 8) | v4[1]!).toString(16);
    const low = ((v4[2]! << 8) | v4[3]!).toString(16);
    text = `${text.slice(0, lastColon)}:${high}:${low}`;
  }

  const doubleColonCount = (text.match(/::/g) ?? []).length;
  if (doubleColonCount > 1) return null;

  let headPart: string;
  let tailPart: string;
  if (doubleColonCount === 1) {
    const [head, tail] = text.split("::");
    headPart = head ?? "";
    tailPart = tail ?? "";
  } else {
    headPart = text;
    tailPart = "";
  }

  const headGroups = headPart ? headPart.split(":") : [];
  const tailGroups = tailPart ? tailPart.split(":") : [];

  if (doubleColonCount === 0 && headGroups.length !== 8) return null;
  if (doubleColonCount === 1 && headGroups.length + tailGroups.length > 7) return null;

  const missing = 8 - headGroups.length - tailGroups.length;
  const allGroups = [...headGroups, ...Array(Math.max(0, missing)).fill("0"), ...tailGroups];
  if (allGroups.length !== 8) return null;

  let result = 0n;
  for (const group of allGroups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
    result = (result << 16n) | BigInt(parseInt(group, 16));
  }
  return result;
}

type ParsedEntry =
  | { kind: "ipv4"; value: number; prefix: number }
  | { kind: "ipv6"; value: bigint; prefix: number };

function parseAllowlistEntry(entry: string): ParsedEntry | null {
  const trimmed = entry.trim();
  if (!trimmed) return null;

  const slash = trimmed.indexOf("/");
  const addressPart = slash === -1 ? trimmed : trimmed.slice(0, slash);
  const prefixPart = slash === -1 ? null : trimmed.slice(slash + 1);

  const v4 = parseIpv4(addressPart);
  if (v4) {
    let prefix = 32;
    if (prefixPart !== null) {
      if (!/^\d{1,2}$/.test(prefixPart)) return null;
      prefix = Number(prefixPart);
      if (prefix < 0 || prefix > 32) return null;
    }
    return { kind: "ipv4", value: ipv4ToInt(v4), prefix };
  }

  const v6 = parseIpv6ToBigInt(addressPart);
  if (v6 !== null) {
    let prefix = 128;
    if (prefixPart !== null) {
      if (!/^\d{1,3}$/.test(prefixPart)) return null;
      prefix = Number(prefixPart);
      if (prefix < 0 || prefix > 128) return null;
    }
    return { kind: "ipv6", value: v6, prefix };
  }

  return null;
}

function ipv4Matches(ip: number, entry: { value: number; prefix: number }): boolean {
  if (entry.prefix === 0) return true;
  const mask = entry.prefix === 32 ? 0xffffffff : (0xffffffff << (32 - entry.prefix)) >>> 0;
  return (ip & mask) >>> 0 === (entry.value & mask) >>> 0;
}

function ipv6Matches(ip: bigint, entry: { value: bigint; prefix: number }): boolean {
  if (entry.prefix === 0) return true;
  const mask = ((1n << 128n) - 1n) ^ ((1n << BigInt(128 - entry.prefix)) - 1n);
  return (ip & mask) === (entry.value & mask);
}

// Strip a "%zone" scope id and an IPv4-mapped ::ffff: prefix is left intact (the
// matcher handles it). Returns null for anything not parseable as an address.
function normalizeClientAddress(ip: string): { v4?: number; v6?: bigint } | null {
  let text = ip.trim();
  const percent = text.indexOf("%");
  if (percent !== -1) text = text.slice(0, percent);

  const v4 = parseIpv4(text);
  if (v4) return { v4: ipv4ToInt(v4) };

  const v6 = parseIpv6ToBigInt(text);
  if (v6 !== null) {
    const result: { v4?: number; v6?: bigint } = { v6 };
    // An IPv4-mapped IPv6 address (::ffff:a.b.c.d) should also match plain IPv4
    // allowlist entries, so expose the embedded v4 too.
    if ((v6 >> 32n) === 0x0000ffffn) {
      result.v4 = Number(v6 & 0xffffffffn);
    }
    return result;
  }
  return null;
}

/**
 * Validate and canonicalize a single allowlist entry (an IP or CIDR). Returns the
 * trimmed entry when valid, or null when it is not a parseable IP/CIDR. Used by
 * the API to reject bad admin input before persisting.
 */
export function normalizeSourceIpEntry(entry: string): string | null {
  const trimmed = entry.trim();
  return parseAllowlistEntry(trimmed) ? trimmed : null;
}

/**
 * True if `clientIp` is allowed by `allowlist`. An empty allowlist returns true
 * (no restriction). Unparseable allowlist entries are skipped (never match); an
 * unparseable clientIp never matches a non-empty allowlist (fail closed).
 */
export function isIpInAllowlist(clientIp: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true;

  const client = normalizeClientAddress(clientIp);
  if (!client) return false;

  for (const rawEntry of allowlist) {
    const entry = parseAllowlistEntry(rawEntry);
    if (!entry) continue;

    if (entry.kind === "ipv4" && client.v4 !== undefined && ipv4Matches(client.v4, entry)) {
      return true;
    }
    if (entry.kind === "ipv6" && client.v6 !== undefined && ipv6Matches(client.v6, entry)) {
      return true;
    }
  }
  return false;
}
