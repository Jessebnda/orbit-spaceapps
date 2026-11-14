import * as FileSystem from 'expo-file-system/legacy';
import type { LlamaContext } from 'llama.rn';
import { METRIC_META, type MetricKey } from '@orbit/shared';
import { ENV } from '../config/env';
import { askPet } from './hub';
import { useStore } from '../store/store';

const MODEL_PATH = `${FileSystem.documentDirectory}${ENV.petModelFile}`;

// Optional native module: absent in Expo Go. Every path then falls back to hub, then canned replies.
let initLlama: typeof import('llama.rn').initLlama | null = null;
try {
  initLlama = (require('llama.rn') as typeof import('llama.rn')).initLlama;
} catch {
  initLlama = null;
}

let ctx: LlamaContext | null = null;
let loading: Promise<LlamaContext> | null = null;
let idle: ReturnType<typeof setTimeout> | null = null;
let serial: Promise<unknown> = Promise.resolve();

/** Crisis words never reach a model: the reply is fixed and points to a human. */
const CRISIS = /suicid|matarme|quitarme la vida|autolesi|hacerme daño|no quiero vivir/i;
const CRISIS_REPLY = 'Lo que dices me preocupa. Contacta ahora mismo con el capitán o con el médico de vuelo; no te quedes con esto solo.';
const SYSTEM = 'Eres Orbit, una mascota mentora de apoyo psicológico para un tripulante de una misión espacial. Hablas en español, con calidez, en 3 frases como máximo. Usa los datos del tripulante para contextualizar y anima acciones sanas (respirar, moverse, hablar con un compañero, dormir a tiempo). Nunca diagnosticas ni recetas. Si menciona autolesión, suicidio o una crisis, dile que contacte ahora al capitán o al médico de vuelo.';
const SUMMARY = 'Resume en español, en 2 frases cálidas y concretas, estas observaciones semanales de un tripulante. No diagnosticas.';

/** Only checks that the file exists. The model itself loads on the first message. */
export async function checkModel() {
  const info = await FileSystem.getInfoAsync(MODEL_PATH);
  useStore.getState().setBrain({ status: info.exists ? 'ready' : 'none' });
}

/** One context at a time. A load in progress is shared, never started twice. */
function context(): Promise<LlamaContext> {
  if (ctx) return Promise.resolve(ctx);
  if (!loading) {
    loading = initLlama!({ model: MODEL_PATH.replace('file://', ''), n_ctx: ENV.petContextTokens, use_mlock: false })
      .then((c) => (ctx = c))
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

/** Frees the context: on idle, on app background, and before another model is downloaded. */
export async function release() {
  if (idle) clearTimeout(idle);
  idle = null;
  if (loading) await loading.catch(() => {});
  const c = ctx;
  ctx = null;
  await c?.release().catch(() => {});
}

function runSerial<T>(fn: () => Promise<T>): Promise<T> {
  const run = serial.then(fn);
  serial = run.catch(() => {});
  return run;
}

/** One generation at a time. Null when the model is missing or fails, so callers fall back. */
export function ask(system: string, user: string): Promise<string | null> {
  if (!initLlama || useStore.getState().brain.status !== 'ready') return Promise.resolve(null);
  return runSerial(async () => {
    try {
      const c = await context();
      const r = await c.completion({
        messages: [{ role: 'system', content: system }, { role: 'user', content: `${user} /no_think` }],
        n_predict: 140,
        temperature: 0.7,
        stop: ['<|im_end|>'],
      });
      return r.text.replace(/<think>[\s\S]*?<\/think>/g, '').trim() || null;
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
    const res = await FileSystem.createDownloadResumable(ENV.petModelUrl, MODEL_PATH, {}, (p) => {
      const pct = Math.floor((p.totalBytesWritten / Math.max(1, p.totalBytesExpectedToWrite)) * 100);
      if (pct !== last) {
        last = pct;
        useStore.getState().setBrain({ progress: pct / 100 });
      }
    }).downloadAsync();
    if (!res || res.status !== 200) throw new Error(`http ${res?.status}`);
    st.setBrain({ status: 'ready', progress: 1 });
  } catch {
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
  return `Signos: ${vitals.join(', ') || 'sin datos'}. Último check-in: ${checkin}. Protocolos activos: ${protocols.join('; ') || 'ninguno'}.`;
}

/** Fallback chain: on-device model, then the hub's pet brain, then canned replies. */
export async function petReply(text: string): Promise<string> {
  if (CRISIS.test(text)) return CRISIS_REPLY;
  const llm = await ask(SYSTEM, `${facts()}\nTripulante: ${text}`);
  if (llm) return llm;
  return (await askPet(text)) ?? canned(text);
}

/** Weekly insight wording: the model if loaded, otherwise the lines as they are. */
export async function summarize(lines: string[]): Promise<string> {
  return (await ask(SUMMARY, lines.join('\n'))) ?? lines.join(' ');
}

function canned(text: string): string {
  const t = text.toLowerCase();
  if (/cansad|sueño|dorm|fatig/.test(t)) return 'Descansar también es parte de la misión. Prueba 10 minutos de respiración lenta y deja las pantallas.';
  if (/triste|solo|sola|llor|añor/.test(t)) return 'Gracias por contármelo. ¿Quieres hablar hoy con alguien del equipo? Puedo guiarte en una sesión corta.';
  if (/miedo|ansi|estr|agobi|nervi/.test(t)) return 'Vamos paso a paso: inhala 4 segundos, sostén 4, exhala 4. ¿Lo hacemos juntos ahora?';
  return 'Estoy aquí contigo. ¿Qué necesitas en este momento?';
}
