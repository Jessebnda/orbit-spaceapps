import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { color, font, space } from '../../theme';

/** Cabecera de tab: kicker, título y subtítulo útil. Misma geometría en todas las pestañas. */
export function ScreenHeader({ kicker, title, subtitle, right }: { kicker: string; title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md, paddingTop: space.sm, paddingHorizontal: space.lg, paddingBottom: space.md }}>
      <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
        <Text style={{ ...font('caption', color.accent), textTransform: 'uppercase' }}>{kicker}</Text>
        <Text style={font('title')}>{title}</Text>
        {subtitle ? <Text style={font('small', color.muted)}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}
