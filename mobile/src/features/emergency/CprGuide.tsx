import { useEffect, useState } from 'react';
import { Modal, Text, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { alpha, color, font, motion, radius } from '../../theme';
import { Icon } from '../../components/ui/Icon';
import { Press } from '../../components/ui/Press';
import { Ring } from '../../components/ui/Ring';
import { useReducedMotion } from '../../theme/useReducedMotion';

const BEAT_MS = Math.round(60000 / motion.cprBpm);
const SWAP_S = 120;
const VENT_MS = 6000;
const SIZE = 260;
const STROKE = 14;
const SEG = 30;

/** Evetts-Russomano en microgravedad: las piernas del rescatador sujetan el torso, manos en el centro del pecho. */
function Diagram() {
  return (
    <Svg width={300} height={160} viewBox="0 0 300 160">
      <Circle cx={40} cy={100} r={18} fill={color.raised} />
      <Rect x={58} y={84} width={150} height={34} rx={17} fill={color.raised} />
      <Circle cx={210} cy={50} r={16} fill={color.text} />
      <Path d="M212 68 L200 118" stroke={color.text} strokeWidth={9} strokeLinecap="round" />
      <Path d="M200 118 Q170 150 130 128" stroke={color.text} strokeWidth={9} strokeLinecap="round" fill="none" />
      <Path d="M200 118 Q230 150 260 128" stroke={color.text} strokeWidth={9} strokeLinecap="round" fill="none" />
      <Path d="M212 78 L120 100" stroke={color.text} strokeWidth={7} strokeLinecap="round" />
    </Svg>
  );
}

/** 30 segmentos: cada compresión llena uno. */
function Segments({ count }: { count: number }) {
  const r = (SIZE - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const seg = c / SEG;
  return (
    <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
      {Array.from({ length: SEG }, (_, i) => (
        <Circle key={i} cx={SIZE / 2} cy={SIZE / 2} r={r} stroke={i < count ? color.accent : color.raised} strokeWidth={STROKE} fill="none" strokeDasharray={`${seg - 4} ${c - seg + 4}`} strokeLinecap="round" transform={`rotate(${(i * 360) / SEG - 90} ${SIZE / 2} ${SIZE / 2})`} />
      ))}
    </Svg>
  );
}

/** Compresiones a 110/min: el anillo entero es el metrónomo (opacidad + escala por pulso), un segmento por compresión, 30:2 y cambio de reanimador cada 2 min.
 *  Háptico: solo Medium por compresión; Warning al pasar a ventilación y al llegar el cambio de reanimador. */
export function CprGuide({ onSwap }: { onSwap?: (secsLeft: number) => void }) {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  const vent = useSharedValue(0);
  const [count, setCount] = useState(0);
  const [breaths, setBreaths] = useState(false);
  const [swap, setSwap] = useState(SWAP_S);
  const [posture, setPosture] = useState(false);

  useEffect(() => {
    if (breaths) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      vent.set(0);
      vent.set(withTiming(1, { duration: VENT_MS, easing: Easing.linear }));
      const id = setTimeout(() => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setBreaths(false);
        setCount(0);
      }, VENT_MS);
      return () => { clearTimeout(id); cancelAnimation(vent); };
    }
    const id = setInterval(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      pulse.set(reduced ? withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 320 })) : withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 320 })));
      setCount((c) => {
        if (c + 1 >= SEG) {
          setBreaths(true);
          return SEG;
        }
        return c + 1;
      });
    }, BEAT_MS);
    return () => clearInterval(id);
  }, [breaths, pulse, vent, reduced]);

  useEffect(() => {
    const id = setInterval(() => setSwap((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    onSwap?.(swap);
    if (swap === 0) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [swap, onSwap]);

  const beat = useAnimatedStyle(() => ({ opacity: 0.35 + 0.65 * pulse.get(), transform: [{ scale: reduced ? 1 : 1 + 0.03 * pulse.get() }] }));

  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      {breaths ? (
        <Ring size={SIZE} stroke={STROKE} progress={vent} tint={color.text}>
          <Text style={font('hud')}>2</Text>
          <Text style={font('title')}>ventilaciones</Text>
        </Ring>
      ) : (
        <Animated.View style={[{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }, beat]}>
          <Segments count={count} />
          <Text style={font('hud')} accessibilityLabel={`${count} de 30 compresiones`}>{count}</Text>
          <Text style={font('body', color.muted)}>de 30</Text>
        </Animated.View>
      )}
      <Text style={{ ...font('title'), textAlign: 'center' }}>{breaths ? 'Abre la vía aérea. 1 s cada una.' : 'Mitad inferior del esternón · 5–6 cm'}</Text>
      <Text style={font('body', swap === 0 ? color.emergency : color.muted)}>{swap === 0 ? 'Cambia de reanimador ahora' : `Cambio de reanimador en ${Math.floor(swap / 60)}:${String(swap % 60).padStart(2, '0')}`}</Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Press label="Ver postura" onPress={() => setPosture(true)} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', height: 44, paddingHorizontal: 16, borderRadius: radius.full, backgroundColor: color.raised }}>
          <Icon name="figure.mind.and.body" size={18} color={color.accent} />
          <Text style={font('button', color.accentText)}>Ver postura</Text>
        </Press>
        {swap === 0 ? (
          <Press label="Reiniciar cambio" onPress={() => setSwap(SWAP_S)} style={{ height: 44, paddingHorizontal: 16, borderRadius: radius.full, backgroundColor: color.raised, justifyContent: 'center' }}>
            <Text style={font('button')}>Reiniciar cambio</Text>
          </Press>
        ) : null}
      </View>
      <Modal visible={posture} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPosture(false)}>
        <View style={{ flex: 1, backgroundColor: color.bg, padding: 24, gap: 16, alignItems: 'center', justifyContent: 'center' }}>
          <Diagram />
          <Text style={{ ...font('body', color.muted), textAlign: 'center' }}>1. Llama al AED si está disponible.{'\n'}2. Cuando el paciente esté en la camilla médica, cambia al método de paro de manos.</Text>
          <Press label="Cerrar" onPress={() => setPosture(false)} style={{ height: 44, paddingHorizontal: 24, borderRadius: radius.full, backgroundColor: alpha(color.accent, 0.2), justifyContent: 'center' }}>
            <Text style={font('button', color.accentText)}>Cerrar</Text>
          </Press>
        </View>
      </Modal>
    </View>
  );
}
