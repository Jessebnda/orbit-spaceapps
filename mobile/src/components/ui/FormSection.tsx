import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { color, font, radius } from '../../theme';

/** Grupo inset de UITableView: cabecera 13 muted en sentence case, filas en caja `surface`, pie opcional. Las filas ponen su propio padding y divisor. */
export function FormSection({ title, hint, children }: { title?: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      {title ? <Text style={{ ...font('small', color.muted), paddingHorizontal: 16 }} accessibilityRole="header">{title}</Text> : null}
      <View style={{ backgroundColor: color.surface, borderRadius: radius.md + 2, borderCurve: 'continuous', overflow: 'hidden' }}>{children}</View>
      {hint ? <Text style={{ ...font('small', color.faint), paddingHorizontal: 16 }}>{hint}</Text> : null}
    </View>
  );
}

/** Tarjeta visual (Health): surface, radio 20 continuo, 16 de padding, sin borde ni sombra. */
export function Card({ children, pad = 16, style }: { children: ReactNode; pad?: number; style?: object }) {
  return <View style={[{ backgroundColor: color.surface, borderRadius: radius.card, borderCurve: 'continuous', padding: pad }, style]}>{children}</View>;
}

/** Título de sección fuera de tarjeta (20/600) con acción opcional a la derecha. */
export function Section({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text style={font('section')} accessibilityRole="header">{title}</Text>
        {action ? <Text style={font('body', color.accentText)} onPress={onAction} accessibilityRole="button">{action}</Text> : null}
      </View>
      {children}
    </View>
  );
}
