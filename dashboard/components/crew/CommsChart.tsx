"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { niceTicks } from "@/lib/domain/ticks";
import { chart, color, tickStyle, tooltipStyle } from "@/lib/theme";
import type { CommsRow } from "@/lib/services/hub";

const DAY = 86_400_000;
const TOP = 3; // peers beyond the top three fold into "Otros": a fourth categorical hue would be too many

/** Stacked talk minutes per day, one segment per peer. The legend is a table: name and total minutes. */
export function CommsChart({ crewId, records, names, now, days = 14 }: { crewId: string; records: CommsRow[]; names: Record<string, string>; now: number; days?: number }) {
  const { data, peers, totals, mean, ticks } = useMemo(() => {
    const totals = new Map<string, number>();
    for (const r of records) {
      const peer = r.crewId === crewId ? r.peerId : r.crewId;
      totals.set(peer, (totals.get(peer) ?? 0) + r.minutes);
    }
    const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    const top = ranked.slice(0, TOP);
    const rows = Array.from({ length: days }, (_, i) => {
      const start = new Date(now - (days - 1 - i) * DAY).setHours(0, 0, 0, 0);
      return { day: new Date(start).toLocaleDateString("es", { day: "numeric", month: "short" }), start, end: start + DAY } as Record<string, number | string>;
    });
    for (const r of records) {
      const row = rows.find((x) => r.ts >= (x.start as number) && r.ts < (x.end as number));
      if (!row) continue;
      const peer = r.crewId === crewId ? r.peerId : r.crewId;
      const key = top.includes(peer) ? peer : "__other";
      row[key] = ((row[key] as number) ?? 0) + r.minutes;
    }
    const hues = [chart.line, color.text, color.muted];
    const series = [
      ...top.map((id, i) => ({ key: id, label: names[id] ?? id, color: hues[i], total: totals.get(id) ?? 0 })),
      ...(ranked.length > top.length ? [{ key: "__other", label: "Otros", color: chart.other, total: ranked.slice(TOP).reduce((a, id) => a + (totals.get(id) ?? 0), 0) }] : []),
    ];
    const dayTotals = rows.map((r) => series.reduce((a, s) => a + ((r[s.key] as number) ?? 0), 0));
    const max = Math.max(1, ...dayTotals);
    return { data: rows, peers: series, totals, mean: dayTotals.reduce((a, b) => a + b, 0) / days, ticks: niceTicks(0, max, 4) };
  }, [crewId, records, names, now, days]);
  void totals;

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-6 gap-y-1" aria-label="Leyenda">
        {peers.map((p) => (
          <li key={p.key} className="t-small flex items-center gap-2">
            <span className="inline-block size-2 rounded-full" style={{ background: p.color }} aria-hidden />
            {p.label} <span className="tabular-nums text-muted">{Math.round(p.total)} min</span>
          </li>
        ))}
      </ul>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid horizontal vertical={false} stroke={chart.grid} />
            <XAxis dataKey="day" tick={{ ...tickStyle, fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
            <YAxis tick={{ ...tickStyle, fontSize: 11 }} tickLine={false} axisLine={false} width={32} ticks={ticks} domain={[0, ticks[ticks.length - 1]]} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#fff", fillOpacity: 0.05 }} formatter={(v, n) => [`${v} min`, n]} />
            <ReferenceLine y={mean} stroke="#8E8E93" strokeDasharray="3 3" label={{ value: `media ${Math.round(mean)} min`, position: "insideTopRight", fill: "#8E8E93", fontSize: 11 }} />
            {peers.map((p) => (
              <Bar key={p.key} dataKey={p.key} name={p.label} stackId="m" fill={p.color} stroke={color.surface} strokeWidth={1} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
