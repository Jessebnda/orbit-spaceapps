"use client";

import { useMemo, useRef } from "react";
import { Radio } from "lucide-react";
import { worstStatus, STATUS_LABEL, type CrewSnapshot, type Emergency } from "@orbit/shared";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { LedgerList, LedgerRow } from "@/components/ui/LedgerRow";
import { pairs, procrustes, smacof, type Pt } from "@/lib/domain/proximity";
import { color, statusColor } from "@/lib/theme";

const W = 660;
const H = 360;
const MARGIN = 56;
const initials = (n: string) => n.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const meters = (m: number) => (m < 0.5 ? "<0,5 m" : `≈${(Math.round(m * 2) / 2).toString().replace(".", ",")} m`);

/** Positions in metres from the RSSI distances, aligned to the previous frame so the map never flips. */
function useLayout(crew: CrewSnapshot[]) {
  const prev = useRef<Record<string, Pt>>({});
  return useMemo(() => {
    const ids = crew.map((c) => c.member.id);
    const ps = pairs(crew);
    const mean = ps.length ? ps.reduce((a, p) => a + p.m, 0) / ps.length : 2;
    const init: Record<string, Pt> = Object.fromEntries(
      ids.map((id, i) => [id, prev.current[id] ?? { x: mean * Math.cos((2 * Math.PI * i) / ids.length), y: mean * Math.sin((2 * Math.PI * i) / ids.length) }]),
    );
    const solved = procrustes(smacof(ids, ps, init), prev.current);
    prev.current = solved;
    return { pos: solved, ps };
  }, [crew]);
}

