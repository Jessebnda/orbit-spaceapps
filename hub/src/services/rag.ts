import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from '@huggingface/transformers';
import { query } from './db';

export const KB_DIR = fileURLToPath(new URL('../../kb', import.meta.url));

type Embedder = { (text: string, o: { pooling: 'mean'; normalize: true }): Promise<{ data: Float32Array }>; dispose(): Promise<void> };
let embedder: Promise<Embedder> | undefined;
let idle: ReturnType<typeof setTimeout> | undefined;

/** Lazy-loaded encoder, released after 5 min without use to free RAM. */
export function embed(text: string): Promise<number[]> {
  embedder ??= pipeline('feature-extraction', 'Xenova/multilingual-e5-small', { dtype: 'q8' }) as unknown as Promise<Embedder>;
  const current = embedder;
  clearTimeout(idle);
  idle = setTimeout(() => { embedder = undefined; current.then((e) => e.dispose()); }, 5 * 60_000);
  idle.unref(); // must not keep the ingest script alive
  return current.then((e) => e(text, { pooling: 'mean', normalize: true })).then((o) => Array.from(o.data));
}

export function chunk(text: string, size = 800, overlap = 100): string[] {
  const out: string[] = [];
  let cur = '';
  for (const p of text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)) {
    if (cur && cur.length + p.length > size) {
      out.push(cur);
      cur = cur.slice(-overlap).replace(/^\S*\s/, ''); // start the overlap on a whole word
    }
    cur = cur ? `${cur}\n\n${p}` : p;
  }
  if (cur) out.push(cur);
  return out;
}

export interface Doc { source: string; title: string; chunks: string[] }
export async function loadDocs(dir = KB_DIR): Promise<Doc[]> {
  // README.md is for humans maintaining the folder, not knowledge to index.
  const files = (await readdir(dir)).filter((f) => /\.(md|txt)$/.test(f) && f.toLowerCase() !== 'readme.md');
  return Promise.all(files.map(async (f) => {
    const text = await readFile(path.join(dir, f), 'utf8');
    return { source: f, title: text.match(/^# (.+)$/m)?.[1] ?? f, chunks: chunk(text) };
  }));
}

export interface Hit { source: string; title: string; content: string; similarity: number }

// Used only when Postgres is down: embeds the kb folder once per process.
let memIndex: Promise<{ source: string; title: string; content: string; vec: number[] }[]> | undefined;
function memoryIndex() {
  memIndex ??= (async () => {
    const out = [];
    for (const d of await loadDocs()) for (const c of d.chunks) out.push({ source: d.source, title: d.title, content: c, vec: await embed(`passage: ${c}`) });
    return out;
  })();
  return memIndex;
}

export async function search(q: string, k = 5): Promise<Hit[]> {
  const vec = await embed(`query: ${q}`);
  try {
    return (await query<Hit>('select * from match_kb($1::vector, $2)', [`[${vec}]`, k])).rows;
  } catch {
    const idx = await memoryIndex();
    // Vectors are normalized, so the dot product is the cosine similarity.
    return idx
      .map((c) => ({ source: c.source, title: c.title, content: c.content, similarity: vec.reduce((s, x, i) => s + x * c.vec[i], 0) }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  }
}
