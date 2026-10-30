import { test, expect } from '@playwright/test';
test('expanded words popup links to the dedicated options page', async ({ page }) => {
  await page.goto('/extension/popup.html');
  await page.evaluate(() => localStorage.setItem('sozlook-words', JSON.stringify(Array.from({ length: 20 }, (_, i) => ({ word: `word-${i}`, context: 'A longer reading context. '.repeat(30), translation: '' })))));
  await page.reload();
  await expect(page.locator('body')).toHaveCSS('width', '480px');
  await expect(page.locator('body')).toHaveCSS('height', '560px');
  await expect(page.getByRole('radio')).toHaveCount(0);
  const geometry = await page.locator('#words').evaluate(el => ({ scrollable: el.scrollHeight > el.clientHeight, body: document.body.scrollHeight }));
  expect(geometry.scrollable).toBe(true); expect(geometry.body).toBeLessThanOrEqual(560);
  await page.screenshot({ path: 'test-results/sozlook-popup.png' });
  const opened = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Seçenekler' }).click();
  const settings = await opened;
  await expect(settings).toHaveURL(/options\.html$/);
  await expect(settings.getByRole('radio', { name: /Kelime seçince otomatik aç/ })).toBeChecked();
  await settings.screenshot({ path: 'test-results/sozlook-options.png' });
});
test('options fits small screens and reports a failed save without changing the preference', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/extension/options.html');
  await expect(page.getByRole('radio', { name: /Kelime seçince otomatik aç/ })).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.evaluate(() => { SozlookStore.writeOpeningMode = async () => { throw new Error('test failure'); }; });
  await page.getByRole('radio', { name: 'Düğmeye tıklayınca aç' }).click();
  await expect(page.getByRole('status')).toHaveText('Tercih kaydedilemedi. Tekrar dene.');
  await expect(page.getByRole('radio', { name: /Kelime seçince otomatik aç/ })).toBeChecked();
});
