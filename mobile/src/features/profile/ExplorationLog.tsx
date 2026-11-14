import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { sendStat } from '../../services/hub';
import { useStore } from '../../store/store';
import { color, font, radius, space } from '../../theme';
import { EmptyState } from '../../components/ui/EmptyState';
import { FeedRow } from '../../components/ui/FeedRow';
import { FormSection } from '../../components/ui/FormSection';
import { Press } from '../../components/ui/Press';

const field = { backgroundColor: color.surface, borderRadius: radius.md, padding: space.md, color: color.text, fontSize: 16 };
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Registro de exploraciones tipo Strava: cronómetro, título, lugar y km. */
export function ExplorationLog() {
  const explorations = useStore((s) => s.explorations);
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

  const save = () => {
    const d = Number(km.replace(',', '.'));
    const minutes = Math.max(1, Math.round(secs / 60));
    const e = { id: `e${Date.now()}`, ts: Date.now(), title: title.trim() || 'Exploración', place: place.trim(), km: Number.isFinite(d) ? d : 0, minutes };
    useStore.getState().addExploration(e);
    sendStat({ type: 'exploration', title: e.title, km: e.km, minutes: e.minutes, place: e.place });
    setRunning(false);
    setSecs(0);
    setTitle('');
    setPlace('');
    setKm('');
  };

  return (
    <FormSection title="Exploraciones" hint="Registra un recorrido dentro de la nave o en superficie.">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={font('figure')}>{clock(secs)}</Text>
        <Press label={running ? 'Parar cronómetro' : 'Iniciar cronómetro'} onPress={() => setRunning((r) => !r)} style={{ backgroundColor: running ? color.raised : color.accent, borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: space.sm }}>
          <Text style={font('button', running ? color.text : color.onAccent)}>{running ? 'Parar' : 'Iniciar'}</Text>
        </Press>
      </View>
      <TextInput value={title} onChangeText={setTitle} placeholder="Título" placeholderTextColor={color.faint} style={field} />
      <TextInput value={place} onChangeText={setPlace} placeholder="Lugar" placeholderTextColor={color.faint} style={field} />
      <TextInput value={km} onChangeText={setKm} placeholder="Kilómetros" keyboardType="decimal-pad" placeholderTextColor={color.faint} style={field} />
      <Press label="Guardar exploración" onPress={save} disabled={secs === 0 && !km} style={{ backgroundColor: color.raised, borderRadius: radius.md, padding: space.md, alignItems: 'center' }}>
        <Text style={font('button')}>Guardar exploración</Text>
      </Press>
      {explorations.length === 0 ? (
        <EmptyState icon="navigate-outline" title="Aún no hay exploraciones." />
      ) : (
        explorations.slice(0, 10).map((e, i, arr) => (
          <FeedRow key={e.id} title={e.title} subtitle={[e.place, `${e.minutes} min`].filter(Boolean).join(' · ')} trailing={<Text style={font('body')}>{e.km.toFixed(1)} km</Text>} last={i === arr.length - 1} />
        ))
      )}
    </FormSection>
  );
}
