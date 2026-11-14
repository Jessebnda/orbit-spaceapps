import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font } from '../../theme';
import { FormSection } from './FormSection';

/** Grupo de ajustes: el mismo grupo inset que FormSection. */
export function SettingsGroup({ title, hint, children }: { title?: string; hint?: string; children: ReactNode }) {
  return <FormSection title={title} hint={hint}>{children}</FormSection>;
}

const divider = <View style={{ position: 'absolute', left: 16, right: 0, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: color.hairline }} />;

/** Fila de grupo: 44 pt mínimo, 16 de padding, divisor con sangría. Pasa `last` para quitar el divisor. */
export function SettingsRow({ children, last }: { children: ReactNode; last?: boolean }) {
  return (
    <View style={{ minHeight: 44, paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
      {children}
      {last ? null : divider}
    </View>
  );
}

/** LabeledContent: etiqueta 17 a la izquierda (110), campo o valor a la derecha. Los TextInput van aquí, sin fondo propio. */
export function LabeledRow({ label, children, last }: { label: string; children: ReactNode; last?: boolean }) {
  return (
    <View style={{ minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={{ ...font('body'), width: 110 }}>{label}</Text>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>{children}</View>
      {last ? null : divider}
    </View>
  );
}
