import { Text, View } from 'react-native';
import { formatMetric, METRIC_META, statusOf, type MetricKey } from '@orbit/shared';
import { color, font, radius, space, STATUS_LABEL } from '../../theme';
import { Press } from './Press';
import { Sparkline } from './Sparkline';
import { StatusMark } from './StatusMark';

/** Valor grande con unidad, estado en texto y tendencia de 24 h. `large` para los cuatro vitales principales. */
export function MetricTile({ metric, value, values, large = false, width, onPress }: {
  metric: MetricKey;
  value: number | undefined;
  values: number[];
  large?: boolean;
  width: number;
  onPress: () => void;
}) {
  const meta = METRIC_META[metric];
  const st = statusOf(metric, value);
  return (
    <Press label={`${meta.label}, ${formatMetric(metric, value)}, ${STATUS_LABEL[st]}`} onPress={onPress} haptic={false} style={{ width, backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, gap: space.xs }}>
      <Text style={font('caption', color.muted)}>{meta.label}</Text>
      <Text style={{ ...font(large ? 'figure' : 'title'), color: color.text }}>
        {value == null ? '—' : value.toFixed(meta.decimals)}
        <Text style={font('small', color.muted)}> {meta.unit}</Text>
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <StatusMark label={STATUS_LABEL[st]} tone={st} />
        <Sparkline values={values} width={Math.max(24, width / 3)} height={20} />
      </View>
    </Press>
  );
}
