import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// OpenAI-compatible llama.cpp server. Qwen 3 may leak <think> blocks into content.
export const LLM_URL = process.env.LLM_URL ?? 'http://127.0.0.1:8080';
const LLM_SH = fileURLToPath(new URL('../../scripts/llm.sh', import.meta.url));
const LLM_LOG = fileURLToPath(new URL('../../llm.log', import.meta.url));

export class LlmOffline extends Error {
  constructor() { super('LLM offline — start Flash Next (serve.sh)'); }
}

export interface ToolCall { id: string; type: 'function'; function: { name: string; arguments: string } }
export interface ChatMsg { role: 'system' | 'user' | 'assistant' | 'tool'; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string; /** The model's thinking, only when asked with think. */ reasoning?: string }

let starting: Promise<void> | undefined;

async function health(): Promise<boolean> {
  try { return (await fetch(`${LLM_URL}/health`, { signal: AbortSignal.timeout(1000) })).ok; } catch { return false; }
}

/** True only when the model is in RAM. The server answers /props while asleep, so reachability alone is not enough. */
export async function isAwake(): Promise<boolean> {
  try {
    const r = await fetch(`${LLM_URL}/props`, { signal: AbortSignal.timeout(1000) });
    return r.ok && !(await r.json()).is_sleeping;
  } catch { return false; }
}

export async function llmState(): Promise<'off' | 'starting' | 'ready'> {
  if (starting) return 'starting';
  return (await isAwake()) ? 'ready' : 'off';
}

/** Uses any server already listening (the user's serve.sh included); otherwise starts llm.sh and waits up to 180 s. */
export function ensureLLM(): Promise<void> {
  starting ??= (async () => {
    if (await health()) return;
    const log = openSync(LLM_LOG, 'a');
    let failed = false;
    const child = spawn(LLM_SH, { detached: true, stdio: ['ignore', log, log] });
    child.on('error', () => { failed = true; });
    child.unref();
    const until = Date.now() + 180_000;
    while (!(await health())) {
      if (failed || Date.now() > until) throw new LlmOffline();
      await new Promise((r) => setTimeout(r, 1000));
    }
  })().finally(() => { starting = undefined; });
  return starting;
}

/** think: Qwen reasons first (shown to the captain); slower, so the pet chat keeps it off. */
export async function chat(messages: ChatMsg[], tools?: unknown[], think = false, onThought?: (t: string) => void): Promise<ChatMsg> {
  let res: Response;
  try {
    res = await fetch(`${LLM_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // thinking costs minutes per round at ~9 tok/s on SSD-streamed experts, so it gets a bigger token and time budget
      body: JSON.stringify({ stream: !!onThought, messages: messages.map(({ reasoning, ...m }) => m), tools, temperature: 0.3, max_tokens: think ? 2500 : 900, chat_template_kwargs: { enable_thinking: think } }),
      signal: AbortSignal.timeout(think ? 420_000 : 180_000), // the model streams experts from SSD and can be slow
    });
  } catch { throw new LlmOffline(); }
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
  const msg = (onThought ? await readStream(res, onThought) : (await res.json()).choices[0].message) as ChatMsg & { reasoning_content?: string };
  // llama.cpp returns the thinking as reasoning_content, or leaves <think> blocks inside content
  const inline = [...(msg.content ?? '').matchAll(/<think>([\s\S]*?)<\/think>/g)].map((m) => m[1]).join('\n');
  const reasoning = (msg.reasoning_content || inline).trim() || undefined;
  return { role: msg.role, tool_calls: msg.tool_calls, content: msg.content?.replace(/<think>[\s\S]*?<\/think>/g, '').trim() ?? null, reasoning };
}

/** Rebuilds one chat message from llama.cpp's SSE deltas, handing each thinking piece to onThought as it arrives. */
async function readStream(res: Response, onThought: (t: string) => void) {
  const msg = { role: 'assistant' as const, content: '', reasoning_content: '', tool_calls: [] as ToolCall[] };
  const dec = new TextDecoder();
  let buf = '';
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    buf += dec.decode(chunk, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
      const d = JSON.parse(line.slice(6)).choices?.[0]?.delta ?? {};
      if (d.reasoning_content) { msg.reasoning_content += d.reasoning_content; onThought(d.reasoning_content); }
      if (d.content) msg.content += d.content;
      for (const t of d.tool_calls ?? []) {
        const c = (msg.tool_calls[t.index ?? 0] ??= { id: '', type: 'function', function: { name: '', arguments: '' } });
        if (t.id) c.id = t.id;
        if (t.function?.name) c.function.name += t.function.name;
        if (t.function?.arguments) c.function.arguments += t.function.arguments;
      }
    }
  }
  return { ...msg, tool_calls: msg.tool_calls.length ? msg.tool_calls : undefined };
}
