import Svg, { Polyline } from 'react-native-svg';
import { color } from '../../theme';

/** Filtered ECG as it arrives: ADC-derived units, not bpm, so the y axis is auto-scaled with no labels. */
export function EcgTrace({ values, width, height, tint = color.status.critical }: { values: number[]; width: number; height: number; tint?: string }) {
  const lo = Math.min(...values), hi = Math.max(...values);
  const span = hi - lo || 1;
  const step = (width - 4) / Math.max(1, values.length - 1);
  const points = values.map((v, i) => `${2 + i * step},${height - 2 - ((v - lo) / span) * (height - 4)}`).join(' ');
  return <Svg width={width} height={height} accessible={false}>
    <Polyline points={points} stroke={tint} strokeWidth={1.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
  </Svg>;
}
