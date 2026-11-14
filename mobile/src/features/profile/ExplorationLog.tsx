import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { sendStat } from '../../services/hub';
import { useStore, type Exploration } from '../../store/store';
import { dayKey } from '../../domain/derive';
import { alpha, color, figureFont, font, radius } from '../../theme';
import { Bars, lastDays } from '../../components/ui/Bars';
import { Card, FormSection, Section } from '../../components/ui/FormSection';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import { LabeledRow } from '../../components/ui/SettingsGroup';
import { Press } from '../../components/ui/Press';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const num = (n: number, d = 1) => n.toFixed(d).replace('.', ',');
const ago = (ts: number) => {
  const m = Math.round((Date.now() - ts) / 60000);
  return m < 60 ? `hace ${Math.max(1, m)} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`;
};

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ ...font('small', color.faint), fontSize: 11 }}>{label}</Text>
      <Text style={figureFont('figure')} numberOfLines={1} adjustsFontSizeToFit>{value}{unit ? <Text style={font('body', color.muted)}> {unit}</Text> : null}</Text>
    </View>
  );
}

function Card1({ e, max, median }: { e: Exploration; max: number; median: number }) {
  const pace = e.km > 0 ? (e.minutes / e.km) * 60 : 0;
  const remove = () => Alert.alert('Eliminar exploración', undefined, [
    { text: 'Eliminar', style: 'destructive', onPress: () => useStore.setState((s) => ({ explorations: s.explorations.filter((x) => x.id !== e.id) })) },
    { text: 'Cancelar', style: 'cancel' },
  ]);
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={font('button')} numberOfLines={2}>{e.title}</Text>
          <Text style={font('small', color.muted)}>{[e.place, ago(e.ts)].filter(Boolean).join(' · ')}</Text>
        </View>
        <Press label="Más opciones" onPress={remove} style={{ width: 44, height: 44, marginTop: -10, marginRight: -10, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="list.bullet" size={18} color={color.muted} />
        </Press>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Stat label="Distancia" value={e.km > 0 ? num(e.km) : '—'} unit="km" />
        <Stat label="Tiempo" value={clock(e.minutes * 60)} />
        <Stat label="Ritmo" value={pace ? clock(Math.round(pace)) : '—'} unit="/km" />
      </View>
      <View style={{ gap: 4 }} accessible accessibilityLabel={`Contra tu media: ${num(e.km)} km, tu salida más larga ${num(max)} km`}>
        <Text style={{ ...font('small', color.faint), fontSize: 11 }}>Contra tu media</Text>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: color.raised }}>
          <View style={{ height: 6, borderRadius: 3, width: `${Math.min(1, e.km / (max || 1)) * 100}%`, backgroundColor: color.accent }} />
          <View style={{ position: 'absolute', left: `${Math.min(1, median / (max || 1)) * 100}%`, top: -2, width: 1, height: 10, backgroundColor: color.muted }} />
        </View>
      </View>
      {e.km >= max && e.km > 0 ? (
        <View style={{ alignSelf: 'flex-start', height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: alpha(color.accent, 0.14), justifyContent: 'center' }}>
          <Text style={font('caption', color.accentText)}>Tu salida más larga</Text>
        </View>
      ) : null}
    </Card>
  );
}

function RecordSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(0);
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [km, setKm] = useState('');
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const reset = () => { setRunning(false); setSecs(0); setTitle(''); setPlace(''); setKm(''); };
  const save = () => {
    const d = Number(km.replace(',', '.'));
    const e = { id: `e${Date.now()}`, ts: Date.now(), title: title.trim() || 'Exploración', place: place.trim(), km: Number.isFinite(d) ? d : 0, minutes: Math.max(1, Math.round(secs / 60)) };
    useStore.getState().addExploration(e);
    sendStat({ type: 'exploration', title: e.title, km: e.km, minutes: e.minutes, place: e.place });
    useStore.getState().showToast('Exploración guardada');
    reset();
    onClose();
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: color.bg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
          <Press label="Cancelar" onPress={() => { reset(); onClose(); }}><Text style={font('body', color.accentText)}>Cancelar</Text></Press>
          <Press label="Guardar exploración" disabled={secs === 0 && !km} haptic="success" onPress={save}><Text style={font('button', color.accentText)}>Guardar</Text></Press>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 24 }}>
          <View style={{ alignItems: 'center', gap: 16 }}>
            <Text style={font('hud')} accessibilityLabel={`Tiempo ${clock(secs)}`}>{clock(secs)}</Text>
            <Press label={running ? 'Pausar' : 'Iniciar cronómetro'} haptic="light" onPress={() => setRunning((r) => !r)} style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: running ? color.raised : color.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={running ? 'pause.fill' : 'play.fill'} size={28} color={color.text} />
            </Press>
          </View>
          <FormSection title="Detalles">
            <LabeledRow label="Título"><TextInput value={title} onChangeText={setTitle} placeholder="Exploración" placeholderTextColor={color.faint} style={{ ...font('body'), textAlign: 'right', alignSelf: 'stretch', paddingVertical: 12 }} /></LabeledRow>
            <LabeledRow label="Lugar"><TextInput value={place} onChangeText={setPlace} placeholder="Módulo" placeholderTextColor={color.faint} style={{ ...font('body'), textAlign: 'right', alignSelf: 'stretch', paddingVertical: 12 }} /></LabeledRow>
            <LabeledRow label="Distancia" last><TextInput value={km} onChangeText={setKm} keyboardType="decimal-pad" placeholder="0 km" placeholderTextColor={color.faint} style={{ ...font('body'), textAlign: 'right', alignSelf: 'stretch', paddingVertical: 12 }} /></LabeledRow>
          </FormSection>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Exploraciones tipo Strava: resumen semanal con barras, botón de registrar (hoja) y tarjetas con 3 cifras. Sin mapa: no hay GPS. */
export function ExplorationLog() {
  const explorations = useStore((s) => s.explorations);
  const [recording, setRecording] = useState(false);
  const week = lastDays(7, Date.now(), dayKey);
  const perDay = week.map((d) => explorations.filter((e) => dayKey(e.ts) === d.key).reduce((s, e) => s + e.km, 0));
  const weekKm = perDay.reduce((s, v) => s + v, 0);
  const kms = explorations.map((e) => e.km).filter((k) => k > 0).sort((a, b) => a - b);
  const max = kms[kms.length - 1] ?? 0;
  const median = kms.length ? kms[Math.floor(kms.length / 2)]! : 0;

  return (
    <Section title="Exploraciones">
      {explorations.length === 0 ? (
        <Card><EmptyState icon="location" title="Registra tu primera exploración" hint="Anota un recorrido dentro de la nave o en superficie." action="Empezar" onAction={() => setRecording(true)} /></Card>
      ) : (
        <>
          <Card style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={figureFont('display')}>{num(weekKm)}</Text>
              <Text style={font('body', color.muted)}>km esta semana</Text>
            </View>
            <Bars values={perDay} labels={week.map((d) => d.label)} height={72} />
          </Card>
          <Press label="Registrar exploración" haptic="light" onPress={() => setRecording(true)} style={{ height: 50, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={font('button', color.onAccent)}>Registrar exploración</Text>
          </Press>
          <View style={{ gap: 12 }}>
            {explorations.slice(0, 10).map((e) => <Card1 key={e.id} e={e} max={max} median={median} />)}
          </View>
        </>
      )}
      <RecordSheet visible={recording} onClose={() => setRecording(false)} />
    </Section>
  );
}
