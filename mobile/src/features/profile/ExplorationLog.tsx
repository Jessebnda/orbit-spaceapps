import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
import { RouteMap } from '../../components/ui/RouteMap';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const num = (n: number, d = 1) => n.toFixed(d).replace('.', ',');
const ago = (ts: number) => {
  const m = Math.round((Date.now() - ts) / 60000);
  return m < 60 ? `hace ${Math.max(1, m)} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`;
};

function Stat({ label, value, unit, first }: { label: string; value: string; unit?: string; first?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 2, paddingLeft: first ? 0 : 12, borderLeftWidth: first ? 0 : StyleSheet.hairlineWidth, borderLeftColor: color.hairline }}>
      <Text style={font('small', color.faint)}>{label}</Text>
      <Text style={{ ...figureFont('button'), fontSize: 22, lineHeight: 28 }} numberOfLines={1} adjustsFontSizeToFit>{value}{unit ? <Text style={font('small', color.muted)}> {unit}</Text> : null}</Text>
    </View>
  );
}

function Card1({ e, max }: { e: Exploration; max: number }) {
  const pace = e.km > 0 ? (e.minutes / e.km) * 60 : 0;
  const longest = e.km >= max && e.km > 0;
  const remove = () => Alert.alert('Eliminar exploración', undefined, [
    { text: 'Eliminar', style: 'destructive', onPress: () => useStore.setState((s) => ({ explorations: s.explorations.filter((x) => x.id !== e.id) })) },
    { text: 'Cancelar', style: 'cancel' },
  ]);
  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      <View style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: color.raised, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="figure.run" size={18} color={color.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={font('button')} numberOfLines={1}>{e.title}</Text>
            <Text style={font('small', color.muted)} numberOfLines={1}>{[e.place, ago(e.ts)].filter(Boolean).join(' · ')}</Text>
          </View>
          <Press label="Eliminar exploración" onPress={remove} style={{ width: 44, height: 44, marginRight: -12, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="trash" size={17} color={color.faint} />
          </Press>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <Stat first label="Distancia" value={e.km > 0 ? num(e.km) : '—'} unit="km" />
          <Stat label="Ritmo" value={pace ? clock(Math.round(pace)) : '—'} unit="/km" />
          <Stat label="Tiempo" value={clock(e.minutes * 60)} />
        </View>
      </View>
      <View style={{ backgroundColor: color.bg }}>
        <RouteMap seed={e.id} km={e.km} />
        {longest ? (
          <View style={{ position: 'absolute', top: 12, left: 12, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: alpha(color.surface, 0.9), flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="bolt.fill" size={12} color={color.text} />
            <Text style={font('status')}>Tu salida más larga</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function RecordSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets(); // Android draws the page sheet full screen, under the status bar
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, paddingTop: Platform.OS === 'android' ? insets.top + 8 : 16 }}>
          <Press label="Cancelar" onPress={() => { reset(); onClose(); }}><Text style={font('body', color.accentText)}>Cancelar</Text></Press>
          <Press label="Guardar exploración" disabled={secs === 0 && !km} haptic="success" onPress={save}><Text style={font('button', color.accentText)}>Guardar</Text></Press>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 24 }}>
          <View style={{ alignItems: 'center', gap: 16 }}>
            <Text style={font('hud')} accessibilityLabel={`Tiempo ${clock(secs)}`}>{clock(secs)}</Text>
            <Press label={running ? 'Pausar' : 'Iniciar cronómetro'} haptic="light" onPress={() => setRunning((r) => !r)} style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: running ? color.raised : color.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={running ? 'pause.fill' : 'play.fill'} size={28} color={running ? color.text : color.onAccent} />
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

/** Exploraciones tipo Strava: resumen semanal con barras, botón de registrar (hoja) y tarjetas con 3 cifras. El plano es dibujado (no hay GPS), el mismo que en el monitor. */
export function ExplorationLog() {
  const explorations = useStore((s) => s.explorations);
  const [recording, setRecording] = useState(false);
  const week = lastDays(7, Date.now(), dayKey);
  const perDay = week.map((d) => explorations.filter((e) => dayKey(e.ts) === d.key).reduce((s, e) => s + e.km, 0));
  const weekKm = perDay.reduce((s, v) => s + v, 0);
  const weekRuns = explorations.filter((e) => week.some((d) => d.key === dayKey(e.ts)));
  const weekMin = weekRuns.reduce((t, e) => t + e.minutes, 0);
  const max = Math.max(0, ...explorations.map((e) => e.km));

  return (
    <Section title="Exploraciones">
      {explorations.length === 0 ? (
        <Card><EmptyState icon="location" title="Registra tu primera exploración" hint="Anota un recorrido dentro de la nave o en superficie." action="Empezar" onAction={() => setRecording(true)} /></Card>
      ) : (
        <>
          <Card style={{ gap: 16 }}>
            <View style={{ gap: 2 }}>
              <Text style={font('caption', color.faint)}>Esta semana</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={figureFont('display')}>{num(weekKm)}</Text>
                <Text style={font('body', color.muted)}>km</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Stat first label="Salidas" value={String(weekRuns.length)} />
              <Stat label="Tiempo" value={weekMin >= 60 ? `${Math.floor(weekMin / 60)} h ${weekMin % 60}` : String(weekMin)} unit="min" />
              <Stat label="Ritmo medio" value={weekKm > 0 ? clock(Math.round((weekMin / weekKm) * 60)) : '—'} unit="/km" />
            </View>
            <Bars values={perDay} labels={week.map((d) => d.label)} height={64} />
          </Card>
          <Press label="Registrar exploración" haptic="light" onPress={() => setRecording(true)} style={{ height: 50, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.accent, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="play.fill" size={16} color={color.onAccent} />
            <Text style={font('button', color.onAccent)}>Registrar exploración</Text>
          </Press>
          <View style={{ gap: 12 }}>
            {explorations.slice(0, 10).map((e) => <Card1 key={e.id} e={e} max={max} />)}
          </View>
        </>
      )}
      <RecordSheet visible={recording} onClose={() => setRecording(false)} />
    </Section>
  );
}
