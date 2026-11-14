import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { color, font, radius } from '../../theme';
import { Icon } from '../../components/ui/Icon';
import { Press } from '../../components/ui/Press';
import { Ring } from '../../components/ui/Ring';
import { useReducedMotion } from '../../theme/useReducedMotion';

const BEAT_MS = 500;

/** Metrónomo de repeticiones: una cada 500 ms con tic háptico, anillo que se llena cada 30 y pulso de escala. Sin figura de palo. */
export function JumpingJacks() {
  const reduced = useReducedMotion();
  const [reps, setReps] = useState(0);
  const [running, setRunning] = useState(false);
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setReps((r) => r + 1);
      void Haptics.selectionAsync();
      if (!reduced) pulse.set(withSequence(withTiming(1.04, { duration: 120 }), withTiming(1, { duration: 300 })));
    }, BEAT_MS);
    return () => clearInterval(id);
  }, [running, reduced, pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));
  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <Animated.View style={style}>
        <Ring size={160} stroke={10} value={(reps % 30) / 30} tint={color.accent}>
          <Icon name="figure.run" size={28} color={color.muted} />
          <Text style={font('display')}>{reps}</Text>
        </Ring>
      </Animated.View>
      <Press label={running ? 'Pausar' : 'Empezar'} haptic="light" onPress={() => setRunning((r) => !r)} style={{ height: 44, paddingHorizontal: 28, borderRadius: radius.full, backgroundColor: color.raised, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={font('button', color.accentText)}>{running ? 'Pausar' : 'Empezar'}</Text>
      </Press>
    </View>
  );
}
