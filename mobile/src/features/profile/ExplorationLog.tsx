import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { sendStat } from '../../services/hub';
import { useStore } from '../../store/store';
import { color, figureFont, font, radius } from '../../theme';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card, Section } from '../../components/ui/FormSection';
import { Medal } from '../../components/ui/Medal';
import { Press } from '../../components/ui/Press';

const field = { backgroundColor: color.raised, borderRadius: radius.md, padding: 12, color: color.text, fontSize: 17 };
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const pace = (min: number, km: number) => km > 0 ? clock(Math.round(min / km * 60)) : '—';

/** A field log: time, distance and pace stay grounded in the recorded outing. */
export function ExplorationLog() {
  const explorations = useStore(s => s.explorations);
  const [form, setForm] = useState(false);
  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(0);
  const [title, setTitle] = useState(''), [place, setPlace] = useState(''), [km, setKm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const started = useRef(0), accumulated = useRef(0);
  useEffect(() => {
    if (!running) return;
    started.current = Date.now();
    const id = setInterval(() => setSecs(accumulated.current + Math.floor((Date.now() - started.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [running]);
  const toggle = () => {
    if (running) { accumulated.current += Math.floor((Date.now() - started.current) / 1000); setSecs(accumulated.current); }
    setRunning(r => !r);
  };
  const save = () => {
    const d = Number(km.replace(',', '.'));
    if (!Number.isFinite(d) || d <= 0) { setError('Escribe una distancia mayor que cero.'); return; }
    const elapsed = running ? accumulated.current + Math.floor((Date.now() - started.current) / 1000) : secs;
    if (elapsed < 1) { setError('Inicia el cronómetro antes de guardar.'); return; }
    const e = { id: `e${Date.now()}`, ts: Date.now(), title: title.trim() || 'Exploración', place: place.trim(), km: d, minutes: elapsed / 60 };
    useStore.getState().addExploration(e);
    sendStat({ type: 'exploration', title: e.title, km: e.km, minutes: e.minutes, place: e.place });
    useStore.getState().showToast('Exploración guardada');
    setRunning(false); setSecs(0); accumulated.current = 0;
    setTitle(''); setPlace(''); setKm(''); setError(null); setForm(false);
  };
  const best = Math.max(0, ...explorations.map(e => e.km));
  return <Section title="Exploraciones" action={form ? 'Ocultar' : 'Registrar'} onAction={() => setForm(v => !v)}>
    <View style={{ gap: 12 }}>
      {form && <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={figureFont('display')}>{clock(secs)}</Text><Press label={running ? 'Pausar cronómetro' : 'Iniciar cronómetro'} onPress={toggle} haptic="light" style={{ minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: color.accent, borderRadius: 12 }}><Text style={font('button', color.onAccent)}>{running ? 'Pausar' : 'Iniciar'}</Text></Press></View>
        <Text style={font('small', color.muted)}>El recorrido se registra manualmente, sin GPS.</Text>
        <Text style={font('caption')}>Título</Text><TextInput accessibilityLabel="Título de la exploración" value={title} onChangeText={setTitle} placeholder="Caminata por el hábitat" placeholderTextColor={color.muted} style={field} />
        <Text style={font('caption')}>Lugar</Text><TextInput accessibilityLabel="Lugar de la exploración" value={place} onChangeText={setPlace} placeholder="Hábitat" placeholderTextColor={color.muted} style={field} />
        <Text style={font('caption')}>Distancia en kilómetros</Text><TextInput accessibilityLabel="Distancia en kilómetros" value={km} onChangeText={v => { setKm(v); setError(null); }} placeholder="0.0" keyboardType="decimal-pad" placeholderTextColor={color.muted} style={field} />
        {error && <Text accessibilityRole="alert" style={font('small', color.status.watch)}>{error}</Text>}
        <Press label="Guardar exploración" onPress={save} haptic="light" style={{ backgroundColor: color.accent, borderRadius: radius.md, padding: 14, alignItems: 'center' }}><Text style={font('button', color.onAccent)}>Guardar exploración</Text></Press>
      </Card>}
      {!explorations.length && <EmptyState icon="location" title="Tu próxima salida empieza aquí" hint="Registra distancia y tiempo para construir tu bitácora." />}
      {[...explorations].sort((a, b) => b.ts - a.ts).slice(0, 10).map(e => <Card key={e.id} style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Medal id="first_explore" size={52} earned /><View style={{ flex: 1, gap: 3 }}><Text style={font('button')}>{e.title}</Text><Text style={font('small', color.muted)}>{[e.place, new Date(e.ts).toLocaleDateString('es', { day: 'numeric', month: 'short' })].filter(Boolean).join(' · ')}</Text></View></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {[{ label: 'Distancia', value: e.km.toFixed(1), unit: 'km' }, { label: 'Tiempo', value: clock(Math.round(e.minutes * 60)), unit: 'min:s' }, { label: 'Ritmo', value: pace(e.minutes, e.km), unit: '/km' }].map(v => <View key={v.label} style={{ flexGrow: 1, gap: 4 }}><Text style={font('small', color.muted)}>{v.label}</Text><Text style={figureFont('figure')}>{v.value}</Text><Text style={font('small', color.muted)}>{v.unit}</Text></View>)}
        </View>
        {explorations.length > 1 && e.km === best && <Text style={font('caption', color.accentText)}>Tu mayor distancia registrada</Text>}
      </Card>)}
    </View>
  </Section>;
}
