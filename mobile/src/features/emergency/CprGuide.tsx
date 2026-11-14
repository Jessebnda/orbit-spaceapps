import { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
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

/** Paciente boca arriba (gris) y punto de compresión en la mitad inferior del esternón. */
function Patient({ y }: { y: number }) {
  return (
    <>
      <Circle cx={52} cy={y + 12} r={14} fill={color.faint} />
      <Rect x={68} y={y} width={118} height={26} rx={13} fill={color.faint} />
      <Path d={`M184 ${y + 13} L270 ${y + 16}`} stroke={color.faint} strokeWidth={18} strokeLinecap="round" />
    </>
  );
}
function Push({ x, y }: { x: number; y: number }) {
  return (
    <>
      <Circle cx={120} cy={y} r={5} fill={color.accent} />
      <Path d={`M${x} ${y - 38} L${x} ${y - 12} M${x - 6} ${y - 18} L${x} ${y - 11} L${x + 6} ${y - 18}`} stroke={color.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  );
}
const limb = { stroke: color.text, strokeLinecap: 'round' as const, fill: 'none' };

/** Evetts-Russomano (flotando): piernas del rescatador rodean el torso y se cruzan bajo la espalda; brazos rectos al esternón. */
function FloatingDiagram() {
  return (
    <Svg width={300} height={150} viewBox="0 0 300 150" accessibilityLabel="Rescatador rodea el torso con las piernas y comprime con brazos rectos">
      <Patient y={100} />
      <Path d="M88 84 Q66 100 72 132 Q92 142 116 134" {...limb} stroke={color.muted} strokeWidth={9} />
      <Path d="M92 84 Q112 102 104 136" {...limb} strokeWidth={10} />
      <Path d="M90 84 L114 50" {...limb} strokeWidth={12} />
      <Circle cx={126} cy={34} r={12} fill={color.text} />
      <Path d="M114 52 L120 98" {...limb} strokeWidth={7} />
      <Push x={140} y={100} />
    </Svg>
  );
}

/** Parada de manos (paciente sujeto a la camilla): pies contra el techo, brazos rectos al esternón. */
function HandstandDiagram() {
  return (
    <Svg width={300} height={160} viewBox="0 0 300 160" accessibilityLabel="Rescatador de cabeza con los pies en el techo y las manos en el esternón">
      <Path d="M20 8 L280 8" stroke={color.hairline} strokeWidth={3} strokeLinecap="round" />
      <Rect x={30} y={140} width={250} height={8} rx={4} fill={color.hairline} />
      <Patient y={112} />
      <Path d="M118 70 L120 110" {...limb} strokeWidth={7} />
      <Circle cx={132} cy={86} r={12} fill={color.text} />
      <Path d="M118 68 L112 36" {...limb} strokeWidth={12} />
      <Path d="M112 36 L100 10 M112 36 L128 10" {...limb} strokeWidth={10} />
      <Push x={150} y={112} />
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
        <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 16, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={font('title')}>Flotando</Text>
          <FloatingDiagram />
          <Text style={{ ...font('body', color.muted), textAlign: 'center' }}>Rodea su torso con las piernas y cruza los pies bajo su espalda. Brazos rectos sobre la mitad inferior del esternón.</Text>
          <Text style={font('title')}>En la camilla</Text>
          <HandstandDiagram />
          <Text style={{ ...font('body', color.muted), textAlign: 'center' }}>Con el paciente sujeto, ponte de cabeza: pies contra el techo y brazos rectos sobre el esternón.</Text>
          <Text style={{ ...font('small', color.muted), textAlign: 'center' }}>Pide el DEA si está disponible.</Text>
          <Press label="Cerrar" onPress={() => setPosture(false)} style={{ height: 44, paddingHorizontal: 24, borderRadius: radius.full, backgroundColor: alpha(color.accent, 0.2), justifyContent: 'center' }}>
            <Text style={font('button', color.accentText)}>Cerrar</Text>
          </Press>
        </ScrollView>
      </Modal>
    </View>
  );
}
