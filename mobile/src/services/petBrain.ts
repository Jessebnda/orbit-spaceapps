import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { LlamaContext } from 'llama.rn';
import { METRIC_META, type MetricKey } from '@orbit/shared';
import { ENV } from '../config/env';
import { askPet } from './hub';
import { PET_SYSTEM, petMessages, hasPhysicalRoleConfusion, type PetTurn } from '../domain/petPrompt';
import { useStore } from '../store/store';

const MODEL_PATH = `${FileSystem.documentDirectory}${ENV.petModelFile}`;

// Optional native module: absent in Expo Go. Every path then falls back to hub, then canned replies.
// Resolve the heavy native module only when a local chat is actually requested.
function llamaInitializer(): typeof import('llama.rn').initLlama | null {
  try { return (require('llama.rn') as typeof import('llama.rn')).initLlama; }
  catch { return null; }
}

let ctx: LlamaContext | null = null;
let loading: Promise<LlamaContext> | null = null;
let idle: ReturnType<typeof setTimeout> | null = null;
let serial: Promise<unknown> = Promise.resolve();

type LocalModelStage = 'missing' | 'present' | 'loading' | 'loaded' | 'local-test-ok' | 'role-test-ok' | 'role-test-failed' | 'local-response' | 'error';
const modelStages: { stage: LocalModelStage; at: string; elapsedMs?: number }[] = [];
let diagnosticWrites: Promise<unknown> = Promise.resolve();
let verifiedContext: LlamaContext | null = null;
let warmPending: Promise<{ available: boolean; verified: boolean }> | null = null;
let roleCheckPassed: boolean | null = null;
let lastLocalCompletion: { at: string; elapsedMs: number; tokens: number; tokensPerSecond: number; test: boolean } | null = null;

/** Diagnostics contain only runtime metadata/timing, never prompts, replies or health. */
function modelDiagnostic(stage: LocalModelStage, elapsedMs?: number) {
  modelStages.push({ stage, at: new Date().toISOString(), ...(elapsedMs == null ? {} : { elapsedMs }) });
  if (modelStages.length > 30) modelStages.shift();
  const json = JSON.stringify({ modelFile: ENV.petModelFile, contextTokens: ENV.petContextTokens, gpu: ctx?.gpu ?? null, roleCheckPassed, stages: [...modelStages], lastLocalCompletion });
  diagnosticWrites = diagnosticWrites.then(() => FileSystem.writeAsStringAsync(`${FileSystem.documentDirectory}model-status.json`, json)).catch(() => {});
  return diagnosticWrites;
}

/** Load and run a tiny neutral test once per context, serialized with real replies. */
export function warmModel(): Promise<{ available: boolean; verified: boolean }> {
  if (warmPending) return warmPending;
  warmPending = runSerial(async () => {
    const began = Date.now();
    try {
      const file = await FileSystem.getInfoAsync(MODEL_PATH);
      if (!file.exists) {
        await modelDiagnostic('missing');
        return { available: false, verified: false };
      }
      useStore.getState().setBrain({ status: 'ready' });
      await modelDiagnostic('present');
      await modelDiagnostic('loading');
      const c = await context();
      await modelDiagnostic('loaded', Date.now() - began);
      if (verifiedContext !== c) {
        const testStart = Date.now();
        const result = await c.completion({ messages: [{ role: 'user', content: 'Responde solo: listo /no_think' }], n_predict: 8, temperature: 0, stop: ['<|im_end|>'] });
        if (!result.text.trim() && result.tokens_predicted <= 0) throw new Error('local-test-empty');
        lastLocalCompletion = { at: new Date().toISOString(), elapsedMs: Date.now() - testStart, tokens: result.tokens_predicted, tokensPerSecond: result.timings.predicted_per_second, test: true };
        verifiedContext = c;
        await modelDiagnostic('local-test-ok', Date.now() - began);
        const roleResult = await c.completion({
          messages: petMessages('Como estoy fisicamente', 'Datos simulados (demo). Signos: Pulso 72 lpm, SpO₂ 97 %.'),
          jinja: true, enable_thinking: false, n_predict: 96, temperature: 0.3, stop: ['<|im_end|>'],
        });
        const roleAnswer = roleResult.text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        roleCheckPassed = !hasPhysicalRoleConfusion(roleAnswer) && /\btu[s]?\b|tú|te sientes/i.test(roleAnswer);
        await modelDiagnostic(roleCheckPassed ? 'role-test-ok' : 'role-test-failed', Date.now() - began);
      }
      return { available: true, verified: true };
    } catch {
      await modelDiagnostic('error', Date.now() - began);
      throw new Error('No se pudo comprobar el modelo local');
    } finally {
      if (idle) clearTimeout(idle);
      idle = setTimeout(() => void release(), ENV.petIdleMs);
    }
  }).finally(() => { warmPending = null; });
  return warmPending;
}

