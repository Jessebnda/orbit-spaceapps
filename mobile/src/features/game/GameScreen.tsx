import { useEffect, useRef, useState } from 'react';
import { AppState, PanResponder, Text, View, useWindowDimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Svg, { Circle, Polygon, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { sendStat } from '../../services/hub';
import { useStore } from '../../store/store';
import { color, font, radius, space } from '../../theme';
import { initGame, tick, type GameState } from '../../domain/game';
import { Press } from '../../components/ui/Press';
import { ScreenHeader } from '../../components/layout/ScreenHeader';

const SHIP_HALF = 0.06;

/** Orbit Defender. El loop corre solo con la pantalla enfocada y la app activa. */
export function GameScreen() {
  const focused = useIsFocused();
  const { width, height } = useWindowDimensions();
  const [active, setActive] = useState(true);
  const [running, setRunning] = useState(false);
  const [, bump] = useState(0);
  const game = useRef<GameState>(initGame());
  const shipX = useRef(0.5);
  const startX = useRef(0.5);
  const playing = running && focused && active;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => (startX.current = shipX.current),
      onPanResponderMove: (_, g) => (shipX.current = Math.min(1 - SHIP_HALF, Math.max(SHIP_HALF, startX.current + g.dx / width))),
    }),
  ).current;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);

  // Pausa al salir de la pantalla o al ir a background: el juego no sigue corriendo a ciegas.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = 0;
    let secs = 0;
    const loop = (t: number) => {
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      secs += dt;
      game.current = tick(game.current, dt, shipX.current);
      bump((n) => n + 1);
      if (game.current.over) {
        const played = secs;
        secs = 0; // the cleanup below must not count this round twice
        finish(game.current.score, played);
        setRunning(false);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      // Seconds played in an interrupted round still count toward game time.
      if (secs > 0) useStore.getState().addStat('gameSec', Math.round(secs));
    };
  }, [playing]);

  const finish = (score: number, secs: number) => {
    const st = useStore.getState();
    st.setBest(score);
    st.addStat('gameSec', Math.round(secs));
    sendStat({ type: 'game_time', seconds: Math.round(secs), score });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const restart = () => {
    game.current = initGame();
    setRunning(true);
  };
  const g = game.current;
  const best = useStore((s) => s.stats.bestScore);
  const fieldH = Math.min(height * 0.55, width * 1.4);
  const sx = (x: number) => x * width;
  const sy = (y: number) => y * fieldH;

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader kicker="Juego" title="Orbit Defender" subtitle={`Puntos ${g.score} · Vidas ${g.lives} · Récord ${best}`} />
      <View {...pan.panHandlers} style={{ width, height: fieldH, backgroundColor: color.surface }}>
        <Svg width={width} height={fieldH}>
          {g.enemies.map((e) =>
            e.kind === 'sq' ? (
              <Rect key={e.id} x={sx(e.x) - 14} y={sy(e.y) - 14} width={28} height={28} fill={e.hp > 1 ? color.status.watch : color.text} />
            ) : e.kind === 'dia' ? (
              <Polygon key={e.id} points={`${sx(e.x)},${sy(e.y) - 16} ${sx(e.x) + 16},${sy(e.y)} ${sx(e.x)},${sy(e.y) + 16} ${sx(e.x) - 16},${sy(e.y)}`} fill={color.status.critical} />
            ) : (
              <Polygon key={e.id} points={`${sx(e.x)},${sy(e.y) - 14} ${sx(e.x) + 13},${sy(e.y) + 10} ${sx(e.x) - 13},${sy(e.y) + 10}`} fill={color.muted} />
            ),
          )}
          {g.shots.map((b) => <Circle key={b.id} cx={sx(b.x)} cy={sy(b.y)} r={3} fill={color.accent} />)}
          <Polygon points={`${sx(shipX.current)},${sy(0.9) - 16} ${sx(shipX.current) + 14},${sy(0.9) + 10} ${sx(shipX.current) - 14},${sy(0.9) + 10}`} fill={color.accent} />
        </Svg>
      </View>
      <View style={{ padding: space.lg, gap: space.md }}>
        {g.over ? (
          <Text style={font('section')}>Fin de la partida · {g.score} puntos</Text>
        ) : (
          <Text style={font('small', color.muted)}>Arrastra para mover la nave. Dispara sola.</Text>
        )}
        <Press label={running ? 'Pausar' : g.over || g.t === 0 ? 'Empezar' : 'Seguir'} onPress={() => (g.over ? restart() : setRunning((r) => !r))} style={{ backgroundColor: color.accent, borderRadius: radius.md, padding: space.md, alignItems: 'center' }}>
          <Text style={font('button', color.onAccent)}>{running ? 'Pausar' : g.over ? 'Otra partida' : g.t === 0 ? 'Empezar' : 'Seguir'}</Text>
        </Press>
      </View>
    </View>
  );
}
