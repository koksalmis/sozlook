// wiktionary-tr: İngilizce kelimelerin Türkçe karşılıklarını Wiktionary'den (CC BY-SA 4.0) alır,
// ortak dictionary_tr önbelleğine yazar ve döndürür. Yalnızca giriş yapmış kullanıcılar çağırabilir.
//
// POST { "words": ["reliable", "strike"] }  (en fazla 30)
// → { "results": { "reliable": { "lemma": null, "senses": [...], "url": "https://en.wiktionary.org/wiki/reliable" } } }
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { isLookup, normalize, resolve, type Sense } from './parse.ts';

const USER_AGENT = 'Sozlook/0.3 (https://github.com/koksalmis/sozlook)';
const MAX_WORDS = 30;
const FRESH_MS = 30 * 24 * 60 * 60 * 1000;
const CONCURRENCY = 4;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

type Entry = { word: string; lemma: string | null; senses: Sense[]; page_url: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });

async function wikitext(title: string): Promise<string | null> {
  const url = `https://en.wiktionary.org/w/api.php?action=parse&format=json&formatversion=2&prop=wikitext&redirects=1&page=${encodeURIComponent(title)}`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`wiktionary ${response.status}`);
  const data = await response.json();
  if (data?.error?.code === 'missingtitle') return null;
  if (data?.error) throw new Error(`wiktionary ${data.error.code}`);
  return typeof data?.parse?.wikitext === 'string' ? data.parse.wikitext : null;
}

const lookup = (word: string): Promise<Entry> => resolve(word, wikitext);

async function pool<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      try { results[index] = { status: 'fulfilled', value: await task(items[index]) }; }
      catch (reason) { results[index] = { status: 'rejected', reason }; }
    }
  });
  await Promise.all(workers);
  return results;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  // Herkese açık anon anahtarı yetmez: gerçek bir kullanıcı oturumu gerekir.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await admin.auth.getUser(token);
  if (!auth?.user) return json({ error: 'unauthorized' }, 401);

  let body: { words?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  if (!Array.isArray(body.words)) return json({ error: 'words_required' }, 400);
  const words = [...new Set(body.words.filter((w): w is string => typeof w === 'string').map(normalize).filter(isLookup))].slice(0, MAX_WORDS);
  if (!words.length) return json({ results: {} });

  const { data: cached, error } = await admin.from('dictionary_tr').select('word, lemma, senses, page_url, fetched_at').in('word', words);
  if (error) return json({ error: 'cache_unavailable' }, 500);

  const results: Record<string, { lemma: string | null; senses: Sense[]; url: string }> = {};
  const fresh = new Set<string>();
  for (const row of cached ?? []) {
    if (Date.now() - Date.parse(row.fetched_at) < FRESH_MS) {
      fresh.add(row.word);
      results[row.word] = { lemma: row.lemma, senses: row.senses, url: row.page_url };
    }
  }

  const missing = words.filter(w => !fresh.has(w));
  const settled = await pool(missing, CONCURRENCY, lookup);
  const rows: (Entry & { fetched_at: string })[] = [];
  settled.forEach(outcome => {
    if (outcome.status !== 'fulfilled') return; // ağ hatası önbelleğe yazılmaz; sonraki istekte tekrar denenir
    const entry = outcome.value;
    rows.push({ ...entry, fetched_at: new Date().toISOString() });
    results[entry.word] = { lemma: entry.lemma, senses: entry.senses, url: entry.page_url };
  });
  if (rows.length) await admin.from('dictionary_tr').upsert(rows, { onConflict: 'word' });

  return json({ results, source: { name: 'Wiktionary', license: 'CC BY-SA 4.0', url: 'https://en.wiktionary.org' } });
});
