import { test, expect } from '@playwright/test';
test('preview lookup is restricted and static paths cannot expose repository files', async ({ request }) => {
  expect((await request.get('/lookup?word=reliable&source=oxford')).status()).toBe(403);
  expect((await request.get('/lookup?word=reliable&source=http://localhost', { headers: { 'X-Sozlook-Request': 'lookup' } })).status()).toBe(400);
  expect((await request.get('/lookup?word=reliable&source=oxford', { headers: { 'X-Sozlook-Request': 'lookup', Origin: 'https://example.com' } })).status()).toBe(403);
  expect((await request.get('/preview/..%2fpackage.json')).status()).toBe(403);
});
