import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTabInset } from '../../theme/useTabInset';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { PROTOCOL_KIND_LABEL, type Protocol, type ProtocolKind } from '@orbit/shared';
import { send, sendStat } from '../../services/hub';
import { useStore } from '../../store/store';
import { color, figureFont, font, radius, space } from '../../theme';
import { Card, FormSection } from '../../components/ui/FormSection';
import { EmptyState } from '../../components/ui/EmptyState';
import { FeedRow } from '../../components/ui/FeedRow';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Press } from '../../components/ui/Press';
import { Ring } from '../../components/ui/Ring';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { StatusMark } from '../../components/ui/StatusMark';
import { CprGuide } from '../emergency/CprGuide';
import { Breathing } from './Breathing';
import { JumpingJacks } from './JumpingJacks';
import { Reaction } from './Reaction';
import { dayKey } from '../../domain/derive';

const KINDS: ProtocolKind[] = ['emergency', 'physical', 'mental'];
const TONE = { emergency: 'critical', physical: 'accent', mental: 'muted' } as const;
const KIND_ICON: Record<ProtocolKind, { name: IconName; ink: string }> = {
  emergency: { name: 'cross.case.fill', ink: color.status.critical },
  physical: { name: 'figure.run', ink: color.accent },
  mental: { name: 'brain.head.profile', ink: color.muted },
};
type Nav = { navigate: (n: string, p?: object) => void; goBack: () => void };

const DRILL: Protocol = { id: 'drill-cpr', kind: 'emergency', title: 'Simulacro de RCP', reason: 'Práctica sin emergencia real.', steps: ['Llama al AED', 'Compresiones a 110/min', 'Ventilaciones cada 30'], createdBy: 'captain', guide: 'cpr' };
/** Daily training, local to the phone: done is stored per day as `<id>@<day>`, so each one comes back tomorrow. */
const DAILY: Record<string, Protocol & { icon: IconName }> = {
  'daily-physical': { id: 'daily-physical', icon: 'figure.run', kind: 'physical', title: 'Prueba física: 5 saltos', reason: 'La IMU del pecho (esp sensores) cuenta los saltos.', guide: 'jumping_jacks', createdBy: 'rules', steps: ['Ponte el chaleco (esp sensores, en el pecho) y ajusta las correas.', 'Pulsa Empezar y quédate quieto un segundo.', 'Haz 5 saltos en el mismo lugar, con las manos quietas en la cintura (la banda de la mano casi no debe moverse).'] },
  'daily-mental': { id: 'daily-mental', icon: 'brain.head.profile', kind: 'mental', title: 'Prueba mental: reacción', reason: 'Cinco intentos de tiempo de reacción, como la prueba de vigilancia de NASA.', guide: 'reaction', createdBy: 'rules', steps: ['Busca un lugar sin distracciones.', 'Haz los 5 intentos: toca en cuanto se ponga verde.'] },
  drill: { ...DRILL, icon: 'heart.text.square' },
};
const todayId = (id: string) => `${id}@${dayKey(Date.now())}`;

