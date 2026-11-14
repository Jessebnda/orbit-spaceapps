import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { color, font, space } from '../../theme';

/** Estado vacío: icono gris, una frase y, si hay, la acción. */
export function EmptyState({ icon, title, hint }: { icon: ComponentProps<typeof Ionicons>['name']; title: string; hint?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space['2xl'], paddingHorizontal: space.xl, gap: space.sm }}>
      <Ionicons name={icon} size={28} color={color.muted} />
      <Text style={{ ...font('body'), textAlign: 'center' }}>{title}</Text>
      {hint ? <Text style={{ ...font('small', color.muted), textAlign: 'center' }}>{hint}</Text> : null}
    </View>
  );
}
