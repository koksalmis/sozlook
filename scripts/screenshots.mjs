// Chrome Web Store görselleri: docs/store/images/*.png
// Gerçek eklentiyi yükler; sözlük yanıtları ağdan değil, aşağıdaki özgün örnek metinlerden gelir.
import { chromium } from '@playwright/test';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const extension = resolve(root, 'extension');
const out = resolve(root, 'docs/store/images');
await mkdir(out, { recursive: true });

// Özgün, örnek amaçlı açıklamalar (sözlüklerden kopyalanmadı).
const entries = {
  reliable: { pos: 'adjective', ipa: 'rɪˈlaɪəbl', tr: 'güvenilir', def: 'that you can trust to work well or to behave as you expect', ex: 'We need a reliable way to keep track of new words.' }
};
const html = (source, word) => {
  const e = entries[word];
  if (!e) return '<title>Not found</title>';
  if (source === 'oxford') return `<title>${word}</title><div id="entryContent"><div class="entry"><h1 class="headword">${word}</h1><span class="pos">${e.pos}</span><div class="phons_br"><span class="phon">/${e.ipa}/</span></div><ol><li class="sense"><span class="def">${e.def}</span><ul class="examples"><li><span class="x">${e.ex}</span></li></ul></li></ol></div></div>`;
  return `<title>${word}</title><div class="entry-body__el"><span class="hw">${word}</span><span class="pos">${e.pos}</span><span class="uk"><span class="ipa">${e.ipa}</span></span><div class="def-block"><div class="def">${e.def}</div><span class="trans" lang="tr">${e.tr}</span><div class="examp"><span class="eg">${e.ex}</span></div></div></div>`;
};

