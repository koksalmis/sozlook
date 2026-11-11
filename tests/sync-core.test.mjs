import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../extension/sync-core.js';
const { pending, afterPush, applyRemote, fingerprint, toRow } = globalThis.SozlookSyncCore;

const w = (word, savedAt = '2026-11-01T10:00:00.000Z', context = `a ${word} sentence`) => ({ word, translation: '', context, url: 'https://example.com', title: 'Example', savedAt });
const row = (word, updated_at, extra = {}) => ({ word, translation: '', context: `a ${word} sentence`, url: 'https://example.com', title: 'Example', saved_at: '2026-11-01T10:00:00+00:00', updated_at, deleted_at: null, ...extra });
const baseOf = (...words) => Object.fromEntries(words.map(x => [x.word, fingerprint(x)]));

test('first sync pushes every local word and nothing is deleted', () => {
  const changes = pending([w('reliable'), w('curious')], {});
  assert.deepEqual(changes.upserts.map(x => x.word), ['reliable', 'curious']);
  assert.deepEqual(changes.deletes, []);
});

test('only changed words are pushed; words missing locally become deletions', () => {
  const kept = w('reliable'); const removed = w('curious');
  const changes = pending([kept, w('improve')], baseOf(kept, removed));
  assert.deepEqual(changes.upserts.map(x => x.word), ['improve']);
  assert.deepEqual(changes.deletes, ['curious']);
});

test('duplicate and malformed local entries are ignored', () => {
  const changes = pending([w('reliable'), w('reliable'), null, { word: '' }, { nope: 1 }], {});
  assert.deepEqual(changes.upserts.map(x => x.word), ['reliable']);
});

test('remote words are added, remote deletions remove local words, list stays newest first', () => {
  const local = [w('reliable')];
  const base = baseOf(local[0]);
  const result = applyRemote(local, base, [
    row('curious', '2026-11-11T10:00:01+00:00', { saved_at: '2026-11-05T10:00:00+00:00' }),
    row('reliable', '2026-11-11T10:00:02+00:00', { deleted_at: '2026-11-11T10:00:02+00:00' })
  ]);
  assert.deepEqual(result.words.map(x => x.word), ['curious']);
  assert.equal(result.changed, true);
  assert.equal(result.cursor, '2026-11-11T10:00:02+00:00');
  assert.ok(!('reliable' in result.base));
  assert.ok('curious' in result.base);
});

test('a word removed locally while syncing is not resurrected by its own pulled row', () => {
  const word = w('reliable');
  const base = afterPush({}, { upserts: [word], deletes: [] });
  // Kullanıcı ağ isteği sürerken kelimeyi kaldırdı: en güncel yerel liste boş.
  const result = applyRemote([], base, [row('reliable', '2026-11-11T10:00:00+00:00')]);
  assert.deepEqual(result.words, []);
  assert.deepEqual(pending(result.words, result.base).deletes, ['reliable']);
});

test('a word saved locally during sync is kept and still pending', () => {
  const fresh = w('improve', '2026-11-11T09:00:00.000Z');
  const result = applyRemote([fresh], {}, [row('reliable', '2026-11-11T10:00:00+00:00')]);
  assert.deepEqual(result.words.map(x => x.word).sort(), ['improve', 'reliable']);
  assert.deepEqual(pending(result.words, result.base).upserts.map(x => x.word), ['improve']);
});

test('pulling our own pushed rows converges with nothing left pending', () => {
  const local = [w('reliable'), w('curious')];
  const changes = pending(local, {});
  const base = afterPush({}, changes);
  const rows = changes.upserts.map((x, i) => ({ ...toRow(x), updated_at: `2026-11-11T10:00:0${i}+00:00` }));
  const result = applyRemote(local, base, rows);
  const again = pending(result.words, result.base);
  assert.equal(again.upserts.length + again.deletes.length, 0);
});

test('rows are trimmed to database limits before sending', () => {
  const r = toRow({ word: 'x', context: 'c'.repeat(5000), url: 'u'.repeat(5000), title: 't'.repeat(900), savedAt: 'not a date' });
  assert.equal(r.context.length, 1000); assert.equal(r.url.length, 2048); assert.equal(r.title.length, 500);
  assert.ok(Date.parse(r.saved_at)); assert.equal(r.deleted_at, null);
});
