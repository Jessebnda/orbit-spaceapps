import { arcPath, rangeDial, statusOf, type MetricKey } from '@orbit/shared';
import { statusColor } from '@/lib/theme';

export function RangeDial({ metric, value, size = 72 }: { metric: MetricKey; value?: number; size?: number }) {
  const d = rangeDial(metric, value);
  const a = (135 + (d.value ?? 0) * 270) * Math.PI / 180;
  return <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
    <path d={arcPath(0, 1)} fill="none" stroke="var(--t-raised)" strokeWidth="7" strokeLinecap="round" />
    <path d={arcPath(d.normalLo, d.normalHi)} fill="none" stroke="var(--t-ok)" opacity=".45" strokeWidth="7" strokeLinecap="round" />
    {d.value != null && <circle cx={50 + 43 * Math.cos(a)} cy={50 + 43 * Math.sin(a)} r="5" fill={statusColor[statusOf(metric, value)]} stroke="var(--t-surface)" strokeWidth="2" />}
  </svg>;
}
