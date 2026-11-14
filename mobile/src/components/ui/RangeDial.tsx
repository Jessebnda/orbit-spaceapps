import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { arcPath, rangeDial, statusOf, type MetricKey } from '@orbit/shared';
import { color, STATUS_INK } from '../../theme';

/** 270-degree instrument: the arc shows the normal range, a single dot shows the measurement. */
export function RangeDial({ metric, value, size = 96, children }: { metric: MetricKey; value?: number; size?: number; children?: ReactNode }) {
  const dial = rangeDial(metric, value);
  const state = statusOf(metric, value);
  const ink = value == null ? color.muted : state === 'ok' ? color.text : STATUS_INK[state];
  const angle = (135 + (dial.value ?? 0) * 270) * Math.PI / 180;
  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
      <Path d={arcPath(0, 1)} stroke={color.raised} strokeWidth={4} fill="none" strokeLinecap="round" />
      <Path d={arcPath(dial.normalLo, dial.normalHi)} stroke={color.muted} strokeOpacity={.55} strokeWidth={4} fill="none" strokeLinecap="round" />
      {dial.value != null && <Circle cx={50 + 43 * Math.cos(angle)} cy={50 + 43 * Math.sin(angle)} r={4} fill={ink} stroke={color.surface} strokeWidth={2} />}
    </Svg>
    {children}
  </View>;
}
