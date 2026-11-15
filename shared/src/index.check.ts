import assert from 'node:assert/strict';
import { statusOf, worstStatus, nearestResponders, parseBleName, commsAnomalies, type CommsRecord } from './index';

assert.equal(statusOf('hr', 72), 'ok');
assert.equal(statusOf('hr', 110), 'watch');
assert.equal(statusOf('temp', 24.4), 'watch'); // GY-906 reading air, not hypothermia
assert.equal(statusOf('temp', 34.5), 'critical');
assert.equal(statusOf('hr', 35), 'critical');
assert.equal(statusOf('spo2', 99), 'ok');           // no upper critical for SpO2
assert.equal(statusOf('spo2', 90), 'watch');
assert.equal(statusOf('sleep', 5), 'watch');
const at = (h: number) => new Date(2026, 10, 14, h).getTime();
assert.equal(statusOf('activity', 0, at(23)), 'watch');
assert.equal(statusOf('kcal', 1500, at(11)), 'ok');       // mid-morning: pro-rated
assert.equal(statusOf('kcal', 1500, at(21)), 'watch');    // evening: real deficit
assert.equal(statusOf('kcal', 1000, at(23)), 'critical');
assert.equal(statusOf('water', 0, at(6)), 'ok');          // before the day starts
assert.equal(statusOf('kcal', 5200, at(9)), 'critical');  // upper limits are not pro-rated
assert.equal(worstStatus({ hr: 72, spo2: 86 }), 'critical');
assert.equal(worstStatus({ hr: 72, kcal: 900 }, at(10)), 'ok');

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

// labels + insights
import { formatMetric, behaviorInsights, anomalyText } from './index';
assert.equal(formatMetric('temp', 36.64), '36.6 °C');
assert.equal(formatMetric('hr', undefined), '—');
assert.match(anomalyText({ kind: 'peer_drop', peerId: 'c2', detail: '' }, () => 'Leo'), /Leo/);
const d = (i: number, o: object) => ({ day: `2026-11-0${i}`, ...o });
const wk = [d(1, { sleep: 8, mood: 4, commsMin: 60, activity: 90, stress: 2 }), d(2, { sleep: 7.5, mood: 4, commsMin: 55, activity: 80, stress: 2 }),
  d(3, { sleep: 8, mood: 5, commsMin: 65, activity: 100, stress: 1 }), d(4, { sleep: 7.8, mood: 4, commsMin: 50, activity: 85, stress: 2 }),
  d(5, { sleep: 5, mood: 2, commsMin: 10, activity: 10, stress: 4 }), d(6, { sleep: 5.5, mood: 2, commsMin: 15, activity: 15, stress: 5 }), d(7, { sleep: 5, mood: 3, commsMin: 12, activity: 20, stress: 4 })];
const ids = behaviorInsights(wk).map((x) => x.id).sort();
assert.deepEqual(ids, ['mood_drop', 'move_stress', 'sleep_drop', 'sleep_mood', 'social_drop']);
assert.deepEqual(behaviorInsights(wk.slice(0, 3)), []);
console.log('labels+insights ok');
