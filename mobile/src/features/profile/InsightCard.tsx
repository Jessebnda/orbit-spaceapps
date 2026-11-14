import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { behaviorInsights } from '@orbit/shared';
import { daySummaries } from '../../domain/derive';
import { summarize } from '../../services/petBrain';
import { useStore } from '../../store/store';
import { color, font, space } from '../../theme';
import { FormSection } from '../../components/ui/FormSection';
import { StatusMark } from '../../components/ui/StatusMark';

/** Análisis de comportamiento: la lectura es de shared; aquí solo se arman los días desde el store. */
export function InsightCard() {
  const days = useStore((s) => s.days);
  const checkins = useStore((s) => s.checkins);
  const insights = useMemo(() => behaviorInsights(daySummaries(days, checkins)), [days, checkins]);
  const [summary, setSummary] = useState<string | null>(null);
  const key = insights.map((i) => i.id).join('|');

  // Summary is recomputed only when the set of findings changes, not on every sensor tick.
  useEffect(() => {
    if (!insights.length) return;
    let alive = true;
    void summarize(insights.map((i) => i.text)).then((s) => alive && setSummary(s));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <FormSection title="Análisis de la semana" hint="Calculado en el teléfono. Solo tú lo ves.">
      {insights.length === 0 ? (
        <Text style={font('small', color.muted)}>Aún no hay tendencias. Necesito al menos 5 días con datos.</Text>
      ) : (
        insights.map((i) => (
          <View key={i.id} style={{ gap: space.xs }}>
            <StatusMark label={i.tone === 'ok' ? 'Positivo' : 'Atención'} tone={i.tone} />
            <Text style={font('body')}>{i.text}</Text>
          </View>
        ))
      )}
      {summary ? <Text style={font('small', color.muted)}>{summary}</Text> : null}
    </FormSection>
  );
}
