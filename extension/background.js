importScripts('core.js', 'sources.js');
// Limit concurrent user-initiated loads; no crawling, background prefetch or retries.
let active = 0;
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !sender.tab || message?.type !== 'sozlook:lookup') return;
  if (!SozlookSources.validSource(message.source) || typeof message.word !== 'string' || !SozlookCore.isLookup(message.word)) { respond({ status: 'invalid_request' }); return; }
  if (active >= 6) { respond({ status: 'busy' }); return; }
  active++;
  SozlookSources.fetchPage(message.word, message.source).then(respond, () => respond({ status: 'unavailable' })).finally(() => active--);
  return true;
});
