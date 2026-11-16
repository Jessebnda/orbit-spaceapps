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
import { careLevels, needsTalk, petMood, type Care, type PetMood } from '../../domain/derive';
import { Creature, PET_COLORS, PET_SHAPES, type PetColor, type PetShape } from './Creature';

const FLUSH_EVERY_S = 15;
const NEEDS: { key: keyof Care; label: string; icon: IconName }[] = [
  { key: 'fed', label: 'Alimento', icon: 'fork.knife' },
  { key: 'petted', label: 'Cariño', icon: 'heart.fill' },
  { key: 'talked', label: 'Compañía', icon: 'bubble.left.fill' },
];
const THOUGHT: Record<PetMood, string> = {
  happy: '¿Cómo va tu día?',
  tired: 'Hoy dormiste poco. ¿Respiramos un minuto?',
  sad: 'Aquí estoy. ¿Quieres contarme cómo va el día?',
};
/** What Orbi asks for first: a low day you haven't talked through, then its own emptiest need. */
function thought(mood: PetMood, talk: boolean, lv: Record<keyof Care, number>) {
  if (talk) return 'Te noto bajo de ánimo y yo también me siento así. ¿Hablamos un rato?';
  if (lv.fed < 0.25) return 'Tengo hambre…';
  if (lv.petted < 0.25) return '¿Me haces un cariño?';
  if (lv.talked < 0.25) return 'Hace mucho que no platicamos.';
  return THOUGHT[mood];
}
/** Shape and colour pickers: each shape previewed as a small Orbi in the current colour. */
function Customize() {
  const profile = useStore((s) => s.profile);
  const shape = (profile.petShape ?? 'bellota') as PetShape;
  const tint = (profile.petColor ?? 'blanco') as PetColor;
  const set = useStore.getState().setProfile;
  return (
    <View style={{ gap: 16 }}>
      <Text style={font('section')}>Personaliza a Orbi</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {(Object.keys(PET_SHAPES) as PetShape[]).map((k) => {
          const on = k === shape;
          return (
            <Press key={k} label={`Forma ${PET_SHAPES[k].label}${on ? ', elegida' : ''}`} haptic="light" onPress={() => set({ petShape: k })}
              style={{ width: 76, alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: on ? color.raised : color.surface, borderWidth: 1.5, borderColor: on ? color.accent : 'transparent' }}>
              <View style={{ width: 52, height: 52 }}><Creature size={52} shape={k} /></View>
              <Text style={font('small', on ? color.text : color.muted)}>{PET_SHAPES[k].label}</Text>
            </Press>
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {(Object.keys(PET_COLORS) as PetColor[]).map((k) => {
          const on = k === tint;
          return (
            <Press key={k} label={`Color ${PET_COLORS[k].label}${on ? ', elegido' : ''}`} haptic="light" onPress={() => set({ petColor: k })}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: on ? color.accent : 'transparent' }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: PET_COLORS[k].fill }} />
            </Press>
          );
        })}
      </View>
    </View>
  );
}

/** Quiet portrait of Orbi: the character is the visual, not a decorative scene. */
function Scene({ mood, text, feeds, pets, onThought }: { mood: PetMood; text: string; feeds: number; pets: number; onThought: () => void }) {
  return <View style={{ backgroundColor: color.surface, borderRadius: radius.card, borderCurve: 'continuous', padding: 20, alignItems: 'center', gap: 12 }}>
    <Creature size={170} mood={mood} feeds={feeds} pets={pets} interactive onPoke={() => useStore.getState().careFor('petted')} />
    <Press label={text} hint="Abre el chat" onPress={onThought} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={[font('body', color.muted), { textAlign: 'center' }]}>{text}</Text>
    </Press>
  </View>;
}

export function PetScreen() {
  const nav = useNavigation<{ navigate: (n: string) => void }>();
  const focused = useIsFocused();
  const { metrics, checkins, sessions, care } = useStore();
  const last = checkins[checkins.length - 1];
  const mood = petMood(metrics, last, care);
  const needs = careLevels(care);
  const talk = needsTalk(last, care);
  const [feeds, setFeeds] = useState(0);
  const [pets, setPets] = useState(0);
  const pet = () => {
    setPets((n) => n + 1);
    useStore.getState().careFor('petted');
  };
  const feed = () => {
    if (needs.fed > 0.97) return useStore.getState().showToast('Orbi ya está lleno');
    setFeeds((n) => n + 1);
    setTimeout(() => useStore.getState().careFor('fed'), 650); // the bar rises when Orbi catches the snack
  };
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
          <Text style={font('body', color.muted)}>Dale de comer, hazle cariño y platica con él. Si te ve triste, se pone triste contigo.</Text>
          <Scene mood={mood} text={thought(mood, talk, needs)} feeds={feeds} pets={pets} onThought={() => nav.navigate('Chat')} />
          <Press label={talk ? 'Hablar con Orbi' : 'Abrir chat con Orbi'} onPress={() => nav.navigate('Chat')} style={{ minHeight: 50, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.accent, flexDirection: 'row', gap: 8, padding: 14, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bubble.left.fill" size={20} color={color.onAccent} />
            <Text style={font('button', color.onAccent)}>{talk ? 'Hablar con Orbi' : 'Escribir a Orbi'}</Text>
          </Press>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Press label="Dar de comer a Orbi" haptic="light" onPress={feed} style={{ flex: 1, height: 44, borderRadius: radius.lg - 2, borderCurve: 'continuous', backgroundColor: color.raised, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="fork.knife" size={16} color={color.accentText} />
              <Text style={font('button', color.accentText)}>Dar de comer</Text>
            </Press>
            <Press label="Hacerle cariño a Orbi" onPress={pet} style={{ flex: 1, height: 44, borderRadius: radius.lg - 2, borderCurve: 'continuous', backgroundColor: color.raised, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="heart.fill" size={16} color={color.accentText} />
              <Text style={font('button', color.accentText)}>Cariño</Text>
            </Press>
          </View>
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

        <Customize />

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
