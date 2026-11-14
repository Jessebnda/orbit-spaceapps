// @orbit/shared — the single contract between ESP32 wearables, phones (mobile), the ship hub, and the captain dashboard.
// Keep this file dependency-free: it is imported by Node (hub), Metro (mobile) and Next (dashboard).

/* ───────────── Wearables ───────────── */

export type Device = 'band' | 'sleeve' | 'vest';

export type MetricKey = 'bpSys' | 'bpDia' | 'spo2' | 'hr' | 'temp' | 'activity' | 'resp' | 'sleep' | 'kcal' | 'water';

/** Which wearable produces which metric. */
export const DEVICE_METRICS: Record<Device, MetricKey[]> = {
  band: ['hr', 'spo2', 'temp', 'sleep'], // wrist PPG + skin temp + actigraphy sleep
  sleeve: ['bpSys', 'bpDia'],        // arm cuff; the phone rides in this sleeve
  vest: ['resp', 'activity'],        // chest strain gauge + IMU
};

/** Measured by ship systems (galley/food log), not wearables; they arrive in the same `vitals` message. */
export const SHIP_METRICS: MetricKey[] = ['kcal', 'water'];

export type Metrics = Partial<Record<MetricKey, number>>;

export const METRIC_META: Record<MetricKey, { label: string; unit: string; decimals: number; info: string }> = {
  hr: { label: 'Ritmo cardiaco', unit: 'lpm', decimals: 0, info: 'En microgravedad la sangre sube al pecho y cambia la carga del corazón; taquicardia o bradicardia sostenidas requieren revisión.' },
  spo2: { label: 'Oxígeno en sangre', unit: '%', decimals: 0, info: 'Un SpO2 bajo puede indicar problemas de la atmósfera de la cabina (CO2 alto, fuga de O2) o enfermedad respiratoria.' },
  temp: { label: 'Temperatura', unit: '°C', decimals: 1, info: 'El sistema inmune cambia en vuelo y sube el riesgo de infección; la fiebre es una señal temprana.' },
  bpSys: { label: 'Presión sistólica', unit: 'mmHg', decimals: 0, info: 'El cambio de fluidos y el desacondicionamiento afectan la presión y la tolerancia al ponerse de pie.' },
  bpDia: { label: 'Presión diastólica', unit: 'mmHg', decimals: 0, info: 'Se lee junto con la sistólica.' },
  resp: { label: 'Respiración', unit: 'rpm', decimals: 0, info: 'La frecuencia respiratoria sube con estrés, esfuerzo, exposición a CO2 o enfermedad.' },
  activity: { label: 'Actividad', unit: 'min', decimals: 0, info: 'Minutos de ejercicio hoy. ~2 h diarias de contramedidas frenan la pérdida de hueso y músculo.' },
  sleep: { label: 'Sueño', unit: 'h', decimals: 1, info: 'Ciclos de luz, ruido y carga de trabajo recortan el sueño en órbita; dormir poco de forma crónica afecta ánimo, reflejos e inmunidad.' },
  kcal: { label: 'Comida', unit: 'kcal', decimals: 0, info: 'Las tripulaciones suelen comer de menos en vuelo; el déficit acelera la pérdida de músculo y hueso.' },
  water: { label: 'Agua', unit: 'L', decimals: 1, info: 'El cambio de fluidos reduce la sed; la deshidratación sube el riesgo de cálculos renales, ya mayor en microgravedad.' },
};

/* ───────────── Thresholds ─────────────
 * shortcut: generic adult clinical ranges; replace with the NASA paper values the team will provide.
 * Each metric: [criticalLow, watchLow, watchHigh, criticalHigh]. ok = (watchLow, watchHigh).
 */
export const THRESHOLDS: Record<MetricKey, [number, number, number, number]> = {
  hr: [40, 50, 100, 130],
  spo2: [88, 94, 101, 101],
  temp: [35, 36, 37.8, 39],
  bpSys: [85, 95, 135, 170],
  bpDia: [50, 60, 88, 110],
  resp: [8, 11, 21, 30],
  activity: [-1, 30, 1e9, 1e9],
  sleep: [4, 6, 10, 14],
  kcal: [1200, 2000, 3600, 5000],
  water: [1, 2, 4.5, 7],
};

export type Status = 'ok' | 'watch' | 'critical';

export function statusOf(key: MetricKey, v: number | undefined): Status {
  if (v == null || Number.isNaN(v)) return 'ok';
  const [cl, wl, wh, ch] = THRESHOLDS[key];
  if (v <= cl || (v >= ch && ch !== wh)) return 'critical'; // ch === wh means no upper critical
  if (v < wl || v > wh) return 'watch';
  return 'ok';
}

export function worstStatus(m: Metrics): Status {
  const all = (Object.keys(m) as MetricKey[]).map((k) => statusOf(k, m[k]));
  return all.includes('critical') ? 'critical' : all.includes('watch') ? 'watch' : 'ok';
}

