// Wiktionary wikitext'inden İngilizce kelimenin Türkçe karşılıklarını çıkarır.
// Saf modül: ağ veya Deno API'si yok; Node testlerinden de kullanılır.

export type Sense = { pos: string; gloss: string; translations: string[] };

const POS = new Set([
  'Adjective', 'Adverb', 'Noun', 'Verb', 'Pronoun', 'Preposition', 'Conjunction', 'Interjection',
  'Determiner', 'Article', 'Numeral', 'Particle', 'Phrase', 'Prepositional phrase', 'Proverb', 'Idiom', 'Proper noun', 'Contraction'
]);

/** Sayfanın yalnızca ==English== bölümü. */
export function englishSection(wikitext: string): string {
  const match = /(?:^|\n)==\s*English\s*==\s*\n([\s\S]*?)(?=\n==[^=]|$)/.exec(wikitext);
  return match ? match[1] : '';
}

/** {{trans-top|...}} içinden okunabilir anlam açıklaması. */
function gloss(template: string): string {
  const inner = template.replace(/^\{\{\s*trans-top(?:-see)?\s*\|?/, '').replace(/\}\}\s*$/, '');
  const parts = inner.split('|').map(p => p.trim()).filter(p => p && !/^\w+=/.test(p));
  return clean(parts[0] ?? '');
}

/** Wiki işaretlerini sadeleştirir: [[a|b]] → b, ''x'' → x, kalan şablonlar atılır. */
function clean(text: string): string {
  return text
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "* Turkish: {{t+|tr|vurmak}}, {{t|tr|çarpmak|...}}" satırındaki kelimeler. */
function turkishTerms(line: string): string[] {
  const terms: string[] = [];
  for (const match of line.matchAll(/\{\{\s*t{1,2}\+?\s*\|\s*tr\s*\|([^|}]+)/g)) {
    const term = clean(match[1]);
    if (term && !terms.includes(term)) terms.push(term);
  }
  return terms;
}

/** İngilizce bölümdeki tüm anlamların Türkçe karşılıkları (yalnızca karşılığı olanlar). */
export function turkishSenses(wikitext: string): Sense[] {
  const section = englishSection(wikitext);
  const senses: Sense[] = [];
  let pos = '';
  let current: Sense | null = null;
  for (const raw of section.split('\n')) {
    const line = raw.trim();
    const heading = /^(=+)\s*([^=]+?)\s*\1$/.exec(line);
    if (heading) {
      const title = heading[2].replace(/\s+\d+$/, '');
      if (POS.has(title)) pos = title;
      current = null;
      continue;
    }
    if (/^\{\{\s*trans-top/.test(line)) { current = { pos, gloss: gloss(line), translations: [] }; continue; }
    if (/^\{\{\s*trans-bottom/.test(line)) {
      if (current && current.translations.length) senses.push(current);
      current = null;
      continue;
    }
    if (current && /^\*\s*Turkish\s*:/.test(line)) {
      for (const term of turkishTerms(line)) if (!current.translations.includes(term)) current.translations.push(term);
    }
  }
  if (current && current.translations.length) senses.push(current);
  return senses;
}

/** Çekimli halin kökü ve hangi sözcük türünün çekimi olduğu: "took" → { lemma: "take", pos: "Verb" }. */
export function lemmaInfo(wikitext: string, word: string): { lemma: string; pos: string } | null {
  const section = englishSection(wikitext);
  const patterns = [
    /\{\{\s*(?:infl|inflection|plural|past tense|past participle|present participle|third-person singular|simple past|comparative|superlative|alternative form|alternative spelling|obsolete form|archaic form|misspelling)[a-z -]* of\s*\|\s*en\s*\|([^|}]+)/i,
    /\{\{\s*en-(?:past|third-person singular|ing form|simple past|past participle|plural noun|comparative|superlative)[a-z -]* of\s*\|([^|}]+)/i
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(section);
    const lemma = match ? clean(match[1]).toLowerCase() : '';
    if (!match || !lemma || lemma === word) continue;
    let pos = '';
    for (const heading of section.slice(0, match.index).matchAll(/\n=+\s*([^=\n]+?)\s*=+/g)) {
      const title = heading[1].replace(/\s+\d+$/, '');
      if (POS.has(title)) pos = title;
    }
    return { lemma, pos };
  }
  return null;
}

export function lemmaOf(wikitext: string, word: string): string | null {
  return lemmaInfo(wikitext, word)?.lemma ?? null;
}

/** Sayfa, çevirilerin bir kısmını ayrı alt sayfada tutuyorsa ("take/translations"). */
export function hasTranslationSubpage(wikitext: string): boolean {
  return /\{\{\s*see translation subpage\b/i.test(englishSection(wikitext));
}

const asEnglish = (text: string) => (/(^|\n)==\s*English\s*==/.test(text) ? text : `==English==\n${text}`);

/** Bir sayfanın (ve varsa çeviri alt sayfasının) tüm Türkçe anlamları; alt sayfadakiler önce. */
async function pageSenses(title: string, text: string, fetchText: (title: string) => Promise<string | null>): Promise<Sense[]> {
  const own = turkishSenses(text);
  if (!hasTranslationSubpage(text)) return own;
  const sub = await fetchText(`${title}/translations`);
  return sub ? [...turkishSenses(asEnglish(sub)), ...own] : own;
}

export type Resolved = { word: string; lemma: string | null; senses: Sense[]; page_url: string };

export const pageURL = (title: string) => `https://en.wiktionary.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

/**
 * Kelimenin Türkçe karşılıkları. Çekimli kelimede kökün karşılıkları da eklenir ve
 * çekimin türüne uyanlar ("took" için fiil) en başa gelir. Ağ erişimi dışarıdan verilir.
 */
export async function resolve(word: string, fetchText: (title: string) => Promise<string | null>): Promise<Resolved> {
  const text = await fetchText(word);
  if (!text) return { word, lemma: null, senses: [], page_url: pageURL(word) };
  const own = await pageSenses(word, text, fetchText);
  const info = lemmaInfo(text, word);
  let lemma: string | null = null;
  let senses = own;
  if (info && isLookup(info.lemma)) {
    const lemmaText = await fetchText(info.lemma);
    const fromLemma = lemmaText ? await pageSenses(info.lemma, lemmaText, fetchText) : [];
    if (fromLemma.length) {
      lemma = info.lemma;
      const matching = fromLemma.filter(s => s.pos === info.pos);
      const rest = fromLemma.filter(s => s.pos !== info.pos);
      senses = [...matching, ...own, ...rest];
    }
  }
  const seen = new Set<string>();
  senses = senses.filter(s => { const key = `${s.pos}|${s.gloss}|${s.translations.join(',')}`; if (seen.has(key)) return false; seen.add(key); return true; })
    .slice(0, 12)
    .map(s => ({ ...s, translations: s.translations.slice(0, 6) }));
  return { word, lemma, senses, page_url: pageURL(lemma && !own.length ? lemma : word) };
}

/** Kelime normalizasyonu: eklentideki SozlookCore.normalize ile uyumlu. */
export function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('en-US').replace(/^[“”"'‘’.,!?;:()]+|[“”"'‘’.,!?;:()]+$/g, '').replace(/\s+/g, ' ');
}

export function isLookup(value: string): boolean {
  const word = normalize(value);
  return /^[a-z][a-z'’ -]{0,79}$/.test(word) && word.split(' ').length <= 5;
}
