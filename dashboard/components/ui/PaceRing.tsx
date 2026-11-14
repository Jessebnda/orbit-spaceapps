import { GOALS, THRESHOLDS, dayProgress, statusOf, type MetricKey } from "@orbit/shared";
import { statusColor } from "@/lib/theme";

/** Closed ring for a running total. A tick marks where the day says you should be; behind it you are late. Status comes from the pro-rated statusOf. */
export function PaceRing({ metric, value, size = 36, stroke = 5, now, label }: { metric: MetricKey; value?: number; size?: number; stroke?: number; now: number; label: string }) {
  const goal = GOALS[metric] ?? 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = value == null ? 0 : Math.min(1, value / goal);
  const s = value == null ? "ok" : statusOf(metric, value, now);
  const tick = (THRESHOLDS[metric][1] * dayProgress(now)) / goal;
  const a = (tick * 360 - 90) * (Math.PI / 180);
  const mid = size / 2;
  return (
    <svg width={size} height={size} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={goal} aria-valuenow={value} className="block">
      <circle cx={mid} cy={mid} r={r} fill="none" stroke="#0F2A47" strokeWidth={stroke} />
      <circle cx={mid} cy={mid} r={r} fill="none" stroke={s === "ok" ? "var(--t-accent)" : statusColor[s]} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform={`rotate(-90 ${mid} ${mid})`} className="ring-fill" />
      {tick > 0 && tick < 1 && (
        <line x1={mid + (r - stroke / 2 - 1) * Math.cos(a)} y1={mid + (r - stroke / 2 - 1) * Math.sin(a)} x2={mid + (r + stroke / 2 + 1) * Math.cos(a)} y2={mid + (r + stroke / 2 + 1) * Math.sin(a)} stroke="var(--t-text)" strokeWidth={1.5} />
      )}
    </svg>
  );
}
