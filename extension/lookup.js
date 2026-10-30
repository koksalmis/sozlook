(function (root) {
  async function lookup(word, source) {
    if (typeof word !== 'string' || !SozlookCore.isLookup(word)) return { status: 'invalid_request' };
    try {
      let result;
      if (globalThis.chrome?.runtime?.id) result = await chrome.runtime.sendMessage({ type: 'sozlook:lookup', word, source });
      else {
        const response = await fetch(`/lookup?word=${encodeURIComponent(word)}&source=${encodeURIComponent(source)}`, { cache: 'no-store', signal: AbortSignal.timeout(15_000), headers: { 'X-Sozlook-Request': 'lookup' } });
        if (!response.ok) return { status: response.status === 429 ? 'busy' : 'unavailable' };
        result = await response.json();
      }
      if (result?.status !== 'ok') return result || { status: 'unavailable' };
      return SozlookParser.parse(result.html, source, result.url);
    } catch { return { status: 'unavailable' }; }
  }
  root.SozlookLookup = { lookup };
})(globalThis);
