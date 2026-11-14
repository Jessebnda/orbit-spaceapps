import { randomUUID } from 'node:crypto';
import { PROTOCOL_KIND_LABEL, type CrewSnapshot, type Protocol } from '@orbit/shared';
import { PROTOCOLS } from '../domain/protocols';
import { petContext } from '../domain/context';
import { chat, isAwake, type ChatMsg } from './llm';
import { search } from './rag';

export interface AgentCtx {
  overview(): string;
  history(crewId: string, hours: number): Promise<string>;
  comms(crewId: string): string;
  insights(crewId: string): Promise<string>;
  sendProtocol(crewId: string, p: Protocol): boolean;
}

const SYSTEM = 'Eres un asistente de análisis médico y psicológico para el capitán de la nave. Responde en español, de forma concisa, citando datos concretos (valores, horas, tendencias) obtenidos con las herramientas. No des diagnósticos definitivos: habla de indicios y recomienda revisión con el cirujano de vuelo en casos críticos. Formatea en markdown: listas y **negritas** para lo clave, tablas para comparar tripulantes. Sin emojis.';

const fn = (name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []) =>
  ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } });
const str = (description: string) => ({ type: 'string', description });
const TOOLS = [
  fn('get_crew_overview', 'Estado actual de TODA la tripulación en una llamada: métricas, estado, check-ins y emergencias. Úsala primero; no pidas historiales salvo que hagan falta tendencias.'),
  fn('get_member_history', 'Serie temporal de métricas de un tripulante.', { crewId: str('id, p. ej. c2'), hours: { type: 'number' } }, ['crewId']),
  fn('get_comms', 'Minutos de conversación de un tripulante hoy y anomalías frente a su línea base.', { crewId: str('id') }, ['crewId']),
  fn('get_behavior_insights', 'Análisis de comportamiento de los últimos 7 días (sueño, ánimo, comunicación, juego) de un tripulante.', { crewId: str('id') }, ['crewId']),
  fn('search_knowledge', 'Busca en la base de conocimiento (psicología, sueño, RCP, aislamiento).', { query: str('consulta'), k: { type: 'number' } }, ['query']),
  fn('list_protocols', 'Lista los protocolos de la biblioteca.'),
  fn('trigger_protocol', 'Envía a un tripulante un protocolo de la biblioteca.', { crewId: str('id'), protocolId: str('id del protocolo'), reason: str('motivo para el tripulante') }, ['crewId', 'protocolId']),
  fn('create_protocol', 'Crea un protocolo nuevo y lo envía al tripulante.', { crewId: str('id'), kind: { type: 'string', enum: ['mental', 'physical', 'emergency'] }, title: str('título'), steps: { type: 'array', items: { type: 'string' } }, reason: str('motivo') }, ['crewId', 'kind', 'title', 'steps']),
];

const KINDS = ['mental', 'physical', 'emergency'];

async function run(name: string, a: any, ctx: AgentCtx): Promise<unknown> {
  switch (name) {
    case 'get_crew_overview': return ctx.overview();
    case 'get_member_history': return ctx.history(a.crewId, a.hours ?? 6);
    case 'get_comms': return ctx.comms(a.crewId);
    case 'get_behavior_insights': return ctx.insights(a.crewId);
    case 'search_knowledge': return (await search(a.query, a.k ?? 3)).map((h) => `[${h.source}] ${h.content}`);
    case 'list_protocols': return PROTOCOLS.map((p) => `${p.id}: ${p.title} (${PROTOCOL_KIND_LABEL[p.kind]})`);
    case 'trigger_protocol': {
      const p = PROTOCOLS.find((x) => x.id === a.protocolId);
      if (!p) return { error: 'unknown protocolId' };
      return { delivered: ctx.sendProtocol(a.crewId, { ...p, reason: a.reason, createdBy: 'ai' }) };
    }
    case 'create_protocol': {
      if (!KINDS.includes(a.kind) || !Array.isArray(a.steps)) return { error: 'invalid kind or steps' };
      const p: Protocol = { id: `ai-${randomUUID().slice(0, 8)}`, kind: a.kind, title: a.title, steps: a.steps, reason: a.reason, createdBy: 'ai' };
      return { id: p.id, delivered: ctx.sendProtocol(a.crewId, p) };
    }
    default: return { error: `unknown tool ${name}` };
  }
}

const MAX_ROUNDS = 4;
const asText = (r: unknown) => (typeof r === 'string' ? r : JSON.stringify(r));
const parseArgs = (s: string) => { try { return JSON.parse(s || '{}'); } catch { return {}; } };

export async function ask(messages: { role: 'user' | 'assistant'; content: string }[], ctx: AgentCtx) {
  const convo: ChatMsg[] = [{ role: 'system', content: SYSTEM }, ...messages];
  const actions: { tool: string; args: unknown; result: string }[] = [];
  for (let round = 0; round < MAX_ROUNDS; round++) {
    // last round: no tools, so the model must answer with what it already gathered
    const last = round === MAX_ROUNDS - 1;
    const msg = await chat(last ? [...convo, { role: 'user', content: 'Responde ya con los datos que tienes.' }] : convo, last ? undefined : TOOLS);
    const calls = msg.tool_calls ?? [];
    if (!calls.length) return { reply: msg.content ?? '', actions };
    convo.push({ role: 'assistant', content: msg.content, tool_calls: calls });
    for (const [i, call] of calls.entries()) {
      const args = parseArgs(call.function.arguments);
      const result = await run(call.function.name, args, ctx).catch((e) => ({ error: String(e) }));
      actions.push({ tool: call.function.name, args, result: asText(result).slice(0, 300) });
      convo.push({ role: 'tool', tool_call_id: call.id ?? `${round}-${i}`, content: asText(result) });
    }
  }
  return { reply: 'No he podido cerrar el análisis; prueba con una pregunta más concreta.', actions };
}

const PET_SYSTEM = 'Eres un mentor psicológico cálido para un astronauta en una misión espacial. Responde en español, en como máximo 3 frases, sin diagnósticos. Si percibes riesgo (desesperanza, pánico intenso, pensamientos de hacerse daño), pide que avise al equipo médico.';
const CANNED = 'Estoy aquí contigo. Respira despacio: cuatro segundos dentro, cuatro fuera. Si te sientes peor, avisa al equipo médico.';

/** Never wakes the model: a sleeping 92 GB model would take minutes to reload for a chat line. */
export async function petReply(text: string, s: CrewSnapshot): Promise<string> {
  if (!(await isAwake())) return CANNED;
  try {
    const r = await chat([{ role: 'system', content: `${PET_SYSTEM}\n${petContext(s)}` }, { role: 'user', content: text }]);
    return r.content || CANNED;
  } catch { return CANNED; }
}
