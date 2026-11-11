importScripts('core.js', 'sources.js', 'sync-core.js', 'sync.js');
// Limit concurrent user-initiated loads; no crawling, background prefetch or retries.
let active = 0;
// Eşitleme mesajlarını yalnızca eklentinin kendi sayfaları (popup, seçenekler) gönderebilir;
// içerik betiklerinin adresi ziyaret edilen web sayfasıdır, bu yüzden reddedilir.
const extensionPage = sender => sender.id === chrome.runtime.id && typeof sender.url === 'string' && sender.url.startsWith(chrome.runtime.getURL('')) && (!sender.origin || sender.origin === new URL(chrome.runtime.getURL('')).origin);

const syncActions = {
  'sozlook:sync-send-code': message => SozlookSync.sendCode(message.email),
  'sozlook:sync-verify': async message => { const session = await SozlookSync.verifyCode(message.email, message.code); SozlookSync.sync().catch(() => {}); return { email: session.email }; },
  'sozlook:sync-now': () => SozlookSync.sync(),
  'sozlook:sync-sign-out': () => SozlookSync.signOut()
};

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (syncActions[message?.type]) {
    if (!extensionPage(sender)) return;
    syncActions[message.type](message).then(result => respond({ ok: true, result: result ?? null }), error => respond({ ok: false, error: SozlookSync.message(error) }));
    return true;
  }
  if (sender.id !== chrome.runtime.id || !sender.tab || message?.type !== 'sozlook:lookup') return;
  if (!SozlookSources.validSource(message.source) || typeof message.word !== 'string' || !SozlookCore.isLookup(message.word)) { respond({ status: 'invalid_request' }); return; }
  if (active >= 6) { respond({ status: 'busy' }); return; }
  active++;
  SozlookSources.fetchPage(message.word, message.source).then(respond, () => respond({ status: 'unavailable' })).finally(() => active--);
  return true;
});

// Kaydet / kaldır sonrası: yalnızca gerçekten gönderilecek değişiklik varsa eşitle
// (eşitlemenin kendi yazdığı liste tekrar eşitleme başlatmaz).
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local' || !changes.words) return;
  if (await SozlookSync.hasPendingChanges()) SozlookSync.schedule();
});

// Telefonda yapılan değişiklikleri düzenli olarak al.
chrome.alarms.create('sozlook-sync', { periodInMinutes: 15 });
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === 'sozlook-sync') SozlookSync.sync().catch(() => {}); });
chrome.runtime.onStartup.addListener(() => { SozlookSync.sync().catch(() => {}); });
