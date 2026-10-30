import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import '../extension/core.js';
import '../extension/sources.js';
const root = resolve(import.meta.dirname, '..');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png' };
let active = 0;
const server = http.createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path === '/lookup') {
      const origin = req.headers.origin;
      const host = req.headers.host;
      const json = (code, value) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
      if (req.method !== 'GET' || ![`127.0.0.1:${port}`, `localhost:${port}`].includes(host) || (origin && ![`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(origin)) || req.headers['x-sozlook-request'] !== 'lookup') return json(403, { status: 'forbidden' });
      const params = new URL(req.url, 'http://localhost').searchParams;
      const word = params.get('word'); const source = params.get('source');
      if (!word || !SozlookCore.isLookup(word) || !SozlookSources.validSource(source)) return json(400, { status: 'invalid_request' });
      if (active >= 6) return json(429, { status: 'busy' });
      active++;
      try { return json(200, await SozlookSources.fetchPage(word, source)); } finally { active--; }
    }
    const requested = path === '/' ? '/preview/index.html' : path;
    const relative = requested.startsWith('/extension/') || requested.startsWith('/preview/') ? requested : `/preview${requested}`;
    const file = resolve(root, `.${relative}`);
    if (!['preview', 'extension'].some(dir => file.startsWith(resolve(root, dir) + sep))) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Bulunamadı'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Sözlook önizleme: http://127.0.0.1:${port}`));