/** Protocolos de la nave por tipo. Detalle = push nativo. */
export function ProtocolsScreen() {
  const nav = useNavigation<Nav>();
  const { protocols, done, checked } = useStore();
  const [kind, setKind] = useState<ProtocolKind>('emergency');
  const pending = protocols.filter((p) => !done.includes(p.id));
  const urgent = pending.find((p) => p.kind === 'emergency') ?? pending[0];
  const list = protocols.filter((p) => p.kind === kind && p !== urgent);
  const open = (id: string) => nav.navigate('ProtocolDetail', { id });
  const critical = pending.filter((p) => p.kind === 'emergency').length;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ paddingHorizontal: 16, gap: 24 }}>
        <Text style={font('body', color.muted)}>{pending.length ? `${pending.length} pendiente${pending.length > 1 ? 's' : ''}${critical ? ` · ${critical} crítico${critical > 1 ? 's' : ''}` : ''}` : 'Todo al día'}</Text>

        {urgent ? (
          <Card pad={16} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <StatusMark label={PROTOCOL_KIND_LABEL[urgent.kind]} tone={TONE[urgent.kind]} />
                <Text style={font('title')}>{urgent.title}</Text>
                {urgent.reason ? <Text style={{ ...font('body', color.muted), fontSize: 15 }}>{urgent.reason}</Text> : null}
              </View>
              <Ring size={56} stroke={6} value={urgent.steps.length ? (checked[urgent.id]?.length ?? 0) / urgent.steps.length : 0} tint={color.accent}>
                <Text style={figureFont('small')}>{checked[urgent.id]?.length ?? 0}/{urgent.steps.length}</Text>
              </Ring>
            </View>
            <Press label={`Empezar ${urgent.title}`} onPress={() => open(urgent.id)} haptic="light" style={{ height: 44, borderRadius: radius.lg - 2, borderCurve: 'continuous', backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={font('button', color.onAccent)}>Empezar</Text>
            </Press>
          </Card>
        ) : null}

        <FormSection title="Entrenamiento de hoy" hint="Se renueva cada día.">
          {Object.entries(DAILY).map(([id, d], i, all) => (
            <FeedRow key={id} icon={d.icon} iconColor={done.includes(todayId(id)) ? color.status.ok : color.accent} title={d.title} badge={done.includes(todayId(id)) ? 'Hecho' : undefined} badgeTone="ok" last={i === all.length - 1} onPress={() => open(id)} />
          ))}
        </FormSection>

        <SegmentedTabs tabs={KINDS.map((k) => ({ key: k, label: PROTOCOL_KIND_LABEL[k] }))} active={kind} onChange={setKind} />

        {list.length === 0 ? (
          // Quiet one-liner: a big centred empty state here contradicted the pending card just above it.
          <Text style={[font('body', color.muted), { paddingHorizontal: 16 }]}>{urgent?.kind === kind ? 'Nada más pendiente en esta categoría.' : `Sin protocolos de ${PROTOCOL_KIND_LABEL[kind].toLowerCase()} por ahora.`}</Text>
        ) : (
          <FormSection>
            {list.map((p, i) => (
              <FeedRow
                key={p.id}
                icon={KIND_ICON[p.kind].name}
                iconColor={done.includes(p.id) ? color.status.ok : KIND_ICON[p.kind].ink}
                title={p.title}
                subtitle={p.reason}
                trailing={p.durationMin ? <Text style={font('body', color.muted)}>{p.durationMin} min</Text> : undefined}
                badge={done.includes(p.id) ? 'Hecho' : undefined}
                badgeTone="ok"
                last={i === list.length - 1}
                onPress={() => open(p.id)}
              />
            ))}
          </FormSection>
        )}

      </View>
    </ScrollView>
  );
}

