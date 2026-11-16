import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { JumpCounter } from '@orbit/shared';
import { color, font, radius } from '../../theme';
import { Icon } from '../../components/ui/Icon';
import { Press } from '../../components/ui/Press';
import { Ring } from '../../components/ui/Ring';
import { useReducedMotion } from '../../theme/useReducedMotion';
import { onImu, pauseHr } from '../../services/sensors/decoder';

const GOAL = 5;
const IMU_STALE_MS = 2000;

/** Jumps in place (hands still, for the hand band) counted from the chest IMU (vest, "ESP32_Sensores"): each landing spike over the learned gravity is one rep. */
export function JumpingJacks() {
  const reduced = useReducedMotion();
  const [reps, setReps] = useState(0);
  const [running, setRunning] = useState(false);
  const [imu, setImu] = useState<{ at: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!running) return;
    // Only the chest: it moves with the body's centre; the hand band swings with the arms and over-counts.
    const counter = new JumpCounter(); // fresh per start, so it learns gravity from the person standing still
    let shownAt = 0;
    let log = { at: Date.now(), n: 0, lo: Infinity, hi: 0 }; // once a second: IMU rate and |a| range, to tune the thresholds
    const off = onImu((t, a, from) => {
      if (from !== 'vest') return;
      const at = Date.now();
      if (at - shownAt > 500) { shownAt = at; setImu({ at }); }
      const m = Math.hypot(a.x, a.y, a.z);
      log = { ...log, n: log.n + 1, lo: Math.min(log.lo, m), hi: Math.max(log.hi, m) };
      if (at - log.at >= 1000) {
        console.log('[jump] imu', log.n, '/s |a|', log.lo.toFixed(1), '-', log.hi.toFixed(1), 'cuenta', counter.count);
        log = { at, n: 0, lo: Infinity, hi: 0 };
      }
      if (!counter.push(t, a)) return;
      console.log('[jump] salto', counter.count, '|a|', m.toFixed(1));
      setReps((r) => r + 1);
      void Haptics.selectionAsync();
      if (!reduced) pulse.set(withSequence(withTiming(1.04, { duration: 120 }), withTiming(1, { duration: 300 })));
    });
    const tick = setInterval(() => setNow(Date.now()), 1000);
    pauseHr(true);
    return () => { off(); clearInterval(tick); pauseHr(false); };
  }, [running, reduced, pulse]);

  const live = imu != null && now - imu.at < IMU_STALE_MS;
  const status = !running ? 'Quédate quieto un segundo al empezar: así Orbit mide tu gravedad.'
    : live ? 'Contando con la IMU del pecho (esp sensores)'
    : 'Sin lectura de la IMU del pecho. Conecta esp sensores (chaleco) para contar los saltos.';
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));
  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <Animated.View style={style}>
        <Ring size={160} stroke={10} value={Math.min(1, reps / GOAL)} tint={color.accent}>
          <Icon name="figure.run" size={28} color={color.muted} />
          <Text style={font('display')} accessibilityLabel={`${reps} saltos de ${GOAL}`}>{reps}</Text>
        </Ring>
      </Animated.View>
      <Text style={[font('small', running && !live ? color.status.watch : color.muted), { textAlign: 'center' }]} accessibilityLiveRegion="polite">{status}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Press label={running ? 'Pausar' : 'Empezar'} haptic="light" onPress={() => setRunning((r) => !r)} style={{ height: 44, paddingHorizontal: 28, borderRadius: radius.full, backgroundColor: color.raised, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={font('button', color.accentText)}>{running ? 'Pausar' : 'Empezar'}</Text>
        </Press>
        {reps > 0 && !running ? (
          <Press label="Reiniciar conteo" haptic="light" onPress={() => setReps(0)} style={{ height: 44, paddingHorizontal: 20, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={font('button', color.muted)}>Reiniciar</Text>
          </Press>
        ) : null}
      </View>
    </View>
  );
}
