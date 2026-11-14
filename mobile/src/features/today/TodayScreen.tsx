import { useRef, useState } from 'react';
import { Modal, Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { METRIC_META, GOALS, THRESHOLDS, dayProgress, formatMetric, statusOf, worstStatus, type MetricKey } from '@orbit/shared';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../../store/store';
import { color, figureFont, font, radius, space, STATUS_LABEL } from '../../theme';
import { BodyMap, type BodyZone } from '../../components/ui/BodyMap';
import { FeedRow } from '../../components/ui/FeedRow';
import { FormSection } from '../../components/ui/FormSection';
import { MetricTile } from '../../components/ui/MetricTile';
import { Press } from '../../components/ui/Press';
import { SettingsRow } from '../../components/ui/SettingsGroup';
import { MetricTrend } from '../../components/ui/MetricTrend';
import { RangeDial } from '../../components/ui/RangeDial';
import { Ring } from '../../components/ui/Ring';
import { Card, Section } from '../../components/ui/FormSection';
import { dayKey } from '../../domain/derive';
import { Icon } from '../../components/ui/Icon';
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

const LEDGER: MetricKey[] = ['resp', 'sleep'];
const VITALS: MetricKey[] = ['hr', 'spo2', 'bpSys', 'temp'];

export function TodayScreen() {
  const nav = useNavigation<{ navigate: (n: string) => void }>();
  const { metrics, history, missionStart, dataSource, checkins } = useStore();
  const doneToday = checkins.length > 0 && dayKey(checkins[checkins.length - 1]!.ts) === dayKey(Date.now());
  const { width } = useWindowDimensions();
  const [zone, setZone] = useState<BodyZone | null>(null);
  const [metric, setMetric] = useState<MetricKey | null>(null);
  // iOS can't present a sheet while another modal is still dismissing (it shows black), so wait for onDismiss
  const next = useRef<MetricKey | null>(null);
  const openFromZone = (k: MetricKey) => {
    if (Platform.OS !== 'ios') { setZone(null); setMetric(k); return; } // onDismiss is iOS-only
    next.current = k;
    setZone(null);
  };
  const day = Math.floor((Date.now() - missionStart) / 86_400_000) + 1;
  const overall = worstStatus(metrics);
  const tile = (width - 32 - space.sm) / 2;
  const trend = (k: MetricKey) => history.map((h) => h.m[k]).filter((v): v is number => v != null);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: space['2xl'] }}>
      <Text style={[font('small', color.muted), { paddingHorizontal: 16, paddingVertical: 12 }]}>Día {day} · {Object.keys(metrics).length ? 'Resumen de hoy' : 'Esperando tus sensores'}</Text>
      <View style={{ paddingHorizontal: 16, gap: 24 }}>
        {doneToday ? (
          <StatusMark label={`Check-in enviado a las ${new Date(checkins[checkins.length - 1]!.ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`} tone="ok" />
        ) : (
          <Press card label="Check-in de hoy" hint="Abre el formulario" onPress={() => nav.navigate('CheckIn')} style={{ backgroundColor: color.surface, borderRadius: radius.card, borderCurve: 'continuous', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="square.and.pencil" size={24} color={color.accent} />
            <View style={{ flex: 1 }}>
              <Text style={font('button')}>Check-in de hoy</Text>
              <Text style={font('small', color.muted)}>¿Cómo estás? Tarda un minuto.</Text>
            </View>
            <Icon name="chevron.right" size={13} color={color.faint} weight="semibold" />
          </Press>
        )}
        {dataSource === 'sim' && <Text style={font('small', color.muted)}>Simulación · datos de demostración</Text>}
        {Object.keys(metrics).length ? overall === 'ok' ? <Text style={font('body', color.muted)}>Tus signos están dentro de rango.</Text> : <StatusMark label={STATUS_LABEL[overall]} tone={overall} /> : <Text style={font('body', color.muted)}>Conecta tus sensores para ver tus signos.</Text>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {VITALS.map((k) => (
            <MetricTile key={k} metric={k} value={metrics[k]} values={trend(k)} large width={tile} onPress={() => setMetric(k)} />
          ))}
        </View>

        <Section title="Tus objetivos de hoy">
          <Card style={{ flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap', gap: 16 }}>
            {(['activity', 'kcal', 'water'] as MetricKey[]).map((k) => <Press key={k} label={`${METRIC_META[k].label}, ${formatMetric(k, metrics[k])}`} onPress={() => setMetric(k)} style={{ alignItems: 'center', gap: 8 }}>
              <Ring size={72} stroke={9} value={(metrics[k] ?? 0) / GOALS[k]!} mark={(THRESHOLDS[k][1] * dayProgress(Date.now())) / GOALS[k]!} tint={statusOf(k, metrics[k]) === 'ok' ? color.accent : color.status[statusOf(k, metrics[k])]}><Text style={figureFont('small')}>{metrics[k] == null ? '—' : Math.round((metrics[k]! / GOALS[k]!) * 100)}{metrics[k] != null ? '%' : ''}</Text></Ring>
              <Text style={font('caption')}>{METRIC_META[k].label}</Text>
              <Text style={font('small', color.muted)}>{formatMetric(k, metrics[k])}</Text>
            </Press>)}
          </Card>
          <Text style={font('small', color.muted)}>La marca blanca es el avance esperado a esta hora. Metas: 120 min · 2400 kcal · 2.5 L</Text>
        </Section>

        <FormSection title="Más métricas">
          {LEDGER.map((k, i) => (
            <FeedRow
              key={k}
              title={METRIC_META[k].label}
              badge={metrics[k] != null && statusOf(k, metrics[k]) !== 'ok' ? STATUS_LABEL[statusOf(k, metrics[k])] : undefined}
              badgeTone={statusOf(k, metrics[k])}
              trailing={<Text style={font('body')}>{formatMetric(k, metrics[k])}</Text>}
              last={i === LEDGER.length - 1}
              onPress={() => setMetric(k)}
            />
          ))}
        </FormSection>

        <FormSection title="Zonas del cuerpo">
          <SettingsRow last>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
              <BodyMap selected={zone} onSelect={setZone} width={120} />
              <View style={{ flex: 1, gap: space.sm }}>
                {(Object.keys(ZONES) as BodyZone[]).map((z) => (
                  <Press key={z} label={`Zona ${ZONES[z].label}`} onPress={() => setZone(z)} style={{ paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.sm, borderCurve: 'continuous', backgroundColor: zone === z ? color.raised : 'transparent' }}>
                    <Text style={font('body')}>{ZONES[z].label}</Text>
                  </Press>
                ))}
              </View>
            </View>
          </SettingsRow>
        </FormSection>

      </View>

      <Modal visible={zone !== null} transparent animationType="fade" onRequestClose={() => setZone(null)} onDismiss={() => { if (next.current) { setMetric(next.current); next.current = null; } }}>
        <Press label="Cerrar" haptic="none" onPress={() => setZone(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}><View /></Press>
        <View style={{ backgroundColor: color.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderCurve: 'continuous', padding: space.lg, gap: space.sm }}>
          <Text style={font('caption', color.muted)}>Zona {zone ? ZONES[zone].label : ''}</Text>
          {zone && ZONES[zone].metrics.map((k, i, all) => (
            <FeedRow key={k} title={METRIC_META[k].label} badge={metrics[k] != null && statusOf(k, metrics[k]) !== 'ok' ? STATUS_LABEL[statusOf(k, metrics[k])] : undefined} badgeTone={statusOf(k, metrics[k])} trailing={<Text style={font('body')}>{formatMetric(k, metrics[k])}</Text>} last={i === all.length - 1} onPress={() => openFromZone(k)} />
          ))}
        </View>
      </Modal>

      <Modal visible={metric !== null} presentationStyle="pageSheet" animationType="slide" onRequestClose={() => setMetric(null)}>
        {metric && (
          <ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: 40, gap: 20 }}>
            <Press label="Cerrar" onPress={() => setMetric(null)} style={{ alignSelf: 'flex-end', padding: space.sm }}><Text style={font('body', color.accentText)}>Cerrar</Text></Press>
            <Text style={font('caption', color.muted)}>{METRIC_META[metric].label}</Text>
            <Text style={font('display')}>{formatMetric(metric, metrics[metric])}</Text>
            {!GOALS[metric] && <View style={{ alignItems: 'center' }}><RangeDial metric={metric} value={metrics[metric]} size={180} /></View>}
            <StatusMark label={STATUS_LABEL[statusOf(metric, metrics[metric])]} tone={statusOf(metric, metrics[metric]) === 'ok' ? 'muted' : statusOf(metric, metrics[metric])} />
            <MetricTrend metric={metric} history={history} width={width - 32} />
            <Text style={font('small', color.muted)}>Muestras guardadas durante las últimas 24 h.</Text>
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
