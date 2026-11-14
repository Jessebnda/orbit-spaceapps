import { type MetricKey, statusOf } from "@orbit/shared";
import { statusColor } from "@/lib/theme";
import { unitPos, zonesOf, domainOf } from "@/lib/domain/vitals";

/** Linear range: five zones at 22 %, a marker on the value, a tick on the 7-day baseline. Out of range, the marker takes the status colour. */
export function RangeBar({ metric, value, base, height = 4, now, label }: { metric: MetricKey; value?: number; base?: number; height?: number; now?: number; label: string }) {
  const [lo, hi] = domainOf(metric);
  const pct = (v: number) => `${unitPos(metric, v) * 100}%`;
  const status = value == null ? "ok" : statusOf(metric, value, now);
  return (
    <div className="relative" style={{ height: 10 }} role="meter" aria-label={label} aria-valuemin={lo} aria-valuemax={hi} aria-valuenow={value} aria-hidden={value == null ? true : undefined}>
      <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 overflow-hidden rounded-full" style={{ height }}>
        {zonesOf(metric).map((z) => (
          <span key={`${z.a}`} style={{ width: `${((z.b - z.a) / (hi - lo)) * 100}%`, background: `color-mix(in srgb, ${statusColor[z.status]} 22%, transparent)` }} />
        ))}
      </div>
      {base != null && <span className="absolute top-0 h-full w-[1.5px] -translate-x-1/2 bg-muted" style={{ left: pct(base) }} />}
      {value != null && (
        <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface" style={{ left: pct(value), background: status === "ok" ? "var(--t-text)" : statusColor[status] }} />
      )}
    </div>
  );
}
