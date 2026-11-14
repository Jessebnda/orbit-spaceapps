import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { color, font, space } from '../../theme';
import { useReducedMotion } from '../../theme/useReducedMotion';

const PHASES = ['Inhala', 'Sostén', 'Exhala', 'Sostén'] as const;
const STEP_MS = 4000;

/** Motion #3 del brief: respiración 4-4-4-4. Con Reducir movimiento queda el texto y el háptico. */
export function Breathing({ cycles = Infinity, onDone }: { cycles?: number; onDone?: () => void }) {
  const reduced = useReducedMotion();
  const size = useSharedValue(0.5);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(size);
      size.value = 0.75;
      return;
    }
    size.value = withRepeat(
      withSequence(
        withTiming(1, { duration: STEP_MS, easing: Easing.bezier(0.23, 1, 0.32, 1) }),
        withTiming(1, { duration: STEP_MS }),
        withTiming(0.5, { duration: STEP_MS, easing: Easing.bezier(0.77, 0, 0.175, 1) }),
        withTiming(0.5, { duration: STEP_MS }),
      ),
      -1,
      false,
    );
  }, [size, reduced]);

  useEffect(() => {
    let i = 0;
    let count = 0;
    const id = setInterval(() => {
      i = (i + 1) % 4;
      setPhase(i);
      void Haptics.selectionAsync();
      if (i === 0 && ++count >= cycles) {
        clearInterval(id);
        onDone?.();
      }
    }, STEP_MS);
    return () => clearInterval(id);
  }, [cycles, onDone]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: size.value }] }));
  return (
    <View style={{ alignItems: 'center', gap: space.md }}>
      <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ width: 200, height: 200, borderRadius: 100, backgroundColor: color.accent, opacity: 0.85 }, style]} />
      </View>
      <Text style={font('title')}>{PHASES[phase]}</Text>
    </View>
  );
}
