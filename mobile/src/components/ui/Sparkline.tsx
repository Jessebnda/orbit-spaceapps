import Svg, { Line, Polyline, Rect } from 'react-native-svg';
import { alpha, color } from '../../theme';

/** Straight samples over a normal band; no invented curve or score. */
export function Sparkline({ values, width, height, tint = color.accent, band }: { values: number[]; width: number; height: number; tint?: string; band?: [number, number] }) {
  const clean = values.filter(Number.isFinite);
  const lo = Math.min(...clean, band?.[0] ?? Infinity), hi = Math.max(...clean, band?.[1] ?? -Infinity);
  const span = hi - lo || 1;
  const y = (v: number) => height - 3 - ((v - lo) / span) * (height - 6);
  const points = clean.map((v, i) => `${3 + (i / Math.max(1, clean.length - 1)) * (width - 6)},${y(v)}`).join(' ');
  return <Svg width={width} height={height} accessible={false}>
    {clean.length > 1 && band && <Rect x={0} y={y(band[1])} width={width} height={Math.max(0, y(band[0]) - y(band[1]))} fill={alpha(color.status.ok, .12)} />}
    {clean.length < 2 ? <Line x1={0} x2={width} y1={height / 2} y2={height / 2} stroke={color.hairline} strokeDasharray="4 4" /> : <Polyline points={points} stroke={tint} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />}
  </Svg>;
}
