import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../extension/core.js';
import '../extension/sources.js';
const { fetchPage, sourceUrl } = SozlookSources;
test('fixed sources reject arbitrary URLs and invalid input', () => {
  assert.throws(() => sourceUrl('word', 'http://localhost'));
  assert.throws(() => sourceUrl('<script>', 'oxford'));
  assert.equal(new URL(sourceUrl('keep going', 'oxford')).pathname, '/definition/english/keep-going');
});
test('reports blocking and does not retry', async () => {
  let calls = 0;
  const result = await fetchPage('reliable', 'cambridge', async () => { calls++; return new Response('', { status: 403 }); });
  assert.equal(result.status, 'blocked'); assert.equal(calls, 1);
});
test('rejects redirects to unrelated sites and oversized responses', async () => {
  const redirect = await fetchPage('reliable', 'oxford', async () => new Response('', { status: 302, headers: { Location: 'https://example.com' } }));
  assert.equal(redirect.status, 'unavailable');
  const big = await fetchPage('reliable', 'oxford', async () => new Response('x'.repeat(2_000_001), { headers: { 'Content-Type': 'text/html' } }));
  assert.equal(big.status, 'unavailable');
});
test('returns HTML only for an allowed successful response', async () => {
  const result = await fetchPage('reliable', 'turkish', async () => new Response('<html>test</html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
  assert.equal(result.status, 'ok'); assert.equal(result.html, '<html>test</html>');
});