export * from './design'; // design tokens + STATUS_COLOR
export * from './labels';
export * from './insights';

/* ───────────── BLE spec (for the firmware team) ─────────────
 * Each ESP32 advertises its name as `ORB-<crewId>-<device>` (e.g. ORB-c2-vest) so any phone can
 * read its RSSI for proximity. It exposes one GATT service with one NOTIFY characteristic that
 * sends UTF-8 JSON of its metrics every 2 s, e.g. {"hr":72,"spo2":98,"temp":36.6}.
 */
export const BLE = {
  service: '6f726269-7400-4000-8000-000000000001',
  vitalsChar: '6f726269-7400-4000-8000-000000000002',
  namePrefix: 'ORB-',
} as const;

export function parseBleName(name: string | null | undefined): { crewId: string; device: Device } | null {
  const m = /^ORB-([A-Za-z0-9_]+)-(band|sleeve|vest)$/.exec(name ?? '');
  return m ? { crewId: m[1], device: m[2] as Device } : null;
}

/* ───────────── Crew & self-report ───────────── */

export interface CrewMember { id: string; name: string; role: string; avatar?: string }

export interface CheckIn {
  ts: number;
  mood: 1 | 2 | 3 | 4 | 5;
  stress: 1 | 2 | 3 | 4 | 5;
  missionOutlook: 1 | 2 | 3 | 4 | 5;   // expectations about the mission
  injury?: string;                      // free text, empty = none
  bereavement?: boolean;                // family loss reported (delivered news from ground)
  note?: string;
}

/* ───────────── Protocols ───────────── */

export type ProtocolKind = 'mental' | 'physical' | 'emergency';

export interface Protocol {
  id: string;
  kind: ProtocolKind;
  title: string;
  reason?: string;
  steps: string[];
  durationMin?: number;
  /** Emergency protocols carry the CPR/AED guide flag so the app shows the animated guide. */
  guide?: 'cpr' | 'breathing' | 'jumping_jacks';
  createdBy: 'rules' | 'ai' | 'captain';
}

export type EmergencyKind = 'cardiac_arrest' | 'hypoxia' | 'fever' | 'hypertensive_crisis' | 'panic';

export interface Emergency {
  id: string;
  ts: number;
  victimId: string;
  kind: EmergencyKind;
  responders: string[];   // crewIds, nearest first
  resolved?: boolean;
}

/* ───────────── Crew communication ─────────────
 * Measured by the ship comms system (assumed): every conversation between two members is one record.
 * The hub keeps the history and flags each member against their OWN baseline, like social apps do.
 */
export interface CommsRecord { crewId: string; peerId: string; ts: number; minutes: number; channel: 'voice' | 'text' | 'in_person' }

export interface CommsAnomaly { kind: 'withdrawal' | 'peer_drop' | 'spike'; peerId?: string; detail: string }

const DAY = 86_400_000;

/**
 * Compare `crewId`'s last 24 h of talking against their previous `baselineDays` days.
 * - withdrawal: total talk fell below half of their daily average (isolation sign)
 * - peer_drop: a peer they talked to on most baseline days got zero today (possible conflict)
 * - spike: total more than 2.5x their average (possible conflict or crisis)
 */
export function commsAnomalies(crewId: string, records: CommsRecord[], now = Date.now(), baselineDays = 7): CommsAnomaly[] {
  const mine = records.filter((r) => r.crewId === crewId || r.peerId === crewId);
  const peerOf = (r: CommsRecord) => (r.crewId === crewId ? r.peerId : r.crewId);
  const today = mine.filter((r) => r.ts > now - DAY);
  const base = mine.filter((r) => r.ts <= now - DAY && r.ts > now - DAY * (baselineDays + 1));
  if (!base.length) return []; // no history yet, nothing to compare

  const sum = (rs: CommsRecord[]) => rs.reduce((a, r) => a + r.minutes, 0);
  const avg = sum(base) / baselineDays;
  const todayMin = sum(today);
  const out: CommsAnomaly[] = [];
  if (todayMin < avg * 0.5) out.push({ kind: 'withdrawal', detail: `${Math.round(todayMin)} min today vs ${Math.round(avg)} min/day usual` });
  if (todayMin > avg * 2.5) out.push({ kind: 'spike', detail: `${Math.round(todayMin)} min today vs ${Math.round(avg)} min/day usual` });

  const daysWith = new Map<string, Set<number>>();
  for (const r of base) {
    const set = daysWith.get(peerOf(r)) ?? new Set<number>();
    set.add(Math.floor((now - r.ts) / DAY));
    daysWith.set(peerOf(r), set);
  }
  const talkedToday = new Set(today.map(peerOf));
  for (const [peer, days] of daysWith) {
    if (days.size >= Math.ceil(baselineDays * 0.6) && !talkedToday.has(peer)) {
      out.push({ kind: 'peer_drop', peerId: peer, detail: `talked on ${days.size}/${baselineDays} days, none today` });
    }
  }
  return out;
}

