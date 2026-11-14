import { useEffect } from 'react';
import Animated, { Easing, useAnimatedProps, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { alpha } from '../../theme';
import { useReducedMotion } from '../../theme/useReducedMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Anillo de progreso (pista al 22 %, extremos redondos). Anima strokeDashoffset en el hilo de UI: barrido 900 ms al montar, muelle después. `progress` externo (SharedValue) tiene prioridad. */
export function Ring({ size, stroke, value = 0, tint, progress, children }: {
  size: number;
  stroke: number;
  value?: number;
  tint: string;
  progress?: SharedValue<number>;
  children?: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const own = useSharedValue(0);
  const p = progress ?? own;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  useEffect(() => {
    if (progress) return;
    const v = Math.min(1, Math.max(0, value));
    if (reduced) own.set(v);
    else if (own.get() === 0) own.set(withTiming(v, { duration: 900, easing: Easing.bezier(0.23, 1, 0.32, 1) }));
    else own.set(withSpring(v, { duration: 600, dampingRatio: 1 }));
  }, [value, reduced, progress, own]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - p.get()) }));
  return (
    <Animated.View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={alpha(tint, 0.22)} strokeWidth={stroke} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={tint} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={`${c} ${c}`} animatedProps={props} />
      </Svg>
      {children}
    </Animated.View>
  );
}
