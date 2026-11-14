import { useState } from 'react';
import { Modal, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { METRIC_META, formatMetric, statusOf, worstStatus, type MetricKey } from '@orbit/shared';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../../store/store';
import { color, font, radius, space, STATUS_LABEL } from '../../theme';
import { BodyMap, type BodyZone } from '../../components/ui/BodyMap';
import { FeedRow } from '../../components/ui/FeedRow';
import { FormSection } from '../../components/ui/FormSection';
import { MetricTile } from '../../components/ui/MetricTile';
import { Press } from '../../components/ui/Press';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { Sparkline } from '../../components/ui/Sparkline';
import { StatusMark } from '../../components/ui/StatusMark';

const ZONES: Record<BodyZone, { label: string; metrics: MetricKey[] }> = {
  head: { label: 'Cabeza', metrics: ['temp', 'sleep'] },
  chest: { label: 'Pecho', metrics: ['hr', 'resp', 'spo2'] },
  arm: { label: 'Brazos', metrics: ['bpSys', 'bpDia'] },
  legs: { label: 'Piernas', metrics: ['activity'] },
  stomach: { label: 'Abdomen', metrics: ['kcal', 'water'] },
};

/** Cómo se mide cada valor: la app lo dice para que el número no asuste sin contexto. */
const HOW: Record<MetricKey, string> = {
  hr: 'Banda: sensor óptico de muñeca, cada 2 s.',
  spo2: 'Banda: oxímetro óptico de muñeca.',
  temp: 'Banda: sensor de piel. No es la temperatura central.',
  bpSys: 'Manga: manguito de brazo, medición oscilométrica.',
  bpDia: 'Manga: manguito de brazo, medición oscilométrica.',
  resp: 'Chaleco: banda de deformación en el pecho.',
  activity: 'Chaleco: acelerómetro. Minutos de ejercicio acumulados hoy.',
  sleep: 'Banda: actigrafía, movimiento durante la noche.',
  kcal: 'Registro de comidas de la nave.',
  water: 'Registro de agua de la nave.',
};
const ACTION = {
  ok: 'Sin acción. Sigue tu rutina.',
  watch: 'Repite la medición en 30 minutos y anótalo en el check-in.',
  critical: 'Avisa ahora al capitán o al médico de vuelo.',
} as const;

const LEDGER: MetricKey[] = ['resp', 'sleep', 'activity', 'kcal', 'water'];
const VITALS: MetricKey[] = ['hr', 'spo2', 'bpSys', 'temp'];

export function TodayScreen() {
  const nav = useNavigation<{ navigate: (n: string) => void }>();
  const { metrics, history, missionStart } = useStore();
  const { width } = useWindowDimensions();
  const [zone, setZone] = useState<BodyZone | null>(null);
  const [metric, setMetric] = useState<MetricKey | null>(null);
  const day = Math.floor((Date.now() - missionStart) / 86_400_000) + 1;
  const overall = worstStatus(metrics);
  const tile = (width - space.lg * 2 - space.sm) / 2;
  const trend = (k: MetricKey) => history.map((h) => h.m[k]).filter((v): v is number => v != null);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: space['2xl'] }}>
      <ScreenHeader kicker={`Orbit · día ${day}`} title={STATUS_LABEL[overall]} subtitle={Object.keys(metrics).length ? 'Estado general de tus signos.' : 'Esperando datos de tus sensores.'} />
      <View style={{ paddingHorizontal: space.lg, gap: space.lg }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {VITALS.map((k) => (
            <MetricTile key={k} metric={k} value={metrics[k]} values={trend(k)} large width={tile} onPress={() => setMetric(k)} />
          ))}
        </View>

        <FormSection title="Resto de hoy">
          {LEDGER.map((k, i) => (
            <FeedRow
              key={k}
              title={METRIC_META[k].label}
              badge={STATUS_LABEL[statusOf(k, metrics[k])]}
              badgeTone={statusOf(k, metrics[k])}
              trailing={<Text style={font('body')}>{formatMetric(k, metrics[k])}</Text>}
              last={i === LEDGER.length - 1}
              onPress={() => setMetric(k)}
            />
          ))}
        </FormSection>

        <FormSection title="Zonas del cuerpo">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <BodyMap selected={zone} onSelect={setZone} width={120} />
            <View style={{ flex: 1, gap: space.sm }}>
              {(Object.keys(ZONES) as BodyZone[]).map((z) => (
                <Press key={z} label={`Zona ${ZONES[z].label}`} onPress={() => setZone(z)} style={{ paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.sm, backgroundColor: zone === z ? color.raised : 'transparent' }}>
                  <Text style={font('body')}>{ZONES[z].label}</Text>
                </Press>
              ))}
            </View>
          </View>
        </FormSection>

        <Press label="Hacer el check-in de hoy" onPress={() => nav.navigate('CheckIn')} style={{ backgroundColor: color.accent, borderRadius: radius.md, padding: space.md, alignItems: 'center' }}>
          <Text style={font('button', color.onAccent)}>Check-in de hoy</Text>
        </Press>
      </View>

      <Modal visible={zone !== null} transparent animationType="fade" onRequestClose={() => setZone(null)}>
        <Press label="Cerrar" haptic={false} onPress={() => setZone(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}><View /></Press>
        <View style={{ backgroundColor: color.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.lg, gap: space.sm }}>
          <Text style={font('caption', color.muted)}>Zona {zone ? ZONES[zone].label : ''}</Text>
          {zone && ZONES[zone].metrics.map((k, i, all) => (
            <FeedRow key={k} title={METRIC_META[k].label} badge={STATUS_LABEL[statusOf(k, metrics[k])]} badgeTone={statusOf(k, metrics[k])} trailing={<Text style={font('body')}>{formatMetric(k, metrics[k])}</Text>} last={i === all.length - 1} onPress={() => { setZone(null); setMetric(k); }} />
          ))}
        </View>
      </Modal>

      <Modal visible={metric !== null} animationType="slide" onRequestClose={() => setMetric(null)}>
        {metric && (
          <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: space['2xl'], gap: space.md }}>
            <Press label="Cerrar" onPress={() => setMetric(null)} style={{ alignSelf: 'flex-end', padding: space.sm }}><Text style={font('body', color.accent)}>Cerrar</Text></Press>
            <Text style={font('caption', color.muted)}>{METRIC_META[metric].label}</Text>
            <Text style={font('hero')}>{formatMetric(metric, metrics[metric])}</Text>
            <StatusMark label={STATUS_LABEL[statusOf(metric, metrics[metric])]} tone={statusOf(metric, metrics[metric])} />
            <Sparkline values={trend(metric)} width={width - space.lg * 2} height={96} />
            <Text style={font('small', color.muted)}>Últimas 24 h, una muestra por minuto.</Text>
            <Text style={font('section')}>Qué significa</Text>
            <Text style={font('body')}>{METRIC_META[metric].info}</Text>
            <Text style={font('section')}>Cómo se mide</Text>
            <Text style={font('body')}>{HOW[metric]}</Text>
            <Text style={font('section')}>Qué hacer</Text>
            <Text style={font('body')}>{ACTION[statusOf(metric, metrics[metric])]}</Text>
          </ScrollView>
        )}
      </Modal>
    </ScrollView>
  );
}
