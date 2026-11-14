import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { color, font, space } from '../../theme';

/** Formulario o ajustes sobre el fondo de la app. Nunca dentro de una card. */
export function FormSection({ title, hint, children }: { title?: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      {title ? <Text style={font('section')} accessibilityRole="header">{title}</Text> : null}
      {hint ? <Text style={font('small', color.muted)}>{hint}</Text> : null}
      <View style={{ gap: space.md }}>{children}</View>
    </View>
  );
}
