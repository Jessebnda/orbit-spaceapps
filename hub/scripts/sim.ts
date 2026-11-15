import { spawn } from 'node:child_process';
import { WebSocket } from 'ws';
import { HUB_PORT, type CheckIn, type ClientMsg, type CommsRecord, type CrewMember, type Metrics, type MetricKey, type StatEvent } from '@orbit/shared';

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const HUB = arg('--hub') ?? `ws://127.0.0.1:${HUB_PORT}/ws`;
const EMERGENCY = arg('--emergency'); // e.g. c2: cardiac arrest 20 s after start

const DAY = 86_400_000;
// --skip c1,c2: leave those ids to real phones so the dashboard shows them, not a fake twin.
const SKIP = new Set((arg('--skip') ?? '').split(',').filter(Boolean));
const CREW: CrewMember[] = ([
  { id: 'c1', name: 'Ana Ruiz', role: 'Comandante' },
  { id: 'c2', name: 'Leo Park', role: 'Ingeniero de vuelo' },
  { id: 'c3', name: 'Mia Chen', role: 'Oficial médica' },
  { id: 'c4', name: 'Omar Haddad', role: 'Especialista de misión' },
] as CrewMember[]).filter((m) => !SKIP.has(m.id));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const r1 = (x: number) => Math.round(x * 10) / 10;
const drift = (v: number, step: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v + rand(-step, step)));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Per-member drifting state. kcal and water accumulate like the galley log.
const vit: Record<string, Record<MetricKey, number>> = Object.fromEntries(CREW.map((m) => [m.id, {
  hr: rand(60, 75), spo2: rand(96, 98), temp: 36.6, bpSys: rand(110, 122), bpDia: rand(70, 80), resp: 14,
  activity: rand(5, 40), sleep: m.id === 'c4' ? 5.2 : rand(6.2, 7.6), kcal: rand(1500, 1900), water: rand(2.2, 3),
}]));
const arrestAt = Date.now() + 20_000;

function sample(id: string): Metrics {
  const s = vit[id];
  if (EMERGENCY === id && Date.now() > arrestAt) { s.hr = 0; s.spo2 = Math.max(60, s.spo2 - 1.5); }
  else {
    s.hr = drift(s.hr, 1.5, 55, 95);
    s.spo2 = drift(s.spo2, 0.3, 95, 99);
    s.temp = drift(s.temp, 0.05, 36.2, 37.2);
    s.bpSys = drift(s.bpSys, 1.5, 100, 135);
    s.bpDia = drift(s.bpDia, 1, 62, 88);
    s.resp = drift(s.resp, 0.5, 11, 20);
  }
  s.activity += 0.01;
  s.kcal += rand(0.1, 0.5);
  s.water += 0.0003;
  return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, r1(v)])) as Metrics;
}

// Each pair keeps its own random-walk RSSI in dBm.
const link: Record<string, number> = {};
function pairRssi(a: string, b: string): number {
  const k = [a, b].sort().join('-');
  link[k] = Math.max(-95, Math.min(-40, (link[k] ?? rand(-75, -50)) + rand(-3, 3)));
  return Math.round(link[k]);
}

const send = (ws: WebSocket | undefined, msg: ClientMsg) => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); };

// The hub keeps crew in memory, so after a hub restart the whole sim (hello, backfill, check-ins) must replay.
let restarting = false;
function restart() {
  if (restarting) return;
  restarting = true;
  console.error('[sim] hub connection lost, restarting in 2 s');
  setTimeout(() => {
    spawn(process.execPath, [...process.execArgv, ...process.argv.slice(1)], { stdio: 'inherit', detached: false }).on('exit', (c) => process.exit(c ?? 0));
  }, 2000);
}

function connect(m: CrewMember): Promise<WebSocket> {
  return new Promise((ok) => {
    const ws = new WebSocket(HUB);
    ws.on('open', () => { send(ws, { t: 'hello', role: 'crew', member: m }); ok(ws); });
    ws.on('error', (e) => console.error(`[sim] ${m.id}: ${e.message}`));
    ws.on('close', restart);
  });
}

