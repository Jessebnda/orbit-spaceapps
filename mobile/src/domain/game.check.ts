// Run: npm run check:domain. Asserts for the game engine.
import { initGame, tick, type GameState } from './game';

const still = () => 0.5;
let s = initGame();
s = tick(s, 0.1, 0.5, still);
console.assert(s.t > 0 && s.lives === 3, 'a tick advances time without losing lives');
// An enemy that falls past the bottom costs one life.
let f: GameState = { ...initGame(), enemies: [{ id: 99, x: 0.1, y: 0.99, kind: 'tri' as const, hp: 1 }] };
f = tick(f, 0.1, 0.9, still);
console.assert(f.lives === 2, 'an enemy past the bottom costs a life');
// A shot on top of an enemy kills it and scores.
let k: GameState = { ...initGame(), enemies: [{ id: 5, x: 0.5, y: 0.5, kind: 'tri' as const, hp: 1 }], shots: [{ id: 6, x: 0.5, y: 0.5 }] };
k = tick(k, 0.01, 0.1, still);
console.assert(k.enemies.length === 0 && k.score > 0, 'a hit removes the enemy and scores');
console.log('game.check: ok');
