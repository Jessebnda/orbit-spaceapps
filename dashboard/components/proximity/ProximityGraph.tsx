"use client";

import { useMemo } from "react";
import { STATUS_LABEL, worstStatus, type CrewSnapshot } from "@orbit/shared";
import { chart, color, statusColor } from "@/lib/theme";

const SIZE = 360;
const C = SIZE / 2;
const R = 130;

/** Who is near whom: one edge per pair, thicker and more opaque the stronger the BLE signal. */
export function ProximityGraph({ crew }: { crew: CrewSnapshot[] }) {
  const { nodes, edges } = useMemo(() => {
    const index = new Map(crew.map((c, i) => [c.member.id, i]));
    const nodes = crew.map((c, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(crew.length, 1);
      return { x: C + R * Math.cos(a), y: C + R * Math.sin(a), c };
    });
    const best = new Map<string, { a: number; b: number; rssi: number }>();
    crew.forEach((c, i) =>
      c.peers.forEach((p) => {
        const j = index.get(p.crewId);
        if (j === undefined || j === i) return;
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        const prev = best.get(key);
        if (!prev || p.rssi > prev.rssi) best.set(key, { a: i, b: j, rssi: p.rssi });
      }),
    );
    return { nodes, edges: [...best.values()] };
  }, [crew]);

  if (!crew.length) return <p className="text-small text-faint">Sin tripulación conectada.</p>;

  return (
    <div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-sm" role="img" aria-label="Proximidad entre la tripulación">
        {edges.map((e) => {
          // RSSI -100 dBm (far) to -30 dBm (near) mapped to 0..1.
          const s = Math.min(1, Math.max(0, (e.rssi + 100) / 70));
          const from = nodes[e.a];
          const to = nodes[e.b];
          return (
            <line key={`${e.a}-${e.b}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={chart.peers[2]} strokeWidth={1 + 4 * s} strokeOpacity={0.15 + 0.7 * s}>
              <title>{`${from.c.member.name} ↔ ${to.c.member.name}: ${e.rssi} dBm`}</title>
            </line>
          );
        })}
        {nodes.map(({ x, y, c }) => {
          const status = worstStatus(c.metrics);
          return (
            <g key={c.member.id} opacity={c.online ? 1 : 0.45}>
              <circle cx={x} cy={y} r={20} fill={color.bg} stroke={statusColor[status]} strokeWidth={2} strokeDasharray={c.online ? undefined : "3 3"} />
              <text x={x} y={y + 4} textAnchor="middle" fontSize={12} fill={color.text} className="tabular-nums">
                {c.member.name.slice(0, 1)}
              </text>
              <text x={x} y={y + 36} textAnchor="middle" fontSize={12} fill={color.text}>
                {c.member.name}
              </text>
              <text x={x} y={y + 50} textAnchor="middle" fontSize={11} fill={color.muted}>
                {c.online ? STATUS_LABEL[status] : "Sin conexión"}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-center text-caption text-faint">Línea más gruesa y opaca = señal BLE más fuerte (más cerca). Sin línea = sin lectura.</p>
    </div>
  );
}
