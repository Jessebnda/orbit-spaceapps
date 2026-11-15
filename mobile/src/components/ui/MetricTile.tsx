import { Text, View } from 'react-native';
import { formatMetric, METRIC_META, statusOf, THRESHOLDS, type MetricKey } from '@orbit/shared';
import { color, figureFont, font, radius, STATUS_INK, STATUS_LABEL } from '../../theme';
import { Icon, type IconName } from './Icon';
import { Press } from './Press';
import { RangeDial } from './RangeDial';
import { useEcg } from '../../services/sensors/ecgStream';
import { EcgTrace } from './EcgTrace';
import { Sparkline } from './Sparkline';
import { StatusMark } from './StatusMark';

const SYMBOL: Partial<Record<MetricKey, IconName>> = { hr: 'heart.fill', spo2: 'drop.fill', bpSys: 'heart.text.square', temp: 'heart.text.square' };

/** Tarjeta de vital: etiqueta con símbolo, dial de 270° con el valor dentro, tendencia 24 h con banda normal y estado. Normal = quieto; solo lo anormal se tiñe. */
export function MetricTile({ metric, value, values, width, onPress }: {
  metric: MetricKey; value: number | undefined; values: number[]; large?: boolean; width: number; onPress: () => void;
}) {
  const meta = METRIC_META[metric], st = statusOf(metric, value);
  const abnormal = value != null && st !== 'ok';
  const ecg = useEcg(metric === 'hr'); // live chest ECG replaces the 24 h trend while it streams
  const ink = abnormal ? STATUS_INK[st] : color.text;
  const [wl, wh] = THRESHOLDS[metric].slice(1, 3) as [number, number];
  const dial = Math.min(96, width - 32);
  return (
    <Press card label={`${meta.label}, ${formatMetric(metric, value)}, ${value == null ? 'Sin datos' : STATUS_LABEL[st]}`} onPress={onPress} style={{ width, minHeight: 188, backgroundColor: color.surface, borderRadius: radius.card, borderCurve: 'continuous', padding: 16, gap: 8, borderWidth: st === 'critical' && value != null ? 1.5 : 0, borderColor: color.status.critical }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={SYMBOL[metric] ?? 'heart.text.square'} size={15} color={abnormal ? ink : color.muted} weight="semibold" />
        <Text style={{ ...font('caption', color.muted), flexShrink: 1 }} numberOfLines={1}>{meta.label}</Text>
      </View>
      <View style={{ alignItems: 'center' }}>
        <RangeDial metric={metric} value={value} size={dial}>
          <Text style={{ ...figureFont('figure', value == null ? color.faint : ink), fontSize: 28 }}>{value == null ? '—' : value.toFixed(meta.decimals)}</Text>
          <Text style={font('small', color.muted)}>{meta.unit}</Text>
        </RangeDial>
      </View>
      {ecg ? <EcgTrace values={ecg} width={width - 32} height={24} /> : values.length > 1 ? <Sparkline values={values} width={width - 32} height={24} tint={abnormal ? ink : color.muted} band={[wl, wh]} /> : null}
      {value == null ? <Text style={font('small', color.faint)}>Sin señal</Text> : <StatusMark label={STATUS_LABEL[st]} tone={st === 'ok' ? 'ok' : st} />}
    </Press>
  );
}
