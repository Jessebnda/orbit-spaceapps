import { Text, View } from 'react-native';
import { formatMetric, METRIC_META, rangeDial, statusOf, THRESHOLDS, type MetricKey } from '@orbit/shared';
import { color, figureFont, font, radius, STATUS_INK, STATUS_LABEL } from '../../theme';
import { Press } from './Press';
import { useEcg } from '../../services/sensors/ecgStream';
import { EcgTrace } from './EcgTrace';
import { Sparkline } from './Sparkline';
import { StatusMark } from './StatusMark';

/** Reading first, history second. Only readings outside the reference range use status colour. */
export function MetricTile({ metric, value, values, width, onPress }: {
  metric: MetricKey; value: number | undefined; values: number[]; large?: boolean; width: number; onPress: () => void;
}) {
  const meta = METRIC_META[metric], st = statusOf(metric, value);
  const abnormal = value != null && st !== 'ok';
  const ecg = useEcg(metric === 'hr'); // live chest ECG replaces the 24 h trend while it streams
  const ink = abnormal ? STATUS_INK[st] : color.text;
  const range = rangeDial(metric, value);
  const [low, high] = THRESHOLDS[metric].slice(1, 3);
  return <Press card label={`${meta.label}, ${formatMetric(metric, value)}, ${value == null ? 'Sin datos' : STATUS_LABEL[st]}`} onPress={onPress} style={{ width, minHeight: 156, backgroundColor: color.surface, borderRadius: radius.card, borderCurve: 'continuous', padding: 16, gap: 12 }}>
    <Text style={font('caption', color.muted)}>{meta.label}</Text>
    <Text style={figureFont('figure', value == null ? color.muted : ink)}>{value == null ? '—' : value.toFixed(meta.decimals)}<Text style={font('small', color.muted)}> {meta.unit}</Text></Text>
    {ecg ? <EcgTrace values={ecg} width={Math.max(24, width - 32)} height={24} /> : values.length > 1 ? <Sparkline values={values} width={Math.max(24, width - 32)} height={24} tint={abnormal ? ink : color.muted} /> : <View style={{ height: 24, justifyContent: 'center' }}>
      <View style={{ height: 3, backgroundColor: color.raised, borderRadius: 2 }}>
        <View style={{ position: 'absolute', left: `${range.normalLo * 100}%`, width: `${(range.normalHi - range.normalLo) * 100}%`, height: 3, backgroundColor: color.muted, opacity: .5 }} />
        {range.value != null && <View style={{ position: 'absolute', left: `${range.value * 100}%`, top: -3, marginLeft: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: ink }} />}
      </View>
    </View>}
    {value == null ? <Text style={font('small', color.muted)}>Sin señal</Text> : abnormal ? <StatusMark label={STATUS_LABEL[st]} tone={st} /> : <Text style={font('small', color.muted)}>Ref. {low}–{metric === 'spo2' ? 100 : high}</Text>}
  </Press>;
}
