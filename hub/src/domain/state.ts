import type { WebSocket } from 'ws';
import {
  ACHIEVEMENTS, commsAnomalies, type CommsRecord, type CrewMember, type CrewSnapshot, type Emergency,
  type Metrics, type Proximity, type StatEvent,
} from '@orbit/shared';
import type { Env } from './rules';

export const DAY = 86_400_000;
export const RING_MAX = 2000;   // vitals samples per crew (about 66 min at 2 s)
export const STAT_MAX = 5000;
export const EMERGENCY_MAX = 200;

export interface Crew { snap: CrewSnapshot; ws?: WebSocket; ring: { ts: number; metrics: Metrics }[]; lastDbVitals: number; seenAt: Record<string, number> }

export const crews = new Map<string, Crew>();
export const captains = new Set<WebSocket>();
export const emergencies: Emergency[] = [];
export let commsLog: CommsRecord[] = [];
export const statLog: { crewId: string; ts: number; event: StatEvent }[] = [];

/** Appends and drops the oldest entry once `max` is reached. */
export function pushCapped<T>(arr: T[], item: T, max: number) {
  arr.push(item);
  if (arr.length > max) arr.shift();
}

/** Full buffer: drop the oldest resolved emergency first, so an open one is kept. */
export function addEmergency(e: Emergency) {
  if (emergencies.length >= EMERGENCY_MAX) emergencies.splice(Math.max(0, emergencies.findIndex((x) => x.resolved)), 1);
  emergencies.push(e);
}

export function hasOpenEmergency(victimId: string, kind: string): boolean {
  return emergencies.some((e) => !e.resolved && e.victimId === victimId && e.kind === kind);
}

export function newCrew(member: CrewMember, now: number): Crew {
  return {
    snap: {
      member, online: true, lastSeen: now, metrics: {}, status: 'ok', peers: [],
      comms: { todayMin: 0, byPeer: {}, anomalies: [] },
      stats: { petMin: 0, gameMin: 0, activityMin: 0, xp: 0, achievements: [] },
    },
    ring: [], lastDbVitals: 0, seenAt: {},
  };
}

export function pruneComms(now: number) {
  commsLog = commsLog.filter((r) => r.ts > now - 14 * DAY);
}

export function commsOf(id: string, now: number): CrewSnapshot['comms'] {
  const byPeer: Record<string, number> = {};
  for (const r of commsLog) {
    if (r.ts <= now - DAY || (r.crewId !== id && r.peerId !== id)) continue;
    const peer = r.crewId === id ? r.peerId : r.crewId;
    byPeer[peer] = (byPeer[peer] ?? 0) + r.minutes;
  }
  return { todayMin: Object.values(byPeer).reduce((a, b) => a + b, 0), byPeer, anomalies: commsAnomalies(id, commsLog, now) };
}

export const snapshotOf = (id: string, now: number): CrewSnapshot => ({ ...crews.get(id)!.snap, comms: commsOf(id, now) });
export const allSnaps = (now: number) => [...crews.keys()].map((id) => snapshotOf(id, now));
export const peersBy = () => Object.fromEntries([...crews].map(([id, c]) => [id, c.snap.peers])) as Record<string, Proximity[]>;

/** The environment the rules decide in, read from the current state. */
export const envOf = (now: number): Env => ({
  now,
  open: hasOpenEmergency,
  peers: peersBy(),
  online: [...crews].filter(([, c]) => c.snap.online).map(([id]) => id),
});

export function applyStat(s: CrewSnapshot['stats'], e: StatEvent) {
  const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  if (e.type === 'pet_time' && isNum(e.seconds)) s.petMin += e.seconds / 60;
  if (e.type === 'game_time' && isNum(e.seconds)) s.gameMin += e.seconds / 60;
  if (e.type === 'activity' && isNum(e.minutes)) s.activityMin += e.minutes;
  if (e.type === 'achievement') {
    const a = ACHIEVEMENTS.find((x) => x.id === e.id);
    if (a && !s.achievements.includes(a.id)) { s.achievements.push(a.id); s.xp += a.xp; }
  }
}
