// Run: npm run check:domain. Asserts for the game engine.
import { initGame, tick, MAX_LIVES, type GameState } from './game';

function check(v: boolean, m: string) { if (!v) throw new Error(m); }
const still = () => 0.5;
const low = () => 0.1; // forces a coin drop and a "rapid" power-up roll
let s = initGame();
s = tick(s, 0.1, 0.5, still);
check(s.t > 0 && s.lives === 3, 'a tick advances time without losing lives');
// An enemy that falls past the bottom costs one life and counts a hit.
let f: GameState = { ...initGame(), enemies: [{ id: 99, x: 0.1, y: 0.99, kind: 'tri', hp: 1 }] };
f = tick(f, 0.1, 0.9, still);
check(f.lives === 2 && f.hits === 1, 'an enemy past the bottom costs a life');
// Three misses end the game.
let o: GameState = { ...initGame(), lives: 1, enemies: [{ id: 9, x: 0.1, y: 0.99, kind: 'tri', hp: 1 }] };
o = tick(o, 0.1, 0.9, still);
check(o.lives === 0 && o.over, 'last life lost ends the game');
// The shield absorbs a hit instead of a life.
let sh: GameState = { ...initGame(), shield: true, enemies: [{ id: 99, x: 0.1, y: 0.99, kind: 'tri', hp: 1 }] };
sh = tick(sh, 0.1, 0.9, still);
check(sh.lives === 3 && !sh.shield && sh.hits === 0, 'shield absorbs one hit');
// A shot on top of an enemy kills it, scores, and with a low roll drops a coin.
let k: GameState = { ...initGame(), enemies: [{ id: 5, x: 0.5, y: 0.5, kind: 'tri', hp: 1 }], shots: [{ id: 6, x: 0.5, y: 0.5 }] };
k = tick(k, 0.01, 0.1, low);
check(k.enemies.length === 0 && k.score > 0 && k.drops[0]?.kind === 'coin', 'a hit removes the enemy, scores and drops a coin');
// Flying under drops picks them up.
const at = (kind: GameState['drops'][number]['kind']): GameState => ({ ...initGame(), drops: [{ id: 1, x: 0.5, y: 0.89, kind }] });
check(tick(at('coin'), 0.01, 0.5, still).coins === 1, 'coin is collected');
check(tick(at('rapid'), 0.01, 0.5, still).rapid > 5, 'rapid fire starts');
check(tick(at('shield'), 0.01, 0.5, still).shield, 'shield is collected');
check(tick({ ...at('heart'), lives: MAX_LIVES }, 0.01, 0.5, still).lives === MAX_LIVES, 'hearts cap at MAX_LIVES');
check(tick(at('coin'), 0.01, 0.1, still).coins === 0, 'a drop away from the ship is not collected');
console.log('game.check: ok');
