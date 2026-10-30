// Shared by the extension worker and the local preview server. No API keys.
(function (root) {
  const hosts = new Set(['www.oxfordlearnersdictionaries.com', 'dictionary.cambridge.org']);
  const maxBytes = 2_000_000;
  const validSource = source => ['oxford', 'cambridge', 'turkish'].includes(source);
  function sourceUrl(word, source) {
    if (!validSource(source) || typeof word !== 'string' || !SozlookCore.isLookup(word)) throw new Error('invalid_request');
    const normalized = SozlookCore.normalize(word);
    if (source === 'oxford') return `https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(normalized.replace(/ /g, '-'))}`;
    return SozlookCore.links(normalized)[source];
  }
  async function fetchPage(word, source, fetcher = fetch) {
    let url;
    try { url = sourceUrl(word, source); } catch { return { status: 'invalid_request' }; }
    const signal = AbortSignal.timeout(12_000);
    try {
      for (let redirects = 0; redirects <= 4; redirects++) {
        const response = await fetcher(url, { redirect: 'manual', credentials: 'omit', cache: 'no-store', signal, headers: { Accept: 'text/html' } });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('location');
          await response.body?.cancel();
          if (!location) return { status: 'unavailable', url };
          const next = new URL(location, url);
          if (next.protocol !== 'https:' || !hosts.has(next.hostname) || next.hostname !== new URL(url).hostname || next.port || next.username || next.password) return { status: 'unavailable', url };
          url = next.href; continue;
        }
        if (!response.ok) {
          await response.body?.cancel();
          return { status: [401, 403, 429].includes(response.status) ? 'blocked' : response.status === 404 ? 'not_found' : 'unavailable', url };
        }
        if (!response.headers.get('content-type')?.includes('text/html')) { await response.body?.cancel(); return { status: 'unavailable', url }; }
        const reader = response.body.getReader(); const chunks = []; let size = 0;
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          size += value.byteLength;
          if (size > maxBytes) { await reader.cancel(); return { status: 'unavailable', url }; }
          chunks.push(value);
        }
        const bytes = new Uint8Array(size); let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        return { status: 'ok', html: new TextDecoder().decode(bytes), url };
      }
      return { status: 'unavailable', url };
    } catch (error) { return { status: signal.aborted || error.name === 'TimeoutError' ? 'timeout' : 'unavailable', url }; }
  }
  root.SozlookSources = { sourceUrl, fetchPage, validSource };
})(globalThis);