/* ───────────── Gamification / stats ───────────── */

export type StatEvent =
  | { type: 'pet_time'; seconds: number }
  | { type: 'game_time'; seconds: number; score?: number }
  | { type: 'activity'; minutes: number; kind: string }
  | { type: 'protocol_done'; protocolId: string }
  | { type: 'achievement'; id: string }
  | { type: 'exploration'; title: string; km: number; minutes: number; place: string };

/** Mission achievements. The phone unlocks them and sends a `stat` achievement event; the hub sums XP for the leaderboard. */
export const ACHIEVEMENTS = [
  { id: 'first_checkin', title: 'First log', desc: 'Complete your first daily check-in', xp: 50 },
  { id: 'checkin_streak_7', title: 'Steady orbit', desc: '7 check-ins in a row', xp: 200 },
  { id: 'exercise_2h', title: 'Countermeasure', desc: '2 h of exercise in one day', xp: 150 },
  { id: 'sleep_7h_x3', title: 'Circadian', desc: 'Sleep 7 h+ three nights in a row', xp: 150 },
  { id: 'protocol_done', title: 'By the book', desc: 'Finish a protocol sent by the ship', xp: 75 },
  { id: 'pet_session', title: 'Heart to heart', desc: 'Complete a scheduled session with your pet', xp: 100 },
  { id: 'defender_1000', title: 'Defender', desc: 'Score 1000 in Orbit Defender', xp: 50 },
  { id: 'first_explore', title: 'Explorer', desc: 'Log your first exploration', xp: 100 },
  { id: 'explore_10km', title: 'Long walk', desc: '10 km explored in total', xp: 250 },
  { id: 'cpr_trained', title: 'Lifeline', desc: 'Complete the CPR drill', xp: 200 },
] as const;
export type AchievementId = (typeof ACHIEVEMENTS)[number]['id'];

/* ───────────── Wire protocol (WebSocket, JSON) ─────────────
 * Phones and the dashboard connect to ws://<hub-lan-ip>:8787. Works fully offline on the ship LAN.
 */
export const HUB_PORT = 8787;

export interface Proximity { crewId: string; rssi: number }

export type ClientMsg =
  | { t: 'hello'; role: 'crew'; member: CrewMember }
  | { t: 'hello'; role: 'captain' }
  | { t: 'vitals'; crewId: string; ts: number; metrics: Metrics }
  | { t: 'proximity'; crewId: string; peers: Proximity[] }
  | { t: 'checkin'; crewId: string; checkin: CheckIn }
  | { t: 'comms'; record: CommsRecord }                               // from ship comms system (or simulator)
  | { t: 'stat'; crewId: string; ts: number; event: StatEvent }
  | { t: 'pet_chat'; crewId: string; text: string }
  | { t: 'sos'; crewId: string; kind: EmergencyKind }                  // manual panic button
  | { t: 'protocol_ack'; crewId: string; protocolId: string }
  | { t: 'resolve'; emergencyId: string };

export type HubMsg =
  | { t: 'protocol'; crewId: string; protocol: Protocol }
  | { t: 'emergency'; emergency: Emergency }
  | { t: 'pet_reply'; crewId: string; text: string }
  | { t: 'snapshot'; crew: CrewSnapshot[]; emergencies: Emergency[] }    // captain only
  | { t: 'self'; snapshot: CrewSnapshot };                              // to each crew phone, every few seconds

export interface CrewSnapshot {
  member: CrewMember;
  online: boolean;
  lastSeen: number;
  metrics: Metrics;
  status: Status;
  lastCheckIn?: CheckIn;
  peers: Proximity[];
  comms: { todayMin: number; byPeer: Record<string, number>; anomalies: CommsAnomaly[] };
  stats: { petMin: number; gameMin: number; activityMin: number; xp: number; achievements: string[] };
}

/* ───────────── Emergency routing ───────────── */

/**
 * Nearest responders to a victim, strongest signal first.
 * A responder's distance comes from either side of the link: the responder's phone hearing the victim's
 * wearables, or the victim's phone hearing the responder's. RSSI is in dBm (-30 near … -100 far).
 */
export function nearestResponders(victimId: string, peersBy: Record<string, Proximity[]>, max = 2): string[] {
  const best = new Map<string, number>();
  const see = (id: string, rssi: number) => {
    if (id !== victimId) best.set(id, Math.max(best.get(id) ?? -Infinity, rssi));
  };
  for (const p of peersBy[victimId] ?? []) see(p.crewId, p.rssi);
  for (const [who, peers] of Object.entries(peersBy)) {
    const hit = peers.find((p) => p.crewId === victimId);
    if (hit) see(who, hit.rssi);
  }
  return [...best.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([id]) => id);
}
