(function (root) {
  const clean = el => el?.textContent?.replace(/\s+/g, ' ').trim() || '';
  function parse(html, source, url) {
    // Template contents stay inert: no remote scripts, images or markup enter the page.
    const template = document.createElement('template'); template.innerHTML = html;
    const doc = template.content;
    const title = clean(doc.querySelector('title'));
    if (/just a moment|access denied|security check|verify you are human|captcha|pardon our interruption/i.test(title)) return { status: 'blocked' };
    const oxford = source === 'oxford';
    const entry = doc.querySelector(oxford ? '#entryContent .entry' : '.entry-body__el');
    if (!entry) return { status: 'unavailable' };
    entry.querySelectorAll('script,style,.runon,.drunon,.xref,.xrefs,.unbox').forEach(el => el.remove());
    const headword = clean(entry.querySelector(oxford ? '.headword' : '.hw'));
    if (!headword) return { status: 'unavailable' };
    const definitions = [...entry.querySelectorAll(oxford ? '.sense .def' : '.def-block .def')];
    // A short reading excerpt, not a dictionary mirror. Keep the selected sense intact.
    const first = definitions[0];
    const sense = first?.closest(oxford ? '.sense' : '.def-block');
    const definition = clean(first);
    const translation = source === 'turkish' ? clean(sense?.querySelector('.trans[lang="tr"]')) : '';
    if (!definition && !translation) return { status: 'unavailable' };
    const example = clean(sense?.querySelector(oxford ? '.examples .x' : '.examp .eg'));
    const ipa = clean(entry.querySelector(oxford ? '.phons_br .phon, .phon' : '.uk .ipa, .ipa'));
    const copyright = clean(entry.closest('.pr.dictionary')?.querySelector('small.ddef')) || (oxford ? '© Oxford University Press · Oxford Advanced Learner’s Dictionary' : '© Cambridge University Press & Assessment');
    return { status: 'ok', entry: { headword, type: clean(entry.querySelector('.pos')), ipa: ipa && !ipa.startsWith('/') ? `/${ipa}/` : ipa, definition, example, translation, copyright, url, source } };
  }
  root.SozlookParser = { parse };
})(globalThis);
