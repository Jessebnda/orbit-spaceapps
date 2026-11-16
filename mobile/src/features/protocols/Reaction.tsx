import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { color, figureFont, font, radius } from '../../theme';
import { Press } from '../../components/ui/Press';

const TRIALS = 5;
type Phase = 'idle' | 'wait' | 'go' | 'early' | 'done';

/** Short reaction-time test after NASA's PVT: wait for green, tap; the median of 5 tries is the score. */
export function Reaction() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [times, setTimes] = useState<number[]>([]);
  const shownAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const arm = () => {
    setPhase('wait');
    timer.current = setTimeout(() => { shownAt.current = Date.now(); setPhase('go'); }, 1500 + Math.random() * 2500);
  };
  const tap = () => {
    if (phase === 'idle' || phase === 'early') return arm();
    if (phase === 'done') { setTimes([]); return arm(); }
    if (phase === 'wait') { clearTimeout(timer.current); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return setPhase('early'); }
    const next = [...times, Date.now() - shownAt.current];
    setTimes(next);
    void Haptics.selectionAsync();
    if (next.length >= TRIALS) setPhase('done');
    else arm();
  };
  const sorted = [...times].sort((a, b) => a - b);
  const median = sorted[sorted.length >> 1];
  const label = { idle: 'Toca para empezar', wait: 'Espera el verde…', go: '¡Toca!', early: 'Muy pronto. Toca para repetir', done: 'Toca para repetir la prueba' }[phase];

  return (
    <View style={{ gap: 12 }}>
      <Press label={label} onPress={tap} style={{ height: 180, borderRadius: radius.lg, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: phase === 'go' ? color.status.ok : color.raised }}>
        {phase === 'done' ? <Text style={font('display')}>{median} ms</Text> : null}
        <Text style={font('button', phase === 'go' ? color.bg : color.text)}>{label}</Text>
      </Press>
      <Text style={[figureFont('small'), { color: color.muted, textAlign: 'center' }]} accessibilityLiveRegion="polite">
        {phase === 'done' ? `Mediana de ${TRIALS} intentos. Menos de 400 ms es lo habitual descansado.` : `Intento ${Math.min(times.length + 1, TRIALS)} de ${TRIALS}`}
      </Text>
    </View>
  );
}
