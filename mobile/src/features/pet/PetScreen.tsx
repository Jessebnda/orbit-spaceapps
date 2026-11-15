import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, Text, View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { sendStat } from '../../services/hub';
import { useStore } from '../../store/store';
import { alpha, color, figureFont, font, radius } from '../../theme';
import { Card, FormSection } from '../../components/ui/FormSection';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Press } from '../../components/ui/Press';
import { FeedRow } from '../../components/ui/FeedRow';
import { petMood, petNeeds, type PetMood } from '../../domain/derive';
import { Creature } from './Creature';

const FLUSH_EVERY_S = 15;
const NEEDS: { key: 'food' | 'rest' | 'mood'; label: string; icon: IconName }[] = [
  { key: 'food', label: 'Alimento', icon: 'fork.knife' },
  { key: 'rest', label: 'Descanso', icon: 'moon.zzz.fill' },
  { key: 'mood', label: 'Ánimo', icon: 'face.smiling' },
];
const THOUGHT: Record<PetMood, string> = {
  happy: '¿Cómo va tu día?',
  tired: 'Hoy dormiste poco. ¿Respiramos un minuto?',
  sad: 'Aquí estoy. ¿Quieres contarme cómo va el día?',
};
/** Quiet portrait of Orbi: the character is the visual, not a decorative scene. */
function Scene({ mood, onThought }: { mood: PetMood; onThought: () => void }) {
  return <View style={{ backgroundColor: color.surface, borderRadius: radius.card, borderCurve: 'continuous', padding: 20, alignItems: 'center', gap: 12 }}>
    <Creature size={170} mood={mood} interactive />
    <Press label={THOUGHT[mood]} hint="Abre el chat" onPress={onThought} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={[font('body', color.muted), { textAlign: 'center' }]}>{THOUGHT[mood]}</Text>
    </Press>
  </View>;
}

