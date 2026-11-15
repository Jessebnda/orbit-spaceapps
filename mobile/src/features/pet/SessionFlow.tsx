import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store/store';
import { alpha, color, font, radius } from '../../theme';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Press } from '../../components/ui/Press';
import { Breathing } from '../protocols/Breathing';

const FEELINGS: { label: string; icon: IconName }[] = [
  { label: 'Tranquilo', icon: 'sun.max' },
  { label: 'Cansado', icon: 'moon.stars' },
  { label: 'Ansioso', icon: 'cloud.bolt' },
  { label: 'Triste', icon: 'cloud.rain' },
  { label: 'Motivado', icon: 'bolt.fill' },
];
const PROMPTS = ['¿Qué te preocupa más hoy?', '¿Qué salió bien desde ayer?'];
// iOS native tabs overlay the scene (49 pt + home indicator); Android's Material bar sits below it, ~80 dp tall.
const TAB_BAR = Platform.select({ ios: 49, default: 80 });

/** Aviso in-app cuando llega la hora de una sesión programada. Se coloca sobre la barra de pestañas según el área segura. */
export function SessionBanner() {
  const sessions = useStore((s) => s.sessions);
  const active = useStore((s) => s.activeSession);
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);
  const due = sessions.find((x) => !x.done && x.ts <= now);
  if (!due || active) return null;
  return (
    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={{ position: 'absolute', bottom: (Platform.OS === 'ios' ? insets.bottom : 0) + TAB_BAR + 8, left: 16, right: 16, backgroundColor: color.raised, borderRadius: radius.card, borderCurve: 'continuous', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Icon name="figure.mind.and.body" size={24} color={color.accent} />
      <View style={{ flex: 1 }}>
        <Text style={font('button')}>Sesión programada</Text>
        <Text style={font('small', color.muted)}>Es hora de tu sesión con Orbi.</Text>
      </View>
      <Press label="Después" onPress={() => useStore.getState().snoozeSession(due.id)} style={{ padding: 8 }}><Text style={font('body', color.muted)}>Después</Text></Press>
      <Press label="Empezar sesión" haptic="light" onPress={() => useStore.getState().setActiveSession(due.id)} style={{ backgroundColor: color.accent, borderRadius: radius.full, paddingHorizontal: 14, height: 34, justifyContent: 'center' }}>
        <Text style={font('button', color.onAccent)}>Empezar</Text>
      </Press>
    </Animated.View>
  );
}

/** Sesión guiada: sentimiento, dos preguntas, respiración de tres ciclos y cierre. Progreso en 4 segmentos. */
export function SessionFlow() {
  const id = useStore((s) => s.activeSession);
  const [step, setStep] = useState(0);
  const [feeling, setFeeling] = useState('');
  const [notes, setNotes] = useState(['', '']);
  useEffect(() => {
    if (id) {
      setStep(0);
      setFeeling('');
      setNotes(['', '']);
    }
  }, [id]);
  const onBreathDone = useCallback(() => setStep(3), []);
  if (!id) return null;
  const next = () => setStep((s) => s + 1);
  const cta = (label: string, onPress: () => void, success = false) => (
    <Press label={label} haptic={success ? 'success' : 'light'} onPress={onPress} style={{ height: 50, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={font('button', color.onAccent)}>{label}</Text>
    </Press>
  );
  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => useStore.getState().setActiveSession(null)}>
      {/* a Modal is its own window on Android: only a native SafeAreaView inside it sees that window's bars */}
      <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, paddingTop: 16, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', gap: 4, marginBottom: 24 }} accessibilityLabel={`Paso ${step + 1} de 4`}>
          {[0, 1, 2, 3].map((i) => <View key={i} style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: i <= step ? color.accent : color.raised }} />)}
        </View>
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, gap: 24 }}>
          {step === 0 && (
            <>
              <Text style={font('hero')}>¿Cómo te sientes?</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {FEELINGS.map((f) => (
                  <Press key={f.label} label={f.label} haptic="tick" onPress={() => { setFeeling(f.label); next(); }} style={{ width: '47.5%', height: 88, borderRadius: radius.card, borderCurve: 'continuous', backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Icon name={f.icon} size={28} color={color.accent} />
                    <Text style={font('body')}>{f.label}</Text>
                  </Press>
                ))}
              </View>
            </>
          )}
          {step === 1 && (
            <>
              <Text style={font('hero')}>Reflexiona</Text>
              {PROMPTS.map((p, i) => (
                <View key={p} style={{ gap: 8 }}>
                  <Text style={font('body', color.muted)}>{p}</Text>
                  <TextInput value={notes[i]} onChangeText={(t) => setNotes((n) => n.map((x, j) => (j === i ? t : x)))} multiline style={{ ...font('body'), backgroundColor: color.surface, borderRadius: radius.md + 2, borderCurve: 'continuous', padding: 14, minHeight: 80, textAlignVertical: 'top' }} />
                </View>
              ))}
              {cta('Siguiente', next)}
            </>
          )}
          {step === 2 && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
              <Text style={font('hero')}>Respira conmigo</Text>
              <Breathing cycles={3} onDone={onBreathDone} />
            </View>
          )}
          {step === 3 && (
            <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
              <Icon name="checkmark.circle.fill" size={56} color={color.status.ok} />
              <Text style={font('hero')}>Sesión completa</Text>
              <Text style={font('body', color.muted)}>Anotado: {feeling || 'sin sentimiento elegido'}. Vuelve cuando lo necesites.</Text>
              {cta('Terminar sesión', () => { useStore.getState().finishSession(id); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }, true)}
            </View>
          )}
        </ScrollView>
        {/* own wrapper: a Press with alignSelf directly in this column stretched to the screen bottom on Android and squeezed the content to 0 */}
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <Press label="Salir de la sesión" onPress={() => useStore.getState().setActiveSession(null)} style={{ minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' }}><Text style={font('small', color.muted)}>Salir</Text></Press>
        </View>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