/** Who is near whom, drawn as a plane: only distances are real (from RSSI), orientation is arbitrary. */
export function ProximityGraph({ crew, emergencies = [] }: { crew: CrewSnapshot[]; emergencies?: Emergency[] }) {
  const { pos, ps } = useLayout(crew);
  const open = emergencies.filter((e) => !e.resolved);
  const victim = open[0]?.victimId;
  const responders = open[0]?.responders ?? [];
  const names = new Map(crew.map((c) => [c.member.id, c.member.name]));

  const view = useMemo(() => {
    const pts = Object.values(pos);
    if (!pts.length) return { s: 1, cx: 0, cy: 0 };
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const bw = Math.max(...xs) - Math.min(...xs) || 1, bh = Math.max(...ys) - Math.min(...ys) || 1;
    const s = Math.min((W - 2 * MARGIN - 40) / bw, (H - 2 * MARGIN) / bh, 120);
    return { s, cx: (Math.max(...xs) + Math.min(...xs)) / 2, cy: (Math.max(...ys) + Math.min(...ys)) / 2 };
  }, [pos]);
  // Nodes closer than MIN px are pushed apart so labels stay readable; the distance list keeps the true values.
  const px = useMemo(() => {
    const out: Record<string, Pt> = Object.fromEntries(Object.entries(pos).map(([id, p]) => [id, { x: W / 2 + (p.x - view.cx) * view.s, y: H / 2 + (p.y - view.cy) * view.s }]));
    const ids = Object.keys(out), BW = 96, BH = 74; // node + label box
    for (let it = 0; it < 40; it++)
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++) {
          const a = out[ids[i]], b = out[ids[j]];
          const dx = b.x - a.x, dy = b.y - a.y;
          const ox = BW - Math.abs(dx), oy = BH - Math.abs(dy);
          if (ox <= 0 || oy <= 0) continue;
          // push along the axis that needs the smaller move
          if (ox < oy) { const k = ox / 2 * (dx < 0 ? -1 : 1); a.x -= k; b.x += k; }
          else { const k = oy / 2 * (dy < 0 ? -1 : 1); a.y -= k; b.y += k; }
        }
    // Re-centre the separated layout and grow the canvas to hold it.
    const ys = ids.map((i) => out[i].y), xs = ids.map((i) => out[i].x);
    const top = Math.min(...ys), bottom = Math.max(...ys);
    const h = Math.max(H, bottom - top + 120);
    const dy = 40 - top + (h - 120 - (bottom - top)) / 2, dx = W / 2 - (Math.max(...xs) + Math.min(...xs)) / 2;
    for (const i of ids) { out[i].x = Math.min(W - 60, Math.max(60, out[i].x + dx)); out[i].y += dy; }
    return { out, h };
  }, [pos, view]);
  const P = (id: string) => px.out[id];
  const HH = px.h;

  if (!crew.length) return <EmptyState icon={Radio} title="Sin tripulación conectada" hint="El mapa aparece cuando los móviles reportan su señal." />;

  const sorted = [...ps].sort((a, b) => a.m - b.m);
  const listId = "prox-list";
  const gridDots = view.s >= 8; // dots every metre vanish into noise when the scale is too fine

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <section id="proximidad" className="rounded-md bg-surface p-5 lg:col-span-7">
        <h2 className="t-heading">Proximidad</h2>
        <p className="t-small mt-0.5 text-muted">Distancias calculadas desde la señal Bluetooth</p>
        <svg viewBox={`0 0 ${W} ${HH}`} className="mt-3 block w-full" role="img" aria-label="Mapa de proximidad entre la tripulación" aria-describedby={listId}>
          <defs>
            <pattern id="grid" width={view.s} height={view.s} patternUnits="userSpaceOnUse" x={W / 2 - view.cx * view.s} y={H / 2 - view.cy * view.s}>
              <circle cx={0} cy={0} r={1} fill="#2C2C2E" />
            </pattern>
          </defs>
          {gridDots && <rect width={W} height={HH} fill="url(#grid)" />}
          {victim && pos[victim] && [2, 5, 10].map((m) => {
            const v = P(victim);
            return (
              <g key={m}>
                <circle cx={v.x} cy={v.y} r={m * view.s} fill="none" stroke="#38383A" strokeDasharray="4 4" />
                <text x={v.x + m * view.s * 0.7071 + 4} y={v.y - m * view.s * 0.7071} fontSize={11} fill="#8E8E93">{m} m</text>
              </g>
            );
          })}
          {ps.map((p) => {
            const a = P(p.a), b = P(p.b);
            const flow = victim && ((p.a === victim && responders.includes(p.b)) || (p.b === victim && responders.includes(p.a)));
            return (
              <g key={`${p.a}|${p.b}`}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={flow ? color.text : "#48484A"} strokeWidth={flow ? 2 : 1} />
                {flow && (
                  <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 + 4} textAnchor="middle" fontSize={11} fill={color.text} stroke={color.surface} strokeWidth={4} paintOrder="stroke">{meters(p.m)}</text>
                )}
              </g>
            );
          })}
          {crew.map((c) => {
            const id = c.member.id;
            const { x, y } = P(id);
            const isVictim = id === victim;
            const status = worstStatus(c.metrics);
            const rank = responders.indexOf(id);
            return (
              <g key={id} className="node-move" style={{ transform: `translate(${x}px, ${y}px)` }} opacity={c.online ? 1 : 0.5}>
                <circle r={19} fill="none" stroke={isVictim ? color.emergency : statusColor[status]} strokeWidth={isVictim ? 2.5 : 2} strokeDasharray={c.online ? undefined : "3 3"} />
                <circle r={15} fill={color.raised} />
                <text textAnchor="middle" y={5} fontSize={13} fontWeight={600} fill={color.text}>{initials(c.member.name)}</text>
                {rank >= 0 && (
                  <g transform="translate(14,-14)"><circle r={8} fill={color.text} /><text textAnchor="middle" y={4} fontSize={11} fontWeight={600} fill="#000">{rank + 1}</text></g>
                )}
                <g style={{ paintOrder: "stroke" }} stroke={color.surface} strokeWidth={4} strokeLinejoin="round">
                  <text textAnchor="middle" y={36} fontSize={13} fontWeight={600} fill={color.text}>{c.member.name}</text>
                  <text textAnchor="middle" y={50} fontSize={11} fill="#98989F">{isVictim ? "Víctima" : c.online ? STATUS_LABEL[status] : "Sin conexión"}</text>
                </g>
              </g>
            );
          })}
          <g transform={`translate(16, ${HH - 16})`}>
            <line x1={0} x2={2 * view.s} y1={0} y2={0} stroke="#98989F" />
            <line x1={0} x2={0} y1={-3} y2={3} stroke="#98989F" /><line x1={2 * view.s} x2={2 * view.s} y1={-3} y2={3} stroke="#98989F" />
            <text x={2 * view.s + 8} y={4} fontSize={11} fill="#98989F">2 m</text>
          </g>
        </svg>
        <p className="t-micro text-ink3">Solo las distancias son reales; la orientación es arbitraria y los nodos muy juntos se separan para leerse.</p>
      </section>

      <section className="lg:col-span-5">
        <h2 className="t-heading mb-2">Distancias</h2>
        {sorted.length ? (
          <LedgerList id={listId} label="Distancias entre tripulantes" inset={16}>
              {sorted.map((p) => (
                <LedgerRow
                  key={`${p.a}|${p.b}`}
                  title={<span className="t-small font-medium">{names.get(p.a)} ↔ {names.get(p.b)}</span>}
                  trailing={<><span className="t-body font-semibold">{meters(p.m)}</span><span className="t-micro block text-ink3">{p.rssi} dBm</span></>}
                />
              ))}
          </LedgerList>
        ) : (
          <EmptyState compact icon={Radio} title="Sin lecturas de señal" hint="Aparecen cuando dos móviles se detectan." />
        )}
      </section>
    </div>
  );
}
