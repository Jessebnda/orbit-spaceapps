import { View } from 'react-native';
import { rangeDial, statusOf, type MetricKey } from '@orbit/shared';
import { alpha, color, STATUS_INK } from '../../theme';

/** Linear twin of RangeDial: the lit band is the normal range, one dot is the measurement (status ink when out of range). */
export function RangeStrip({ metric, value }: { metric: MetricKey; value?: number }) {
  const d = rangeDial(metric, value);
  const st = statusOf(metric, value);
  return (
    <View style={{ height: 12, justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ height: 4, borderRadius: 2, backgroundColor: color.raised }} />
      <View style={{ position: 'absolute', height: 4, borderRadius: 2, left: `${d.normalLo * 100}%`, width: `${(d.normalHi - d.normalLo) * 100}%`, backgroundColor: alpha(color.muted, 0.55) }} />
      {d.value != null ? <View style={{ position: 'absolute', left: `${d.value * 100}%`, marginLeft: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: st === 'ok' ? color.text : STATUS_INK[st], borderWidth: 2, borderColor: color.bg }} /> : null}
    </View>
  );
}
