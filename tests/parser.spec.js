import { test, expect } from '@playwright/test';
import { fixture } from './fixtures.js';
test('parses linked text and keeps scripts and remote resources inert', async ({ page }) => {
  await page.goto('/preview/fixture.html');
  await page.addScriptTag({ path: 'extension/parser.js' });
  let fetched = false;
  await page.route('https://example.invalid/**', route => { fetched = true; return route.abort(); });
  const result = await page.evaluate(html => SozlookParser.parse(html, 'cambridge', 'https://dictionary.cambridge.org/dictionary/english/reliable'), fixture('cambridge').replace('a person', '<a href="https://example.invalid/link">a person</a>') + '<img src="https://example.invalid/tracker"><script>window.injected=true</script>');
  expect(result.entry.definition).toBe('Cambridge test: a person who does what they promise.');
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  expect(fetched).toBe(false);
});
test('Turkish stays scoped to the primary headword; challenge pages fail explicitly', async ({ page }) => {
  await page.goto('/preview/fixture.html'); await page.addScriptTag({ path: 'extension/parser.js' });
  const result = await page.evaluate(html => SozlookParser.parse(html, 'turkish', 'https://dictionary.cambridge.org/dictionary/english-turkish/reliable'), fixture('turkish'));
  expect(result.entry.translation).toBe('güvenilir');
  const blocked = await page.evaluate(() => SozlookParser.parse('<title>Just a moment...</title>', 'oxford', ''));
  expect(blocked.status).toBe('blocked');
});
test('blocked requests show fallback and stale responses cannot overwrite another word', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/lookup?**', async route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get('word') === 'reliable') { await gate; return route.fulfill({ json: { status: 'ok', html: fixture(params.get('source')), url: 'https://dictionary.cambridge.org/dictionary/english/reliable' } }); }
    return route.fulfill({ json: { status: 'blocked' } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'reliable' }).click();
  await expect(page.getByText('Oxford sayfası yükleniyor…')).toBeVisible();
  await page.evaluate(() => window.SozlookPreview.open('curious', document.querySelector('#reliable')));
  await expect(page.getByText('Sözlük sitesi bu isteğe izin vermedi. Kaynak sayfasını açarak okuyabilirsin.')).toBeVisible();
  release();
  await expect(page.getByRole('dialog').getByRole('heading')).toHaveText('curious');
  await expect(page.getByText('Oxford test: a friend who keeps a promise.')).toHaveCount(0);
});
