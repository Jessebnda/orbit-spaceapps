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
export interface ChatMsg { role: 'system' | 'user' | 'assistant' | 'tool'; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string }

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

export async function chat(messages: ChatMsg[], tools?: unknown[]): Promise<ChatMsg> {
  let res: Response;
  try {
    res = await fetch(`${LLM_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // no thinking: at ~9 tok/s on SSD-streamed experts, a hidden <think> block cost minutes per round
      body: JSON.stringify({ messages, tools, temperature: 0.3, max_tokens: 900, chat_template_kwargs: { enable_thinking: false } }),
      signal: AbortSignal.timeout(180_000), // the model streams experts from SSD and can be slow
    });
  } catch { throw new LlmOffline(); }
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
  const msg = (await res.json()).choices[0].message as ChatMsg;
  return { ...msg, content: msg.content?.replace(/<think>[\s\S]*?<\/think>/g, '').trim() ?? null };
}
