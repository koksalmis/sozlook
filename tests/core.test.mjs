import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../extension/core.js';
const { normalize, isLookup, links, position } = globalThis.SozlookCore;
test('normalizes punctuation, case and short phrases', () => {
  assert.equal(normalize(' “Reliable!” '), 'reliable');
  assert.equal(normalize(' KEEP   GOING '), 'keep going');
});
test('rejects long selections, numbers and injected markup', () => {
  for (const input of ['<img src=x>', 'one two three four five six', '1234', '', 'こんにちは']) assert.equal(isLookup(input), false, input);
  for (const input of ['reliable', 'keep going', 'well-known', "don't"]) assert.equal(isLookup(input), true, input);
});
test('uses encoded dictionary links', () => {
  assert.ok(links('keep going').oxford.endsWith('keep%20going'));
  assert.ok(links('keep going').cambridge.endsWith('keep-going'));
});
test('card stays within mobile and desktop viewport', () => {
  for (const width of [360, 1280]) {
    const w = Math.min(344, width - 24);
    const p = position({ left: width - 70, right: width - 10, top: 800 }, w, 450, { width, height: 900 });
    assert.ok(p.left >= 12); assert.ok(p.left + w <= width - 12); assert.ok(p.top + 450 <= 888);
  }
});
