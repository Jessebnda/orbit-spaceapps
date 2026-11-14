import { useEffect } from 'react';
import { Modal, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EMERGENCY_LABEL, type Emergency } from '@orbit/shared';
import { send } from '../../services/hub';
import { useNameOf, useStore } from '../../store/store';
import { color, font, motion } from '../../theme';
import { HoldRing } from '../../components/ui/HoldRing';
import { Icon } from '../../components/ui/Icon';
import { Breathing } from '../protocols/Breathing';
import { CprGuide } from './CprGuide';

const BEAT_MS = Math.round(60000 / motion.cprBpm);

/** Takeover de emergencia sobre todo. Único lugar, con el SOS, donde aparece el rojo de emergencia. */
export function EmergencyTakeover() {
  const e = useStore((s) => s.emergency);
  return (
    <Modal visible={!!e} animationType="fade" presentationStyle="fullScreen" statusBarTranslucent supportedOrientations={['portrait', 'landscape']}>
      {e && <EmergencyView e={e} />}
    </Modal>
  );
}

function EmergencyView({ e }: { e: Emergency }) {
  useKeepAwake();
  const crewId = useStore((s) => s.profile.crewId);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const nameOf = useNameOf();
  const victim = e.victimId === crewId;
  const rank = e.responders.indexOf(crewId);
  const cpr = !victim && e.kind === 'cardiac_arrest';
  const edge = useSharedValue(0.25);
  useEffect(() => {
    if (!cpr) return;
    // Borde de pantalla a la par del metrónomo (visible de reojo).
    const id = setInterval(() => edge.set(withSequence(withTiming(1, { duration: 120 }), withTiming(0.25, { duration: 320, easing: Easing.out(Easing.quad) }))), BEAT_MS);
    return () => clearInterval(id);
  }, [cpr, edge]);
  const edgeStyle = useAnimatedStyle(() => ({ opacity: edge.get() }));
  const resolve = () => {
    send({ t: 'resolve', emergencyId: e.id });
    useStore.getState().setEmergency(null);
  };
  const wide = width > height;
  const head = (
    <Animated.View entering={FadeIn.duration(300).easing(Easing.bezier(0.23, 1, 0.32, 1))} style={{ gap: 6 }}>
      <Text style={font('caption', color.emergency)}>Emergencia · {EMERGENCY_LABEL[e.kind]}</Text>
      {victim ? (
        <Text style={font('hero')}>Se avisó a {e.responders.map(nameOf).join(', ') || 'tu equipo'}</Text>
      ) : (
        <Text style={font('hero')}>{cpr ? `${nameOf(e.victimId)} necesita RCP` : rank === 0 ? 'Eres el más cercano' : rank > 0 ? `Eres el ${rank + 1}.º más cercano` : 'Alerta cerca de ti'}</Text>
      )}
      <Text style={font('body', color.muted)}>{victim ? 'No te levantes. Respira despacio.' : cpr ? (rank === 0 ? 'Eres el más cercano' : `Rescatista ${rank + 1}`) : `Acude a ${nameOf(e.victimId)} y mantén contacto visual.`}</Text>
    </Animated.View>
  );
  const body = victim ? (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <Icon name="figure.mind.and.body" size={64} color={color.muted} />
      {e.kind === 'panic' || e.kind === 'hypoxia' ? <Breathing /> : null}
    </View>
  ) : cpr ? <CprGuide /> : null;
  const resolveBtn = (
    <HoldRing label="Marcar como resuelto, mantén pulsado" hint="Mantén un segundo" onComplete={resolve} width={Math.min(wide ? 320 : width - 32, 420)} height={50} radius={14} stroke={3} tint={color.status.ok} style={{ backgroundColor: color.raised, borderRadius: 14, borderCurve: 'continuous' }}>
      <Text style={font('button')}>Resuelto — mantén 1 s</Text>
    </HoldRing>
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: insets.top + 6, paddingBottom: insets.bottom + 12, paddingHorizontal: 16 }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderWidth: 6, borderColor: color.emergency }, edgeStyle]} />
      {wide ? (
        <View style={{ flex: 1, flexDirection: 'row', gap: 24, alignItems: 'center' }}>
          <View style={{ flex: 1, alignItems: 'center' }}>{body}</View>
          <View style={{ flex: 1, gap: 24 }}>{head}{resolveBtn}</View>
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'space-between', gap: 12 }}>
          {head}
          <View style={{ alignItems: 'center' }}>{body}</View>
          <View style={{ alignItems: 'center' }}>{resolveBtn}</View>
        </View>
      )}
    </View>
  );
}
