import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { color, font, space } from '../../theme';
import { Press } from './Press';
import { StatusMark, type StatusTone } from './StatusMark';

/** Fila de lista inset: 44 pt mínimo, icono líder opcional, estado al final (glifo + texto), chevron si navega, divisor con sangría. */
export function FeedRow({ icon, iconColor = color.muted, title, subtitle, badge, badgeTone = 'muted', trailing, last, onPress, hint }: {
  icon?: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: StatusTone;
  trailing?: ReactNode;
  last?: boolean;
  onPress?: () => void;
  hint?: string;
}) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 16, paddingVertical: 11, gap: space.md }}>
      {icon ? <View style={{ width: 28, alignItems: 'center' }}><Icon name={icon} size={22} color={iconColor} /></View> : null}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={font('body')} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={font('small', color.muted)} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {trailing ? <View style={{ flexShrink: 0, alignItems: 'flex-end' }}>{trailing}</View> : null}
      {badge ? <View style={{ flexShrink: 0 }}><StatusMark label={badge} tone={badgeTone} /></View> : null}
      {onPress ? <Icon name="chevron.right" size={13} color={color.faint} weight="semibold" /> : null}
      {last ? null : <View style={{ position: 'absolute', left: 16 + (icon ? 40 : 0), right: 0, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: color.hairline }} />}
    </View>
  );
  return onPress ? <Press label={title} hint={hint} row onPress={onPress}>{body}</Press> : body;
}
