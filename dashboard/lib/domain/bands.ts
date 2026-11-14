import { THRESHOLDS, type MetricKey, type Status } from "@orbit/shared";

export interface Band { y1: number; y2: number; status: Status }

/**
 * Shaded zones for a threshold chart, taken from THRESHOLDS so the shading agrees with statusOf().
 * ch === wh means no upper critical; wh >= 1e8 means no upper limit at all (activity).
 */
export function thresholdBands(key: MetricKey): { lo: number; hi: number; bands: Band[] } {
  const [cl, wl, wh, ch] = THRESHOLDS[key];
  const upperCrit = ch !== wh;
  const openTop = wh >= 1e8;
  const top = upperCrit ? ch : openTop ? wl * 2 : wh;
  const lo = Math.max(0, cl - (top - cl) * 0.1);
  const hi = top + (top - cl) * 0.1;
  const zones: Band[] = [
    { y1: lo, y2: cl, status: "critical" },
    { y1: cl, y2: wl, status: "watch" },
    { y1: wl, y2: Math.min(wh, hi), status: "ok" },
    { y1: wh, y2: upperCrit ? ch : hi, status: "watch" },
    { y1: ch, y2: hi, status: "critical" },
  ];
  // Drops zones that are empty or sit beyond the axis.
  return { lo, hi, bands: zones.filter((b) => b.y2 > b.y1 && b.y1 < hi) };
}
