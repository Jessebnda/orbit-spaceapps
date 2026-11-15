"use client";

import { useMemo, useSyncExternalStore } from "react";
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { METRIC_META, THRESHOLDS, formatMetric, statusOf, type MetricKey, type Status } from "@orbit/shared";
import { downsample } from "@/lib/domain/downsample";
import { fmtClock } from "@/lib/domain/format";
import { niceTicks } from "@/lib/domain/ticks";
import { domainOf } from "@/lib/domain/vitals";
import { chart, statusColor, tooltipStyle } from "@/lib/theme";

export interface Point { ts: number; v: number }

// Phones can't spare 112 px for limit labels beside the plot: there they sit inside it, over their line.
const NARROW = "(max-width: 639px)";
const subscribe = (cb: () => void) => { const m = matchMedia(NARROW); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };
const useNarrow = () => useSyncExternalStore(subscribe, () => matchMedia(NARROW).matches, () => false);

const tick = { fill: "#98989F", fontSize: 11 };
const day = (t: number) => new Date(t).toLocaleDateString("es", { day: "numeric", month: "short" });

/** One big line over a neutral normal zone. Limits are dashed, labelled lines; out-of-range stretches take their status colour. */
export function ThresholdChart({ metric, points, span }: { metric: MetricKey; points: Point[]; span: "6h" | "24h" | "14d" }) {
  const { data, ticks, last, xticks } = useMemo(() => {
    const pts = downsample(points, 400);
    const [dlo, dhi] = domainOf(metric);
    const vs = pts.map((p) => p.v);
    const [, wl, wh] = THRESHOLDS[metric];
    const lo = Math.max(dlo, Math.min(...vs, wl) - 5), hi = Math.min(dhi, Math.max(...vs, Math.min(wh, 1e6)) + 5);
    const ticks = niceTicks(Math.min(lo, hi - 1), hi, 4);
    let prev: Status | undefined;
    const rows = pts.map((p) => {
      const s = statusOf(metric, p.v);
      const row: Record<string, number | undefined> = { ts: p.ts, [s]: p.v };
      if (prev && prev !== s) row[prev] = p.v; // overlap one point so the stretches join
      prev = s;
      return row;
    });
    const t0 = pts[0]?.ts ?? 0, t1 = pts[pts.length - 1]?.ts ?? 0;
    return { data: rows, ticks, last: pts[pts.length - 1], xticks: Array.from({ length: 5 }, (_, i) => t0 + ((t1 - t0) * i) / 4) };
  }, [metric, points]);
  const narrow = useNarrow();
  const [, wl, wh, ch] = THRESHOLDS[metric];
  const top = ticks[ticks.length - 1], bottom = ticks[0];
  const fmt = (t: number) => (span === "14d" ? day(t) : fmtClock(t));
  const lines = [
    { y: wh, text: `Vigilar > ${wh}`, c: statusColor.watch, show: wh < 1e6 },
    { y: wl, text: `Vigilar < ${wl}`, c: statusColor.watch, show: wl > 0 },
    { y: ch, text: `Crítico > ${ch}`, c: statusColor.critical, show: ch !== wh },
    { y: THRESHOLDS[metric][0], text: `Crítico < ${THRESHOLDS[metric][0]}`, c: statusColor.critical, show: THRESHOLDS[metric][0] > 0 },
  ].filter((l) => l.show && l.y > bottom && l.y < top);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 12, right: narrow ? 8 : 112, bottom: 0, left: 0 }}>
        <ReferenceArea y1={Math.max(wl, bottom)} y2={Math.min(wh, top)} fill="#fff" fillOpacity={0.05} stroke="none" />
        <CartesianGrid horizontal vertical={false} stroke="#2C2C2E" />
        <XAxis dataKey="ts" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={fmt} tick={tick} tickLine={false} axisLine={false} ticks={xticks} padding={{ left: 8, right: 0 }} />
        <YAxis domain={[bottom, top]} ticks={ticks} tick={tick} tickLine={false} axisLine={false} width={40} />
        {lines.map((l) => (
          <ReferenceLine key={l.text} y={l.y} stroke={l.c} strokeOpacity={0.7} strokeDasharray="3 3" label={{ value: l.text, position: narrow ? "insideTopRight" : "right", fill: l.c, fontSize: 11 }} />
        ))}
        <Tooltip contentStyle={{ ...tooltipStyle, border: "none", background: "#2C2C2E" }} labelFormatter={(t) => fmt(Number(t))} formatter={(v) => [formatMetric(metric, Number(v)), METRIC_META[metric].label]} cursor={{ stroke: "#98989F", strokeWidth: 1 }} />
        {(["ok", "watch", "critical"] as Status[]).map((s) => (
          <Line key={s} dataKey={s} type="linear" stroke={s === "ok" ? chart.line : statusColor[s]} strokeWidth={1.75} dot={false} isAnimationActive={false} connectNulls={false} activeDot={{ r: 3 }} />
        ))}
        {last && <ReferenceDot x={last.ts} y={last.v} r={4} fill={chart.line} stroke="#1C1C1E" strokeWidth={2} />}
      </LineChart>
    </ResponsiveContainer>
  );
}
