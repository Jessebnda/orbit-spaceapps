import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { color, font, radius, space } from '../../theme';

/** Grupo de ajustes: título fuera, panel de tono con filas separadas por divisores. */
export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text style={{ ...font('caption', color.muted), paddingHorizontal: space.xs }}>{title}</Text>
      <View style={{ backgroundColor: color.surface, borderRadius: radius.lg, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

/** Fila de SettingsGroup. Pasa `last` para quitar el divisor inferior. */
export function SettingsRow({ children, last }: { children: ReactNode; last?: boolean }) {
  return <View style={{ paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm, borderBottomWidth: last ? 0 : 1, borderBottomColor: color.hairline }}>{children}</View>;
}
