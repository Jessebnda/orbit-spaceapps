import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Text, View, useWindowDimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Polygon, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { sendStat } from '../../services/hub';
import { useStore } from '../../store/store';
import { alpha, color, font, radius } from '../../theme';
import { initGame, tick, type GameState } from '../../domain/game';
import { Icon } from '../../components/ui/Icon';
import { Press } from '../../components/ui/Press';
import { useReducedMotion } from '../../theme/useReducedMotion';

const SHIP_HALF = 0.06;
const FRAME_MS = 33; // el estado de render se refresca a 30 Hz; el movimiento de la nave no pasa por React

/** Capa de estrellas con scroll vertical infinito en el hilo de UI. Sin estado de React. */
function StarLayer({ w, h, count, r, op, speed, still }: { w: number; h: number; count: number; r: number; op: number; speed: number; still: boolean }) {
  const y = useSharedValue(0);
  const stars = useMemo(() => Array.from({ length: count }, (_, i) => ({ x: ((i * 7919) % 997) / 997 * w, y: ((i * 104729) % 991) / 991 * h })), [count, w, h]);
  useEffect(() => {
    if (still || h === 0) return;
    y.set(0);
    y.set(withRepeat(withTiming(h, { duration: (h / speed) * 1000, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(y);
  }, [still, h, speed, y]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() - h }] }));
  const layer = (dy: number) => stars.map((s, i) => <Circle key={`${dy}${i}`} cx={s.x} cy={s.y + dy} r={r} fill={alpha(color.text, op)} />);
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: w, height: h * 2 }, st]}>
      <Svg width={w} height={h * 2}>{layer(0)}{layer(h)}</Svg>
    </Animated.View>
  );
}

