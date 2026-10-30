globalThis.SozlookStore = {
  async read() {
    if (globalThis.chrome?.storage?.local) return (await chrome.storage.local.get('words')).words || [];
    try { return JSON.parse(localStorage.getItem('sozlook-words') || '[]'); } catch { return []; }
  },
  async write(words) {
    if (globalThis.chrome?.storage?.local) await chrome.storage.local.set({ words });
    else localStorage.setItem('sozlook-words', JSON.stringify(words));
  }
};
