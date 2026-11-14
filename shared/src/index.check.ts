import assert from 'node:assert/strict';
import { statusOf, worstStatus, nearestResponders, parseBleName, commsAnomalies, type CommsRecord } from './index';

assert.equal(statusOf('hr', 72), 'ok');
assert.equal(statusOf('hr', 110), 'watch');
assert.equal(statusOf('hr', 35), 'critical');
assert.equal(statusOf('spo2', 99), 'ok');           // no upper critical for SpO2
assert.equal(statusOf('spo2', 90), 'watch');
assert.equal(statusOf('sleep', 5), 'watch');
assert.equal(statusOf('activity', 0), 'watch');
assert.equal(worstStatus({ hr: 72, spo2: 86 }), 'critical');

assert.deepEqual(parseBleName('ORB-c2-vest'), { crewId: 'c2', device: 'vest' });
assert.equal(parseBleName('Galaxy Buds'), null);

// c2 is down: c3 hears c2's vest at -50, c1 hears it at -80, c2's phone hears c4 at -60.
const peers = { c1: [{ crewId: 'c2', rssi: -80 }], c2: [{ crewId: 'c4', rssi: -60 }], c3: [{ crewId: 'c2', rssi: -50 }], c4: [] };
assert.deepEqual(nearestResponders('c2', peers), ['c3', 'c4']);
assert.deepEqual(nearestResponders('c9', peers), []);
// comms: c1 talked 30 min/day with c2 for 7 days, today nothing -> withdrawal + peer_drop
const now = Date.UTC(2026, 10, 14);
const hist: CommsRecord[] = [1, 2, 3, 4, 5, 6, 7].map((d) => ({ crewId: 'c1', peerId: 'c2', ts: now - d * 86_400_000 - 3600_000, minutes: 30, channel: 'voice' }));
const kinds = commsAnomalies('c1', hist, now).map((a) => a.kind).sort();
assert.deepEqual(kinds, ['peer_drop', 'withdrawal']);
assert.deepEqual(commsAnomalies('c1', [...hist, { crewId: 'c2', peerId: 'c1', ts: now - 600_000, minutes: 25, channel: 'in_person' }], now), []);
assert.equal(commsAnomalies('c1', [...hist, { crewId: 'c1', peerId: 'c2', ts: now - 600_000, minutes: 200, channel: 'voice' }], now)[0].kind, 'spike');
assert.deepEqual(commsAnomalies('c3', hist, now), []); // no history
console.log('shared ok');
