// Opt-in network smoke: npm run test:e2e -- --config=playwright.live.config.js
import { test, expect, chromium } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
test('live preview reads Oxford, Cambridge and Turkish for three selected words', async ({ page }) => {
  await page.goto('/');
  const results = [];
  for (const word of ['reliable', 'curious', 'improve']) {
    for (const source of ['oxford', 'cambridge', 'turkish']) {
      const result = await page.evaluate(async ({ word, source }) => {
        const result = await SozlookLookup.lookup(word, source);
        return { status: result.status, word: result.entry?.headword, definition: Boolean(result.entry?.definition), translation: Boolean(result.entry?.translation) };
      }, { word, source });
      results.push({ word, source, ...result });
    }
  }
  console.log('Live page results:', JSON.stringify(results));
  await test.info().attach('live-results', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
  expect(results.every(r => ['ok', 'blocked', 'timeout', 'not_found', 'unavailable'].includes(r.status))).toBe(true);
  expect(results.some(r => r.status === 'ok')).toBe(true);
  await page.getByRole('button', { name: 'reliable' }).click();
  await expect(page.getByRole('dialog').locator('[role=tabpanel]')).toHaveAttribute('aria-busy', 'false', { timeout: 20_000 });
  await expect(page.getByRole('dialog').locator('.translation')).not.toHaveText('Türkçesi yükleniyor…', { timeout: 20_000 });
  await page.screenshot({ path: 'test-results/sozlook-live.png' });
});
test('installed extension makes real dictionary requests without a local backend', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sozlook-live-'));
  const extension = resolve('extension');
  const context = await chromium.launchPersistentContext(dir, { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/preview/fixture.html');
    await page.locator('#word').dblclick();
    await page.getByRole('button', { name: 'Sözlook ile bak' }).click();
    const card = page.getByRole('dialog');
    await expect(card.locator('[role=tabpanel]')).toHaveAttribute('aria-busy', 'false', { timeout: 20_000 });
    await expect(card.locator('.translation')).not.toHaveText('Türkçesi yükleniyor…', { timeout: 20_000 });
    const oxford = await card.locator('.label').textContent();
    const translation = await card.locator('.translation').textContent();
    await card.getByRole('tab', { name: 'Cambridge' }).click();
    await expect(card.locator('[role=tabpanel]')).toHaveAttribute('aria-busy', 'false', { timeout: 20_000 });
    const cambridge = await card.locator('.label').textContent();
    console.log('Live extension results:', JSON.stringify({ oxford, cambridge, turkishLoaded: !translation.includes('karşılığına bak') }));
    await test.info().attach('extension-live-results', { body: JSON.stringify({ oxford, cambridge, turkishLoaded: !translation.includes('karşılığına bak') }), contentType: 'application/json' });
    expect(oxford.includes('İngilizce açıklama') || cambridge.includes('İngilizce açıklama')).toBe(true);
  } finally { await context.close(); await rm(dir, { recursive: true, force: true }); }
});