/** Orbit Defender. El loop corre solo con la pantalla enfocada y la app activa. Entrada con Gesture.Pan sobre un SharedValue. */
export function GameScreen() {
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const window = useWindowDimensions();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const container = useRef<View>(null);
  const [reservedBottom, setReservedBottom] = useState(0);
  const [field, setField] = useState({ width: window.width, height: 0 });
  const width = field.width;
  const fieldH = field.height;
  // Native tabs may overlay the scene or already inset it. Only reserve the
  // obstruction that remains inside this scene; never add the home inset twice.
  const bottomObstruction = Math.max(tabBarHeight, insets.bottom);
  const bottomPadding = Math.max(0, bottomObstruction - reservedBottom) + 12;
  const measureContainer = () => container.current?.measureInWindow((_x, y, _w, height) => {
    setReservedBottom(Math.max(0, window.height - y - height));
  });
  useEffect(() => {
    if (focused) measureContainer();
  }, [focused, window.height, window.width, tabBarHeight]);
  const [active, setActive] = useState(true);
  const [running, setRunning] = useState(false);
  const [, bump] = useState(0);
  const game = useRef<GameState>(initGame());
  const shipX = useSharedValue(0.5);
  const startX = useSharedValue(0.5);
  const record = useRef(false);
  const playing = running && focused && active;
  const best = useStore((s) => s.stats.bestScore);

  const pan = Gesture.Pan()
    .onBegin(() => { startX.set(shipX.get()); })
    .onUpdate((e) => { shipX.set(Math.min(1 - SHIP_HALF, Math.max(SHIP_HALF, startX.get() + e.translationX / Math.max(1, width)))); });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = 0;
    let lastDraw = 0;
    let secs = 0;
    const loop = (t: number) => {
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      secs += dt;
      game.current = tick(game.current, dt, shipX.get());
      if (game.current.over) {
        const played = secs;
        secs = 0; // el cleanup no debe contar esta ronda dos veces
        finish(game.current.score, played);
        setRunning(false);
        bump((n) => n + 1);
        return;
      }
      if (t - lastDraw >= FRAME_MS) { lastDraw = t; bump((n) => n + 1); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      if (secs > 0) useStore.getState().addStat('gameSec', Math.round(secs));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const finish = (score: number, secs: number) => {
    const st = useStore.getState();
    record.current = score > st.stats.bestScore;
    st.setBest(score);
    st.addStat('gameSec', Math.round(secs));
    sendStat({ type: 'game_time', seconds: Math.round(secs), score });
    void Haptics.notificationAsync(record.current ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
  };
  const restart = () => {
    game.current = initGame();
    setRunning(true);
  };

  const g = game.current;
  const sx = (x: number) => x * width;
  const sy = (y: number) => y * fieldH;
  const shipStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shipX.get() * width - 14 }] }));
  const fresh = g.t === 0 && !g.over;

  return (
    <View ref={container} onLayout={measureContainer} style={{ flex: 1, backgroundColor: color.bg, paddingBottom: bottomPadding }}>
      <GestureDetector gesture={pan}>
        <View style={{ flex: 1, overflow: 'hidden' }} onLayout={(e) => setField({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
          {fieldH > 0 ? (
            <>
              <StarLayer w={width} h={fieldH} count={14} r={0.8} op={0.25} speed={12} still={reduced} />
              <StarLayer w={width} h={fieldH} count={9} r={1.2} op={0.4} speed={24} still={reduced} />
              <StarLayer w={width} h={fieldH} count={5} r={1.8} op={0.6} speed={48} still={reduced} />
              <Svg width={width} height={fieldH} pointerEvents="none">
                {g.enemies.map((e) => {
                  const x = sx(e.x), y = sy(e.y);
                  const props = { fill: 'none', stroke: color.text, strokeWidth: 1.5 } as const;
                  return e.kind === 'sq' ? (
                    <Rect key={e.id} x={x - 14} y={y - 14} width={28} height={28} {...props} />
                  ) : e.kind === 'dia' ? (
                    <Polygon key={e.id} points={`${x},${y - 17} ${x + 17},${y} ${x},${y + 17} ${x - 17},${y}`} {...props} strokeWidth={e.hp > 1 ? 3 : 1.5} />
                  ) : (
                    <Polygon key={e.id} points={`${x},${y - 14} ${x + 13},${y + 10} ${x - 13},${y + 10}`} {...props} />
                  );
                })}
                {g.shots.map((b) => <Rect key={b.id} x={sx(b.x) - 1.5} y={sy(b.y) - 5} width={3} height={10} rx={1.5} fill={color.accent} />)}
              </Svg>
              <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: sy(0.9) - 16, left: 0 }, shipStyle]}>
                <Svg width={28} height={32}><Polygon points="14,0 28,26 14,20 0,26" fill={color.accent} /><Polygon points="10,22 18,22 14,31" fill={color.text} /></Svg>
              </Animated.View>
            </>
          ) : null}

          <View pointerEvents="none" style={{ position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={font('title')}>{g.score}</Text>
              <Text style={font('small', color.muted)}>Récord {best}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel={`${g.lives} vidas`}>
              {[0, 1, 2].map((i) => <Icon key={i} name="heart.fill" size={16} color={i < g.lives ? color.text : color.faint} />)}
            </View>
          </View>

          {!running ? (
            <View style={{ position: 'absolute', left: 16, right: 16, bottom: 24, backgroundColor: color.surface, borderRadius: radius.sheet, borderCurve: 'continuous', padding: 20, gap: 12, alignItems: 'center' }}>
              {g.over ? (
                <>
                  <Text style={font('display')}>{g.score}</Text>
                  <Text style={font('body', color.muted)}>{record.current ? 'Nuevo récord' : 'Fin de la partida'}</Text>
                </>
              ) : (
                <Text style={{ ...font('body', color.muted), textAlign: 'center' }}>{fresh ? 'Arrastra para mover. Dispara sola.' : 'En pausa'}</Text>
              )}
              <Press label={g.over ? 'Otra partida' : fresh ? 'Empezar' : 'Seguir'} haptic="light" onPress={() => (g.over ? restart() : setRunning(true))} style={{ alignSelf: 'stretch', height: 50, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={font('button', color.onAccent)}>{g.over ? 'Otra partida' : fresh ? 'Empezar' : 'Seguir'}</Text>
              </Press>
            </View>
          ) : (
            <Press label="Pausar" onPress={() => setRunning(false)} style={{ position: 'absolute', right: 16, bottom: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: alpha(color.raised, 0.8), alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="pause.fill" size={18} color={color.text} />
            </Press>
          )}
        </View>
      </GestureDetector>
    </View>
  );
}
