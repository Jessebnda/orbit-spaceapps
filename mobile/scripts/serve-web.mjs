// Static server for dist-web with an SPA fallback: a reload on /mascota or /protocolo/x gets index.html, not a 404.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = join(import.meta.dirname, '..', 'dist-web');
const port = Number(process.env.PORT ?? 8083);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };

createServer(async (req, res) => {
  if (!/\.(js|css|png|ttf|ico|woff2)$/.test(req.url)) console.log(new Date().toISOString().slice(11, 19), req.url, req.headers['user-agent']?.slice(0, 90));
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const file = join(root, path);
  if (!file.startsWith(root)) return res.writeHead(403).end();
  const send = (body, f) => {
    // index.html must never be cached: it names the hashed bundle, so a stale copy loads an old app
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] ?? 'application/octet-stream', 'Cache-Control': f.endsWith('.html') ? 'no-cache' : 'public, max-age=31536000, immutable' });
    res.end(body);
  };
  try {
    send(await readFile(file), file);
  } catch {
    if (extname(path)) return res.writeHead(404).end('not found'); // a missing asset stays a 404
    const index = join(root, 'index.html');
    send(await readFile(index), index);
  }
}).listen(port, '0.0.0.0', () => console.log(`dist-web on :${port}`));
