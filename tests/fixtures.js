// Synthetic, original test text. No downloaded dictionary content is committed.
export function fixture(source, word = 'reliable') {
  if (source === 'oxford') return `<title>Test word</title><div id="entryContent"><div class="entry"><h1 class="headword">${word}</h1><span class="pos">adjective</span><div class="phons_br"><span class="phon">/test/</span></div><ol><li class="sense"><span class="def">Oxford test: a friend who keeps a promise.</span><ul class="examples"><li><span class="x">Our test friend is reliable.</span></li></ul></li></ol></div></div>`;
  return `<title>Test word</title><div class="entry-body__el"><span class="hw">${word}</span><span class="pos">adjective</span><span class="uk"><span class="ipa">test</span></span><div class="def-block"><div class="def">Cambridge test: a person who does what they promise.</div><span class="trans" lang="tr">güvenilir</span><div class="examp"><span class="eg">This is a test example.</span></div></div><div class="runon"><span class="trans" lang="tr">WRONG DERIVED WORD</span></div></div>`;
}
export async function mockLookups(page) {
  await page.route('**/lookup?**', route => {
    const params = new URL(route.request().url()).searchParams;
    const word = params.get('word'); const source = params.get('source');
    return route.fulfill({ json: word === 'reliable' ? { status: 'ok', html: fixture(source), url: source === 'oxford' ? 'https://www.oxfordlearnersdictionaries.com/definition/english/reliable' : `https://dictionary.cambridge.org/dictionary/${source === 'turkish' ? 'english-turkish' : 'english'}/reliable` } : { status: 'not_found' } });
  });
}
