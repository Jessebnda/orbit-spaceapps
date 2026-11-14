import { Text, View } from 'react-native';
import { color, font } from '../../theme';

/** Barras de 7 días: hoy en `accent`, el resto `raised`. `labels` bajo cada barra (L M X J V S D). */
export function Bars({ values, labels, height = 80, todayIndex = values.length - 1 }: { values: (number | undefined)[]; labels?: string[]; height?: number; todayIndex?: number }) {
  const max = Math.max(1e-9, ...values.map((v) => v ?? 0));
  return (
    <View style={{ gap: 6 }} accessible accessibilityLabel={`Barras de ${values.length} días`}>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        {values.map((v, i) => (
          <View key={i} style={{ flex: 1, height: Math.max(4, ((v ?? 0) / max) * height), borderRadius: 4, borderCurve: 'continuous', backgroundColor: i === todayIndex ? color.accent : color.raised }} />
        ))}
      </View>
      {labels ? (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {labels.map((l, i) => <Text key={i} style={{ ...font('small', color.faint), flex: 1, textAlign: 'center', fontSize: 11 }}>{l}</Text>)}
        </View>
      ) : null}
    </View>
  );
}

/** Últimos `n` días terminando hoy: claves locales y letra del día. */
export function lastDays(n: number, now = Date.now(), key: (ts: number) => string) {
  return Array.from({ length: n }, (_, i) => {
    const ts = now - (n - 1 - i) * 86_400_000;
    return { key: key(ts), label: ['D', 'L', 'M', 'X', 'J', 'V', 'S'][new Date(ts).getDay()]! };
  });
}
