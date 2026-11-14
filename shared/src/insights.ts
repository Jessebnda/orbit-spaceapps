// Behaviour analysis shared by the phone ("Análisis de comportamiento"), the dashboard and the hub agent.
// Pure: each app builds DaySummary[] from its own data source, the reading of it lives here once.
import type { Status } from './index';

export interface DaySummary {
  day: string; // YYYY-MM-DD
  sleep?: number; activity?: number; mood?: number; stress?: number;
  commsMin?: number; gameMin?: number; petMin?: number;
}

export interface Insight { id: string; tone: Status; text: string }

type Key = Exclude<keyof DaySummary, 'day'>;
const vals = (d: DaySummary[], k: Key) => d.map((x) => x[k]).filter((v): v is number => v != null);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

function corr(d: DaySummary[], a: Key, b: Key): number {
  const pairs = d.filter((x) => x[a] != null && x[b] != null).map((x) => [x[a]!, x[b]!] as const);
  if (pairs.length < 4) return NaN;
  const ma = mean(pairs.map((p) => p[0])), mb = mean(pairs.map((p) => p[1]));
  let num = 0, da = 0, db = 0;
  for (const [x, y] of pairs) { num += (x - ma) * (y - mb); da += (x - ma) ** 2; db += (y - mb) ** 2; }
  return da && db ? num / Math.sqrt(da * db) : NaN;
}

/** Compares the last 3 days against the earlier days of the window (needs ≥ 5 days). Oldest first. */
export function behaviorInsights(days: DaySummary[]): Insight[] {
  if (days.length < 5) return [];
  const recent = days.slice(-3), before = days.slice(0, -3);
  const delta = (k: Key) => mean(vals(recent, k)) - mean(vals(before, k));
  const ratio = (k: Key) => mean(vals(recent, k)) / mean(vals(before, k));
  const out: Insight[] = [];

  const dSleep = delta('sleep');
  if (dSleep <= -1) out.push({ id: 'sleep_drop', tone: 'watch', text: `Dormiste ${Math.abs(dSleep).toFixed(1)} h menos por noche estos últimos 3 días.` });
  const dMood = delta('mood');
  if (dMood <= -1) out.push({ id: 'mood_drop', tone: 'watch', text: 'Tu ánimo viene bajando estos últimos días.' });
  if (ratio('commsMin') < 0.5) out.push({ id: 'social_drop', tone: 'watch', text: 'Estás hablando menos con el equipo que antes.' });
  if (ratio('gameMin') > 2 && dMood < 0) out.push({ id: 'escape', tone: 'watch', text: 'Más tiempo en juegos mientras baja tu ánimo: ¿una sesión con tu mascota?' });
  if (corr(days, 'sleep', 'mood') >= 0.5) out.push({ id: 'sleep_mood', tone: 'ok', text: 'Los días que duermes más, tu ánimo es mejor.' });
  if (corr(days, 'activity', 'stress') <= -0.5) out.push({ id: 'move_stress', tone: 'ok', text: 'Los días que haces ejercicio, tu estrés baja.' });
  return out;
}
