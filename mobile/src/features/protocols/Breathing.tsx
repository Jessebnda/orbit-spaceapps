import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, cancelAnimation, interpolate, useAnimatedReaction, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';
import { alpha, color, font } from '../../theme';
import { Ring } from '../../components/ui/Ring';
import { useReducedMotion } from '../../theme/useReducedMotion';

const PHASES = ['Inhala', 'Sostén', 'Exhala', 'Sostén'] as const;
const CYCLE_MS = 16000; // 4 fases x 4 s, un solo reloj

function Petal({ i, p }: { i: number; p: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${i * 60}deg` }, { translateY: -interpolate(p.get(), [0, 0.25, 0.5, 0.75, 1], [0, 34, 34, 0, 0]) }],
  }));
  return <Animated.View style={[{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: alpha(color.accent, 0.22) }, style]} />;
}

/** Respirar 4-4-4-4 (Apple Watch): flor de 6 pétalos con UN reloj; fase, cuenta y háptico salen del mismo progreso. */
export function Breathing({ cycles = Infinity, onDone }: { cycles?: number; onDone?: () => void }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  const [sec, setSec] = useState(0);
  const done = useRef(0);

  useEffect(() => {
    p.set(withRepeat(withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(p);
  }, [p]);

  const onTick = useCallback((i: number) => {
    setSec(i);
    if (i % 4 === 0) void Haptics.impactAsync(i === 8 ? Haptics.ImpactFeedbackStyle.Soft : Haptics.ImpactFeedbackStyle.Light);
    else if (i < 4 && i % 4 === 2) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // tic a mitad de la inhalación
    if (i === 0 && done.current++ >= 1 && done.current - 1 >= cycles) onDone?.();
  }, [cycles, onDone]);

  useAnimatedReaction(
    () => Math.floor(p.get() * 16) % 16,
    (i, prev) => {
      if (i !== prev) scheduleOnRN(onTick, i);
    },
  );

  const phase = Math.floor(sec / 4);
  const session = Number.isFinite(cycles) ? Math.min(1, (done.current - 1 + sec / 16) / cycles) : 0;
  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <Ring size={260} stroke={3} value={Math.max(0, session)} tint={color.accent}>
        <View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center' }}>
          {reduced ? <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: alpha(color.accent, 0.3) }} /> : [0, 1, 2, 3, 4, 5].map((i) => <Petal key={i} i={i} p={p} />)}
          <View style={{ position: 'absolute', alignItems: 'center' }}>
            <Text style={font('title')}>{PHASES[phase]}</Text>
            <Text style={font('display', color.muted)}>{(sec % 4) + 1}</Text>
          </View>
        </View>
      </Ring>
    </View>
  );
}
