"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chart, tickStyle, tooltipStyle } from "@/lib/theme";
import type { CommsRow } from "@/lib/services/hub";

const DAY = 86_400_000;
const TOP = 3; // peers beyond the top three fold into "Otros": a fourth categorical hue would be too many

/** Stacked talk minutes per day, one segment per peer. */
export function CommsChart({ crewId, records, names, now, days = 14 }: { crewId: string; records: CommsRow[]; names: Record<string, string>; now: number; days?: number }) {
  const { data, peers } = useMemo(() => {
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
    const series = [
      ...top.map((id, i) => ({ key: id, label: names[id] ?? id, color: chart.peers[i] })),
      ...(ranked.length > top.length ? [{ key: "__other", label: "Otros", color: chart.other }] : []),
    ];
    return { data: rows, peers: series };
  }, [crewId, records, names, now, days]);

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted" aria-label="Leyenda">
        {peers.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <span className="inline-block size-2" style={{ background: p.color }} aria-hidden />
            {p.label}
          </li>
        ))}
      </ul>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid horizontal vertical={false} stroke={chart.grid} />
            <XAxis dataKey="day" tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={36} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: chart.cursor, fillOpacity: 0.12 }} formatter={(v) => `${v} min`} />
            {peers.map((p) => (
              <Bar key={p.key} dataKey={p.key} name={p.label} stackId="m" fill={p.color} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
