import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { sendStat } from '../../services/hub';
import { petReply } from '../../services/petBrain';
import { useStore } from '../../store/store';
import { color, font, radius, space } from '../../theme';
import { FeedRow } from '../../components/ui/FeedRow';
import { FormSection } from '../../components/ui/FormSection';
import { Press } from '../../components/ui/Press';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { petMood, petNeeds } from '../../domain/derive';
import { Creature } from './Creature';

const FLUSH_EVERY_S = 15;
const SLOTS: { label: string; at: () => number }[] = [
  { label: 'En 5 min', at: () => Date.now() + 5 * 60_000 },
  { label: 'En 1 h', at: () => Date.now() + 60 * 60_000 },
  { label: 'Mañana 9:00', at: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d.getTime(); } },
];
const NEEDS: { key: 'food' | 'rest' | 'mood'; label: string }[] = [
  { key: 'food', label: 'Alimento' },
  { key: 'rest', label: 'Descanso' },
  { key: 'mood', label: 'Ánimo' },
];

export function PetScreen() {
  const focused = useIsFocused();
  const { metrics, checkins, chat, sessions } = useStore();
  const last = checkins[checkins.length - 1];
  const mood = petMood(metrics, last);
  const needs = petNeeds(metrics, last);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const secs = useRef(0);
  const sinceFlush = useRef(0);

  // Pet time counts only while this tab is focused, and is flushed every 15 s so a crash loses little.
  useEffect(() => {
    if (!focused) return;
    const flush = () => {
      if (!secs.current) return;
      useStore.getState().addStat('petSec', secs.current);
      sendStat({ type: 'pet_time', seconds: secs.current });
      secs.current = 0;
    };
    const id = setInterval(() => {
      secs.current++;
      if (++sinceFlush.current >= FLUSH_EVERY_S) {
        sinceFlush.current = 0;
        flush();
      }
    }, 1000);
    return () => {
      clearInterval(id);
      flush();
    };
  }, [focused]);

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setText('');
    setBusy(true);
    useStore.getState().addChat({ from: 'me', text: t, ts: Date.now() });
    const reply = await petReply(t);
    useStore.getState().addChat({ from: 'pet', text: reply, ts: Date.now() });
    setBusy(false);
  };

  const schedule = (at: number) => {
    useStore.getState().addSession({ id: `s${at}`, ts: at, done: false });
    useStore.getState().showToast('Sesión programada');
  };
  const upcoming = sessions.filter((s) => !s.done);

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space['2xl'] }}>
      <ScreenHeader kicker="Mascota" title="Orbit" subtitle="Refleja cómo estás. Habla con ella cuando quieras." />
      <View style={{ paddingHorizontal: space.lg, gap: space.xl }}>
        <View style={{ alignItems: 'center', gap: space.md }}>
          <Creature size={132} mood={mood} />
          <View style={{ width: '100%', gap: space.sm }}>
            {NEEDS.map((n) => (
              <View key={n.key} style={{ gap: space.xs }}>
                <Text style={font('caption', color.muted)}>{n.label}</Text>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: color.raised }}>
                  <View style={{ height: 6, borderRadius: 3, width: `${Math.round(needs[n.key] * 100)}%`, backgroundColor: color.accent }} />
                </View>
              </View>
            ))}
          </View>
        </View>

        <FormSection title="Sesiones">
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {SLOTS.map((s) => (
              <Press key={s.label} label={`Programar ${s.label}`} onPress={() => schedule(s.at())} style={{ borderRadius: radius.full, backgroundColor: color.raised, paddingHorizontal: space.md, paddingVertical: space.sm }}>
                <Text style={font('small')}>{s.label}</Text>
              </Press>
            ))}
          </View>
          {upcoming.length === 0 ? (
            <Text style={font('small', color.muted)}>No hay sesiones programadas.</Text>
          ) : (
            upcoming.map((s, i) => (
              <FeedRow key={s.id} title="Sesión guiada" badge={s.ts <= Date.now() ? 'Ahora' : 'Programada'} badgeTone={s.ts <= Date.now() ? 'accent' : 'muted'} trailing={<Text style={font('small', color.muted)}>{new Date(s.ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</Text>} last={i === upcoming.length - 1} />
            ))
          )}
        </FormSection>

        <FormSection title="Conversación">
          {chat.length === 0 && <Text style={font('small', color.muted)}>Dile cómo va tu día.</Text>}
          {chat.slice(-20).map((m, i, arr) => (
            <FeedRow key={`${m.ts}${i}`} title={m.text} subtitle={m.from === 'me' ? 'Tú' : 'Orbit'} last={i === arr.length - 1} />
          ))}
          {busy && <Text style={font('small', color.muted)}>Orbit está pensando…</Text>}
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <TextInput value={text} onChangeText={setText} placeholder="Escribe a Orbit" placeholderTextColor={color.faint} onSubmitEditing={send} style={{ flex: 1, backgroundColor: color.surface, borderRadius: radius.md, padding: space.md, color: color.text, fontSize: 16 }} />
            <Press label="Enviar mensaje" onPress={send} disabled={busy} style={{ padding: space.md }}><Text style={font('button', color.accent)}>Enviar</Text></Press>
          </View>
        </FormSection>
      </View>
    </ScrollView>
  );
}
