// Asserts for non-trivial domain logic. Run: npx --yes tsx lib/domain/domain.check.ts
import assert from "node:assert/strict";
import { behaviorInsights, formatMetric, statusOf, STATUS_COLOR, type CrewSnapshot } from "@orbit/shared";
import { downsample } from "./downsample";
import { thresholdBands } from "./bands";
import { fmtPace } from "./format";
import { dailySummaries } from "./behaviour";

// downsample: caps at max and keeps order.
assert.equal(downsample([1, 2, 3], 500).length, 3);
const big = Array.from({ length: 2000 }, (_, i) => i);
const thinned = downsample(big, 500);
assert.equal(thinned.length, 500);
assert.equal(thinned[0], 0);
assert.ok(thinned.every((v, i, a) => i === 0 || v > a[i - 1]), "order kept");

// thresholdBands: axis is ordered and every band sits inside it; an ok band always exists.
for (const key of ["hr", "spo2", "temp", "bpSys", "bpDia", "resp", "activity", "sleep", "kcal", "water"] as const) {
  const { lo, hi, bands } = thresholdBands(key);
  assert.ok(lo < hi, `${key} axis`);
  assert.ok(bands.every((b) => b.y2 > b.y1 && b.y1 < hi && b.y2 > lo), `${key} bands inside axis`);
  assert.ok(bands.some((b) => b.status === "ok"), `${key} has an ok band`);
}
assert.equal(statusOf("hr", 72), "ok");
assert.equal(statusOf("hr", 110), "watch");
assert.equal(statusOf("hr", 135), "critical");
assert.equal(STATUS_COLOR.critical, "#FF5A5F");

// fmtPace and formatMetric.
assert.equal(fmtPace(30, 5), "6:00 /km");
assert.equal(fmtPace(10, 0), "—");
assert.equal(formatMetric("hr", undefined), "—");

// dailySummaries: one row per day, oldest first, comms and sleep land on the right day.
const DAY = 86_400_000;
const now = Date.UTC(2026, 10, 14, 12);
const today = { lastCheckIn: { ts: now, mood: 2, stress: 4, missionOutlook: 3 }, stats: { gameMin: 40, petMin: 5, activityMin: 0, xp: 0, achievements: [] } } as unknown as CrewSnapshot;
const days = dailySummaries(
  [{ ts: now - DAY, metrics: { sleep: 6 } }],
  [{ crewId: "a", peerId: "b", ts: now - DAY, minutes: 30, channel: "voice" }],
  "a",
  today,
  now,
  14,
);
assert.equal(days.length, 14);
assert.equal(days[12].sleep, 6);
assert.equal(days[12].commsMin, 30);
assert.equal(days[13].mood, 2);
assert.ok(days[0].day < days[13].day, "oldest first");
// Too little history gives no insight, not a guess.
assert.deepEqual(behaviorInsights(days.slice(0, 3)), []);

console.log("domain checks passed");
