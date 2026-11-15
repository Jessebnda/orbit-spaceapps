import type { IncomingMessage, ServerResponse } from 'node:http';
import { type CommsResponse, type DaySummary, type Exploration, type LeaderRow, type Metrics } from '@orbit/shared';
import { PROTOCOLS } from '../domain/protocols';
import { DAY, allSnaps, commsLog, commsOf, crews, emergencies, snapshotOf, statLog } from '../domain/state';
import { commsText, historyText, insightsText, overviewText } from '../domain/context';
import { isObj, isStr } from '../domain/validate';
import { ask, type AgentCtx } from '../services/agent';
import { LlmOffline, ensureLLM, llmState } from '../services/llm';
import { resolveEmergency, sendProtocol } from '../services/hub';
import { daySummaries, vitalsSince } from '../services/store';

class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

const JSON_HDR = { 'Content-Type': 'application/json' };

function readJson(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 1_000_000) { req.destroy(); reject(new HttpError(413, 'body too large')); }
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new HttpError(400, 'invalid JSON')); }
    });
    req.on('error', reject);
  });
}

/** Vitals from the DB; the in-memory ring keeps charts working when it is down. */
async function history(crewId: string, hours: number): Promise<{ ts: number; metrics: Metrics }[]> {
  const rows = await vitalsSince(crewId, hours);
  if (rows.length) return rows;
  const since = Date.now() - hours * 3_600_000;
  return (crews.get(crewId)?.ring ?? []).filter((s) => s.ts > since);
}

const nameOf = (id: string) => crews.get(id)?.snap.member.name ?? id;

/** The agent sees text, not JSON, so the copy and units match what the phones show. */
const ctx: AgentCtx = {
  overview: () => overviewText(allSnaps(Date.now()), emergencies),
  history: async (id, h) => historyText(await history(id, h)),
  comms: (id) => commsText(snapshotOf(id, Date.now()), nameOf),
  insights: async (id) => insightsText((await daySummaries(id)) as DaySummary[]),
  sendProtocol,
};

function leaderboard(): LeaderRow[] {
  return [...crews.values()]
    .map(({ snap }) => ({ member: { id: snap.member.id, name: snap.member.name }, xp: snap.stats.xp, achievements: snap.stats.achievements }))
    .sort((a, b) => b.xp - a.xp);
}

function explorations(): Exploration[] {
  return statLog
    .flatMap(({ crewId, ts, event }) => (event.type === 'exploration' ? [{ crewId, name: nameOf(crewId), ts, event }] : []))
    .sort((a, b) => b.ts - a.ts);
}

async function route(method: string, path: string, q: URLSearchParams, body: any): Promise<unknown> {
  const now = Date.now();
  const crewParam = () => decodeURIComponent(path.split('/')[3] ?? '');
  if (method === 'GET') {
    if (path === '/api/snapshot') return { crew: allSnaps(now), emergencies };
    if (path === '/api/leaderboard') return leaderboard();
    if (path === '/api/explorations') return explorations();
    if (path === '/api/protocols') return PROTOCOLS;
    if (path === '/api/llm') return { state: await llmState() };
    if (path.startsWith('/api/history/')) return history(crewParam(), Number(q.get('hours') ?? 24));
    if (path.startsWith('/api/comms/')) {
      const id = crewParam();
      const since = now - Number(q.get('days') ?? 14) * DAY;
      const out: CommsResponse = { records: commsLog.filter((r) => r.ts > since && (r.crewId === id || r.peerId === id)), ...commsOf(id, now) };
      return out;
    }
  }
  if (method === 'POST') {
    if (path === '/api/protocol') {
      if (!crews.has(body.crewId)) throw new HttpError(404, 'unknown crew');
      const p = body.protocolId ? PROTOCOLS.find((x) => x.id === body.protocolId)
        : (isObj(body.protocol) && isStr(body.protocol.id) && isStr(body.protocol.title) && Array.isArray(body.protocol.steps) ? { ...body.protocol, createdBy: 'captain' } : undefined);
      if (!p) throw new HttpError(400, 'unknown protocol');
      return { delivered: sendProtocol(body.crewId, p) };
    }
    if (path === '/api/hard_news') {
      const c = crews.get(body.crewId);
      if (!c) throw new HttpError(404, 'unknown crew');
      // shortcut: in memory only, lost on a hub restart; persist like check-ins if that matters.
      c.snap.hardNews = body.on === true ? Date.now() : undefined;
      return { hardNews: c.snap.hardNews ?? null };
    }
    if (path === '/api/resolve') {
      if (!resolveEmergency(body.emergencyId)) throw new HttpError(404, 'unknown emergency');
      return { ok: true };
    }
    if (path === '/api/assistant') {
      const messages = Array.isArray(body.messages)
        ? body.messages.filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && isStr(m.content)) : [];
      if (!messages.length) throw new HttpError(400, 'messages required');
      try {
        await ensureLLM(); // only the assistant may wake the model
        return await ask(messages, ctx);
      } catch (e) {
        if (e instanceof LlmOffline) throw new HttpError(503, e.message);
        throw e;
      }
    }
  }
  throw new HttpError(404, 'not found');
}

/**
 * The local model can take minutes; Safari drops a fetch that gets no bytes for ~60 s ("Load failed").
 * Send headers now and a space every 15 s (JSON.parse ignores leading whitespace); errors go in the body.
 */
async function longPoll(res: ServerResponse, work: () => Promise<unknown>) {
  res.writeHead(200, JSON_HDR);
  const beat = setInterval(() => res.write(' '), 15_000);
  try {
    res.end(JSON.stringify(await work()));
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    res.end(JSON.stringify({ error: (e as Error).message, status: e instanceof HttpError ? e.status : 500 }));
  } finally {
    clearInterval(beat);
  }
}

export async function handleHttp(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // LAN only, no login by design
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return void res.writeHead(204).end();
  try {
    const url = new URL(req.url ?? '/', 'http://hub');
    const body = req.method === 'POST' ? await readJson(req) : {};
    if (req.method === 'POST' && url.pathname === '/api/assistant') return void (await longPoll(res, () => route('POST', url.pathname, url.searchParams, body)));
    const out = await route(req.method ?? 'GET', url.pathname, url.searchParams, body); // before writeHead: a throw must still get its status
    res.writeHead(200, JSON_HDR).end(JSON.stringify(out));
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(e);
    if (!res.headersSent) res.writeHead(status, JSON_HDR);
    res.end(JSON.stringify({ error: (e as Error).message }));
  }
}
