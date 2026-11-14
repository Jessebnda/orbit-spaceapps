import type { ClientMsg, MetricKey, Metrics } from '@orbit/shared';
import { THRESHOLDS } from '@orbit/shared';
import { EMERGENCY_PROTOCOL } from './protocols';

export const isObj = (v: any): v is Record<string, any> => typeof v === 'object' && v !== null;
export const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const EMERGENCY_KINDS = Object.keys(EMERGENCY_PROTOCOL);
const METRIC_KEYS = Object.keys(THRESHOLDS) as MetricKey[];

/** Returns null for anything that is not a well-formed client message. Bad input is dropped, never thrown. */
export function parse(text: string): ClientMsg | null {
  let m: any;
  try { m = JSON.parse(text); } catch { return null; }
  if (!isObj(m) || !isStr(m.t)) return null;
  const ok = (() => {
    switch (m.t) {
      case 'hello': return m.role === 'captain' || (m.role === 'crew' && isObj(m.member) && isStr(m.member.id) && isStr(m.member.name) && isStr(m.member.role));
      case 'vitals': return isStr(m.crewId) && isObj(m.metrics);
      case 'proximity': return isStr(m.crewId) && Array.isArray(m.peers) && m.peers.every((p: any) => isObj(p) && isStr(p.crewId) && isNum(p.rssi));
      case 'checkin': return isStr(m.crewId) && isObj(m.checkin) && isNum(m.checkin.ts) && isNum(m.checkin.mood) && isNum(m.checkin.stress);
      case 'comms': return isObj(m.record) && isStr(m.record.crewId) && isStr(m.record.peerId) && isNum(m.record.ts) && isNum(m.record.minutes);
      case 'stat': return isStr(m.crewId) && isObj(m.event) && isStr(m.event.type);
      case 'pet_chat': return isStr(m.crewId) && isStr(m.text);
      case 'sos': return isStr(m.crewId) && EMERGENCY_KINDS.includes(m.kind);
      case 'protocol_ack': return isStr(m.crewId) && isStr(m.protocolId);
      case 'resolve': return isStr(m.emergencyId);
      default: return false;
    }
  })();
  return ok ? (m as ClientMsg) : null;
}

export function cleanMetrics(m: Record<string, unknown>): Metrics {
  const out: Metrics = {};
  for (const k of METRIC_KEYS) { const v = m[k]; if (isNum(v)) out[k] = v; }
  return out;
}
