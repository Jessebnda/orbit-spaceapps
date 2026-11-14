import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import type { CheckIn } from '@orbit/shared';
import { send } from '../../services/hub';
import { useStore } from '../../store/store';
import { alpha, color, font, radius } from '../../theme';
import { Card, FormSection } from '../../components/ui/FormSection';
import { Press } from '../../components/ui/Press';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { LabeledRow } from '../../components/ui/SettingsGroup';
import { useReducedMotion } from '../../theme/useReducedMotion';

type Score = CheckIn['mood'];
const SCORES = [1, 2, 3, 4, 5] as const;
const MOOD_LABEL = ['Muy mal', 'Mal', 'Regular', 'Bien', 'Muy bien'];
const MOOD_SYN = ['Agotado', 'Apagado', 'Neutral', 'Tranquilo', 'Radiante'];
const R = 80;

/** Forma de ánimo (Health iOS 17): círculo liso cuando va muy bien, encogida y angulosa cuando va muy mal. */
function moodPath(level: Score) {
  const lobes = 8;
  const amp = [0.3, 0.22, 0.14, 0.06, 0][level - 1];
  const scale = [0.62, 0.74, 0.85, 0.94, 1][level - 1];
  const n = level <= 2 ? 24 : 96; // pocos puntos = ángulos; muchos = curva lisa
  let d = '';
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const r = R * scale * (1 + amp * Math.cos(lobes * t));
    d += `${i ? 'L' : 'M'}${(100 + r * Math.cos(t)).toFixed(1)} ${(100 + r * Math.sin(t)).toFixed(1)} `;
  }
  return d + 'Z';
}

function MoodShape({ mood, onChange }: { mood: Score; onChange: (s: Score) => void }) {
  const reduced = useReducedMotion();
  const start = useRef<number>(mood);
  const s = useSharedValue(1);
  useEffect(() => { if (!reduced) s.set(withSpring(1, { duration: 400, dampingRatio: 0.7, velocity: 1.5 } as never)); }, [mood, reduced, s]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }] }));
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin(() => { start.current = mood; })
    .onUpdate((e) => {
      const next = Math.min(5, Math.max(1, Math.round(start.current - e.translationY / 36))) as Score;
      if (next !== mood) {
        void Haptics.selectionAsync();
        if (!reduced) s.set(0.94);
        onChange(next);
      }
    });
  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Ánimo"
        accessibilityValue={{ text: MOOD_LABEL[mood - 1] }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onChange(Math.min(5, Math.max(1, mood + (e.nativeEvent.actionName === 'increment' ? 1 : -1))) as Score)}
        style={{ alignItems: 'center', gap: 4 }}
      >
        <Animated.View style={pop}>
          <Svg width={200} height={200} viewBox="0 0 200 200">
            <Path d={moodPath(mood)} fill={alpha(color.accent, [0.5, 0.62, 0.75, 0.88, 1][mood - 1])} strokeLinejoin="round" stroke={alpha(color.accent, 0.9)} strokeWidth={mood <= 2 ? 3 : 0} />
          </Svg>
        </Animated.View>
        <Text style={font('title')}>{MOOD_LABEL[mood - 1]}</Text>
        <Text style={{ ...font('body', color.muted), fontSize: 15 }}>{MOOD_SYN[mood - 1]} · arrastra arriba o abajo</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const Ends = ({ a, b }: { a: string; b: string }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
    <Text style={font('small', color.muted)}>{a}</Text>
    <Text style={font('small', color.muted)}>{b}</Text>
  </View>
);

/** Check-in diario en hoja (formSheet desde Hoy): ánimo como objeto dominante, estrés, perspectiva, notas y noticias de casa. */
export function CheckInScreen() {
  const nav = useNavigation();
  const [mood, setMood] = useState<Score>(3);
  const [stress, setStress] = useState<Score>(2);
  const [outlook, setOutlook] = useState<Score>(3);
  const [injury, setInjury] = useState('');
  const [bereavement, setBereavement] = useState(false);
  const [note, setNote] = useState('');

  const submit = () => {
    const c: CheckIn = { ts: Date.now(), mood, stress, missionOutlook: outlook, injury: injury.trim() || undefined, bereavement, note: note.trim() || undefined };
    useStore.getState().addCheckIn(c);
    send({ t: 'checkin', crewId: useStore.getState().profile.crewId, checkin: c });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    useStore.getState().showToast('Check-in enviado');
    nav.goBack();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 }}>
        <Press label="Cancelar" onPress={() => nav.goBack()}><Text style={font('body', color.accentText)}>Cancelar</Text></Press>
        <Text style={font('button')} accessibilityRole="header">Check-in</Text>
        <Press label="Enviar check-in" haptic="light" onPress={submit}><Text style={font('button', color.accentText)}>Enviar</Text></Press>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 32 }}>
        <Card pad={20} style={{ minHeight: 300, justifyContent: 'center' }}>
          <MoodShape mood={mood} onChange={setMood} />
        </Card>

        <View style={{ gap: 8 }}>
          <Text style={font('section')}>Estrés</Text>
          <SegmentedTabs tabs={SCORES.map((s) => ({ key: String(s), label: String(s) }))} active={String(stress)} onChange={(k) => setStress(Number(k) as Score)} />
          <Ends a="Tranquilo" b="Muy alto" />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={font('section')}>Perspectiva de la misión</Text>
          <SegmentedTabs tabs={SCORES.map((s) => ({ key: String(s), label: String(s) }))} active={String(outlook)} onChange={(k) => setOutlook(Number(k) as Score)} />
          <Ends a="Pesimista" b="Optimista" />
        </View>

        <FormSection title="Lo que quieras contar">
          <LabeledRow label="Molestias">
            <TextInput value={injury} onChangeText={setInjury} placeholder="Ninguna" placeholderTextColor={color.faint} returnKeyType="done" style={{ ...font('body'), textAlign: 'right', minWidth: 120, paddingVertical: 12 }} />
          </LabeledRow>
          <View style={{ padding: 16 }}>
            <TextInput value={note} onChangeText={setNote} multiline placeholder="Nota" placeholderTextColor={color.faint} style={{ ...font('body'), minHeight: 72, textAlignVertical: 'top', backgroundColor: color.raised, borderRadius: radius.md, borderCurve: 'continuous', padding: 12 }} />
          </View>
        </FormSection>

        <View style={{ gap: 12 }}>
          <FormSection>
            <View style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16 }}>
              <Text style={{ ...font('body'), flex: 1 }}>Recibí una noticia difícil de casa</Text>
              <Switch value={bereavement} onValueChange={setBereavement} ios_backgroundColor={color.raised} trackColor={{ true: color.accent, false: color.raised }} />
            </View>
          </FormSection>
          {bereavement ? (
            <Animated.View entering={FadeIn.duration(150)} style={{ gap: 4, paddingHorizontal: 16 }}>
              <Text style={font('small', color.muted)}>Gracias por decirlo. Se lo haremos saber a tu cirujano de vuelo, no al equipo.</Text>
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
