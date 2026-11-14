import { useEffect, useState } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, cancelAnimation } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { color } from '../../theme';
import { useReducedMotion } from '../../theme/useReducedMotion';
import type { PetMood } from '../../domain/derive';

/** Motion #2 del brief: respiración en reposo. Con Reducir movimiento la mascota queda quieta. */
export function Creature({ size = 120, mood = 'happy' }: { size?: number; mood?: PetMood }) {
  const reduced = useReducedMotion();
  const breathe = useSharedValue(1);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(breathe);
      breathe.value = 1;
      return;
    }
    breathe.value = withRepeat(withTiming(1.035, { duration: 2400, easing: Easing.bezier(0.45, 0, 0.55, 1) }), -1, true);
  }, [breathe, reduced]);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3600);
    return () => clearInterval(id);
  }, [reduced]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: breathe.value }] }));
  const mouth = mood === 'happy' ? 'M46 80 Q60 92 74 80' : mood === 'sad' ? 'M46 88 Q60 76 74 88' : 'M48 84 L72 84';
  const closed = blink || mood === 'tired';
  return (
    <Animated.View style={style}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Circle cx={60} cy={62} r={44} fill={color.accent} />
        {closed ? (
          <>
            <Rect x={38} y={56} width={14} height={3} rx={1.5} fill={color.bg} />
            <Rect x={68} y={56} width={14} height={3} rx={1.5} fill={color.bg} />
          </>
        ) : (
          <>
            <Circle cx={45} cy={58} r={5} fill={color.bg} />
            <Circle cx={75} cy={58} r={5} fill={color.bg} />
          </>
        )}
        <Path d={mouth} stroke={color.bg} strokeWidth={3.5} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}
