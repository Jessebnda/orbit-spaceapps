import { ACHIEVEMENTS, type AchievementId, type CheckIn } from '@orbit/shared';
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

const DAY = 86_400_000;

function met(id: AchievementId, a: AchievementInput): boolean {
  const today = a.days[dayKey(a.now)] ?? {};
  switch (id) {
    case 'first_checkin': return a.checkins.length >= 1;
    case 'checkin_streak_7': return checkinStreak(a.checkins, a.now) >= 7;
    case 'exercise_2h': return (today.activity ?? 0) >= 120;
    case 'sleep_7h_x3': return [0, 1, 2].every((i) => (a.days[dayKey(a.now - i * DAY)]?.sleep ?? 0) >= 7);
    case 'protocol_done': return a.done.length >= 1;
    case 'pet_session': return a.sessions.some((s) => s.done);
    case 'defender_1000': return a.stats.bestScore >= 1000;
    case 'first_explore': return a.explorations.length >= 1;
    case 'explore_10km': return a.explorations.reduce((s, e) => s + e.km, 0) >= 10;
    case 'cpr_trained': return a.stats.cprDrills >= 1;
  }
}

/** Achievements that are met now and not yet in `unlocked`. */
export function newlyUnlocked(a: AchievementInput, unlocked: string[]): AchievementId[] {
  return ACHIEVEMENTS.map((x) => x.id).filter((id) => !unlocked.includes(id) && met(id, a));
}
