import { test, expect, chromium } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
test('installed extension selects and persists words on an ordinary web page', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sozlook-test-'));
  const extension = resolve('extension');
  const context = await chromium.launchPersistentContext(dir, {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
  });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/preview/fixture.html');
    await expect(page.locator('#sozlook-extension')).toHaveCount(1);
    await page.locator('#word').dblclick();
    await page.getByRole('button', { name: 'Sözlook ile bak' }).click();
    const card = page.getByRole('dialog');
    await expect(card.getByText('güvenilir', { exact: true })).toBeVisible();
    await card.getByRole('button', { name: 'Kaydet', exact: true }).click();
    await expect(card.getByRole('button', { name: 'Kaydedildi', exact: true })).toBeVisible();
    await page.reload();
    await page.locator('#word').dblclick();
    await page.getByRole('button', { name: 'Sözlook ile bak' }).click();
    await expect(card.getByRole('button', { name: 'Kaydedildi', exact: true })).toBeVisible();
  } finally { await context.close(); await rm(dir, { recursive: true, force: true }); }
});
