import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { color } from '../../theme';
import { Icon } from '../../components/ui/Icon';
import { useReducedMotion } from '../../theme/useReducedMotion';
import { useStore } from '../../store/store';
import type { PetMood } from '../../domain/derive';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const VISOR = '#0B0B0D';
const BULB: Record<PetMood, string> = { happy: color.accent, tired: color.status.watch, sad: color.muted };

// Body outlines in the same 200x200 frame: each keeps the visor (y 86–146), arm sockets (x 40/160) and antenna base (y 72) covered.
export const PET_SHAPES = {
  bellota: { label: 'Bellota', d: 'M100 70 C150 70 165 110 160 145 C156 172 132 186 100 186 C68 186 44 172 40 145 C35 110 50 70 100 70 Z' },
  burbuja: { label: 'Burbuja', d: 'M100 70 C142 70 164 100 164 132 C164 164 138 186 100 186 C62 186 36 164 36 132 C36 100 58 70 100 70 Z' },
  gota: { label: 'Gota', d: 'M100 62 C120 74 162 104 160 146 C158 172 132 186 100 186 C68 186 42 172 40 146 C38 104 80 74 100 62 Z' },
  capsula: { label: 'Cápsula', d: 'M66 70 H134 Q160 70 160 96 V160 Q160 186 134 186 H66 Q40 186 40 160 V96 Q40 70 66 70 Z' },
  gatito: { label: 'Gatito', d: 'M58 86 L56 54 L82 72 C94 70 106 70 118 72 L144 54 L142 86 C156 104 164 124 160 145 C156 172 132 186 100 186 C68 186 44 172 40 145 C36 124 44 104 58 86 Z' },
} as const;
// Soft tints of the original white suit, so every option still reads as Orbi on the dark UI.
export const PET_COLORS = {
  blanco: { label: 'Blanco', fill: color.text },
  arena: { label: 'Arena', fill: '#EAD9BC' },
  menta: { label: 'Menta', fill: '#BDE7D2' },
  cielo: { label: 'Cielo', fill: '#BCD7F3' },
  coral: { label: 'Coral', fill: '#F5C1B3' },
  limon: { label: 'Limón', fill: '#EEE5A6' },
} as const;
export type PetShape = keyof typeof PET_SHAPES;
export type PetColor = keyof typeof PET_COLORS;

