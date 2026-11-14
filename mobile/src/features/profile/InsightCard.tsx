import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { behaviorInsights, type DaySummary } from '@orbit/shared';
import { daySummaries } from '../../domain/derive';
import { summarize } from '../../services/petBrain';
import { useStore } from '../../store/store';
import { color, font, radius } from '../../theme';
import { Bars } from '../../components/ui/Bars';
import { Icon } from '../../components/ui/Icon';
import { Section } from '../../components/ui/FormSection';

const SERIES: Record<string, { key: keyof DaySummary; label: string }> = {
  sleep_drop: { key: 'sleep', label: 'Sueño · últimos 7 días' },
  sleep_mood: { key: 'mood', label: 'Ánimo · últimos 7 días' },
  mood_drop: { key: 'mood', label: 'Ánimo · últimos 7 días' },
  social_drop: { key: 'commsMin', label: 'Conversación · últimos 7 días' },
  escape: { key: 'gameMin', label: 'Juego · últimos 7 días' },
  move_stress: { key: 'activity', label: 'Actividad · últimos 7 días' },
};

/** Aspectos destacados: tarjetas horizontales con la frase y la gráfica de 7 días que la sostiene. Se calcula en el teléfono. */
export function InsightCard() {
  const days = useStore((s) => s.days);
  const checkins = useStore((s) => s.checkins);
  const sums = useMemo(() => daySummaries(days, checkins), [days, checkins]);
  const insights = useMemo(() => behaviorInsights(sums), [sums]);
  const [summary, setSummary] = useState<string | null>(null);
  const key = insights.map((i) => i.id).join('|');

  // El resumen se recalcula solo cuando cambia el conjunto de hallazgos, no en cada lectura del sensor.
  useEffect(() => {
    if (!insights.length) return;
    let alive = true;
    void summarize(insights.map((i) => i.text)).then((s) => alive && setSummary(s));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const last7 = sums.slice(-7);
  return (
    <Section title="Aspectos destacados">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={296} decelerationRate="fast" contentContainerStyle={{ gap: 16, paddingRight: 16 }} style={{ marginHorizontal: -16, paddingLeft: 16 }}>
        {insights.length === 0 ? (
          <View style={{ width: 280, minHeight: 168, backgroundColor: color.surface, borderRadius: radius.card, borderCurve: 'continuous', padding: 16, gap: 8, justifyContent: 'center' }}>
            <Text style={font('button')}>Aún reuniendo datos</Text>
            <Text style={font('small', color.muted)}>{sums.length} de 5 días. Con 5 días con datos aparecen las tendencias.</Text>
          </View>
        ) : (
          insights.map((i) => {
            const s = SERIES[i.id];
            return (
              <View key={i.id} style={{ width: 280, minHeight: 168, backgroundColor: color.surface, borderRadius: radius.card, borderCurve: 'continuous', padding: 16, gap: 10, justifyContent: 'space-between' }}>
                <Text style={font('button')} numberOfLines={3}>{i.text}</Text>
                <View style={{ gap: 6 }}>
                  {s ? <Bars values={last7.map((d) => d[s.key] as number | undefined)} height={48} /> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name={i.tone === 'ok' ? 'checkmark.circle.fill' : 'exclamationmark.triangle.fill'} size={13} color={color.status[i.tone]} />
                    <Text style={font('small', color.muted)} numberOfLines={1}>{s?.label ?? ''}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      {summary ? <Text style={font('small', color.muted)}>{summary}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name="lock.fill" size={11} color={color.faint} />
        <Text style={{ ...font('small', color.faint), fontSize: 11 }}>Calculado en el teléfono. Solo tú lo ves.</Text>
      </View>
    </Section>
  );
}
