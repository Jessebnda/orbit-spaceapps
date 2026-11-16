import assert from 'node:assert/strict';
import { JumpCounter } from './jumps';

// 1 s standing (press Start), then 20 s at 50 Hz: one landing spike every 800 ms, on top of a given gravity.
function run(g: number, spike: number, periodMs = 800) {
  const c = new JumpCounter();
  for (let t = 0; t < 1000; t += 20) c.push(t, { x: 0.2, y: 0.1, z: g });
  for (let t = 1000; t < 21_000; t += 20) {
    const phase = (t - 1000) % periodMs;
    const z = g + (phase < 60 ? spike : phase < 300 ? -0.6 * g : 0) + Math.sin(t) * 0.3;
    c.push(t, { x: 0.2, y: 0.1, z });
  }
  return c.count;
}
assert.ok(Math.abs(run(9.81, 12) - 25) <= 1, 'Earth: one count per jump');
assert.ok(Math.abs(run(1.62, 8) - 25) <= 1, 'Moon gravity is learned, not assumed');
assert.ok(Math.abs(run(0, 8) - 25) <= 1, 'gravity removed by the sensor still counts');
assert.equal(run(9.81, 1.5), 0, 'walking-size bumps are not jumps');
const still = new JumpCounter();
for (let t = 0; t < 5000; t += 20) still.push(t, { x: 0, y: 0, z: 9.81 });
assert.equal(still.count, 0, 'standing still counts nothing');
console.log('jumps ok');
