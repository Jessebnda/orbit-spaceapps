import { Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { color, font, space } from '../../theme';

export type StatusTone = 'accent' | 'muted' | 'ok' | 'watch' | 'critical';

const INK: Record<StatusTone, string> = { accent: color.accent, muted: color.muted, ok: color.status.ok, watch: color.status.watch, critical: color.status.critical };
const SYMBOL: Record<StatusTone, IconName> = { accent: 'circle.fill', muted: 'circle', ok: 'checkmark.circle.fill', watch: 'exclamationmark.triangle.fill', critical: 'xmark.octagon.fill' };

/** Estado como SF Symbol + etiqueta: el color va con la forma. `compact`: solo glifo (la etiqueta queda en accessibilityLabel). */
export function StatusMark({ label, tone = 'muted', compact = false }: { label: string; tone?: StatusTone; compact?: boolean }) {
  const ink = INK[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, minWidth: 0 }} accessibilityLabel={label}>
      <Icon name={SYMBOL[tone]} size={tone === 'accent' || tone === 'muted' ? 9 : 14} color={ink} />
      {compact ? null : <Text style={{ ...font('small', ink), fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>{label}</Text>}
    </View>
  );
}