export function PetScreen() {
  const nav = useNavigation<{ navigate: (n: string) => void }>();
  const focused = useIsFocused();
  const { metrics, checkins, sessions } = useStore();
  const last = checkins[checkins.length - 1];
  const mood = petMood(metrics, last);
  const needs = petNeeds(metrics, last);
  const secs = useRef(0);
  const sinceFlush = useRef(0);
  const [picking, setPicking] = useState(false);
  const [when, setWhen] = useState(() => new Date(Date.now() + 3600_000));

  // Pet time counts only while this tab is focused and the app is active (the effect cleans up on blur), flushed every 15 s.
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

  const startNow = () => {
    const id = `s${Date.now()}`;
    useStore.getState().addSession({ id, ts: Date.now(), done: false });
    useStore.getState().setActiveSession(id);
  };
  const schedule = (at: Date = when) => {
    useStore.getState().addSession({ id: `s${at.getTime()}`, ts: at.getTime(), done: false });
    useStore.getState().showToast('Sesión programada');
    setPicking(false);
  };
  // Android has no 'datetime' picker (the inline component rendered nothing): two native dialogs in a row, date then time.
  const pickOnAndroid = () => DateTimePickerAndroid.open({
    value: when, mode: 'date', minimumDate: new Date(),
    onChange: (e, day) => {
      if (e.type !== 'set' || !day) return;
      // opening a dialog from inside the previous one's callback is swallowed while that one is still closing
      setTimeout(() => DateTimePickerAndroid.open({
        value: day, mode: 'time', is24Hour: true,
        onChange: (e2, time) => {
          if (e2.type !== 'set' || !time) return;
          const at = new Date(day);
          at.setHours(time.getHours(), time.getMinutes(), 0, 0);
          setWhen(at);
          schedule(at);
        },
      }), 250);
    },
  });
  const upcoming = sessions.filter((s) => !s.done).sort((a, b) => a.ts - b.ts);
  const rel = (ts: number) => {
    const m = Math.round((ts - Date.now()) / 60000);
    const t = new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    return m <= 0 ? `Ahora` : m < 60 ? `${t} · en ${m} min` : `${t} · en ${Math.round(m / 60)} h`;
  };
  const manage = (id: string) => Alert.alert('Sesión guiada', undefined, [
    { text: 'Posponer 10 min', onPress: () => useStore.getState().snoozeSession(id) },
    { text: 'Cancelar sesión', style: 'destructive', onPress: () => useStore.getState().removeSession(id) },
    { text: 'Cerrar', style: 'cancel' },
  ]);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ paddingHorizontal: 16, gap: 32 }}>
        <View style={{ gap: 12 }}>
          <Text style={font('title')}>Tu compañero Orbi</Text>
          <Text style={font('body', color.muted)}>Un espacio para hablar, hacer una pausa y seguir.</Text>
          <Scene mood={mood} onThought={() => nav.navigate('Chat')} />
          <Press label="Abrir chat con Orbi" onPress={() => nav.navigate('Chat')} style={{ minHeight: 50, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.accent, flexDirection: 'row', gap: 8, padding: 14, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bubble.left.fill" size={20} color={color.onAccent} />
            <Text style={font('button', color.onAccent)}>Escribir a Orbi</Text>
          </Press>
        </View>

        {/* Needs as labelled meters on the page ground: not three centred icon-number tiles, not another card. */}
        <View style={{ gap: 14 }}>
          {NEEDS.map((n) => {
            const v = Math.max(0, Math.min(1, needs[n.key]));
            return (
              <View key={n.key} style={{ gap: 6 }} accessible accessibilityLabel={`${n.label} ${Math.round(v * 100)} por ciento`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name={n.icon} size={15} color={color.muted} />
                  <Text style={[font('small', color.muted), { flex: 1 }]}>{n.label}</Text>
                  <Text style={figureFont('small')}>{Math.round(v * 100)} %</Text>
                </View>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: color.raised, overflow: 'hidden' }}>
                  <View style={{ width: `${v * 100}%`, height: 4, borderRadius: 2, backgroundColor: color.accent }} />
                </View>
              </View>
            );
          })}
        </View>

        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="figure.mind.and.body" size={28} color={color.accent} />
            <View style={{ flex: 1 }}>
              <Text style={font('button')}>Sesión guiada · 4 min</Text>
              <Text style={font('small', color.muted)}>Un ejercicio paso a paso para revisar tu ánimo y respirar.</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Press label="Empezar ahora" haptic="light" onPress={startNow} style={{ flex: 1, height: 44, borderRadius: radius.lg - 2, borderCurve: 'continuous', backgroundColor: color.raised, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={font('button', color.accentText)}>Ahora</Text>
            </Press>
            <Press label="Programar sesión" onPress={() => (Platform.OS === 'android' ? pickOnAndroid() : setPicking((p) => !p))} style={{ flex: 1, height: 44, borderRadius: radius.lg - 2, borderCurve: 'continuous', backgroundColor: color.raised, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={font('button', color.accentText)}>Programar</Text>
            </Press>
          </View>
          {picking && Platform.OS === 'ios' ? (
            <View style={{ gap: 8 }}>
              <DateTimePicker value={when} mode="datetime" display={Platform.OS === 'ios' ? 'compact' : 'default'} minimumDate={new Date()} themeVariant="dark" onChange={(_, d) => d && setWhen(d)} style={{ alignSelf: 'flex-start' }} />
              <Press label="Guardar sesión" haptic="success" onPress={() => schedule()} style={{ height: 44, borderRadius: radius.lg - 2, borderCurve: 'continuous', backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={font('button', color.onAccent)}>Guardar</Text>
              </Press>
            </View>
          ) : null}
        </Card>

        {upcoming.length ? (
          <FormSection title="Programadas">
            {upcoming.map((s, i) => <FeedRow key={s.id} icon="figure.mind.and.body" iconColor={color.accent} title="Sesión guiada" trailing={<Text style={font('body', color.muted)}>{rel(s.ts)}</Text>} last={i === upcoming.length - 1} onPress={() => manage(s.id)} hint="Posponer o cancelar" />)}
          </FormSection>
        ) : null}
      </View>
    </ScrollView>
  );
}
