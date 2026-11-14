import { useEffect } from 'react';
import Animated, { Easing, useAnimatedProps, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import { alpha } from '../../theme';
import { useReducedMotion } from '../../theme/useReducedMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Anillo de progreso (pista al 22 %, extremos redondos). Anima strokeDashoffset en el hilo de UI: barrido 900 ms al montar, muelle después. `progress` externo (SharedValue) tiene prioridad. */
export function Ring({ size, stroke, value = 0, tint, progress, mark, children }: {
  size: number;
  stroke: number;
  value?: number;
  tint: string;
  progress?: SharedValue<number>;
  /** Marca de ritmo 0..1 (p. ej. avance esperado del día): tick que cruza el anillo. */
  mark?: number;
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
        {mark != null && mark > 0 && mark < 1 ? (() => {
          const a = mark * 2 * Math.PI;
          const x = (rad: number) => size / 2 + rad * Math.cos(a);
          const y = (rad: number) => size / 2 + rad * Math.sin(a);
          return <Line x1={x(r - stroke * 0.7)} y1={y(r - stroke * 0.7)} x2={x(r + stroke * 0.7)} y2={y(r + stroke * 0.7)} stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />;
        })() : null}
      </Svg>
      {children}
    </Animated.View>
  );
}