const sockets = await Promise.all(CREW.map(connect));
const sock = Object.fromEntries(CREW.map((m, i) => [m.id, sockets[i]])) as Record<string, WebSocket>;
console.log(`[sim] ${CREW.length} phones connected to ${HUB}${EMERGENCY ? `, ${EMERGENCY} arrests in 20 s` : ''}`);
await sleep(300); // hellos must reach the hub before comms reference these crews

/* ───────────── comms: 7-day baseline, c4 withdrawing ───────────── */

const CHANNELS: CommsRecord['channel'][] = ['voice', 'text', 'in_person'];
const record = (a: string, b: string, ts: number, minutes: number): CommsRecord =>
  ({ crewId: a, peerId: b, ts: Math.round(ts), minutes: Math.round(minutes), channel: CHANNELS[Math.floor(Math.random() * 3)] });

const now = Date.now();
const pairs: [string, string][] = [];
for (let i = 0; i < CREW.length; i++) for (let j = i + 1; j < CREW.length; j++) pairs.push([CREW[i].id, CREW[j].id]);
const backfill: CommsRecord[] = [];
for (const [a, b] of pairs) {
  const withC4 = a === 'c4' || b === 'c4';
  for (let k = 1; k <= 7; k++) {
    // k = days ago. c4's talk fades from 1.0 (oldest) down to 0.2 (yesterday).
    const fade = withC4 ? 0.2 + (0.8 * (k - 1)) / 6 : 1;
    backfill.push(record(a, b, now - (k + rand(0.05, 0.95)) * DAY, rand(15, 45) * fade));
  }
  if (!withC4) backfill.push(record(a, b, now - rand(0.05, 0.9) * DAY, rand(15, 40))); // today so far
}
for (const r of backfill) send(sock[CREW[0].id], { t: 'comms', record: r });
console.log(`[sim] backfilled ${backfill.length} comms records`);

setInterval(() => {
  const live = pairs.filter(([x, y]) => x !== 'c4' && y !== 'c4');
  if (!live.length) return;
  const [a, b] = live[Math.floor(Math.random() * live.length)];
  send(sock[CREW[0].id], { t: 'comms', record: record(a, b, Date.now(), Math.round(rand(1, 3))) });
}, 30_000);

/* ───────────── vitals, proximity, checkins, stats ───────────── */

setInterval(() => {
  for (const m of CREW) {
    send(sock[m.id], { t: 'vitals', crewId: m.id, ts: Date.now(), metrics: sample(m.id) });
    send(sock[m.id], { t: 'proximity', crewId: m.id, peers: CREW.filter((o) => o.id !== m.id).map((o) => ({ crewId: o.id, rssi: pairRssi(m.id, o.id) })) });
  }
}, 2000);

const checkins: Record<string, CheckIn> = {
  c1: { ts: Date.now(), mood: 4, stress: 2, missionOutlook: 4 },
  c2: { ts: Date.now(), mood: 4, stress: 2, missionOutlook: 4 },
  c3: { ts: Date.now(), mood: 4, stress: 3, missionOutlook: 3 },
  c4: { ts: Date.now(), mood: 2, stress: 4, missionOutlook: 2, note: 'Hard week' }, // triggers box_breathing
};
for (const [id, checkin] of Object.entries(checkins)) send(sock[id], { t: 'checkin', crewId: id, checkin });

const stats: [string, StatEvent][] = [
  ['c1', { type: 'pet_time', seconds: 600 }],
  ['c1', { type: 'game_time', seconds: 900, score: 1200 }],
  ['c1', { type: 'achievement', id: 'first_checkin' }],
  ['c1', { type: 'exploration', title: 'Shackleton rim walk', km: 3.2, minutes: 70, place: 'Lab module' }],
  ['c1', { type: 'achievement', id: 'first_explore' }],
  ['c2', { type: 'activity', minutes: 120, kind: 'treadmill' }],
  ['c2', { type: 'achievement', id: 'exercise_2h' }],
  ['c3', { type: 'exploration', title: 'Crater ridge traverse', km: 7.8, minutes: 150, place: 'Surface sim' }],
  ['c3', { type: 'achievement', id: 'first_explore' }],
  ['c4', { type: 'exploration', title: 'Dune loop', km: 4.1, minutes: 55, place: 'Observation dome' }],
  ['c4', { type: 'pet_time', seconds: 300 }],
];
for (const [id, event] of stats) send(sock[id], { t: 'stat', crewId: id, ts: Date.now(), event });
