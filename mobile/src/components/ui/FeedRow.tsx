import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { color, font, space } from '../../theme';
import { Press } from './Press';
import { StatusMark, type StatusTone } from './StatusMark';

/** Fila de bitácora: sin caja, divisor de 1 px, StatusMark, título y meta a la derecha. */
export function FeedRow({ title, subtitle, badge, badgeTone = 'muted', trailing, last, onPress }: {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: StatusTone;
  trailing?: ReactNode;
  last?: boolean;
  onPress?: () => void;
}) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: space.md, borderBottomWidth: last ? 0 : 1, borderBottomColor: color.hairline }}>
      <View style={{ flex: 1, minWidth: 0, gap: space.sm }}>
        {badge ? <StatusMark label={badge} tone={badgeTone} /> : null}
        <Text style={font('body')} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={{ ...font('small', color.muted) }} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {trailing ? <View style={{ flexShrink: 0, alignItems: 'flex-end' }}>{trailing}</View> : null}
    </View>
  );
  return onPress ? <Press label={title} onPress={onPress}>{body}</Press> : body;
}
