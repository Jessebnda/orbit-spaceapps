// Outbound messages to phones and captains, and the calls that change an emergency or a protocol.
import { WebSocket } from 'ws';
import type { HubMsg, Protocol } from '@orbit/shared';
import { captains, crews, emergencies, allSnaps, pruneComms } from '../domain/state';
import { saveEmergency, saveProtocol } from './store';

const isOpen = (ws?: WebSocket): ws is WebSocket => ws?.readyState === WebSocket.OPEN;
export const send = (ws: WebSocket | undefined, msg: HubMsg) => { if (isOpen(ws)) ws.send(JSON.stringify(msg)); };
export const toCaptains = (msg: HubMsg) => { for (const ws of captains) send(ws, msg); };

/** Returns whether the phone is online right now. The protocol is stored either way. */
export function sendProtocol(crewId: string, protocol: Protocol): boolean {
  const c = crews.get(crewId);
  if (!c) return false;
  send(c.ws, { t: 'protocol', crewId, protocol });
  saveProtocol(crewId, protocol);
  return isOpen(c.ws);
}

export function resolveEmergency(id: string): boolean {
  const e = emergencies.find((x) => x.id === id);
  if (!e) return false;
  e.resolved = true;
  saveEmergency(e);
  return true;
}

/** 3 s tick: snapshot to captains, self to each phone. */
export function broadcast(now: number) {
  pruneComms(now);
  const all = allSnaps(now);
  for (const ws of captains) send(ws, { t: 'snapshot', crew: all, emergencies });
  const roster = all.map((s) => s.member); // phones show names, not ids
  for (const s of all) send(crews.get(s.member.id)?.ws, { t: 'self', snapshot: s, crew: roster });
}
