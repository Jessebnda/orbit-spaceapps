// Orbit Defender engine. Pure: no React, no timers. Coordinates are normalised to 0..1 so any screen works.

export type Enemy = { id: number; x: number; y: number; kind: 'tri' | 'sq' | 'dia'; hp: number };
export type Shot = { id: number; x: number; y: number };
/** Falls from a destroyed enemy; picked up by flying the ship under it. */
export type Drop = { id: number; x: number; y: number; kind: 'coin' | 'rapid' | 'shield' | 'heart' };
export type GameState = {
  t: number;
  lives: number;
  score: number;
  coins: number;
  enemies: Enemy[];
  shots: Shot[];
  drops: Drop[];
  /** Seconds of rapid fire left. */
  rapid: number;
  /** Absorbs the next hit. */
  shield: boolean;
  /** Lives lost so far; the UI flashes when it grows. */
  hits: number;
  spawnAcc: number;
  fireAcc: number;
  nextId: number;
  over: boolean;
};

const HIT_R = 0.05;
const SHIP_Y = 0.9;
const PICK_R = 0.08;
export const MAX_LIVES = 5;
const RAPID_S = 6;

export const initGame = (): GameState => ({
  t: 0, lives: 3, score: 0, coins: 0, enemies: [], shots: [], drops: [], rapid: 0, shield: false, hits: 0, spawnAcc: 0, fireAcc: 0, nextId: 1, over: false,
});

/** Wave number grows every 15 s; the field gets faster and busier with each wave. */
export const waveOf = (t: number) => 1 + Math.floor(t / 15);

/** What a destroyed enemy leaves behind: diamonds always pay, others sometimes; power-ups are rarer. */
function dropFor(kind: Enemy['kind'], r: number, r2: number): Drop['kind'] | null {
  if (kind === 'dia' || r < 0.35) return 'coin';
  if (r < 0.45) return r2 < 0.45 ? 'rapid' : r2 < 0.85 ? 'shield' : 'heart';
  return null;
}

/** Advances the game by dt seconds. `rnd` is injected so the engine is deterministic in tests. */
export function tick(s: GameState, dt: number, shipX: number, rnd: () => number = Math.random): GameState {
  if (s.over) return s;
  const t = s.t + dt;
  const wave = waveOf(t);
  let { lives, score, coins, nextId, shield, hits } = s;
  let rapid = Math.max(0, s.rapid - dt);
  let spawnAcc = s.spawnAcc + dt;
  let fireAcc = s.fireAcc + dt;
  const shots: Shot[] = s.shots.map((b) => ({ ...b, y: b.y - 0.9 * dt })).filter((b) => b.y > 0);
  const enemies: Enemy[] = [];
  const drops: Drop[] = [];

  const hurt = () => {
    if (shield) shield = false;
    else { lives--; hits++; }
  };

  if (spawnAcc >= Math.max(0.5, 1 - 0.08 * (wave - 1))) {
    spawnAcc = 0;
    const r = rnd();
    const kind: Enemy['kind'] = r < 0.5 ? 'tri' : r < 0.8 ? 'sq' : 'dia';
    enemies.push({ id: nextId++, x: 0.08 + rnd() * 0.84, y: 0, kind, hp: kind === 'dia' ? 2 : 1 });
  }
  if (fireAcc >= (rapid > 0 ? 0.16 : 0.35)) {
    fireAcc = 0;
    if (rapid > 0) shots.push({ id: nextId++, x: shipX - 0.025, y: SHIP_Y - 0.04 }, { id: nextId++, x: shipX + 0.025, y: SHIP_Y - 0.04 });
    else shots.push({ id: nextId++, x: shipX, y: SHIP_Y - 0.04 });
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
      const kind = dropFor(e.kind, rnd(), rnd());
      if (kind) drops.push({ id: nextId++, x, y, kind });
      continue;
    }
    if ((y >= SHIP_Y && Math.abs(x - shipX) < 0.1) || y >= 1) {
      hurt();
      continue;
    }
    enemies.push({ ...e, x, y, hp });
  }

  for (const d of s.drops) {
    const y = d.y + 0.25 * dt;
    if (y >= SHIP_Y - 0.04 && y <= SHIP_Y + 0.04 && Math.abs(d.x - shipX) < PICK_R) {
      if (d.kind === 'coin') coins++;
      else if (d.kind === 'rapid') rapid = RAPID_S;
      else if (d.kind === 'shield') shield = true;
      else lives = Math.min(MAX_LIVES, lives + 1);
      continue;
    }
    if (y < 1) drops.push({ ...d, y });
  }

  return { t, lives, score, coins, enemies, shots: shots.filter((b) => b.y > 0), drops, rapid, shield, hits, spawnAcc, fireAcc, nextId, over: lives <= 0 };
}
