import { useCallback, useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../store/store';
import { color, font, radius, space } from '../../theme';
import { Press } from '../../components/ui/Press';
import { FormSection } from '../../components/ui/FormSection';
import { Breathing } from '../protocols/Breathing';

const FEELINGS = ['Tranquilo', 'Cansado', 'Ansioso', 'Triste', 'Motivado'];
const PROMPTS = ['¿Qué te preocupa más hoy?', '¿Qué salió bien desde ayer?'];
const SNOOZE_LABEL = 'Después';

/** Aviso in-app cuando llega la hora de una sesión programada. */
export function SessionBanner() {
  const sessions = useStore((s) => s.sessions);
  const active = useStore((s) => s.activeSession);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);
  const due = sessions.find((x) => !x.done && x.ts <= now);
  if (!due || active) return null;
  return (
    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={{ position: 'absolute', bottom: 88, left: space.lg, right: space.lg, backgroundColor: color.raised, borderRadius: radius.lg, padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View style={{ flex: 1 }}>
        <Text style={font('caption', color.accent)}>Sesión programada</Text>
        <Text style={font('small')}>Es hora de tu sesión con la mascota.</Text>
      </View>
      <Press label={SNOOZE_LABEL} onPress={() => useStore.getState().snoozeSession(due.id)} style={{ padding: space.sm }}><Text style={font('small', color.muted)}>{SNOOZE_LABEL}</Text></Press>
      <Press label="Empezar sesión" onPress={() => useStore.getState().setActiveSession(due.id)} style={{ backgroundColor: color.accent, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: space.sm }}>
        <Text style={font('button', color.onAccent)}>Empezar</Text>
      </Press>
    </Animated.View>
  );
}

/** Sesión guiada: sentimiento, dos preguntas, respiración de tres ciclos y cierre. */
export function SessionFlow() {
  const id = useStore((s) => s.activeSession);
  const insets = useSafeAreaInsets();
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
  return (
    <Modal visible animationType="fade" onRequestClose={() => useStore.getState().setActiveSession(null)}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: color.bg, padding: space.lg, paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg, gap: space.xl }}>
        <Text style={font('caption', color.muted)}>Paso {step + 1} de 4</Text>
        {step === 0 && (
          <FormSection title="¿Cómo te sientes?">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {FEELINGS.map((f) => (
                <Press key={f} label={f} onPress={() => { setFeeling(f); next(); }} style={{ borderRadius: radius.full, backgroundColor: color.raised, paddingHorizontal: space.md, paddingVertical: space.sm }}>
                  <Text style={font('body')}>{f}</Text>
                </Press>
              ))}
            </View>
          </FormSection>
        )}
        {step === 1 && (
          <FormSection title="Reflexiona">
            {PROMPTS.map((p, i) => (
              <View key={p} style={{ gap: space.sm }}>
                <Text style={font('body')}>{p}</Text>
                <TextInput value={notes[i]} onChangeText={(t) => setNotes((n) => n.map((x, j) => (j === i ? t : x)))} multiline style={{ backgroundColor: color.surface, borderRadius: radius.md, padding: space.md, color: color.text, fontSize: 16, minHeight: 72 }} />
              </View>
            ))}
            <Press label="Siguiente" onPress={next} style={{ backgroundColor: color.accent, borderRadius: radius.md, padding: space.md, alignItems: 'center' }}>
              <Text style={font('button', color.onAccent)}>Siguiente</Text>
            </Press>
          </FormSection>
        )}
        {step === 2 && (
          <FormSection title="Respira conmigo">
            <Breathing cycles={3} onDone={onBreathDone} />
          </FormSection>
        )}
        {step === 3 && (
          <FormSection title="Sesión completa" hint={`Anotado: ${feeling || 'sin sentimiento elegido'}. Vuelve cuando lo necesites.`}>
            <Press label="Terminar sesión" onPress={() => { useStore.getState().finishSession(id); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }} style={{ backgroundColor: color.accent, borderRadius: radius.md, padding: space.md, alignItems: 'center' }}>
              <Text style={font('button', color.onAccent)}>Terminar sesión</Text>
            </Press>
          </FormSection>
        )}
      </ScrollView>
    </Modal>
  );
}
