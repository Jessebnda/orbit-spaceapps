import { useCallback, useRef, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const HOLD_MS = 1000;

/** Mantener para confirmar: un borde redondeado se llena 0→100 % en 1 s (lineal). Háptico Light / Medium / Heavy a 0, 33 y 66 %, Error al completar. Soltar cancela en 120 ms.
 *  Accesible: acción `activate` de VoiceOver confirma sin mantener. */
export function HoldRing({ label, hint, onComplete, width, height, radius, stroke, tint, style, children }: {
  label: string;
  hint?: string;
  onComplete: () => void;
  width: number;
  height: number;
  radius: number;
  stroke: number;
  tint: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const p = useSharedValue(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const perimeter = 2 * (width + height - 2 * radius) + 2 * Math.PI * radius;
  const props = useAnimatedProps(() => ({ strokeDashoffset: perimeter * (1 - p.get()) }));

  const start = useCallback(() => {
    clear();
    p.set(withTiming(1, { duration: HOLD_MS, easing: Easing.linear }));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    timers.current.push(setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), HOLD_MS / 3));
    timers.current.push(setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), (HOLD_MS * 2) / 3));
    timers.current.push(setTimeout(() => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      onComplete();
      p.set(withTiming(0, { duration: 400 }));
    }, HOLD_MS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onComplete, p]);
  const cancel = useCallback(() => {
    clear();
    p.set(withTiming(0, { duration: 120 }));
  }, [p]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityActions={[{ name: 'activate', label }]}
      onAccessibilityAction={onComplete}
      onPressIn={start}
      onPressOut={cancel}
      hitSlop={8}
      style={[{ width, height }, style]}
    >
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        {children}
        <Svg width={width} height={height} style={{ position: 'absolute' }} pointerEvents="none">
          <AnimatedRect x={stroke / 2} y={stroke / 2} width={width - stroke} height={height - stroke} rx={radius - stroke / 2} stroke={tint} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${perimeter} ${perimeter}`} animatedProps={props} />
        </Svg>
      </View>
    </Pressable>
  );
}
