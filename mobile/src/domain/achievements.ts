import { ACHIEVEMENTS, BADGE_STYLE, type AchievementId, type CheckIn } from '@orbit/shared';
import { checkinStreak, dayKey } from './derive';
import type { DayStat, Stats } from '../store/types';

export type AchievementInput = {
  now: number;
  checkins: CheckIn[];
  days: Record<string, DayStat>;
  done: string[];
  sessions: { done: boolean }[];
  stats: Stats;
  explorations: { km: number }[];
};


/** One source for unlock rules and the progress shown in the trophy case. */
export function achievementProgress(id: AchievementId, a: AchievementInput): number {
  const today = a.days[dayKey(a.now)] ?? {};
  switch (id) {
    case 'first_checkin': return a.checkins.length;
    case 'checkin_streak_7': return checkinStreak(a.checkins, a.now);
    case 'exercise_2h': return Math.max(today.activity ?? 0, ...Object.values(a.days).map(d => d.activity ?? 0));
    case 'sleep_7h_x3': return Object.values(a.days).filter(d => (d.sleep ?? 0) >= 7).length;
    case 'protocol_done': return a.done.length;
    case 'pet_session': return a.sessions.filter(s => s.done).length;
    case 'defender_1000': return a.stats.bestScore;
    case 'first_explore': return a.explorations.length;
    case 'explore_10km': return a.explorations.reduce((s, e) => s + e.km, 0);
    case 'cpr_trained': return a.stats.cprDrills;
  }
}
function met(id: AchievementId, a: AchievementInput) {
  return achievementProgress(id, a) >= BADGE_STYLE[id].target;
}

/** Achievements that are met now and not yet in `unlocked`. */
export function newlyUnlocked(a: AchievementInput, unlocked: string[]): AchievementId[] {
  return ACHIEVEMENTS.map((x) => x.id).filter((id) => !unlocked.includes(id) && met(id, a));
}