const NONE: number[] = []; // stable fallback: a fresh [] per render makes zustand v5 loop (Maximum update depth)
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Detalle (push nativo): pasos con casilla, anillo de progreso, temporizador, guía y barra de acción fija. */
export function ProtocolDetailScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<{ key: string; name: string; params: { id: string } }>();
  const tabBar = useTabInset(); // iOS native tab bar overlays this pushed screen; Android's does not
  const [footer, setFooter] = useState(110);
  const drill = params.id === 'drill';
  const daily = DAILY[params.id];
  const stored = useStore((s) => s.protocols.find((x) => x.id === params.id));
  const p = daily ?? stored;
  const checked = useStore((s) => s.checked[params.id] ?? NONE);
  const [secs, setSecs] = useState((p?.durationMin ?? 0) * 60);
  const [timer, setTimer] = useState(false);
  // Tabs keep their screens mounted: leaving must stop the countdown and unmount the guides, or they keep vibrating in the background.
  const focused = useIsFocused();
  useEffect(() => { if (!focused) setTimer(false); }, [focused]);
  const total = (p?.durationMin ?? 0) * 60;
  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [timer]);
  const wasRunning = useRef(false);
  useEffect(() => {
    if (timer && secs === 0 && !wasRunning.current) {
      wasRunning.current = true;
      setTimer(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [secs, timer]);

  if (!p) return <EmptyState icon="checkmark.seal" title="Protocolo no disponible" />;
  const missing = p.steps.length - checked.length;
  const toggle = (i: number) => useStore.getState().setChecked(p.id, checked.includes(i) ? checked.filter((x) => x !== i) : [...checked, i]);
  const finish = () => {
    if (daily) {
      if (drill) useStore.getState().addStat('cprDrills', 1);
      useStore.getState().markDone(todayId(params.id));
      sendStat({ type: 'protocol_done', protocolId: todayId(params.id) });
      useStore.getState().showToast(drill ? 'Simulacro registrado' : 'Prueba de hoy registrada');
    } else {
      useStore.getState().markDone(p.id);
      send({ t: 'protocol_ack', crewId: useStore.getState().profile.crewId, protocolId: p.id });
      sendStat({ type: 'protocol_done', protocolId: p.id });
      useStore.getState().showToast('Protocolo enviado al capitán');
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    nav.goBack();
  };
  const current = p.steps.findIndex((_, i) => !checked.includes(i));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, paddingBottom: tabBar + footer + 24, gap: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={font('title')}>{p.title}</Text>
            {p.reason ? <Text style={font('body', color.muted)}>{p.reason}</Text> : null}
            {p.durationMin ? <Text style={font('small', color.muted)}>{p.durationMin} min</Text> : null}
          </View>
          <Ring size={72} stroke={7} value={p.steps.length ? checked.length / p.steps.length : 0} tint={color.accent}>
            <Text style={figureFont('button')}>{checked.length}/{p.steps.length}</Text>
          </Ring>
        </View>

        <FormSection title="Pasos">
          {p.steps.map((s, i) => {
            const on = checked.includes(i);
            return (
              <Press key={i} label={`Paso ${i + 1}: ${s}`} hint={on ? 'Hecho. Toca para desmarcar' : 'Toca para marcar'} row haptic="light" onPress={() => toggle(i)}>
                <View style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, backgroundColor: i === current ? color.raised : undefined }}>
                  <Icon name={on ? 'checkmark.circle.fill' : 'circle'} size={24} color={on ? color.accent : color.faint} />
                  <Text style={{ ...font('body', on ? color.muted : color.text), flex: 1 }}>{s}</Text>
                </View>
              </Press>
            );
          })}
        </FormSection>

        {p.durationMin ? (
          <Card style={{ alignItems: 'center', gap: 16 }}>
            <Ring size={160} stroke={10} value={total ? 1 - secs / total : 0} tint={color.accent}>
              <Text style={font('display')}>{clock(secs)}</Text>
            </Ring>
            <Press label={timer ? 'Pausar temporizador' : 'Iniciar temporizador'} haptic="light" onPress={() => { wasRunning.current = false; if (secs === 0) setSecs(total); setTimer((t) => !t); }} style={{ height: 44, paddingHorizontal: 28, borderRadius: radius.full, backgroundColor: color.raised, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={font('button', color.accentText)}>{timer ? 'Pausar' : 'Iniciar'}</Text>
            </Press>
          </Card>
        ) : null}

        {focused && p.guide === 'breathing' ? <Card><Breathing /></Card> : null}
        {focused && p.guide === 'jumping_jacks' ? <Card><JumpingJacks /></Card> : null}
        {focused && p.guide === 'reaction' ? <Card><Reaction /></Card> : null}
        {focused && (p.guide === 'cpr' || drill) ? <Card><CprGuide /></Card> : null}
      </ScrollView>

      <View onLayout={(e) => setFooter(e.nativeEvent.layout.height)} style={{ position: 'absolute', left: 0, right: 0, bottom: tabBar, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: color.bg, gap: 6 }}>
        {missing > 0 ? <Text style={{ ...font('small', color.muted), textAlign: 'center' }}>Faltan {missing} paso{missing > 1 ? 's' : ''}</Text> : null}
        <Press label={daily ? 'Registrar' : 'Marcar como hecho'} disabled={missing > 0} onPress={finish} style={{ height: 50, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={font('button', color.onAccent)}>{drill ? 'Registrar simulacro' : daily ? 'Registrar prueba de hoy' : 'Marcar como hecho'}</Text>
        </Press>
      </View>
    </View>
  );
}
