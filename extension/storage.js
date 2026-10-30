globalThis.SozlookStore = {
  async readOpeningMode() {
    const value = globalThis.chrome?.storage?.local
      ? (await chrome.storage.local.get('openingMode')).openingMode
      : localStorage.getItem('sozlook-opening-mode');
    return value === 'click' ? 'click' : 'auto';
  },
  async writeOpeningMode(value) {
    const openingMode = value === 'click' ? 'click' : 'auto';
    if (globalThis.chrome?.storage?.local) await chrome.storage.local.set({ openingMode });
    else localStorage.setItem('sozlook-opening-mode', openingMode);
  },
  async read() {
    if (globalThis.chrome?.storage?.local) return (await chrome.storage.local.get('words')).words || [];
    try { return JSON.parse(localStorage.getItem('sozlook-words') || '[]'); } catch { return []; }
  },
  async write(words) {
    if (globalThis.chrome?.storage?.local) await chrome.storage.local.set({ words });
    else localStorage.setItem('sozlook-words', JSON.stringify(words));
  }
};
