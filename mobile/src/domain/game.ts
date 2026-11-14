// Orbit Defender engine. Pure: no React, no timers. Coordinates are normalised to 0..1 so any screen works.

export type Enemy = { id: number; x: number; y: number; kind: 'tri' | 'sq' | 'dia'; hp: number };
export type Shot = { id: number; x: number; y: number };
export type GameState = {
  t: number;
  lives: number;
  score: number;
  enemies: Enemy[];
  shots: Shot[];
  spawnAcc: number;
  fireAcc: number;
  nextId: number;
  over: boolean;
};

const HIT_R = 0.05;
const SHIP_Y = 0.9;

export const initGame = (): GameState => ({ t: 0, lives: 3, score: 0, enemies: [], shots: [], spawnAcc: 0, fireAcc: 0, nextId: 1, over: false });

/** Wave number grows every 15 s; the field gets faster and busier with each wave. */
export const waveOf = (t: number) => 1 + Math.floor(t / 15);

/** Advances the game by dt seconds. `rnd` is injected so the engine is deterministic in tests. */
export function tick(s: GameState, dt: number, shipX: number, rnd: () => number = Math.random): GameState {
  if (s.over) return s;
  const t = s.t + dt;
  const wave = waveOf(t);
  let { lives, score, nextId } = s;
  let spawnAcc = s.spawnAcc + dt;
  let fireAcc = s.fireAcc + dt;
  const shots: Shot[] = s.shots.map((b) => ({ ...b, y: b.y - 0.9 * dt })).filter((b) => b.y > 0);
  const enemies: Enemy[] = [];

  if (spawnAcc >= Math.max(0.5, 1 - 0.08 * (wave - 1))) {
    spawnAcc = 0;
    const r = rnd();
    const kind: Enemy['kind'] = r < 0.5 ? 'tri' : r < 0.8 ? 'sq' : 'dia';
    enemies.push({ id: nextId++, x: 0.08 + rnd() * 0.84, y: 0, kind, hp: kind === 'dia' ? 2 : 1 });
  }
  if (fireAcc >= 0.35) {
    fireAcc = 0;
    shots.push({ id: nextId++, x: shipX, y: SHIP_Y - 0.04 });
  }

  const speed = 0.18 * (1 + 0.15 * (wave - 1));
  for (const e of s.enemies) {
    let hp = e.hp;
    let x = e.x;
    const y = e.y + speed * dt;
    x += Math.sin((t + e.id) * 3) * 0.05 * dt;
    for (const b of shots) {
      if (hp > 0 && Math.hypot(b.x - x, b.y - y) < HIT_R) {
        hp--;
        b.y = -1; // spent
      }
    }
    if (hp <= 0) {
      score += 10 * wave;
      continue;
    }
    if (y >= SHIP_Y && Math.abs(x - shipX) < 0.1) {
      lives--;
      continue;
    }
    if (y >= 1) {
      lives--;
      continue;
    }
    enemies.push({ ...e, x, y, hp });
  }

  return { t, lives, score, enemies, shots: shots.filter((b) => b.y > 0), spawnAcc, fireAcc, nextId, over: lives <= 0 };
}
