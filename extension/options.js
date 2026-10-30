(() => {
  const modes = [...document.querySelectorAll('[name="openingMode"]')];
  const status = document.querySelector('#settings-status');
  let openingMode = 'auto';
  let saving = false;
  const showMode = mode => modes.forEach(input => { input.checked = input.value === mode; });
  async function refresh() {
    if (saving) return;
    try {
      openingMode = await SozlookStore.readOpeningMode(); showMode(openingMode);
      modes.forEach(input => { input.disabled = false; });
    } catch { status.textContent = 'Ayar okunamadı. Sayfayı yenileyip tekrar dene.'; }
  }
  modes.forEach(input => input.addEventListener('change', async () => {
    const previous = openingMode;
    saving = true; modes.forEach(mode => { mode.disabled = true; });
    try {
      await SozlookStore.writeOpeningMode(input.value); openingMode = input.value;
      status.textContent = 'Tercihin kaydedildi.';
    } catch { showMode(previous); status.textContent = 'Tercih kaydedilemedi. Tekrar dene.'; }
    finally { saving = false; modes.forEach(mode => { mode.disabled = false; }); }
  }));
  window.addEventListener('storage', event => { if (event.key === 'sozlook-opening-mode' || event.key === null) refresh(); });
  globalThis.chrome?.storage?.onChanged?.addListener((changes, area) => { if (area === 'local' && changes.openingMode) refresh(); });
  window.addEventListener('focus', refresh);
  refresh();
})();
