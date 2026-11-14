import assert from 'node:assert/strict';
import { rangeDial, arcPath, BADGE_STYLE, ACHIEVEMENTS } from './index';

// An absent sensor is not a zero reading, and invalid input must not draw NaN geometry.
assert.equal(rangeDial('hr').value, null);
assert.equal(rangeDial('hr', NaN).value, null);
assert.equal(rangeDial('hr', Infinity).value, null);
assert.equal(rangeDial('hr', -5).value, 0);
assert.equal(rangeDial('hr', 500).value, 1);
// SpO2 must end at the physical 100%, despite the sentinel threshold 101.
assert.equal(rangeDial('spo2', 100).value, 1);
assert.equal(rangeDial('spo2', 100).normalHi, 1);
for (const a of ACHIEVEMENTS) assert.ok(BADGE_STYLE[a.id], `missing badge style: ${a.id}`);
assert.ok(!arcPath(0, 1).includes('NaN'));
assert.match(arcPath(0, 1), / 0 1 1 /); // full instrument spans 270°, not the short 90° arc
console.log('visual geometry checks passed');
