import assert from 'node:assert/strict';
import { statusOf, worstStatus, nearestResponders, parseBleName } from './index';

assert.equal(statusOf('hr', 72), 'ok');
assert.equal(statusOf('hr', 110), 'watch');
assert.equal(statusOf('hr', 35), 'critical');
assert.equal(statusOf('spo2', 99), 'ok');           // no upper critical for SpO2
assert.equal(statusOf('spo2', 90), 'watch');
assert.equal(statusOf('sleep', 5), 'watch');
assert.equal(statusOf('comms', 0), 'watch');        // isolation flag, never critical
assert.equal(statusOf('activity', 0), 'watch');
assert.equal(worstStatus({ hr: 72, spo2: 86 }), 'critical');

assert.deepEqual(parseBleName('ORB-c2-vest'), { crewId: 'c2', device: 'vest' });
assert.equal(parseBleName('Galaxy Buds'), null);

// c2 is down: c3 hears c2's vest at -50, c1 hears it at -80, c2's phone hears c4 at -60.
const peers = { c1: [{ crewId: 'c2', rssi: -80 }], c2: [{ crewId: 'c4', rssi: -60 }], c3: [{ crewId: 'c2', rssi: -50 }], c4: [] };
assert.deepEqual(nearestResponders('c2', peers), ['c3', 'c4']);
assert.deepEqual(nearestResponders('c9', peers), []);
console.log('shared ok');
