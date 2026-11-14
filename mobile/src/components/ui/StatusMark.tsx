import { Text, View } from 'react-native';
import { color, font, radius, space } from '../../theme';

export type StatusTone = 'accent' | 'muted' | 'ok' | 'watch' | 'critical';

const INK: Record<StatusTone, string> = {
  accent: color.accent,
  muted: color.muted,
  ok: color.status.ok,
  watch: color.status.watch,
  critical: color.status.critical,
};

/** Estado como tick cuadrado + etiqueta en MAYÚSCULAS: color y texto a la vez. */
export function StatusMark({ label, tone = 'muted' }: { label: string; tone?: StatusTone }) {
  const ink = INK[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minWidth: 0 }} accessibilityLabel={label}>
      <View style={{ width: 7, height: 7, borderRadius: radius.sm / 3, backgroundColor: ink }} />
      <Text style={{ ...font('status', ink), textTransform: 'uppercase', flexShrink: 1 }} numberOfLines={1}>{label}</Text>
    </View>
  );
}
