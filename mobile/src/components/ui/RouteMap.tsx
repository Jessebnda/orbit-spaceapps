import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { color } from '../../theme';

// Same drawing as dashboard/components/activity/RouteMap.tsx, so an outing looks identical on the phone and the ship monitor.

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

const W = 600, H = 220;

/** Catmull-Rom through the points, as cubic beziers. */
const spline = (p: [number, number][]) =>
  p.reduce((d, _, i) => {
    if (i === 0) return `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
    const a = p[i - 2] ?? p[i - 1], b = p[i - 1], c = p[i], e = p[i + 1] ?? c;
    return `${d}C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)} ${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)} ${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
  }, '');

/** A drawn plan, not GPS: topographic contours plus a route whose visual length follows the kilometres. */
export function RouteMap({ seed, km, height = 150 }: { seed: string; km: number; height?: number }) {
  const r = rng(seed);
  const cx = 150 + r() * 300, cy = 60 + r() * 100;
  const contours = [1, 2, 3, 4, 5].map((k) => {
    const R = 22 * k + r() * 8, ph = r() * 6.28, f = 2 + Math.floor(r() * 3), amp = 0.1 + r() * 0.08;
    return Array.from({ length: 48 }, (_, i) => {
      const t = (i / 48) * 2 * Math.PI, rr = R * 1.9 * (1 + amp * Math.sin(f * t + ph));
      return `${i ? 'L' : 'M'}${(cx + rr * Math.cos(t)).toFixed(1)} ${(cy + rr * 0.7 * Math.sin(t)).toFixed(1)}`;
    }).join('') + 'Z';
  });
  const spread = Math.min(1, Math.max(0.35, km / 8));
  const route: [number, number][] = Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    return [60 + t * (W - 120) * spread + (r() - 0.5) * 40, H / 2 + Math.sin(t * Math.PI * (1.2 + r())) * 48 + (r() - 0.5) * 36];
  });
  const [s, e] = [route[0], route[6]];
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" accessibilityLabel={`Plano de la ruta, ${km.toFixed(1)} km`}>
      {contours.map((d, i) => <Path key={i} d={d} fill="none" stroke={color.raised} strokeWidth={1.5} />)}
      <Path d={spline(route)} fill="none" stroke={color.accent} strokeOpacity={0.25} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={spline(route)} fill="none" stroke={color.accent} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={s[0]} cy={s[1]} r={7} fill={color.accent} />
      <Circle cx={e[0]} cy={e[1]} r={7} fill={color.bg} stroke={color.accent} strokeWidth={3} />
      <Line x1={20} x2={70} y1={H - 20} y2={H - 20} stroke={color.faint} strokeWidth={2} />
      <SvgText x={80} y={H - 14} fontSize={18} fill={color.faint}>1 km</SvgText>
    </Svg>
  );
}
