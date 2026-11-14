import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { PROTOCOL_KIND_LABEL, type Protocol, type ProtocolKind } from '@orbit/shared';
import { send, sendStat } from '../../services/hub';
import { useStore } from '../../store/store';
import { color, font, radius, space } from '../../theme';
import { EmptyState } from '../../components/ui/EmptyState';
import { FeedRow } from '../../components/ui/FeedRow';
import { FormSection } from '../../components/ui/FormSection';
import { Press } from '../../components/ui/Press';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { CprGuide } from '../emergency/CprGuide';
import { Breathing } from './Breathing';
import { JumpingJacks } from './JumpingJacks';

const KINDS: ProtocolKind[] = ['emergency', 'physical', 'mental'];
/** Tono por tipo: la emergencia usa coral de estado, no el rojo de emergencia activa. */
const TONE = { emergency: 'critical', physical: 'accent', mental: 'muted' } as const;

/** Protocolos del ship por tipo, más el simulacro de RCP. Detalle en la misma pantalla. */
export function ProtocolsScreen() {
  const { protocols, done } = useStore();
  const [kind, setKind] = useState<ProtocolKind>('emergency');
  const [open, setOpen] = useState<Protocol | 'drill' | null>(null);

  if (open) return <ProtocolDetail item={open} onBack={() => setOpen(null)} />;

  const list = protocols.filter((p) => p.kind === kind);
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: space['2xl'] }}>
      <ScreenHeader kicker="Protocolos" title="Del ship" subtitle="Lo que la nave te pide hacer." />
      <View style={{ paddingHorizontal: space.lg, gap: space.lg }}>
        <SegmentedTabs tabs={KINDS.map((k) => ({ key: k, label: PROTOCOL_KIND_LABEL[k] }))} active={kind} onChange={setKind} />
        {kind === 'emergency' && (
          <FeedRow title="Simulacro de RCP" subtitle="Practica la guía sin emergencia real" badge="Entrenamiento" badgeTone="accent" onPress={() => setOpen('drill')} last={list.length === 0} />
        )}
        {list.length === 0 && kind !== 'emergency' ? (
          <EmptyState icon="checkmark-circle-outline" title="Nada pendiente en esta categoría." />
        ) : (
          list.map((p, i) => (
            <FeedRow key={p.id} title={p.title} subtitle={p.reason} badge={done.includes(p.id) ? 'Hecho' : PROTOCOL_KIND_LABEL[p.kind]} badgeTone={done.includes(p.id) ? 'ok' : TONE[p.kind]} trailing={p.durationMin ? <Text style={font('small', color.muted)}>{p.durationMin} min</Text> : undefined} last={i === list.length - 1} onPress={() => setOpen(p)} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function ProtocolDetail({ item, onBack }: { item: Protocol | 'drill'; onBack: () => void }) {
  const drill = item === 'drill';
  const p: Protocol = drill
    ? { id: 'drill-cpr', kind: 'emergency', title: 'Simulacro de RCP', reason: 'Práctica sin emergencia real.', steps: ['Llama al AED', 'Compresiones a 110/min', 'Ventilaciones cada 30'], createdBy: 'captain', guide: 'cpr' }
    : item;
  const checked = useStore((s) => s.checked[p.id] ?? []);
  const [secs, setSecs] = useState((p.durationMin ?? 0) * 60);
  const [timer, setTimer] = useState(false);
  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const toggle = (i: number) => {
    const next = checked.includes(i) ? checked.filter((x) => x !== i) : [...checked, i];
    useStore.getState().setChecked(p.id, next);
  };
  const finish = () => {
    if (drill) {
      useStore.getState().addStat('cprDrills', 1);
      useStore.getState().showToast('Simulacro registrado');
      onBack();
      return;
    }
    useStore.getState().markDone(p.id);
    send({ t: 'protocol_ack', crewId: useStore.getState().profile.crewId, protocolId: p.id });
    sendStat({ type: 'protocol_done', protocolId: p.id });
    onBack();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space['2xl'], gap: space.lg }}>
      <Press label="Volver a protocolos" onPress={onBack} style={{ alignSelf: 'flex-start', padding: space.sm }}><Text style={font('body', color.accent)}>Volver</Text></Press>
      <Text style={font('caption', color.muted)}>{PROTOCOL_KIND_LABEL[p.kind]}</Text>
      <Text style={font('title')}>{p.title}</Text>
      {p.reason ? <Text style={font('body', color.muted)}>{p.reason}</Text> : null}

      <FormSection title="Pasos">
        {p.steps.map((s, i) => (
          <Press key={i} label={`Paso ${i + 1}: ${s}`} onPress={() => toggle(i)} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start', paddingVertical: space.sm }}>
            <Text style={font('body', checked.includes(i) ? color.muted : color.text)}>{i + 1}. {s}</Text>
          </Press>
        ))}
      </FormSection>

      {p.durationMin ? (
        <FormSection title="Tiempo">
          <Text style={font('figure')}>{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</Text>
          <Press label={timer ? 'Pausar temporizador' : 'Iniciar temporizador'} onPress={() => setTimer((t) => !t)}><Text style={font('button', color.accent)}>{timer ? 'Pausar' : 'Iniciar'}</Text></Press>
        </FormSection>
      ) : null}

      {p.guide === 'breathing' && <Breathing />}
      {p.guide === 'jumping_jacks' && <JumpingJacks />}
      {(p.guide === 'cpr' || drill) && <CprGuide />}

      <Press label={drill ? 'Registrar simulacro' : 'Marcar como hecho'} onPress={finish} style={{ backgroundColor: color.accent, borderRadius: radius.md, padding: space.md, alignItems: 'center' }}>
        <Text style={font('button', color.onAccent)}>{drill ? 'Registrar simulacro' : 'Marcar como hecho'}</Text>
      </Press>
    </ScrollView>
  );
}
