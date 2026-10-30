(() => {
  if (globalThis.__sozlookLoaded) return;
  globalThis.__sozlookLoaded = true;
  const { normalize, isLookup, links, position } = SozlookCore;
  const host = document.createElement('div');
  host.id = 'sozlook-extension';
  host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
  document.documentElement.append(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const icons = {
    book: SozlookBrand.paths,
    sound: '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    save: '<path d="M6 3h12v18l-6-4-6 4V3Z"/>',
    link: '<path d="M14 3h7v7m0-7L10 14"/><path d="M10 3H4v17h17v-7"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>'
  };
  const icon = name => `<svg width="20" height="20" viewBox="0 0 ${name === 'book' ? '64 64' : '24 24'}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
  shadow.innerHTML = `<style>
    :host{all:initial;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#172234;font-size:14px;line-height:1.5;color-scheme:light}
    *{box-sizing:border-box}.card,.launch{font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.5;color:#172234}button,a{-webkit-tap-highlight-color:transparent}button{font:inherit;cursor:pointer}button:focus-visible,a:focus-visible{outline:3px solid #a5c7ff;outline-offset:3px}button:disabled{cursor:wait}a{color:inherit}
    [hidden]{display:none!important}.launch{--sozlook-mark-cutout:#1764ed;position:fixed;pointer-events:auto;background:#1764ed;color:white;border:0;border-radius:9px;width:36px;height:34px;display:grid;place-items:center;box-shadow:0 3px 12px #17223422}
    .card{position:fixed;pointer-events:auto;width:344px;max-width:calc(100vw - 24px);max-height:calc(100dvh - 24px);overflow:auto;background:#fff;border:1px solid #dce1e9;border-radius:12px;box-shadow:0 10px 35px #182d481c;animation:appear .15s ease-out}
    @keyframes appear{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.card{animation:none}}
    .header{height:49px;padding:0 19px;display:flex;align-items:center;border-bottom:1px solid #edf0f4;gap:7px;font-size:16px;font-family:Georgia,serif;font-weight:700;color:#18253a}.brand{color:#1764ed;display:flex}.close{margin-left:auto;border:0;background:none;color:#8992a1;display:grid;place-items:center;padding:5px;border-radius:5px}.close:hover{background:#f1f5fa}
    .body{padding:20px 21px 19px}.word-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.word{font-size:29px;font-family:Georgia,serif;font-weight:700;line-height:1.15;overflow-wrap:anywhere;margin:0 0 5px}.mini{border:0;background:transparent;padding:4px;color:#6d7787;display:flex;border-radius:4px}.mini.active{color:#1764ed;background:#edf4ff}.pronunciation{display:flex;gap:5px;align-items:center;color:#7c8696;font-size:13px;min-height:26px}.pronunciation svg{width:16px;height:16px}.type{display:inline-block;margin:9px 0 4px;padding:1px 8px;background:#f0f2f6;border-radius:5px;font-size:11px;color:#647084}.translation{font-size:22px;font-weight:600;color:#1764ed;margin:3px 0 17px;line-height:1.3}.tabs{display:flex;background:#f7f9fc;border:1px solid #e0e6ef;border-radius:6px;padding:2px;margin:0 0 17px}.tab{flex:1;padding:5px;border:1px solid transparent;border-radius:4px;background:transparent;color:#687385;font-size:12px}.tab[aria-selected=true]{background:#fff;color:#1764ed;border-color:#bdd4ff;box-shadow:0 1px 3px #142a4610}.label{font-size:11px;color:#8590a0;margin:0 0 6px}.definition{font-size:14px;line-height:1.65;margin:0;color:#313b4d}.example{font-family:Georgia,serif;font-style:italic;font-size:14px;color:#7a8595;line-height:1.6;margin:8px 0 0}.notice{border-top:1px solid #edf0f4;margin:16px 0 0;padding-top:10px;color:#8992a1;font-size:10px;line-height:1.5}.source-info{font-size:12px;color:#647084;line-height:1.6}.source-info a{color:#1764ed;text-decoration:none;display:inline-flex;align-items:center;gap:5px}.source-info a:hover{text-decoration:underline}.context{font-size:12px;color:#6d7787;border-left:2px solid #d4e4ff;padding-left:10px;margin-top:12px}.footer{display:grid;grid-template-columns:repeat(3,1fr);background:#f8f9fc;border-top:1px solid #e9edf3;padding:11px 0}.tool{border:0;background:transparent;text-decoration:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;font-size:10px;color:#5c6678;min-height:42px}.tool+.tool{border-left:1px solid #e0e5ed}.tool:hover{color:#1764ed}.tool.saved{color:#1764ed}.status{font-size:11px;color:#647084;margin:10px 0 0}.translation-link{font-size:14px;text-decoration:none;color:#1764ed}
  </style>
  <button class="launch" title="Sözlook ile bak" aria-label="Sözlook ile bak" hidden>${icon('book')}</button>
  <section class="card" role="dialog" aria-label="Sözlook sözlük kartı" hidden>
    <header class="header"><span class="brand">${icon('book')}</span>sözlook<button class="close" aria-label="Kapat">${icon('close')}</button></header>
    <div class="body"><div class="word-row"><h2 class="word"></h2><button class="mini bookmark" aria-label="Kelimeyi kaydet">${icon('save')}</button></div>
    <div class="pronunciation"><span class="ipa"></span><button class="mini speak" aria-label="Telaffuzu dinle">${icon('sound')}</button></div>
    <span class="type"></span><div class="translation"></div>
    <div class="tabs" role="tablist" aria-label="Sözlük kaynağı"><button class="tab" role="tab" data-source="oxford" aria-selected="true" aria-controls="sozlook-entry" id="sozlook-oxford">Oxford</button><button class="tab" role="tab" data-source="cambridge" aria-selected="false" aria-controls="sozlook-entry" id="sozlook-cambridge" tabindex="-1">Cambridge</button></div>
    <div role="tabpanel" id="sozlook-entry" aria-labelledby="sozlook-oxford" aria-live="polite"><p class="label"></p><p class="definition"></p><p class="example"></p><div class="context" hidden></div><p class="source-info"></p><p class="notice"></p></div><p class="status" role="status" aria-live="polite"></p></div>
    <footer class="footer"><button class="tool speak">${icon('sound')}<span>Dinle</span></button><button class="tool save">${icon('save')}<span>Kaydet</span></button><a class="tool source-link" target="_blank" rel="noopener noreferrer">${icon('link')}<span>Kaynağı aç</span></a></footer>
  </section>`;
  const $ = selector => shadow.querySelector(selector);
  const card = $('.card');
  const launcher = $('.launch');
  let current = null;
  let source = 'oxford';
  let saved = false;
  let revision = 0;
  let focusBeforeOpen = null;
  let savePending = false;
  let openingMode = 'auto';
  let selectionTimer;
  const modeReady = SozlookStore.readOpeningMode().then(mode => { openingMode = mode; }).catch(() => {});
  globalThis.chrome?.storage?.onChanged?.addListener((changes, area) => {
    if (area === 'local' && changes.openingMode) { openingMode = changes.openingMode.newValue === 'click' ? 'click' : 'auto'; close(); }
  });
  window.addEventListener('storage', event => {
    if (event.key === 'sozlook-opening-mode' || event.key === null) { openingMode = event.newValue === 'click' ? 'click' : 'auto'; close(); }
  });
  const setText = (sel, value) => { $(sel).textContent = value; };
  const failureText = status => ({
    blocked: 'Sözlük sitesi bu isteğe izin vermedi. Kaynak sayfasını açarak okuyabilirsin.',
    not_found: 'Bu kelime için sözlük sayfası bulunamadı. Kaynakta aramayı deneyebilirsin.',
    timeout: 'Sözlük sayfası zamanında yanıt vermedi. Kaynağı açarak devam edebilirsin.',
    busy: 'Şu anda çok fazla istek var. Kartı biraz sonra yeniden açabilirsin.',
    invalid_request: 'Bu seçim sözlük araması için uygun değil.'
  })[status] || 'Sözlük içeriği okunamadı. Kaynağı açarak devam edebilirsin.';
  function renderTranslation() {
    const result = current.turkish;
    $('.translation').replaceChildren();
    if (result?.entry?.translation) setText('.translation', result.entry.translation);
    else if (!result) setText('.translation', 'Türkçesi yükleniyor…');
    else {
      const a = document.createElement('a'); a.className = 'translation-link'; a.textContent = 'Türkçe karşılığına bak ↗';
      a.href = links(current.word).turkish; a.target = '_blank'; a.rel = 'noopener noreferrer'; $('.translation').append(a);
    }
  }
  function renderSource() {
    if (!current) return;
    shadow.querySelectorAll('.tab').forEach(tab => {
      const active = tab.dataset.source === source;
      tab.setAttribute('aria-selected', active);
      tab.tabIndex = active ? 0 : -1;
    });
    $('#sozlook-entry').setAttribute('aria-labelledby', `sozlook-${source}`);
    const result = current.results?.[source];
    const entry = result?.entry;
    $('.source-link').href = entry?.url || links(current.word)[source];
    const name = source === 'oxford' ? 'Oxford' : 'Cambridge';
    const loading = !result;
    $('#sozlook-entry').setAttribute('aria-busy', String(loading));
    $('.label').hidden = false;
    setText('.label', loading ? `${name} sayfası yükleniyor…` : entry ? `${name} · İngilizce açıklama` : `${name} · İçerik alınamadı`);
    setText('.definition', entry?.definition || (loading ? 'Kelimenin anlamı kaynak sayfadan alınıyor.' : failureText(result.status)));
    setText('.example', entry?.example || '');
    setText('.ipa', entry?.ipa || 'İngilizce telaffuz');
    $('.type').hidden = !entry?.type; setText('.type', entry?.type || '');
    renderTranslation();
    const container = $('.source-info');
    container.replaceChildren();
    const a = document.createElement('a');
    a.textContent = `${name} sözlüğünde incele ↗`;
    a.href = entry?.url || links(current.word)[source]; a.target = '_blank'; a.rel = 'noopener noreferrer';
    container.append(a);
    setText('.notice', entry ? `${entry.copyright}${current.turkish?.entry?.translation ? ' · Türkçe: Cambridge Learner’s Dictionary © Cambridge University Press' : ''} · İlk sözlük anlamı gösterilir; cümleye göre seçilmez.` : 'Ücretsiz sayfa okuma denemesi · Erişim engelleri aşılmaz.');
  }
  async function loadSource(selectedSource) {
    if (!current || current.results?.[selectedSource] || current.pending?.has(selectedSource)) return;
    const ticket = revision; const selected = current;
    selected.pending.add(selectedSource);
    const result = await SozlookLookup.lookup(selected.word, selectedSource);
    if (ticket !== revision || current !== selected) return;
    selected.results[selectedSource] = result; selected.pending.delete(selectedSource);
    if (source === selectedSource) { renderSource(); layout(); }
  }
  function selectSource(selectedSource) {
    source = selectedSource; renderSource(); layout(); loadSource(selectedSource);
  }
  function renderSave() {
    $('.save').classList.toggle('saved', saved);
    $('.bookmark').classList.toggle('active', saved);
    $('.bookmark').setAttribute('aria-label', saved ? 'Kaydı kaldır' : 'Kelimeyi kaydet');
    $('.save').innerHTML = icon(saved ? 'check' : 'save') + `<span>${saved ? 'Kaydedildi' : 'Kaydet'}</span>`;
  }
  function layout() {
    if (!current || card.hidden) return;
    const p = position(current.rect, card.offsetWidth, card.offsetHeight, { width: innerWidth, height: innerHeight });
    card.style.left = `${p.left}px`; card.style.top = `${p.top}px`;
  }
  async function open() {
    if (!current) return;
    const ticket = ++revision;
    focusBeforeOpen = document.activeElement;
    launcher.hidden = true;
    source = 'oxford';
    current.results = {}; current.pending = new Set(); current.turkish = null;
    setText('.word', current.word);
    $('.context').hidden = !current.context; setText('.context', current.context || '');
    setText('.status', ''); saved = false; renderSave(); renderSource();
    card.hidden = false; layout(); $('.close').focus({ preventScroll: true });
    loadSource(source);
    const selected = current;
    SozlookLookup.lookup(selected.word, 'turkish').then(result => {
      if (ticket !== revision || current !== selected) return;
      selected.turkish = result; renderSource(); layout();
    });
    try { const words = await SozlookStore.read(); if (ticket === revision) { saved = words.some(w => w.word === current.word); renderSave(); } }
    catch { if (ticket === revision) setText('.status', 'Kayıtlar okunamadı. Sayfayı yenileyip tekrar dene.'); }
  }
  function close() {
    clearTimeout(selectionTimer);
    revision++; card.hidden = true; launcher.hidden = true;
    if (focusBeforeOpen?.isConnected && focusBeforeOpen !== document.body) focusBeforeOpen.focus({ preventScroll: true });
  }
  async function saveWord() {
    if (!current || savePending) return;
    savePending = true;
    const ticket = revision;
    const selected = { ...current };
    try {
      const words = await SozlookStore.read();
      const exists = words.some(w => w.word === selected.word);
      const next = exists ? words.filter(w => w.word !== selected.word) : [{ word: selected.word, translation: '', context: selected.context, url: location.href, title: document.title, savedAt: new Date().toISOString() }, ...words];
      await SozlookStore.write(next);
      if (ticket === revision) { saved = !exists; renderSave(); setText('.status', saved ? 'Kelimelerine eklendi.' : 'Kayıt kaldırıldı.'); layout(); }
      document.dispatchEvent(new Event('sozlook-saved'));
    } catch { if (ticket === revision) setText('.status', 'Kaydedilemedi. Tekrar dene.'); }
    finally { savePending = false; }
  }
  function speak() {
    if (!current) return;
    if (!('speechSynthesis' in window)) { setText('.status', 'Bu tarayıcı seslendirmeyi desteklemiyor.'); return; }
    const utterance = new SpeechSynthesisUtterance(current.word); utterance.lang = 'en-GB'; utterance.rate = .85;
    utterance.onerror = e => { if (e.error !== 'interrupted' && e.error !== 'canceled') setText('.status', 'Seslendirme açılamadı. Cihazının ses ayarlarını kontrol et.'); };
    speechSynthesis.cancel(); speechSynthesis.speak(utterance);
  }
  shadow.querySelectorAll('.speak').forEach(el => el.addEventListener('click', speak));
  shadow.querySelectorAll('.save,.bookmark').forEach(el => el.addEventListener('click', saveWord));
  $('.close').addEventListener('click', close);
  launcher.addEventListener('click', open);
  shadow.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => selectSource(tab.dataset.source));
    tab.addEventListener('keydown', e => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
        e.preventDefault(); source = e.key === 'Home' ? 'oxford' : e.key === 'End' ? 'cambridge' : source === 'oxford' ? 'cambridge' : 'oxford';
        selectSource(source); $(`[data-source="${source}"]`).focus();
      }
    });
  });
  function readSelection({ forceOpen = false } = {}) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) { launcher.hidden = true; return; }
    const parent = selection.anchorNode?.parentElement;
    if (parent?.closest('input,textarea,[contenteditable]:not([contenteditable="false"])')) { launcher.hidden = true; return; }
    const value = selection.toString();
    if (!isLookup(value)) { launcher.hidden = true; return; }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const container = range.commonAncestorContainer;
    const text = (container.nodeType === Node.TEXT_NODE ? container.textContent : container.textContent || '').replace(/\s+/g, ' ').trim();
    const index = Math.max(0, text.toLowerCase().indexOf(value.trim().toLowerCase()));
    const context = text.slice(Math.max(0, index - 120), index + value.length + 160).trim();
    current = { word: normalize(value), rect, context };
    card.hidden = true; revision++;
    launcher.style.left = `${Math.max(8, Math.min(rect.right + 7, innerWidth - 44))}px`;
    launcher.style.top = `${Math.max(8, Math.min(rect.bottom + 5, innerHeight - 42))}px`;
    launcher.hidden = false;
    if (forceOpen || openingMode === 'auto') open();
  }
  function scheduleSelection() {
    clearTimeout(selectionTimer);
    const ticket = revision;
    selectionTimer = setTimeout(async () => {
      await modeReady;
      if (ticket === revision) readSelection();
    }, 80);
  }
  document.addEventListener('pointerup', e => { if (e.composedPath().includes(host)) return; scheduleSelection(); });
  document.addEventListener('pointerdown', e => { if (!e.composedPath().includes(host)) close(); });
  document.addEventListener('keyup', e => { if (e.key === 'Shift' && !e.composedPath().includes(host) && !e.altKey) scheduleSelection(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
    if (e.altKey && e.shiftKey && e.code === 'KeyS') { e.preventDefault(); clearTimeout(selectionTimer); readSelection({ forceOpen: true }); }
  });
  shadow.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || card.hidden) return;
    const focusables = [...card.querySelectorAll('button,a[href]')].filter(el => el.tabIndex >= 0 && el.getClientRects().length);
    const first = focusables[0], last = focusables.at(-1);
    if (e.shiftKey && shadow.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && shadow.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  window.addEventListener('resize', close);
  window.addEventListener('scroll', e => { if (!e.composedPath().includes(host)) close(); }, true);
  // Preview-only bridge. Not exposed in the installed extension.
  if (!globalThis.chrome?.runtime?.id) window.SozlookPreview = {
    open(word, element) { current = { word: normalize(word), rect: element.getBoundingClientRect(), context: element.closest('p')?.textContent || '' }; open(); }
  };
})();
