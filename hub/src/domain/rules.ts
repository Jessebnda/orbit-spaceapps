import { randomUUID } from 'node:crypto';
import { dayProgress, nearestResponders, statusOf, type CrewSnapshot, type Emergency, type EmergencyKind, type Protocol, type Proximity } from '@orbit/shared';
import { EMERGENCY_PROTOCOL, PROTOCOLS } from './protocols';

export interface Verdict { emergencies: EmergencyKind[]; protocols: string[] }

/** What the rules need from the outside, passed in so this file does no I/O. */
export interface Env { now: number; open(victimId: string, kind: string): boolean; peers: Record<string, Proximity[]>; online: string[] }

/** The rules decide; the route layer sends and stores. */
export type Decision =
  | { t: 'emergency'; emergency: Emergency; targets: string[] }
  | { t: 'protocol'; crewId: string; protocol: Protocol; toCaptains: boolean };

// Re-fire a protocol at most every 30 min per crew, so phones are not spammed on every vitals message.
const COOLDOWN_MS = 30 * 60_000;
const lastFired = new Map<string, number>();
function cooling(key: string, now: number): boolean {
  const t = lastFired.get(key);
  if (t !== undefined && now - t < COOLDOWN_MS) return true;
  lastFired.set(key, now);
  return false;
}

/** Only the protocol cooldown map is stateful. */
export function evaluate(s: CrewSnapshot, now = Date.now()): Verdict {
  const m = s.metrics;
  const hour = new Date(now).getHours();
  const emergencies: EmergencyKind[] = [];
  if (m.hr != null && (m.hr < 30 || m.hr > 180 || (m.hr < 40 && m.spo2 != null && m.spo2 < 85))) emergencies.push('cardiac_arrest');
  // cardiac arrest already covers low SpO2; a second takeover for the same victim only adds noise
  if (m.spo2 != null && m.spo2 < 88 && !emergencies.includes('cardiac_arrest')) emergencies.push('hypoxia');
  if (m.temp != null && m.temp >= 39) emergencies.push('fever');
  if ((m.bpSys ?? 0) >= 180 || (m.bpDia ?? 0) >= 120) emergencies.push('hypertensive_crisis');

  const want: string[] = [];
  const ci = s.lastCheckIn;
  if (hour >= 16 && statusOf('activity', m.activity, now) === 'watch') want.push('jumping_jacks');
  if (m.sleep != null && m.sleep < 6) want.push('sleep_hygiene');
  if (m.water != null && m.water < 2 * dayProgress(now)) want.push('hydrate'); // pro-rated: 0.5 L at 09:00 is fine
  if (hour >= 18 && m.kcal != null && m.kcal < 2000) want.push('eat_meal');
  if (ci && (ci.mood <= 2 || ci.stress >= 4)) want.push('box_breathing');
  if (ci?.bereavement) want.push('grief_support');
  if (s.comms.anomalies.some((a) => a.kind !== 'spike')) want.push('connect_crew');

  return { emergencies, protocols: want.filter((id) => !cooling(`${s.member.id}:${id}`, now)) };
}

const protocolById = (id: string) => PROTOCOLS.find((p) => p.id === id)!;

/** Emergency for a victim, or nothing if one is already open for this crew+kind. */
export function raiseDecisions(victimId: string, kind: EmergencyKind, env: Env): Decision[] {
  if (env.open(victimId, kind)) return [];
  const responders = nearestResponders(victimId, env.peers);
  const emergency: Emergency = { id: randomUUID(), ts: env.now, victimId, kind, responders };
  // With nobody in range, the whole online crew is the fallback.
  const targets = [...new Set([victimId, ...(responders.length ? responders : env.online)])];
  return [
    { t: 'emergency', emergency, targets },
    { t: 'protocol', crewId: victimId, protocol: protocolById(EMERGENCY_PROTOCOL[kind]), toCaptains: false },
  ];
}

export function decide(s: CrewSnapshot, env: Env): Decision[] {
  const v = evaluate(s, env.now);
  return [
    ...v.emergencies.flatMap((k) => raiseDecisions(s.member.id, k, env)),
    ...v.protocols.map((id): Decision => ({ t: 'protocol', crewId: s.member.id, protocol: protocolById(id), toCaptains: id === 'grief_support' })),
  ];
}
