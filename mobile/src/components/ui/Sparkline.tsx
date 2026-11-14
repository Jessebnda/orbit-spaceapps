import Svg, { Polyline } from 'react-native-svg';
import { color } from '../../theme';

/** Trend line: 2 px, no fill, no markers, no axes. */
export function Sparkline({ values, width, height }: { values: number[]; width: number; height: number }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const span = Math.max(...values) - lo || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - 2 - ((v - lo) / span) * (height - 4)}`).join(' ');
  return (
    <Svg width={width} height={height}>
      <Polyline points={points} stroke={color.accent} strokeWidth={2} fill="none" />
    </Svg>
  );
}
