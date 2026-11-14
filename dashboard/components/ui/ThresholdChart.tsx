"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { METRIC_META, formatMetric, type MetricKey, type Status } from "@orbit/shared";
import { thresholdBands } from "@/lib/domain/bands";
import { downsample } from "@/lib/domain/downsample";
import { fmtClock } from "@/lib/domain/format";
import { chart, statusColor, tickStyle, tooltipStyle } from "@/lib/theme";

export interface Point { ts: number; v: number }

const BAND_OPACITY: Record<Status, number> = { ok: 0.1, watch: 0.12, critical: 0.14 };

/** Line over shaded threshold bands. The bands carry status; the line uses the single accent. */
export function ThresholdChart({ metric, points }: { metric: MetricKey; points: Point[] }) {
  const { lo, hi, bands } = useMemo(() => thresholdBands(metric), [metric]);
  const data = useMemo(() => downsample(points), [points]);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        {bands.map((b) => (
          <ReferenceArea
            key={`${b.status}-${b.y1}`}
            y1={b.y1}
            y2={b.y2}
            fill={statusColor[b.status]}
            fillOpacity={BAND_OPACITY[b.status]}
            stroke="none"
            ifOverflow="extendDomain"
          />
        ))}
        <CartesianGrid horizontal vertical={false} stroke={chart.grid} />
        <XAxis
          dataKey="ts"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(t: number) => fmtClock(t)}
          tick={tickStyle}
          tickLine={false}
          axisLine={false}
          tickCount={5}
        />
        <YAxis domain={[lo, hi]} tick={tickStyle} tickLine={false} axisLine={false} width={40} tickCount={4} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(t) => fmtClock(Number(t))}
          formatter={(v) => [formatMetric(metric, Number(v)), METRIC_META[metric].label]}
          cursor={{ stroke: chart.cursor, strokeWidth: 1 }}
        />
        <Line dataKey="v" type="linear" stroke={chart.line} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