function Heart({ i, t }: { i: number; t: { get: () => number } }) {
  const s = useAnimatedStyle(() => ({ opacity: t.get() > 0 ? 1 - t.get() : 0, transform: [{ translateY: -24 * t.get() }, { translateX: (i - 1) * 18 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: '20%', alignSelf: 'center' }, s]}><Icon name="heart.fill" size={14} color={color.accent} /></Animated.View>;
}

/** Orbi: astronauta-bellota hecha de capas SVG. Estado = forma (ojos, párpados, antena, brazos), no solo la boca. Respira y parpadea en el hilo de UI; al tocarla rebota y suelta corazones. */
export function Creature({ size = 200, mood = 'happy', interactive = false, shape, tint }: { size?: number; mood?: PetMood; interactive?: boolean; shape?: PetShape; tint?: PetColor }) {
  const profile = useStore((s) => s.profile);
  const outline = PET_SHAPES[shape ?? (profile.petShape as PetShape)] ?? PET_SHAPES.bellota;
  const suit = (PET_COLORS[tint ?? (profile.petColor as PetColor)] ?? PET_COLORS.blanco).fill;
  const reduced = useReducedMotion();
  const breathe = useSharedValue(0);
  const jump = useSharedValue(0);
  const hearts = useSharedValue(0);
  const lid = useSharedValue(mood === 'tired' ? 10 : 0);
  const last = useRef(0);
  const base = mood === 'tired' ? 10 : 0;

  useEffect(() => {
    if (reduced) { cancelAnimation(breathe); breathe.set(0); return; }
    breathe.set(withRepeat(withTiming(1, { duration: 2400, easing: Easing.bezier(0.45, 0, 0.55, 1) }), -1, true));
  }, [breathe, reduced]);

  useEffect(() => {
    lid.set(base);
    if (reduced) return;
    let id: ReturnType<typeof setTimeout>;
    const blink = () => {
      lid.set(withSequence(withTiming(22, { duration: 80 }), withTiming(base, { duration: 100 })));
      id = setTimeout(blink, 2800 + Math.random() * 2200);
    };
    id = setTimeout(blink, 2800);
    return () => clearTimeout(id);
  }, [base, lid, reduced]);

  const body = useAnimatedStyle(() => ({
    transform: [
      { translateY: -2 * breathe.get() + jump.get() * -14 },
      { scaleY: 1 + 0.035 * breathe.get() - (mood === 'sad' ? 0.06 : 0) },
    ],
  }));
  const lidProps = useAnimatedProps(() => ({ height: lid.get() }));

  const poke = () => {
    const now = Date.now();
    if (now - last.current < 450) return;
    last.current = now;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    hearts.set(0);
    hearts.set(withTiming(1, { duration: 600 }));
    if (!reduced) jump.set(withSequence(withTiming(0, { duration: 90 }), withSpring(1, { duration: 400, dampingRatio: 0.8 }), withDelay(60, withSpring(0, { duration: 400, dampingRatio: 0.8 }))));
  };

  const mouth = mood === 'happy' ? 'M88 124 Q100 136 112 124' : mood === 'sad' ? 'M91 130 Q100 122 109 130' : 'M93 127 L107 127';
  const armRot = mood === 'happy' ? 24 : mood === 'sad' ? -6 : 0;
  const antenna = mood === 'tired' ? 'M100 72 Q104 58 118 52' : 'M100 72 L100 46';
  const bulb = mood === 'tired' ? { x: 118, y: 49 } : { x: 100, y: 42 };

  const art = (
    <Animated.View style={[{ width: size, height: size }, body]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Ellipse cx={100} cy={188} rx={40} ry={5} fill="rgba(0,0,0,0.35)" />
        <G rotation={-armRot} origin="40, 135"><Ellipse cx={38} cy={140} rx={9} ry={15} fill={suit} /></G>
        <G rotation={armRot} origin="160, 135"><Ellipse cx={162} cy={140} rx={9} ry={15} fill={suit} /></G>
        <Path d={outline.d} fill={suit} />
        <Path d={antenna} stroke={color.accent} strokeWidth={4} strokeLinecap="round" fill="none" />
        <Circle cx={bulb.x} cy={bulb.y} r={6} fill={BULB[mood]} />
        <Ellipse cx={100} cy={116} rx={46} ry={30} fill={VISOR} fillOpacity={0.88} />
        <Path d="M68 102 Q76 93 90 91" stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth={3} strokeLinecap="round" fill="none" />
        {[86, 114].map((x) => (
          <G key={x}>
            <Ellipse cx={x} cy={114} rx={7} ry={10} fill={color.text} />
            <Circle cx={x} cy={115} r={3.4} fill={VISOR} />
            <Circle cx={x + 1.6} cy={112} r={1.4} fill={color.text} />
            <AnimatedRect x={x - 8} y={103} width={16} height={0} fill={VISOR} animatedProps={lidProps} />
          </G>
        ))}
        {mood === 'sad' ? <Path d="M78 100 L94 104 M122 100 L106 104" stroke={color.text} strokeWidth={2.5} strokeLinecap="round" /> : null}
        <Path d={mouth} stroke={color.text} strokeWidth={3} strokeLinecap="round" fill="none" />
        {mood === 'happy' ? (<><Ellipse cx={72} cy={128} rx={7} ry={4} fill={color.text} fillOpacity={0.12} /><Ellipse cx={128} cy={128} rx={7} ry={4} fill={color.text} fillOpacity={0.12} /></>) : null}
        {mood === 'sad' ? <Ellipse cx={126} cy={134} rx={3} ry={5} fill={color.text} fillOpacity={0.6} /> : null}
      </Svg>
      {[0, 1, 2].map((i) => <Heart key={i} i={i} t={hearts} />)}
    </Animated.View>
  );
  if (!interactive) return art;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Orbi" accessibilityHint="Tócala para saludar" onPress={poke}>
      <View>{art}</View>
    </Pressable>
  );
}
