// Run: npm run check:domain. Asserts for the pure pet and day-summary rules.
import { checkinStreak, daySummaries, dayKey, petMood } from './derive';

const now = Date.UTC(2026, 10, 14, 12);
const DAY = 86_400_000;
console.assert(petMood({ hr: 70 }) === 'happy', 'healthy metrics: happy');
console.assert(petMood({ sleep: 5 }) === 'tired', 'short sleep: tired');
console.assert(petMood({ hr: 70 }, { ts: now, mood: 1, stress: 2, missionOutlook: 2 }) === 'sad', 'low mood: sad');
console.assert(petMood({ hr: 170 }) === 'sad', 'critical metric: sad');

const ci = (ts: number) => ({ ts, mood: 3 as const, stress: 2 as const, missionOutlook: 3 as const });
console.assert(checkinStreak([0, 1, 2].map((d) => ci(now - d * DAY)), now) === 3, 'three days in a row is a streak of 3');
console.assert(checkinStreak([ci(now - 2 * DAY)], now) === 0, 'a check-in two days ago does not count today');

const rows = daySummaries({ [dayKey(now)]: { sleep: 7 } }, [ci(now)]);
console.assert(rows.length === 1 && rows[0].sleep === 7 && rows[0].mood === 3, 'summary joins sleep and mood by day');
console.log('derive.check: ok');