const article = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Reading every day</title>
<style>body{margin:0;background:#fbfaf7;color:#1f2733;font:19px/1.75 Georgia,serif}header{border-bottom:1px solid #e7e3da;padding:18px 0;background:#fff}header div,main{max-width:720px;margin:0 auto;padding:0 32px}header b{font:600 15px system-ui;letter-spacing:.08em;text-transform:uppercase;color:#8a8170}h1{font-size:40px;line-height:1.2;margin:48px 0 10px}.meta{font:14px system-ui;color:#8a8170;margin-bottom:28px}::selection{background:#cfe0ff}</style></head>
<body><header><div><b>The Reading Room</b></div></header><main><h1>Small habits that make reading stick</h1><p class="meta">5 min read</p>
<p>Learning a language through reading works best when it becomes part of your day. A short article each morning is often more useful than a long session once a week.</p>
<p>The trick is to have a reliable routine: notice an unfamiliar word, check its meaning without leaving the page, and keep the sentence you found it in.</p>
<p>Over time those saved sentences turn into your own personal dictionary, full of words you have actually met.</p></main></body></html>`;

const words = [
  ['reliable', 'The trick is to have a reliable routine: notice an unfamiliar word, check its meaning without leaving the page.'],
  ['curious', 'She was curious about how the old clock still kept such good time.'],
  ['improve', 'Reading a little every day can improve your vocabulary faster than you think.'],
  ['thorough', 'The report gave a thorough explanation of every step in the process.'],
  ['persuade', 'It took him a while to persuade his friends to join the book club.']
].map(([word, context], i) => ({ word, translation: '', context, url: 'https://example.com/article', title: 'Article', savedAt: new Date(Date.UTC(2026, 10, 3 - i)).toISOString() }));

const dir = await mkdtemp(join(tmpdir(), 'sozlook-shots-'));
const context = await chromium.launchPersistentContext(dir, {
  channel: 'chromium', headless: true, viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: 'tr-TR',
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
});
try {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  const pages = { oxford: html('oxford', 'reliable'), cambridge: html('cambridge', 'reliable'), turkish: html('turkish', 'reliable') };
  await worker.evaluate(pages => {
    globalThis.fetch = async url => new Response(url.includes('oxford') ? pages.oxford : url.includes('english-turkish') ? pages.turkish : pages.cambridge, { headers: { 'Content-Type': 'text/html' } });
  }, pages);
  await context.route('https://reading.example/**', route => route.fulfill({ contentType: 'text/html', body: article }));

  // 1 — Sayfada kelime kartı (Oxford)
  const page = await context.newPage();
  await page.goto('https://reading.example/article');
  await page.locator('#sozlook-extension').waitFor({ state: 'attached' });
  // Kelimeyi metin düğümü içinde bul ve gerçek bir çift tıklama yap (bağlam cümlesi kartta görünsün).
  const box = await page.evaluate(() => {
    const p = [...document.querySelectorAll('p')].find(el => el.textContent.includes('reliable routine'));
    const node = p.firstChild; const start = node.textContent.indexOf('reliable');
    const range = document.createRange(); range.setStart(node, start); range.setEnd(node, start + 8);
    const r = range.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.dblclick(box.x, box.y);
  const card = page.getByRole('dialog');
  await card.getByText('güvenilir', { exact: true }).waitFor();
  const blur = () => page.evaluate(() => document.querySelector('#sozlook-extension').shadowRoot.activeElement?.blur());
  await blur(); await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, '01-kelime-karti.png') });

  // 2 — Cambridge sekmesi + kaydet
  await card.getByRole('tab', { name: 'Cambridge' }).click();
  await card.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await card.getByRole('button', { name: 'Kaydedildi', exact: true }).waitFor();
  await blur(); await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, '02-cambridge-kaydet.png') });

  // 3 — Kelimelerim penceresi, mağaza ölçüsünde çerçevelenmiş
  await worker.evaluate(words => chrome.storage.local.set({ words }), words);
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 600, height: 600 });
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.getByText('5 kelime kaydettin').waitFor();
  const popupPng = (await popup.screenshot()).toString('base64');
  await popup.close();

  // 4 — Seçenekler
  const options = await context.newPage();
  await options.goto(`chrome-extension://${id}/options.html`);
  await options.waitForLoadState('networkidle');
  await options.screenshot({ path: join(out, '04-secenekler.png') });
  await options.close();

  const mark = (await readFile(resolve(extension, 'brand/mark.svg'))).toString('base64');
  const brandCss = await readFile(resolve(extension, 'brand/brand.css'), 'utf8');
  const canvas = await context.newPage();
  const render = async (file, width, height, body) => {
    await canvas.setViewportSize({ width, height });
    await canvas.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${brandCss}
      *{box-sizing:border-box}body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:linear-gradient(135deg,#f3f7ff,#e6efff);font-family:system-ui,-apple-system,sans-serif;color:#18253a}
      .logo img{content:url(data:image/svg+xml;base64,${mark})}h2{font:700 44px/1.15 Georgia,serif;margin:0 0 18px;letter-spacing:-.5px}p{font-size:20px;line-height:1.55;color:#4a5568;margin:0}</style></head><body>${body}</body></html>`);
    await canvas.screenshot({ path: join(out, file) });
  };
  const logo = size => `<div class="sozlook-logo logo" style="font-size:${size}px"><img alt="" style="width:${size * 0.93}px;height:${size * 1.13}px">sözlook</div>`;

  await render('03-kelimelerim.png', 1280, 800, `<div style="display:flex;align-items:center;gap:64px;height:100%;padding:0 80px">
    <div style="flex:1">${logo(34)}<h2 style="margin-top:40px;font-size:38px">Okuduğun kelimeler,<br>cümleleriyle birlikte.</h2><p>Kaydettiğin her kelime, bulduğun cümle ve sayfa adresiyle saklanır. Ara, kaldır veya JSON olarak dışa aktar.</p></div>
    <img src="data:image/png;base64,${popupPng}" style="width:600px;height:600px;border-radius:14px;box-shadow:0 24px 60px #1b3a7030,0 2px 8px #1b3a7018">
  </div>`);

  await render('promo-kucuk-440x280.png', 440, 280, `<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;gap:22px;text-align:center">
    ${logo(46)}<p style="font:600 19px/1.4 Georgia,serif;color:#1764ed">Oku. Anla. Öğren.</p></div>`);

  await render('promo-buyuk-1400x560.png', 1400, 560, `<div style="display:flex;align-items:center;justify-content:space-between;height:100%;padding:0 110px">
    <div>${logo(64)}<p style="font:600 30px/1.4 Georgia,serif;color:#1764ed;margin-top:26px">Oku. Anla. Öğren.</p></div>
    <p style="max-width:520px;font-size:24px">İngilizce okurken seçtiğin kelimenin anlamına sayfadan ayrılmadan bak, Türkçesini gör ve cümlesiyle kaydet.</p></div>`);

  console.log(`Görseller hazır: ${out}`);
} finally {
  await context.close();
  await rm(dir, { recursive: true, force: true });
}
