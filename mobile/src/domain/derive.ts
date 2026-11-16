import { type CheckIn, type DaySummary, type Metrics, worstStatus } from '@orbit/shared';
import type { DayStat } from '../store/types';

export type { DayStat };

/** Local calendar day, the key of the per-day record. */
export const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export type PetMood = 'happy' | 'tired' | 'sad';

/** Last time each need was met; a need empties over its own window, so Orbi asks for care like a tamagotchi. */
export type Care = { fed: number; petted: number; talked: number };
export const CARE_WINDOW: Care = { fed: 8 * 3_600_000, petted: 6 * 3_600_000, talked: 12 * 3_600_000 };

/** Every need at 50 %: Orbi starts asking for care right away. */
export const halfCare = (now = Date.now()): Care => ({ fed: now - CARE_WINDOW.fed / 2, petted: now - CARE_WINDOW.petted / 2, talked: now - CARE_WINDOW.talked / 2 });

/** Need levels 0..1. */
export const careLevels = (c: Care, now = Date.now()) => ({
  fed: Math.max(0, 1 - (now - c.fed) / CARE_WINDOW.fed),
  petted: Math.max(0, 1 - (now - c.petted) / CARE_WINDOW.petted),
  talked: Math.max(0, 1 - (now - c.talked) / CARE_WINDOW.talked),
});

/** One feed or pet fills a tenth of the need; talking fills it (it also marks the low day as talked through). */
export const careStep = (c: Care, k: keyof Care, now = Date.now()): number =>
  k === 'talked' ? now : Math.min(now, Math.max(c[k], now - CARE_WINDOW[k]) + CARE_WINDOW[k] / 10);

/** The user said they feel low and hasn't talked with Orbi since: Orbi stays sad until they do. */
export const needsTalk = (last: CheckIn | undefined, care: Care) => !!last && (last.mood <= 2 || last.stress >= 4) && care.talked < last.ts;

/** The pet mirrors the user and its own care: a low check-in not yet talked through, a critical metric or a need left empty makes it sad; short sleep or hunger makes it tired. */
export function petMood(metrics: Metrics, last?: CheckIn, care?: Care, now = Date.now()): PetMood {
  const lv = care && careLevels(care, now);
  const userLow = care ? needsTalk(last, care) : !!last && (last.mood <= 2 || last.stress >= 4);
  if (userLow || worstStatus(metrics) === 'critical' || (lv && Math.min(lv.fed, lv.petted, lv.talked) === 0)) return 'sad';
  if ((metrics.sleep ?? 8) < 6 || (lv && lv.fed < 0.25)) return 'tired';
  return 'happy';
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
