(() => {
  let words = [];
  const list = document.querySelector('#words');
  const status = document.querySelector('#status');
  const search = document.querySelector('#search');
  document.querySelector('#options-link').addEventListener('click', async event => {
    if (!globalThis.chrome?.runtime?.openOptionsPage) return;
    event.preventDefault();
    try { await chrome.runtime.openOptionsPage(); }
    catch { status.textContent = 'Seçenekler açılamadı. Eklenti menüsünden tekrar dene.'; }
  });
  const text = (tag, cls, value) => { const el = document.createElement(tag); el.className = cls; el.textContent = value; return el; };
  function render() {
    const query = search.value.toLocaleLowerCase('tr');
    const filtered = words.filter(w => `${w.word} ${w.translation}`.toLocaleLowerCase('tr').includes(query));
    document.querySelector('#count').textContent = `${words.length} kelime kaydettin`;
    list.replaceChildren();
    if (!filtered.length) {
      const empty = text('div', 'empty', '');
      empty.append(text('strong', '', query ? 'Eşleşen kelime bulunamadı.' : 'İlk kelimen seni bekliyor.'), text('p', '', query ? 'Başka bir kelime veya Türkçe anlam dene.' : 'Bir sayfada İngilizce kelime seç, Sözlook kartını aç ve Kaydet’e bas.'));
      list.append(empty);
    }
    for (const word of filtered) {
      const item = text('article', 'item', '');
      const top = text('div', 'item-top', '');
      const link = text('a', 'word', word.word); link.href = SozlookCore.links(word.word).cambridge; link.target = '_blank'; link.rel = 'noopener noreferrer';
      const remove = text('button', 'remove', 'Kaldır'); remove.setAttribute('aria-label', `${word.word} kaydını kaldır`);
      remove.addEventListener('click', async () => {
        remove.disabled = true;
        try { const latest = await SozlookStore.read(); const next = latest.filter(w => w.word !== word.word); await SozlookStore.write(next); words = next; render(); }
        catch { status.textContent = 'Kayıt kaldırılamadı. Tekrar dene.'; remove.disabled = false; }
      });
      top.append(link, remove); item.append(top);
      if (word.translation) item.append(text('p', 'translation', word.translation));
      if (word.context) item.append(text('p', 'context', word.context));
      list.append(item);
    }
  }
  async function refresh() { try { words = await SozlookStore.read(); render(); } catch { status.textContent = 'Kelimeler yüklenemedi. Tekrar açmayı dene.'; } }
  search.addEventListener('input', render);
  document.querySelector('#export').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ app: 'Sözlook', version: 1, words }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'sozlook-kelimelerim.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Kelimelerin JSON dosyası olarak dışa aktarıldı.';
  });
  window.addEventListener('storage', refresh);
  window.addEventListener('focus', refresh);
  globalThis.chrome?.storage?.onChanged?.addListener(refresh);
  refresh();
})();
