// Pure text for the LLM and for the hub's own answers. Labels come from @orbit/shared so the copy lives in one place.
import {
  anomalyText, behaviorInsights, EMERGENCY_LABEL, formatMetric, METRIC_META, PROTOCOL_KIND_LABEL,
  type CrewSnapshot, type DaySummary, type Emergency, type MetricKey, type Metrics,
} from '@orbit/shared';

const STATUS_ES = { ok: 'normal', watch: 'vigilar', critical: 'crítico' } as const;

const metricsText = (m: Metrics) =>
  (Object.keys(m) as MetricKey[]).map((k) => `${METRIC_META[k].label} ${formatMetric(k, m[k])}`).join(', ') || 'sin datos';

export function crewLine(s: CrewSnapshot, nameOf: (id: string) => string): string {
  const ci = s.lastCheckIn ? `check-in: ánimo ${s.lastCheckIn.mood}/5, estrés ${s.lastCheckIn.stress}/5` : 'sin check-in';
  const anomalies = s.comms.anomalies.map((a) => anomalyText(a, nameOf)).join(' ');
  return `${s.member.name} (${s.member.role}, ${s.member.id}), ${s.online ? 'en línea' : 'desconectado'}, estado ${STATUS_ES[s.status]}. `
    + `Métricas: ${metricsText(s.metrics)}. ${ci}. Hoy ${Math.round(s.comms.todayMin)} min de conversación. ${anomalies}`.trimEnd();
}

export const petContext = (s: CrewSnapshot) => crewLine(s, (id) => id);

export function overviewText(snaps: CrewSnapshot[], emergencies: Emergency[]): string {
  const nameOf = (id: string) => snaps.find((s) => s.member.id === id)?.member.name ?? id;
  const open = emergencies.filter((e) => !e.resolved).map((e) => `${EMERGENCY_LABEL[e.kind]} en ${nameOf(e.victimId)}`);
  return [...snaps.map((s) => crewLine(s, nameOf)), open.length ? `Emergencias abiertas: ${open.join('; ')}.` : 'Sin emergencias abiertas.'].join('\n');
}

export function commsText(s: CrewSnapshot, nameOf: (id: string) => string): string {
  const byPeer = Object.entries(s.comms.byPeer).map(([id, min]) => `${nameOf(id)} ${Math.round(min)} min`).join(', ') || 'nadie';
  return `Hoy ${Math.round(s.comms.todayMin)} min en total. Por compañero: ${byPeer}. ${s.comms.anomalies.map((a) => anomalyText(a, nameOf)).join(' ')}`.trimEnd();
}

export function historyText(samples: { ts: number; metrics: Metrics }[]): string {
  if (!samples.length) return 'Sin muestras en ese periodo.';
  const step = Math.max(1, Math.ceil(samples.length / 24)); // at most ~24 lines for the model
  return samples
    .filter((_, i) => i % step === 0)
    .map((s) => `${new Date(s.ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })} ${metricsText(s.metrics)}`)
    .join('\n');
}

export function insightsText(days: DaySummary[]): string {
  const out = behaviorInsights(days);
  if (!out.length) return `Sin conclusiones todavía (${days.length} días con datos; hacen falta 5).`;
  return `Análisis de ${days.length} días: ${out.map((i) => i.text).join(' ')}`;
}
