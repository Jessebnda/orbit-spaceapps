import { WebSocket } from 'ws';
import { worstStatus } from '@orbit/shared';
import { cleanMetrics, parse } from '../domain/validate';
import { RING_MAX, STAT_MAX, addEmergency, applyStat, captains, commsLog, crews, envOf, newCrew, pushCapped, snapshotOf, statLog } from '../domain/state';
import { decide, raiseDecisions, type Decision } from '../domain/rules';
import { send, sendProtocol, resolveEmergency, toCaptains } from '../services/hub';
import { ackProtocol, saveCheckin, saveComms, saveCrew, saveEmergency, saveStat, saveVitals } from '../services/store';
import { petReply } from '../services/agent';

/** Carries out the rules' decisions: sends to phones and captains, stores in the DB. */
function execute(ds: Decision[]) {
  for (const d of ds) {
    if (d.t === 'emergency') {
      addEmergency(d.emergency);
      saveEmergency(d.emergency);
      for (const id of d.targets) send(crews.get(id)?.ws, { t: 'emergency', emergency: d.emergency });
      toCaptains({ t: 'emergency', emergency: d.emergency });
    } else {
      sendProtocol(d.crewId, d.protocol);
      if (d.toCaptains) toCaptains({ t: 'protocol', crewId: d.crewId, protocol: d.protocol });
    }
  }
}

const judge = (crewId: string, now: number) => execute(decide(snapshotOf(crewId, now), envOf(now)));

/** At most one vitals row per crew per 10 s. */
const DB_VITALS_EVERY_MS = 10_000;

export function onConnection(ws: WebSocket) {
  let crewId: string | undefined;
  ws.on('error', () => {}); // 'close' follows and does the cleanup
  ws.on('message', (raw) => {
    const msg = parse(raw.toString());
    if (!msg) return;
    const now = Date.now();
    try {
      switch (msg.t) {
        case 'hello': {
          if (msg.role === 'captain') { captains.add(ws); return; }
          const m = msg.member;
          let c = crews.get(m.id);
          if (!c) { c = newCrew(m, now); crews.set(m.id, c); }
          c.snap.member = m; c.snap.online = true; c.snap.lastSeen = now; c.ws = ws;
          crewId = m.id;
          saveCrew(m);
          return;
        }
        case 'vitals': {
          const c = crews.get(msg.crewId); if (!c) return;
          Object.assign(c.snap.metrics, cleanMetrics(msg.metrics));
          c.snap.status = worstStatus(c.snap.metrics);
          c.snap.lastSeen = now;
          const metrics = { ...c.snap.metrics };
          pushCapped(c.ring, { ts: now, metrics }, RING_MAX);
          if (now - c.lastDbVitals >= DB_VITALS_EVERY_MS) { c.lastDbVitals = now; saveVitals(msg.crewId, now, metrics); }
          judge(msg.crewId, now);
          return;
        }
        case 'proximity': { const c = crews.get(msg.crewId); if (c) c.snap.peers = msg.peers; return; }
        case 'checkin': {
          const c = crews.get(msg.crewId); if (!c) return;
          c.snap.lastCheckIn = msg.checkin;
          saveCheckin(msg.crewId, msg.checkin);
          judge(msg.crewId, now);
          return;
        }
        case 'comms': {
          const r = msg.record;
          if (!crews.has(r.crewId) || !crews.has(r.peerId)) return; // unknown crew: drop
          commsLog.push(r);
          saveComms(r);
          judge(r.crewId, now); judge(r.peerId, now);
          return;
        }
        case 'stat': {
          const c = crews.get(msg.crewId); if (!c) return;
          applyStat(c.snap.stats, msg.event);
          pushCapped(statLog, { crewId: msg.crewId, ts: now, event: msg.event }, STAT_MAX);
          saveStat(msg.crewId, now, msg.event);
          return;
        }
        case 'pet_chat': {
          if (!crews.has(msg.crewId)) return;
          // petReply checks the model is awake, so pet chat never loads it.
          petReply(msg.text, snapshotOf(msg.crewId, now)).then((text) => send(ws, { t: 'pet_reply', crewId: msg.crewId, text }));
          return;
        }
        case 'sos': { if (crews.has(msg.crewId)) execute(raiseDecisions(msg.crewId, msg.kind, envOf(now))); return; }
        case 'protocol_ack': { ackProtocol(msg.crewId, msg.protocolId); return; }
        case 'resolve': { resolveEmergency(msg.emergencyId); return; }
      }
    } catch (e) {
      console.error('[ws] handler error', e);
    }
  });
  ws.on('close', () => {
    captains.delete(ws);
    const c = crewId ? crews.get(crewId) : undefined;
    if (c && c.ws === ws) { c.ws = undefined; c.snap.online = false; }
  });
}
