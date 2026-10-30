import { test, expect, chromium } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fixture } from './fixtures.js';
test('installed extension selects and persists words on an ordinary web page', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sozlook-test-'));
  const extension = resolve('extension');
  const context = await chromium.launchPersistentContext(dir, {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
  });
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    await worker.evaluate(({ oxford, cambridge }) => {
      globalThis.fetch = async url => new Response(url.includes('oxford') ? oxford : cambridge, { headers: { 'Content-Type': 'text/html' } });
    }, { oxford: fixture('oxford'), cambridge: fixture('cambridge') });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/preview/fixture.html');
    await expect(page.locator('#sozlook-extension')).toHaveCount(1);
    await page.locator('#word').dblclick();
    await page.getByRole('button', { name: 'Sözlook ile bak' }).click();
    const card = page.getByRole('dialog');
    await expect(card.getByText('güvenilir', { exact: true })).toBeVisible();
    await expect(card.getByText('Oxford test: a friend who keeps a promise.')).toBeVisible();
    await card.getByRole('tab', { name: 'Cambridge' }).click();
    await expect(card.getByText('Cambridge test: a person who does what they promise.')).toBeVisible();
    await card.getByRole('button', { name: 'Kaydet', exact: true }).click();
    await expect(card.getByRole('button', { name: 'Kaydedildi', exact: true })).toBeVisible();
    const stored = await worker.evaluate(async () => (await chrome.storage.local.get('words')).words);
    expect(stored[0].translation).toBe('');
    expect(stored[0]).not.toHaveProperty('definition');
    await page.reload();
    await page.locator('#word').dblclick();
    await page.getByRole('button', { name: 'Sözlook ile bak' }).click();
    await expect(card.getByRole('button', { name: 'Kaydedildi', exact: true })).toBeVisible();
  } finally { await context.close(); await rm(dir, { recursive: true, force: true }); }
});
