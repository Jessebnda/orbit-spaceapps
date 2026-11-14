// Spanish UI strings and formatting shared by mobile, dashboard and hub. One place to change copy.
import type { CommsAnomaly, CommsRecord, Device, EmergencyKind, MetricKey, ProtocolKind } from './index';
import { METRIC_META } from './index';

export const EMERGENCY_LABEL: Record<EmergencyKind, string> = {
  cardiac_arrest: 'Paro cardiaco',
  hypoxia: 'Hipoxia',
  fever: 'Fiebre alta',
  hypertensive_crisis: 'Crisis hipertensiva',
  panic: 'Crisis de pánico',
};

export const PROTOCOL_KIND_LABEL: Record<ProtocolKind, string> = { emergency: 'Emergencia', physical: 'Física', mental: 'Mental' };

export const DEVICE_LABEL: Record<Device, string> = { band: 'Banda', sleeve: 'Manga', vest: 'Chaleco' };

export const CHANNEL_LABEL: Record<CommsRecord['channel'], string> = { voice: 'Voz', text: 'Texto', in_person: 'En persona' };

/** "72 lpm", "36.6 °C", "—" when missing. */
export function formatMetric(key: MetricKey, v: number | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  const m = METRIC_META[key];
  return `${v.toFixed(m.decimals)} ${m.unit}`;
}

/** Plain-Spanish, non-judgemental sentence for a comms anomaly. `nameOf` maps crewId -> display name. */
export function anomalyText(a: CommsAnomaly, nameOf: (id: string) => string): string {
  if (a.kind === 'withdrawal') return `Habló mucho menos de lo usual hoy (${a.detail}).`;
  if (a.kind === 'spike') return `Habló mucho más de lo usual hoy (${a.detail}).`;
  return `Hoy no habló con ${nameOf(a.peerId ?? '')}, con quien suele hablar casi a diario.`;
}
