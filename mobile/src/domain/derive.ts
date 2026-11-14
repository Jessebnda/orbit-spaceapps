import { type CheckIn, type DaySummary, type Metrics, worstStatus } from '@orbit/shared';
import type { DayStat } from '../store/types';

export type { DayStat };

/** Local calendar day, the key of the per-day record. */
export const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export type PetMood = 'happy' | 'tired' | 'sad';

/** The pet mirrors the user: check-in or a critical metric makes it sad, short sleep makes it tired. */
export function petMood(metrics: Metrics, last?: CheckIn): PetMood {
  if ((last && (last.mood <= 2 || last.stress >= 4)) || worstStatus(metrics) === 'critical') return 'sad';
  if ((metrics.sleep ?? 8) < 6) return 'tired';
  return 'happy';
}

/** Need bars 0..1, read from the user's own data. */
export function petNeeds(metrics: Metrics, last?: CheckIn) {
  return {
    food: Math.min(1, (metrics.kcal ?? 0) / 2000),
    rest: Math.min(1, (metrics.sleep ?? 0) / 8),
    mood: last ? last.mood / 5 : 0.6,
  };
}

/** Consecutive local days with a check-in, ending today. */
export function checkinStreak(checkins: CheckIn[], now: number): number {
  const days = new Set(checkins.map((c) => dayKey(c.ts)));
  let n = 0;
  for (let t = now; days.has(dayKey(t)); t -= 86_400_000) n++;
  return n;
}

/** Per-day summaries for the shared behaviour analysis: one row per day the app has seen. */
export function daySummaries(days: Record<string, DayStat>, checkins: CheckIn[]): DaySummary[] {
  const keys = [...new Set([...Object.keys(days), ...checkins.map((c) => dayKey(c.ts))])].sort();
  return keys.map((day) => {
    const d = days[day] ?? {};
    const c = checkins.filter((x) => dayKey(x.ts) === day);
    const last = c[c.length - 1];
    return {
      day,
      sleep: d.sleep,
      activity: d.activity,
      mood: last?.mood,
      stress: last?.stress,
      commsMin: d.comms,
      gameMin: d.gameSec != null ? d.gameSec / 60 : undefined,
      petMin: d.petSec != null ? d.petSec / 60 : undefined,
    };
  });
}
