import { Text, View } from 'react-native';
import { formatMetric, METRIC_META, rangeDial, statusOf, THRESHOLDS, type MetricKey } from '@orbit/shared';
import { color, figureFont, font, radius, STATUS_INK, STATUS_LABEL } from '../../theme';
import { Press } from './Press';
import { Sparkline } from './Sparkline';
import { StatusMark } from './StatusMark';

/** A reading first, its history second. Normal readings remain visually quiet. */
export function MetricTile({ metric, value, values, width, onPress }: {
  metric: MetricKey; value: number | undefined; values: number[]; large?: boolean; width: number; onPress: () => void;
}) {
  const meta = METRIC_META[metric], st = statusOf(metric, value);
  const abnormal = value != null && st !== 'ok';
  const ink = abnormal ? STATUS_INK[st] : color.text;
  const range = rangeDial(metric, value);
  const [low, high] = THRESHOLDS[metric].slice(1, 3);
  return <Press card label={`${meta.label}, ${formatMetric(metric, value)}, ${value == null ? 'Sin datos' : STATUS_LABEL[st]}`} onPress={onPress} style={{ width, minHeight: 160, backgroundColor: color.surface, borderRadius: radius.card, borderCurve: 'continuous', padding: 16, gap: 12 }}>
    <Text style={font('caption', color.muted)}>{meta.label}</Text>
    <Text style={figureFont('figure', ink)}>{value == null ? '—' : value.toFixed(meta.decimals)}<Text style={font('small', color.muted)}> {meta.unit}</Text></Text>
    {values.length > 1 ? <Sparkline values={values} width={Math.max(24, width - 32)} height={28} tint={abnormal ? ink : color.muted} /> : <View style={{ height: 28, justifyContent: 'center' }}>
      <View style={{ height: 3, backgroundColor: color.raised, borderRadius: 2 }}>
        <View style={{ position: 'absolute', left: `${range.normalLo * 100}%`, width: `${(range.normalHi - range.normalLo) * 100}%`, height: 3, backgroundColor: color.muted, opacity: .5 }} />
        {range.value != null && <View style={{ position: 'absolute', left: `${range.value * 100}%`, top: -3, marginLeft: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: ink }} />}
      </View>
    </View>}
    {value == null ? <Text style={font('small', color.muted)}>Sin datos</Text> : abnormal ? <StatusMark label={STATUS_LABEL[st]} tone={st} /> : <Text style={font('small', color.muted)}>Ref. {low}–{metric === 'spo2' ? 100 : high}</Text>}
  </Press>;
}
