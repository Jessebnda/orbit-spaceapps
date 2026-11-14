import assert from 'node:assert/strict';
import { nearestResponders, type CrewSnapshot, type Emergency, type Proximity } from '@orbit/shared';
import { decide, evaluate, raiseDecisions, type Decision, type Env } from './rules';

const snap = (id: string, metrics: CrewSnapshot['metrics'] = {}, extra: Partial<CrewSnapshot> = {}): CrewSnapshot => ({
  member: { id, name: id, role: '' }, online: true, lastSeen: 0, metrics, status: 'ok', peers: [],
  comms: { todayMin: 0, byPeer: {}, anomalies: [] }, stats: { petMin: 0, gameMin: 0, activityMin: 0, xp: 0, achievements: [] },
  ...extra,
});
const NOON = new Date(2026, 10, 14, 12).getTime();
const env = (over: Partial<Env> = {}): Env => ({ now: NOON, open: () => false, peers: {}, online: [], ...over });
const emergencyOf = (d: Decision[]) => (d[0] as Extract<Decision, { t: 'emergency' }>).emergency as Emergency;

// 1. Cardiac arrest; responders come back nearest (strongest RSSI) first.
assert.ok(evaluate(snap('c2', { hr: 25 }), NOON).emergencies.includes('cardiac_arrest'));
assert.deepEqual(evaluate(snap('c2', { hr: 25, spo2: 80 }), NOON).emergencies, ['cardiac_arrest']); // no duplicate hypoxia
assert.deepEqual(evaluate(snap('c2', { hr: 80, spo2: 80 }), NOON).emergencies, ['hypoxia']);
const peers: Record<string, Proximity[]> = { c2: [{ crewId: 'c4', rssi: -90 }, { crewId: 'c1', rssi: -40 }, { crewId: 'c3', rssi: -70 }] };
assert.deepEqual(nearestResponders('c2', peers), ['c1', 'c3']);
const raised = raiseDecisions('c2', 'cardiac_arrest', env({ peers, online: ['c1', 'c2', 'c3', 'c4'] }));
assert.deepEqual(emergencyOf(raised).responders, ['c1', 'c3']);
assert.deepEqual((raised[0] as Extract<Decision, { t: 'emergency' }>).targets, ['c2', 'c1', 'c3']);
assert.equal(raised[1].t, 'protocol');

// 2. One open emergency per crew+kind: a second raise is a no-op.
assert.deepEqual(raiseDecisions('c2', 'cardiac_arrest', env({ open: () => true })), []);

// 3. Mood 1 suggests box breathing; the cooldown stops a repeat within 30 min.
const low = snap('c3', {}, { lastCheckIn: { ts: NOON, mood: 1, stress: 2, missionOutlook: 3 } });
assert.ok(evaluate(low, NOON).protocols.includes('box_breathing'));
assert.ok(!evaluate(low, NOON + 60_000).protocols.includes('box_breathing'));

// 4. Bereavement sends grief support and flags the captain.
const grief = decide(snap('c4', {}, { lastCheckIn: { ts: NOON, mood: 3, stress: 2, missionOutlook: 3, bereavement: true } }), env());
assert.ok(grief.some((d) => d.t === 'protocol' && d.protocol.id === 'grief_support' && d.toCaptains));

// 5. Activity watch only after 16:00 local.
const act = snap('c1', { activity: 10 });
assert.ok(evaluate(act, new Date(2026, 10, 14, 17).getTime()).protocols.includes('jumping_jacks'));
assert.ok(!evaluate(act, new Date(2026, 10, 14, 10).getTime()).protocols.includes('jumping_jacks'));

console.log('rules.check: ok');

// context: history is summarised per metric, never a raw series
import { historyText, overviewText } from './context';
const h = historyText([{ ts: NOON, metrics: { hr: 60 } }, { ts: NOON + 60_000, metrics: { hr: 80 } }]);
assert.match(h, /último 80 lpm, mín 60 lpm, media 70 lpm, máx 80 lpm/);
assert.match(overviewText([], []), /No hay tripulantes/);
console.log('context.check: ok');
