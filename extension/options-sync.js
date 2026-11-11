(() => {
  // Yalnızca kurulu eklentide görünür (web önizlemesinde arka plan çalışanı yok).
  if (!globalThis.chrome?.runtime?.id || !chrome.storage?.local) return;
  const $ = selector => document.querySelector(selector);
  const section = $('#sync');
  const emailForm = $('#sync-email-form'); const codeForm = $('#sync-code-form'); const account = $('#sync-account');
  const emailInput = $('#sync-email'); const codeInput = $('#sync-code'); const status = $('#sync-status');
  let pendingEmail = '';
  section.hidden = false;

  const say = (text, error = false) => { status.textContent = text; status.classList.toggle('error', error); };
  const send = async message => {
    try { return await chrome.runtime.sendMessage(message); }
    catch { return { ok: false, error: 'Eklentiye ulaşılamadı. Sayfayı yenileyip tekrar dene.' }; }
  };
  const busy = (form, value) => form.querySelectorAll('button, input').forEach(el => { el.disabled = value; });
  const formatTime = iso => {
    const date = new Date(iso); if (!Number.isFinite(date.getTime())) return '';
    const minutes = Math.round((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return 'az önce';
    if (minutes < 60) return `${minutes} dk önce`;
    return date.toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  };

  function show(view) {
    emailForm.hidden = view !== 'email'; codeForm.hidden = view !== 'code'; account.hidden = view !== 'account';
  }

  async function render() {
    const { syncSession: session, syncState: state } = await chrome.storage.local.get(['syncSession', 'syncState']);
    if (session) {
      show('account');
      $('#sync-account-email').textContent = session.email;
      const last = state?.lastSyncAt ? `Son eşitleme: ${formatTime(state.lastSyncAt)}` : 'Henüz eşitlenmedi.';
      $('#sync-last').textContent = state?.status === 'syncing' ? 'Eşitleniyor…' : last;
      if (state?.status === 'error' && state.error) say(state.error, true);
      else if (status.classList.contains('error')) say('');
      return;
    }
    if (!codeForm.hidden && pendingEmail) return;
    show('email');
    if (state?.status === 'error' && state.error) say(state.error, true);
  }

  emailForm.addEventListener('submit', async event => {
    event.preventDefault();
    const email = emailInput.value.trim();
    if (!emailInput.checkValidity() || !email) { say('Geçerli bir e-posta adresi yaz.', true); emailInput.focus(); return; }
    busy(emailForm, true); say('Kod gönderiliyor…');
    const response = await send({ type: 'sozlook:sync-send-code', email });
    busy(emailForm, false);
    if (!response?.ok) { say(response?.error || 'Kod gönderilemedi.', true); return; }
    pendingEmail = email.toLowerCase();
    $('#sync-code-email').textContent = pendingEmail;
    codeInput.value = ''; show('code'); codeInput.focus();
    say('Kod gönderildi. E-postanı kontrol et.');
  });

  codeForm.addEventListener('submit', async event => {
    event.preventDefault();
    const code = codeInput.value.replace(/\s/g, '');
    if (!/^\d{6,10}$/.test(code)) { say('E-postadaki 6 haneli kodu yaz.', true); codeInput.focus(); return; }
    busy(codeForm, true); say('Giriş yapılıyor…');
    const response = await send({ type: 'sozlook:sync-verify', email: pendingEmail, code });
    busy(codeForm, false);
    if (!response?.ok) { say(response?.error || 'Giriş yapılamadı.', true); codeInput.select(); return; }
    pendingEmail = '';
    say('Giriş yaptın. Kelimelerin eşitleniyor.');
    render();
  });

  codeInput.addEventListener('input', () => {
    const digits = codeInput.value.replace(/\D/g, '');
    if (digits !== codeInput.value) codeInput.value = digits;
    if (digits.length === 6) codeForm.requestSubmit();
  });

  $('#sync-change-email').addEventListener('click', () => { pendingEmail = ''; show('email'); say(''); emailInput.focus(); });

  $('#sync-now').addEventListener('click', async () => {
    busy(account, true); say('Eşitleniyor…');
    const response = await send({ type: 'sozlook:sync-now' });
    busy(account, false);
    if (!response?.ok) { say(response?.error || 'Eşitlenemedi.', true); return; }
    say('Kelimelerin eşitlendi.');
    render();
  });

  $('#sync-sign-out').addEventListener('click', async () => {
    busy(account, true);
    await send({ type: 'sozlook:sync-sign-out' });
    busy(account, false);
    emailInput.value = ''; show('email');
    say('Çıkış yaptın. Kelimelerin bu tarayıcıda kalmaya devam ediyor.');
  });

  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && (changes.syncSession || changes.syncState)) render(); });
  render();
  if (location.hash === '#sync') section.scrollIntoView({ block: 'start' });
})();
