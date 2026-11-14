// Builds the DaySummary input for behaviorInsights() from hub data, and the prompt for the assistant.
import { anomalyText, type CommsAnomaly, type CrewSnapshot, type DaySummary, type Insight } from "@orbit/shared";
import type { CommsRow, HistoryPoint } from "@/lib/services/hub";

const DAY = 86_400_000;

const dayKey = (ts: number) => new Date(ts).toLocaleDateString("sv"); // YYYY-MM-DD, local

/**
 * One summary per local day, oldest first. History gives sleep and activity; comms gives talk minutes.
 * Mood, stress, game and pet time exist only for today (the snapshot's last check-in and stats), so the
 * insights that need them only fire on the most recent day.
 * shortcut: the hub has no per-day check-in or game history, so mood/game/pet are today-only, upgrade when the hub exposes them.
 */
export function dailySummaries(
  history: HistoryPoint[],
  comms: CommsRow[],
  crewId: string,
  today: CrewSnapshot,
  now: number,
  days = 14,
): DaySummary[] {
  const keys = Array.from({ length: days }, (_, i) => dayKey(now - (days - 1 - i) * DAY));
  const out = new Map<string, DaySummary>(keys.map((day) => [day, { day }]));
  const row = (ts: number) => out.get(dayKey(ts));

  for (const h of history) {
    const d = row(h.ts);
    if (!d) continue;
    if (h.metrics.sleep != null) d.sleep = h.metrics.sleep;
    if (h.metrics.activity != null) d.activity = Math.max(d.activity ?? 0, h.metrics.activity);
  }
  for (const r of comms) {
    const d = row(r.ts);
    if (d) d.commsMin = (d.commsMin ?? 0) + r.minutes;
  }

  const todayRow = out.get(dayKey(now));
  if (todayRow) {
    todayRow.mood = today.lastCheckIn?.mood;
    todayRow.stress = today.lastCheckIn?.stress;
    todayRow.gameMin = today.stats.gameMin;
    todayRow.petMin = today.stats.petMin;
  }
  return keys.map((k) => out.get(k) as DaySummary);
}

/** Prompt for "Pedir análisis al asistente": the computed facts, no diagnosis requested. */
export function behaviourPrompt(member: { name: string; role: string }, insights: Insight[], anomalies: CommsAnomaly[], nameOf: (id: string) => string) {
  const facts = [
    ...insights.map((i) => `- ${i.text}`),
    ...anomalies.map((a) => `- ${anomalyText(a, nameOf)}`),
  ];
  return `Analiza el comportamiento de ${member.name} (${member.role}) con este resumen calculado por el monitor. No diagnostiques; di qué convendría observar.\n${facts.length ? facts.join("\n") : "- Sin señales destacadas."}`;
}
