import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { motion } from '../../theme';
import { color, font, space } from '../../theme';
import { useReducedMotion } from '../../theme/useReducedMotion';
import { Press } from '../../components/ui/Press';

const BEAT_MS = Math.round(60000 / motion.cprBpm);
const SWAP_S = 120;

/** Evetts-Russomano en microgravedad: las piernas del rescatador sujetan el torso, manos en el centro del pecho. */
function Diagram({ pulse }: { pulse: { value: number } }) {
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={300} height={160} viewBox="0 0 300 160">
        <Circle cx={40} cy={100} r={18} fill={color.raised} />
        <Rect x={58} y={84} width={150} height={34} rx={17} fill={color.raised} />
        <Circle cx={210} cy={50} r={16} fill={color.text} />
        <Path d="M212 68 L200 118" stroke={color.text} strokeWidth={9} strokeLinecap="round" />
        <Path d="M200 118 Q170 150 130 128" stroke={color.text} strokeWidth={9} strokeLinecap="round" fill="none" />
        <Path d="M200 118 Q230 150 260 128" stroke={color.text} strokeWidth={9} strokeLinecap="round" fill="none" />
        <Path d="M212 78 L120 100" stroke={color.text} strokeWidth={7} strokeLinecap="round" />
      </Svg>
      <Animated.View style={[{ position: 'absolute', top: 70, left: 110, width: 28, height: 28, borderRadius: 14, borderWidth: 3, borderColor: color.accent }, style]} />
    </View>
  );
}

/** Compresiones a 110/min con pulso visual y háptico, ciclos 30:2 y cambio de reanimador cada 2 min. */
export function CprGuide({ onDone }: { onDone?: () => void }) {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(1);
  const [count, setCount] = useState(0);
  const [breaths, setBreaths] = useState(false);
  const [swap, setSwap] = useState(SWAP_S);

  useEffect(() => {
    if (breaths) {
      const id = setTimeout(() => { setBreaths(false); setCount(0); }, 6000);
      return () => clearTimeout(id);
    }
    const id = setInterval(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (reduced) {
        cancelAnimation(pulse);
        pulse.value = 1;
      } else pulse.value = withSequence(withTiming(1.25, { duration: 120 }), withTiming(1, { duration: 320 }));
      setCount((c) => {
        if (c + 1 >= 30) {
          setBreaths(true);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          return 0;
        }
        return c + 1;
      });
    }, BEAT_MS);
    return () => clearInterval(id);
  }, [breaths, pulse, reduced]);

  useEffect(() => {
    const id = setInterval(() => setSwap((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (swap === 0) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [swap]);

  return (
    <View style={{ gap: space.md, alignItems: 'center' }}>
      <Diagram pulse={pulse} />
      <Text style={font('hero')}>{breaths ? 'Ventilación ×2' : `${count} / 30`}</Text>
      <Text style={{ ...font('body'), textAlign: 'center' }}>
        {breaths ? 'Abre la vía aérea y da 2 ventilaciones de 1 segundo.' : 'Mitad inferior del esternón, brazos rectos, 5 a 6 cm de profundidad.'}
      </Text>
      <Text style={font('small', color.muted)}>Cambio de reanimador en {Math.floor(swap / 60)}:{String(swap % 60).padStart(2, '0')}</Text>
      <Text style={{ ...font('small', color.muted), textAlign: 'center' }}>1. Llama al AED si está disponible. 2. Cuando el paciente esté en la camilla médica, cambia al método de paro de manos.</Text>
      {swap === 0 && <Press label="Reiniciar cambio" onPress={() => setSwap(SWAP_S)}><Text style={font('button')}>Reiniciar cambio</Text></Press>}
      {onDone && <Press label="Terminar simulacro" onPress={onDone} style={{ backgroundColor: color.raised, borderRadius: 10, padding: space.md }}><Text style={font('button')}>Terminar simulacro</Text></Press>}
    </View>
  );
}
