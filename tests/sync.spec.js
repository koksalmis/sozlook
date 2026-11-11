import { test, expect, chromium } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Supabase'i arka plan çalışanında taklit eder: gerçek e-posta veya ağ isteği yoktur.
function installFakeSupabase() {
  const db = globalThis.__fakeDb = { rows: new Map(), requests: [] };
  let clock = Date.parse('2026-11-11T10:00:00Z');
  const tick = () => new Date(clock += 1000).toISOString();
  const json = (body, status = 200) => new Response(body === null ? '' : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const session = { access_token: 'access-1', refresh_token: 'refresh-1', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'user-1', email: 'okur@example.com' } };
  db.put = (word, patch) => { db.rows.set(word, { word, translation: '', context: '', url: '', title: '', saved_at: '2026-11-01T00:00:00+00:00', deleted_at: null, ...db.rows.get(word), ...patch, updated_at: tick() }); };
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const body = init.body ? JSON.parse(init.body) : null;
    db.requests.push(`${init.method || 'GET'} ${url.pathname}`);
    if (url.pathname === '/auth/v1/otp') return json({});
    if (url.pathname === '/auth/v1/verify') return body.token === '123456' ? json(session) : json({ error_code: 'otp_expired', msg: 'Token has expired or is invalid' }, 403);
    if (url.pathname === '/auth/v1/logout') return json(null, 204);
    if (url.pathname === '/rest/v1/words') {
      if (new Headers(init.headers).get('Authorization') !== 'Bearer access-1') return json({ message: 'JWT' }, 401);
      if (init.method === 'POST') { for (const r of body) db.put(r.word, r); return json(null, 201); }
      const since = Date.parse(url.searchParams.get('updated_at').slice(3));
      return json([...db.rows.values()].filter(r => Date.parse(r.updated_at) > since).sort((a, b) => Date.parse(a.updated_at) - Date.parse(b.updated_at)));
    }
    return json({ message: 'unexpected' }, 500);
  };
}

test('sign in with an email code, sync both ways and sign out', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sozlook-sync-'));
  const extension = resolve('extension');
  const context = await chromium.launchPersistentContext(dir, { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).host;
    await worker.evaluate(installFakeSupabase);
    await worker.evaluate(() => chrome.storage.local.set({ words: [{ word: 'reliable', translation: '', context: 'a reliable routine', url: 'https://example.com/a', title: 'A', savedAt: '2026-11-10T10:00:00.000Z' }] }));
    const db = fn => worker.evaluate(fn);
    const localWords = () => worker.evaluate(async () => ((await chrome.storage.local.get('words')).words || []).map(w => w.word));

    // Giriş yapılmadan hiçbir ağ isteği yapılmaz.
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await expect(popup.getByRole('link', { name: /Telefonunla eşitle/ })).toBeVisible();
    expect(await db(() => globalThis.__fakeDb.requests)).toEqual([]);

    const options = await context.newPage();
    await options.goto(`chrome-extension://${id}/options.html#sync`);
    await expect(options.getByRole('heading', { name: 'Telefonunla eşitle' })).toBeVisible();
    await expect(options.locator('#sync-account')).toBeHidden();
    await expect(options.locator('#sync-code-form')).toBeHidden();
    await options.getByLabel('E-posta adresin').fill('okur@example.com');
    await options.getByRole('button', { name: 'Kod gönder' }).click();
    await expect(options.getByText('Kod gönderildi. E-postanı kontrol et.')).toBeVisible();

    await options.locator('#sync-code').fill('000000');
    await expect(options.getByRole('status')).toHaveText(/Kod hatalı/);
    await options.locator('#sync-code').fill('123456');
    await expect(options.locator('#sync-account-email')).toHaveText('okur@example.com');
    await expect(options.getByText('Eşitleme açık')).toBeVisible();

    // İlk eşitleme: yerel kelime buluta gider.
    await expect.poll(() => db(() => [...globalThis.__fakeDb.rows.keys()])).toEqual(['reliable']);
    const token = await worker.evaluate(async () => (await chrome.storage.local.get('syncSession')).syncSession.accessToken);
    expect(token).toBe('access-1');

    // Telefonda: yeni kelime eklendi, reliable silindi.
    await db(() => { globalThis.__fakeDb.put('curious', { context: 'curious about the clock', saved_at: '2026-11-11T08:00:00+00:00' }); globalThis.__fakeDb.put('reliable', { deleted_at: '2026-11-11T10:05:00+00:00' }); });
    await options.getByRole('button', { name: 'Şimdi eşitle' }).click();
    await expect(options.getByRole('status')).toHaveText('Kelimelerin eşitlendi.');
    expect(await localWords()).toEqual(['curious']);

    // Eklentide yeni kayıt: kısa süre içinde kendiliğinden gönderilir.
    await worker.evaluate(async () => { const { words } = await chrome.storage.local.get('words'); await chrome.storage.local.set({ words: [{ word: 'improve', translation: '', context: 'improve daily', url: 'https://example.com/b', title: 'B', savedAt: new Date().toISOString() }, ...words] }); });
    await expect.poll(() => db(() => globalThis.__fakeDb.rows.get('improve')?.deleted_at), { timeout: 8000 }).toBe(null);

    // Eklentide kaldırma: bulutta silindi olarak işaretlenir.
    await popup.reload();
    await popup.getByRole('button', { name: 'curious kaydını kaldır' }).click();
    await expect.poll(() => db(() => globalThis.__fakeDb.rows.get('curious').deleted_at), { timeout: 8000 }).not.toBe(null);
    await expect(popup.getByText(/Eşitlendi ·/)).toBeVisible();

    // Çıkış: oturum silinir, kelimeler tarayıcıda kalır.
    await options.getByRole('button', { name: 'Çıkış yap' }).click();
    await expect(options.getByRole('button', { name: 'Kod gönder' })).toBeVisible();
    expect(await worker.evaluate(async () => Object.keys(await chrome.storage.local.get(['syncSession', 'syncBase', 'syncCursor'])))).toEqual([]);
    expect(await localWords()).toEqual(['improve']);
  } finally { await context.close(); await rm(dir, { recursive: true, force: true }); }
});
