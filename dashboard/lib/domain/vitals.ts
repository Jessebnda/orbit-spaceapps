import { THRESHOLDS, type MetricKey, type Status } from "@orbit/shared";

const DAY = 86_400_000;

/** Display domain of a range bar/dial: half a watch-band beyond each critical limit (spo2 tops out at 100). */
export function domainOf(k: MetricKey): [number, number] {
  const [cl, wl, wh, ch] = THRESHOLDS[k];
  return [cl - 0.5 * (wl - cl), ch === wh ? 100 : ch + 0.5 * (ch - wh)];
}

/** Colour zones across the domain; zones that do not exist (spo2 above 100) are omitted. */
export function zonesOf(k: MetricKey): { a: number; b: number; status: Status }[] {
  const [lo, hi] = domainOf(k);
  const [cl, wl, wh, ch] = THRESHOLDS[k];
  const z: { a: number; b: number; status: Status }[] = [
    { a: lo, b: cl, status: "critical" },
    { a: cl, b: wl, status: "watch" },
    { a: wl, b: Math.min(wh, hi), status: "ok" },
    { a: wh, b: ch === wh ? wh : ch, status: "watch" },
    { a: ch, b: hi, status: "critical" },
  ];
  return z.filter((x) => x.b > x.a);
}

export const unitPos = (k: MetricKey, v: number) => {
  const [lo, hi] = domainOf(k);
  return Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
};

export function median(a: number[]) {
  if (!a.length) return undefined;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** 7-day baseline: median of the metric, only when the history spans 3+ days. */
export function base7(points: { ts: number; v: number }[]): number | undefined {
  if (points.length < 3 || points[points.length - 1].ts - points[0].ts < 3 * DAY) return undefined;
  return median(points.map((p) => p.v));
}

/** Flat when the change is under 5 % of the normal band width (spo2: under 1). */
export function trendOf(k: MetricKey, v: number, base?: number): { dir: "up" | "down" | "flat"; delta: number } | undefined {
  if (base == null) return undefined;
  const [, wl, wh] = THRESHOLDS[k];
  const tol = k === "spo2" ? 1 : 0.05 * (Math.min(wh, 1e6) - wl);
  const delta = v - base;
  return { dir: Math.abs(delta) < tol ? "flat" : delta > 0 ? "up" : "down", delta };
}

/** Last value of each of the last 7 local days (newest last); null where a day has no data. */
export function lastSevenDays(points: { ts: number; v: number }[], now: number): (number | null)[] {
  const start = new Date(now).setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const a = start - (6 - i) * DAY, b = a + DAY;
    const day = points.filter((p) => p.ts >= a && p.ts < b);
    return day.length ? day[day.length - 1].v : null;
  });
}
