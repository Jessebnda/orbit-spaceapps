import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, Text, View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Circle } from 'react-native-svg';
import { sendStat } from '../../services/hub';
import { useStore } from '../../store/store';
import { alpha, color, figureFont, font, radius } from '../../theme';
import { Card, FormSection } from '../../components/ui/FormSection';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Press } from '../../components/ui/Press';
import { Ring } from '../../components/ui/Ring';
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
  happy: 'Hoy te veo bien. ¿Charlamos un rato?',
  tired: 'Hoy dormiste poco. ¿Respiramos un minuto?',
  sad: 'Aquí estoy. ¿Quieres contarme cómo va el día?',
};
// Semilla fija: 14 estrellas (x, y en 0..100).
const STARS = [[8, 12], [22, 30], [35, 9], [48, 22], [61, 8], [74, 26], [88, 14], [93, 40], [14, 52], [30, 44], [68, 48], [82, 60], [52, 38], [6, 70]];

function Scene({ mood, onThought }: { mood: PetMood; onThought: () => void }) {
  return (
    <View style={{ height: 300, borderRadius: radius.sheet, borderCurve: 'continuous', backgroundColor: color.surface, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
      <Svg width="100%" height="100%" style={{ position: 'absolute' }} viewBox="0 0 100 100" preserveAspectRatio="none">
        {STARS.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={0.35} fill={alpha(color.text, 0.35)} />)}
      </Svg>
      <View style={{ position: 'absolute', bottom: -420, width: 560, height: 560, borderRadius: 280, backgroundColor: alpha(color.accent, 0.14) }} />
      <Press label={THOUGHT[mood]} hint="Abre el chat para escribir a Orbi" onPress={onThought} style={{ position: 'absolute', top: 16, left: 16, right: 16, alignSelf: 'center', backgroundColor: color.raised, borderRadius: radius.card, borderCurve: 'continuous', paddingHorizontal: 14, paddingVertical: 10 }}>
        <Text style={{ ...font('body'), fontSize: 15, textAlign: 'center' }} numberOfLines={2}>{THOUGHT[mood]}</Text>
      </Press>
      <View style={{ marginBottom: 32 }}><Creature size={200} mood={mood} interactive /></View>
    </View>
  );
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
  const schedule = () => {
    useStore.getState().addSession({ id: `s${when.getTime()}`, ts: when.getTime(), done: false });
    useStore.getState().showToast('Sesión programada');
    setPicking(false);
  };
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
          <Text style={font('body', color.muted)}>Escríbele cómo va tu día. No necesitas descargar un modelo para empezar.</Text>
          <Press label="Abrir chat con Orbi" onPress={() => nav.navigate('Chat')} style={{ minHeight: 50, borderRadius: radius.lg, backgroundColor: color.accent, flexDirection: 'row', gap: 8, padding: 14, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bubble.left.fill" size={20} color={color.onAccent} />
            <Text style={font('button', color.onAccent)}>Escribir a Orbi</Text>
          </Press>
          <Scene mood={mood} onThought={() => nav.navigate('Chat')} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          {NEEDS.map((n) => {
            const v = needs[n.key];
            const tint = v < 0.35 ? color.status.watch : color.accent;
            return (
              <View key={n.key} style={{ alignItems: 'center', gap: 6 }} accessible accessibilityLabel={`${n.label} ${Math.round(v * 100)} por ciento`}>
                <Ring size={56} stroke={6} value={v} tint={tint}><Icon name={n.icon} size={20} color={tint} /></Ring>
                <Text style={font('small', color.muted)}>{n.label}</Text>
                <Text style={figureFont('small')}>{Math.round(v * 100)} %</Text>
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
            <Press label="Empezar ahora" haptic="light" onPress={startNow} style={{ flex: 1, height: 44, borderRadius: radius.lg - 2, borderCurve: 'continuous', backgroundColor: alpha(color.accent, 0.18), alignItems: 'center', justifyContent: 'center' }}>
              <Text style={font('button', color.accentText)}>Ahora</Text>
            </Press>
            <Press label="Programar sesión" onPress={() => setPicking((p) => !p)} style={{ flex: 1, height: 44, borderRadius: radius.lg - 2, borderCurve: 'continuous', backgroundColor: color.raised, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={font('button', color.accentText)}>Programar</Text>
            </Press>
          </View>
          {picking ? (
            <View style={{ gap: 8 }}>
              <DateTimePicker value={when} mode="datetime" display={Platform.OS === 'ios' ? 'compact' : 'default'} minimumDate={new Date()} themeVariant="dark" onChange={(_, d) => d && setWhen(d)} style={{ alignSelf: 'flex-start' }} />
              <Press label="Guardar sesión" haptic="success" onPress={schedule} style={{ height: 44, borderRadius: radius.lg - 2, borderCurve: 'continuous', backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
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
