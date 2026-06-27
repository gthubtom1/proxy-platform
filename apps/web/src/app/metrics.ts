import type { TrafficRow } from "./types";
import { countryLabel } from "./format";

export type DailyPoint = {
  date: string;
  up: number;
  down: number;
  total: number;
  connections: number;
};

export type LabeledValue = {
  key: string;
  label: string;
  value: number;
};

function toNumber(value: string | number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildDailySeries(rows: TrafficRow[], days = 30): DailyPoint[] {
  const byDate = new Map<string, DailyPoint>();
  for (const row of rows) {
    const point = byDate.get(row.date) ?? { date: row.date, up: 0, down: 0, total: 0, connections: 0 };
    point.up += toNumber(row.bytesUp);
    point.down += toNumber(row.bytesDown);
    point.total += toNumber(row.totalBytes);
    point.connections += row.connections || 0;
    byDate.set(row.date, point);
  }
  const sorted = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return sorted.slice(-days);
}

export function sumTrafficByCountry(rows: TrafficRow[]): LabeledValue[] {
  const byCountry = new Map<string, number>();
  for (const row of rows) {
    const key = row.proxyEntry?.targetCountry || "unknown";
    byCountry.set(key, (byCountry.get(key) ?? 0) + toNumber(row.totalBytes));
  }
  return [...byCountry.entries()]
    .map(([key, value]) => ({ key, label: key === "unknown" ? "未知" : countryLabel(key), value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function topUsersByTraffic(rows: TrafficRow[], limit = 5): LabeledValue[] {
  const byUser = new Map<string, number>();
  for (const row of rows) {
    const key = row.user?.username || `用户#${row.userId}`;
    byUser.set(key, (byUser.get(key) ?? 0) + toNumber(row.totalBytes));
  }
  return [...byUser.entries()]
    .map(([key, value]) => ({ key, label: key, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function sumUpstreamsByCountry(upstreams: { country: string | null }[]): LabeledValue[] {
  const byCountry = new Map<string, number>();
  for (const upstream of upstreams) {
    const key = upstream.country || "unknown";
    byCountry.set(key, (byCountry.get(key) ?? 0) + 1);
  }
  return [...byCountry.entries()]
    .map(([key, value]) => ({ key, label: key === "unknown" ? "未知" : countryLabel(key), value }))
    .sort((a, b) => b.value - a.value);
}

export function sumProxiesByCountry(entries: { targetCountry: string }[]): LabeledValue[] {
  const byCountry = new Map<string, number>();
  for (const entry of entries) {
    const key = entry.targetCountry || "unknown";
    byCountry.set(key, (byCountry.get(key) ?? 0) + 1);
  }
  return [...byCountry.entries()]
    .map(([key, value]) => ({ key, label: key === "unknown" ? "未知" : countryLabel(key), value }))
    .sort((a, b) => b.value - a.value);
}

export function sumField(points: DailyPoint[], field: "up" | "down" | "total" | "connections"): number {
  return points.reduce((sum, point) => sum + point[field], 0);
}
