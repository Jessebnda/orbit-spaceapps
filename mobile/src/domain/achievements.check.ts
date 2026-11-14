// Run: npm run check:domain. Asserts for the pure achievement rules.
import { newlyUnlocked, type AchievementInput } from './achievements';
import { dayKey } from './derive';

const now = Date.UTC(2026, 10, 14, 12);
const DAY = 86_400_000;
const key = dayKey;
const base: AchievementInput = { now, checkins: [], days: {}, done: [], sessions: [], stats: { petSec: 0, gameSec: 0, bestScore: 0, cprDrills: 0 }, explorations: [] };

console.assert(newlyUnlocked(base, []).length === 0, 'nothing unlocked on an empty account');
console.assert(newlyUnlocked({ ...base, checkins: [{ ts: now, mood: 3, stress: 2, missionOutlook: 3 }] }, []).includes('first_checkin'), 'first check-in unlocks');
console.assert(!newlyUnlocked({ ...base, stats: { ...base.stats, bestScore: 999 } }, []).includes('defender_1000'), '999 is not 1000');
console.assert(newlyUnlocked({ ...base, stats: { ...base.stats, bestScore: 1000 } }, []).includes('defender_1000'), '1000 unlocks');
console.assert(!newlyUnlocked({ ...base, explorations: [{ km: 6 }, { km: 3 }] }, []).includes('explore_10km'), '9 km is not 10');
console.assert(newlyUnlocked({ ...base, explorations: [{ km: 6 }, { km: 4 }] }, []).includes('explore_10km'), '10 km unlocks');
console.assert(!newlyUnlocked({ ...base, days: { [key(now)]: { activity: 119 } } }, []).includes('exercise_2h'), '119 min is not 2 h');
const three = { [key(now)]: { sleep: 7 }, [key(now - DAY)]: { sleep: 7.5 }, [key(now - 2 * DAY)]: { sleep: 8 } };
console.assert(newlyUnlocked({ ...base, days: three }, []).includes('sleep_7h_x3'), 'three nights of 7 h+ unlock');
console.assert(!newlyUnlocked({ ...base, days: { ...three, [key(now - DAY)]: { sleep: 6.9 } } }, []).includes('sleep_7h_x3'), 'a 6.9 h night does not count as a qualifying night');
console.assert(!newlyUnlocked({ ...base, stats: { ...base.stats, cprDrills: 1 } }, ['cpr_trained']).includes('cpr_trained'), 'already unlocked is not returned again');
const accumulated = { [key(now)]: { sleep: 7 }, [key(now - 3 * DAY)]: { sleep: 7.5 }, [key(now - 8 * DAY)]: { sleep: 8 } };
if (!newlyUnlocked({ ...base, days: accumulated }, []).includes('sleep_7h_x3')) throw new Error('qualifying nights accumulate across rest days');
console.log('achievements.check: ok');
