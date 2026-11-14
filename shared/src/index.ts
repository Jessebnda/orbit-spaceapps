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

export const METRIC_META: Record<MetricKey, { label: string; unit: string; info: string }> = {
  hr: { label: 'Heart rate', unit: 'bpm', info: 'Fluid shifts in microgravity change cardiac load; persistent tachycardia or bradycardia needs review.' },
  spo2: { label: 'Blood oxygen', unit: '%', info: 'Low SpO2 can signal cabin atmosphere problems (CO2 build-up, O2 leak) or respiratory illness.' },
  temp: { label: 'Body temp', unit: '°C', info: 'Immune changes in spaceflight raise infection risk; fever is an early sign.' },
  bpSys: { label: 'Systolic BP', unit: 'mmHg', info: 'Headward fluid shift and deconditioning affect blood pressure and orthostatic tolerance.' },
  bpDia: { label: 'Diastolic BP', unit: 'mmHg', info: 'Read together with systolic pressure.' },
  resp: { label: 'Respiration', unit: 'br/min', info: 'Breathing rate rises with stress, exertion, CO2 exposure or illness.' },
  activity: { label: 'Activity', unit: 'min', info: 'Exercise minutes today. ~2 h/day of countermeasures fights bone and muscle loss.' },
  sleep: { label: 'Sleep', unit: 'h', info: 'Light cycles, noise and workload cut sleep in orbit; chronic short sleep hurts mood, reaction time and immunity.' },
  kcal: { label: 'Food', unit: 'kcal', info: 'Crews often under-eat in flight; energy deficit speeds muscle and bone loss.' },
  water: { label: 'Water', unit: 'L', info: 'Fluid shifts blunt thirst; dehydration raises kidney-stone risk, already higher in microgravity.' },
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

/** Color tokens shared by mobile and dashboard (WCAG AA on dark #0B0D12). */
export const STATUS_COLOR: Record<Status, string> = { ok: '#3DDC97', watch: '#FFB547', critical: '#FF5A5F' };

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
  | { t: 'snapshot'; crew: CrewSnapshot[]; emergencies: Emergency[] };   // captain only

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
