import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { turkishSenses, lemmaOf, lemmaInfo, englishSection, isLookup, normalize, resolve } from '../supabase/functions/wiktionary-tr/parse.ts';
const page = name => readFileSync(new URL(`./fixtures-wiktionary/${name}.wikitext`, import.meta.url), 'utf8');

test('reliable → güvenilir (sıfat)', () => {
  const senses = turkishSenses(page('reliable'));
  assert.deepEqual(senses[0], { pos: 'Adjective', gloss: 'fit to be relied on', translations: ['güvenilir'] });
});

test('strike: fiil "vurmak" ve isim "grev"; Osmanlıca satırları alınmaz', () => {
  const senses = turkishSenses(page('strike'));
  const all = senses.flatMap(s => s.translations);
  assert.ok(senses.some(s => s.pos === 'Verb' && s.gloss === 'to hit' && s.translations.includes('vurmak')));
  assert.ok(senses.some(s => s.pos === 'Noun' && s.translations.includes('grev')));
  assert.ok(!all.some(t => /[؀-ۿ]/.test(t)), 'Arap harfli Osmanlıca karşılık sızmamalı');
  assert.ok(!all.includes('çalmak'));
});

test('karşılığı olmayan anlamlar listelenmez', () => {
  for (const s of turkishSenses(page('strike'))) assert.ok(s.translations.length > 0);
});

test('running: isim anlamı ve kök kelime', () => {
  const senses = turkishSenses(page('running'));
  assert.ok(senses.some(s => s.pos === 'Noun' && s.translations.includes('koşu')));
  assert.equal(lemmaOf(page('running'), 'running'), 'run');
  assert.equal(lemmaOf(page('reliable'), 'reliable'), null);
});

test('yalnızca İngilizce bölüm okunur', () => {
  const text = '==English==\n===Noun===\n====Translations====\n{{trans-top|a thing}}\n* Turkish: {{t|tr|şey}}\n{{trans-bottom}}\n\n==French==\n===Noun===\n{{trans-top|x}}\n* Turkish: {{t|tr|yanlış}}\n{{trans-bottom}}';
  assert.deepEqual(turkishSenses(text), [{ pos: 'Noun', gloss: 'a thing', translations: ['şey'] }]);
  assert.ok(!englishSection(text).includes('French'));
});

test('şablon ve bağlantı işaretleri temizlenir, tekrarlar atılır', () => {
  const text = '==English==\n===Verb===\n{{trans-top|id=abc|to [[move]] quickly}}\n* Turkish: {{t+|tr|[[koşmak]]}}, {{tt|tr|koşmak}}, {{t|tr|seğirtmek|alt=x}}\n{{trans-bottom}}';
  assert.deepEqual(turkishSenses(text), [{ pos: 'Verb', gloss: 'to move quickly', translations: ['koşmak', 'seğirtmek'] }]);
});

test('kelime doğrulaması eklentiyle aynı', () => {
  assert.equal(normalize(' “Strike!” '), 'strike');
  assert.ok(isLookup('keep going'));
  assert.ok(!isLookup('<script>'));
  assert.ok(!isLookup('one two three four five six'));
});

const offline = async title => { try { return page(title.replace(/\//g, '_')) || null; } catch { return null; } };

test('took → take: fiil anlamı "almak" önde, çeviri alt sayfası okunur', async () => {
  assert.deepEqual(lemmaInfo(page('took'), 'took'), { lemma: 'take', pos: 'Verb' });
  const result = await resolve('took', offline);
  assert.equal(result.lemma, 'take');
  assert.equal(result.senses[0].pos, 'Verb');
  assert.ok(result.senses[0].translations.includes('almak'), JSON.stringify(result.senses[0]));
  assert.equal(result.page_url, 'https://en.wiktionary.org/wiki/take');
});

test('running: kökün fiil anlamı (koşmak) önce, kendi isim anlamı (koşu) da kalır', async () => {
  const result = await resolve('running', offline);
  assert.equal(result.lemma, 'run');
  assert.equal(result.senses[0].pos, 'Verb');
  assert.ok(result.senses[0].translations.includes('koşmak'), JSON.stringify(result.senses[0]));
  assert.ok(result.senses.some(s => s.translations.includes('koşu')));
  assert.equal(result.page_url, 'https://en.wiktionary.org/wiki/running');
});

test('kök kelimede çekim aranmaz; sayfa yoksa boş sonuç', async () => {
  const reliable = await resolve('reliable', offline);
  assert.equal(reliable.lemma, null);
  assert.deepEqual(reliable.senses.map(s => s.translations), [['güvenilir']]);
  assert.deepEqual(await resolve('nonexistentword', offline), { word: 'nonexistentword', lemma: null, senses: [], page_url: 'https://en.wiktionary.org/wiki/nonexistentword' });
});

test('anlam ve karşılık sayısı sınırlanır', async () => {
  const strike = await resolve('strike', offline);
  assert.ok(strike.senses.length <= 12);
  for (const s of strike.senses) assert.ok(s.translations.length <= 6);
});
