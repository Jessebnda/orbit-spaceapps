/** Deterministic PRNG so the same outing always draws the same plan. */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const W = 600, H = 168;

/** Catmull-Rom through the points, as cubic beziers. */
const spline = (p: [number, number][]) =>
  p.reduce((d, _, i) => {
    if (i === 0) return `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
    const a = p[i - 2] ?? p[i - 1], b = p[i - 1], c = p[i], e = p[i + 1] ?? c;
    return `${d}C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)} ${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)} ${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
  }, "");

/** A drawn plan, not GPS: topographic contours plus a route whose visual length follows the kilometres. */
export function RouteMap({ seed, km }: { seed: string; km: number }) {
  const r = rng(seed);
  const cx = 150 + r() * 300, cy = 50 + r() * 70;
  const contours = [1, 2, 3, 4].map((k) => {
    const R = 22 * k + r() * 8, ph = r() * 6.28, f = 2 + Math.floor(r() * 3), amp = 0.1 + r() * 0.08;
    const pts = Array.from({ length: 48 }, (_, i) => {
      const t = (i / 48) * 2 * Math.PI, rr = R * 1.9 * (1 + amp * Math.sin(f * t + ph));
      return `${i ? "L" : "M"}${(cx + rr * Math.cos(t)).toFixed(1)} ${(cy + rr * 0.7 * Math.sin(t)).toFixed(1)}`;
    });
    return pts.join("") + "Z";
  });
  const spread = Math.min(1, Math.max(0.35, km / 8));
  const route: [number, number][] = Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    return [60 + t * (W - 120) * spread + (r() - 0.5) * 40, H / 2 + Math.sin(t * Math.PI * (1.2 + r())) * 38 + (r() - 0.5) * 30];
  });
  const [s, e] = [route[0], route[6]];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-lg" style={{ background: "#0F0F10" }} role="img" aria-label={`Plano simulado de la ruta de ${km.toFixed(1)} km`} preserveAspectRatio="xMidYMid slice">
      {contours.map((d, i) => <path key={i} d={d} fill="none" stroke="#2C2C2E" strokeWidth={1} />)}
      <path d={spline(route)} fill="none" stroke="var(--t-accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={s[0]} cy={s[1]} r={3.5} fill="#fff" />
      <circle cx={e[0]} cy={e[1]} r={3.5} fill="none" stroke="#fff" strokeWidth={1.5} />
      <g transform={`translate(14 ${H - 14})`}><line x1={0} x2={40} stroke="#98989F" /><text x={48} y={4} fontSize={11} fill="#98989F">1 km</text></g>
    </svg>
  );
}