/** Crisis words never reach a model: the reply is fixed and points to a human. */
const CRISIS = /suicid|matarme|quitarme la vida|autolesi|hacerme daño|no quiero vivir/i;
const CRISIS_REPLY = 'Lo que dices me preocupa. Contacta ahora mismo con el capitán o con el médico de vuelo; no te quedes con esto solo.';
const CRISIS_NOTE = 'El usuario está en un momento muy difícil: acompáñalo con calidez, sin juzgar ni sermonear, pregúntale qué está pasando y recuérdale que no está solo.';
const SYSTEM = PET_SYSTEM;
const SUMMARY = 'Resume en español, en 2 frases cálidas y concretas, estas observaciones semanales de un tripulante. No diagnosticas.';

/** Only checks that the file exists. The model itself loads on the first message. */
/** A partial file would crash llama.rn on load, so "present" means the exact expected size. */
async function modelComplete(path: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(path);
  return info.exists && !info.isDirectory && info.size === ENV.petModelBytes;
}

export async function checkModel() {
  for (const f of ENV.petLegacyFiles) await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${f}`, { idempotent: true });
  const ok = await modelComplete(MODEL_PATH);
  if (!ok) await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
  useStore.getState().setBrain({ status: ok ? 'ready' : 'none' });
}

/** One context at a time. A load in progress is shared, never started twice. */
function context(): Promise<LlamaContext> {
  if (ctx) return Promise.resolve(ctx);
  if (!loading) {
    const init = llamaInitializer();
    if (!init) return Promise.reject(new Error('Modelo local no disponible'));
    // Android: GPU offload put a 572 MB model into ~1.7 GB of graphics memory and froze the phone; the CPU path is lighter.
    loading = init({ model: MODEL_PATH.replace('file://', ''), n_ctx: ENV.petContextTokens, use_mlock: false, ...(Platform.OS === 'android' ? { n_gpu_layers: 0 } : {}) })
      .then((c) => (ctx = c))
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

/** Frees the context: on idle, on app background, and before another model is downloaded. */
export async function release() {
  return runSerial(async () => {
  if (idle) clearTimeout(idle);
  idle = null;
  if (loading) await loading.catch(() => {});
  const c = ctx;
  ctx = null;
  verifiedContext = null;
  await c?.release().catch(() => {});
  });
}

function runSerial<T>(fn: () => Promise<T>): Promise<T> {
  const run = serial.then(fn);
  serial = run.catch(() => {});
  return run;
}

/** One generation at a time. Null when the model is missing or fails, so callers fall back. */
export function ask(system: string, user: string, telemetry?: string, history: PetTurn[] = []): Promise<string | null> {
  if (useStore.getState().brain.status !== 'ready') return Promise.resolve(null);
  return runSerial(async () => {
    try {
      const c = await context();
      const completionBegan = Date.now();
      const r = await c.completion({
        messages: telemetry == null ? [{ role: 'system', content: system }, { role: 'user', content: `${user} /no_think` }] : petMessages(user, telemetry, history, system),
        jinja: true,
        enable_thinking: false,
        n_predict: 140,
        temperature: 0.3,
        stop: ['<|im_end|>'],
      });
      lastLocalCompletion = { at: new Date().toISOString(), elapsedMs: Date.now() - completionBegan, tokens: r.tokens_predicted, tokensPerSecond: r.timings.predicted_per_second, test: false };
      await modelDiagnostic('local-response', Date.now() - completionBegan);
      const answer = r.text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      if (telemetry != null && hasPhysicalRoleConfusion(answer)) return null;
      return answer || null;
    } catch {
      return null;
    } finally {
      if (idle) clearTimeout(idle);
      idle = setTimeout(() => void release(), ENV.petIdleMs);
    }
  });
}

export async function downloadModel() {
  const st = useStore.getState();
  if (st.brain.status === 'downloading') return;
  await release(); // a new download replaces whatever model was loaded
  st.setBrain({ status: 'downloading', progress: 0 });
  let last = -1;
  try {
    const part = `${MODEL_PATH}.part`; // never expose a half-written model at MODEL_PATH
    const res = await FileSystem.createDownloadResumable(ENV.petModelUrl, part, {}, (p) => {
      const pct = Math.floor((p.totalBytesWritten / Math.max(1, p.totalBytesExpectedToWrite)) * 100);
      if (pct !== last) {
        last = pct;
        useStore.getState().setBrain({ progress: pct / 100 });
      }
    }).downloadAsync();
    if (!res || res.status !== 200) throw new Error(`http ${res?.status}`);
    if (!(await modelComplete(part))) throw new Error('incomplete model file');
    await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
    await FileSystem.moveAsync({ from: part, to: MODEL_PATH });
    st.setBrain({ status: 'ready', progress: 1 });
  } catch {
    await FileSystem.deleteAsync(`${MODEL_PATH}.part`, { idempotent: true });
    st.setBrain({ status: 'error', progress: 0 });
  }
}

function facts(): string {
  const s = useStore.getState();
  const vitals = (Object.keys(METRIC_META) as MetricKey[])
    .filter((k) => s.metrics[k] != null)
    .map((k) => `${METRIC_META[k].label} ${s.metrics[k]} ${METRIC_META[k].unit}`);
  const last = s.checkins[s.checkins.length - 1];
  const checkin = last
    ? `ánimo ${last.mood}/5, estrés ${last.stress}/5${last.bereavement ? ', recibió una mala noticia familiar' : ''}`
    : 'sin check-in';
  const protocols = s.protocols.filter((p) => !s.done.includes(p.id)).map((p) => p.title);
  const source = s.dataSource === 'sim' ? 'Datos simulados (demo); no son mediciones de salud reales. ' : '';
  return `${source}Signos: ${vitals.join(', ') || 'sin datos'}. Último check-in: ${checkin}. Protocolos activos: ${protocols.join('; ') || 'ninguno'}.`;
}

/** Fallback chain: on-device model, then the hub's pet brain, then canned replies. */
export async function petReply(text: string): Promise<string> {
  // last turns so it follows the conversation; the newest 'me' is `text` itself (ChatScreen adds it first)
  // old disclaimer replies are dropped, or the model keeps echoing them
  const history = useStore.getState().chat.slice(-7, -1).filter((m) => !(m.from === 'pet' && /simulaci/i.test(m.text)));
  const crisis = CRISIS.test(text);
  // crisis: the model still listens and helps; the human-contact line is fixed so it can never be skipped
  const llm = await ask(crisis ? `${SYSTEM} ${CRISIS_NOTE}` : SYSTEM, text, facts(), history);
  if (crisis) return llm ? `${llm}\n\n${CRISIS_REPLY}` : CRISIS_REPLY;
  if (llm) return llm;
  const remote = await askPet(text);
  return remote && !hasPhysicalRoleConfusion(remote) ? remote : canned(text);
}

/** Weekly insight wording: the model if loaded, otherwise the lines as they are. */
export async function summarize(lines: string[]): Promise<string> {
  return (await ask(SUMMARY, lines.join('\n'))) ?? lines.join(' ');
}

function canned(text: string): string {
  const t = text.toLowerCase();
  if (/f[ií]sic|salud|signos|m[eé]tricas|vitales/.test(t)) return useStore.getState().dataSource === 'sim' ? 'Tus datos actuales son de simulación y no permiten saber cómo estás físicamente. ¿Cómo te sientes tú ahora?' : 'Puedo ayudarte a revisar tus mediciones, pero no confirmar tu estado físico ni diagnosticarte. ¿Cómo te sientes y qué medición quieres revisar?';
  if (/cansad|sueño|dorm|fatig/.test(t)) return 'Descansar también es parte de la misión. Prueba 10 minutos de respiración lenta y deja las pantallas.';
  if (/triste|solo|sola|llor|añor/.test(t)) return 'Gracias por contármelo. ¿Quieres hablar hoy con alguien del equipo? Puedo guiarte en una sesión corta.';
  if (/miedo|ansi|estr|agobi|nervi/.test(t)) return 'Vamos paso a paso: inhala 4 segundos, sostén 4, exhala 4. ¿Lo hacemos juntos ahora?';
  return 'Estoy aquí contigo. ¿Qué necesitas en este momento?';
}
