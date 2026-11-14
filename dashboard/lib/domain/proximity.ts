import type { CrewSnapshot } from "@orbit/shared";

// shortcut: log-distance model with 1 m at -59 dBm and exponent 2.2; uncalibrated, calibrate in the real ship.
export const rssiToMeters = (rssi: number) => 10 ** ((-59 - rssi) / (10 * 2.2));

export interface Pair { a: string; b: string; rssi: number; m: number }
export type Pt = { x: number; y: number };

/** One pair per two members, keeping the strongest reading heard from either side. */
export function pairs(crew: CrewSnapshot[]): Pair[] {
  const ids = new Set(crew.map((c) => c.member.id));
  const best = new Map<string, Pair>();
  for (const c of crew)
    for (const p of c.peers) {
      if (!ids.has(p.crewId) || p.crewId === c.member.id) continue;
      const [a, b] = c.member.id < p.crewId ? [c.member.id, p.crewId] : [p.crewId, c.member.id];
      const k = `${a}|${b}`;
      const prev = best.get(k);
      if (!prev || p.rssi > prev.rssi) best.set(k, { a, b, rssi: p.rssi, m: rssiToMeters(p.rssi) });
    }
  return [...best.values()];
}

/** Stress majorization (weighted, 80 iterations): positions in metres whose distances match the readings. Pairs with no reading have weight 0. */
export function smacof(ids: string[], ps: Pair[], init: Record<string, Pt>, iters = 80): Record<string, Pt> {
  const pos: Record<string, Pt> = Object.fromEntries(ids.map((id) => [id, { ...init[id] }]));
  const adj = new Map<string, { o: string; d: number }[]>(ids.map((i) => [i, []]));
  for (const p of ps) {
    adj.get(p.a)?.push({ o: p.b, d: p.m });
    adj.get(p.b)?.push({ o: p.a, d: p.m });
  }
  for (let it = 0; it < iters; it++) {
    const next: Record<string, Pt> = {};
    for (const i of ids) {
      const nb = adj.get(i)!;
      if (!nb.length) { next[i] = pos[i]; continue; }
      let sx = 0, sy = 0;
      for (const { o, d } of nb) {
        const dx = pos[i].x - pos[o].x, dy = pos[i].y - pos[o].y;
        const len = Math.hypot(dx, dy) || 1e-6;
        sx += pos[o].x + (d * dx) / len;
        sy += pos[o].y + (d * dy) / len;
      }
      next[i] = { x: sx / nb.length, y: sy / nb.length };
    }
    for (const i of ids) pos[i] = next[i];
  }
  return pos;
}

/** Rotate/reflect/translate `cur` onto `prev` (shared ids) so the map does not flip between refreshes. */
export function procrustes(cur: Record<string, Pt>, prev: Record<string, Pt>): Record<string, Pt> {
  const ids = Object.keys(cur).filter((i) => prev[i]);
  if (ids.length < 2) return cur;
  const mean = (m: Record<string, Pt>) => ({ x: ids.reduce((s, i) => s + m[i].x, 0) / ids.length, y: ids.reduce((s, i) => s + m[i].y, 0) / ids.length });
  const cc = mean(cur), pc = mean(prev);
  const fit = (flip: number) => {
    let dot = 0, cross = 0;
    for (const i of ids) {
      const x = (cur[i].x - cc.x) * flip, y = cur[i].y - cc.y, u = prev[i].x - pc.x, v = prev[i].y - pc.y;
      dot += x * u + y * v;
      cross += x * v - y * u;
    }
    const th = Math.atan2(cross, dot), c = Math.cos(th), s = Math.sin(th);
    const map = (p: Pt): Pt => { const x = (p.x - cc.x) * flip, y = p.y - cc.y; return { x: pc.x + x * c - y * s, y: pc.y + x * s + y * c }; };
    const err = ids.reduce((e, i) => { const q = map(cur[i]); return e + (q.x - prev[i].x) ** 2 + (q.y - prev[i].y) ** 2; }, 0);
    return { map, err };
  };
  const a = fit(1), b = fit(-1);
  const best = a.err <= b.err ? a : b;
  return Object.fromEntries(Object.entries(cur).map(([i, p]) => [i, best.map(p)]));
}
