// Bulut eşitlemesi (yalnızca arka plan çalışanında yüklenir). İsteğe bağlıdır:
// giriş yapılmadıysa hiçbir ağ isteği yapılmaz ve kelimeler yalnızca bu tarayıcıda kalır.
(function (root) {
  const config = {
    url: 'https://fwiranhsgrzcnnnqkbba.supabase.co',
    // Publishable key istemcide bulunmak üzere tasarlanmıştır; erişimi veritabanındaki RLS sınırlar.
    key: 'sb_publishable_wDtWdYXfM2EFP9i4hzNfkw_NbAn5clc'
  };
  const keys = { session: 'syncSession', base: 'syncBase', cursor: 'syncCursor', state: 'syncState' };
  const store = chrome.storage.local;
  const core = root.SozlookSyncCore;
  const pageSize = 1000;
  const chunkSize = 500;

  class SyncError extends Error {
    constructor(message, { status = 0, code = '' } = {}) { super(message); this.status = status; this.code = code; }
  }

  async function api(path, { method = 'GET', body, token, prefer } = {}) {
    const headers = { apikey: config.key, 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (prefer) headers.Prefer = prefer;
    let response;
    try {
      response = await fetch(config.url + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(15_000) });
    } catch { throw new SyncError('network', { code: 'network' }); }
    const raw = await response.text();
    let data = null; try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
    if (!response.ok) throw new SyncError(data?.msg || data?.message || data?.error_description || `HTTP ${response.status}`, { status: response.status, code: data?.error_code || data?.code || '' });
    return data;
  }

  const message = error => {
    if (error?.code === 'network') return 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.';
    if (error?.status === 429 || /rate/i.test(error?.code || '')) return 'Çok sık deneme yapıldı. Biraz bekleyip tekrar dene.';
    if (error?.code === 'otp_expired' || error?.status === 403) return 'Kod hatalı veya süresi dolmuş. Yeni kod isteyebilirsin.';
    if (error?.code === 'email_address_invalid' || error?.code === 'validation_failed') return 'E-posta adresini kontrol et.';
    if (error?.code === 'signed_out') return 'Oturumun sona erdi. Eşitlemek için tekrar giriş yap.';
    return 'Bir sorun oluştu. Biraz sonra tekrar dene.';
  };

  const readState = async () => (await store.get(keys.state))[keys.state] || null;
  async function writeState(patch) {
    const next = { ...(await readState()), ...patch };
    await store.set({ [keys.state]: next });
    return next;
  }

  const validEmail = email => typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function sendCode(email) {
    email = String(email || '').trim().toLowerCase();
    if (!validEmail(email)) throw new SyncError('invalid', { code: 'email_address_invalid' });
    await api('/auth/v1/otp', { method: 'POST', body: { email, create_user: true } });
    return { email };
  }

  async function saveSession(data) {
    if (!data?.access_token || !data?.refresh_token || !data?.user?.id) throw new SyncError('bad session');
    const session = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      userId: data.user.id,
      email: data.user.email || ''
    };
    await store.set({ [keys.session]: session });
    return session;
  }

  async function verifyCode(email, code) {
    email = String(email || '').trim().toLowerCase();
    code = String(code || '').replace(/\s/g, '');
    if (!validEmail(email)) throw new SyncError('invalid', { code: 'email_address_invalid' });
    if (!/^\d{6,10}$/.test(code)) throw new SyncError('invalid', { code: 'otp_expired' });
    const session = await saveSession(await api('/auth/v1/verify', { method: 'POST', body: { type: 'email', email, token: code } }));
    // Farklı bir hesaba geçildiyse önceki hesabın eşitleme geçmişi kullanılmaz.
    await store.remove([keys.base, keys.cursor]);
    await writeState({ email: session.email, status: 'idle', error: '', lastSyncAt: null });
    return session;
  }

  async function forget() {
    await store.remove([keys.session, keys.base, keys.cursor, keys.state]);
  }

  let refreshing = null;
  async function accessToken() {
    const session = (await store.get(keys.session))[keys.session];
    if (!session) throw new SyncError('signed out', { code: 'signed_out' });
    if (session.expiresAt - 60 > Date.now() / 1000) return session.accessToken;
    refreshing ||= (async () => {
      try {
        const data = await api('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refreshToken } });
        return (await saveSession(data)).accessToken;
      } catch (error) {
        if (error.status === 400 || error.status === 401) { await forget(); throw new SyncError('signed out', { code: 'signed_out' }); }
        throw error;
      } finally { refreshing = null; }
    })();
    return refreshing;
  }

  async function signOut() {
    try { await api('/auth/v1/logout?scope=local', { method: 'POST', token: await accessToken() }); } catch { /* yerelde yine de çıkış yapılır */ }
    await forget();
  }

  async function push(token, changes) {
    const rows = changes.upserts.map(core.toRow);
    const now = new Date().toISOString();
    const tombstones = changes.deletes.map(word => ({ word, deleted_at: now }));
    for (const batch of [rows, tombstones]) {
      for (let i = 0; i < batch.length; i += chunkSize) {
        await api('/rest/v1/words?on_conflict=user_id,word', { method: 'POST', token, body: batch.slice(i, i + chunkSize), prefer: 'resolution=merge-duplicates,return=minimal' });
      }
    }
  }

  async function pull(token, cursor) {
    // Küçük bir örtüşme, sunucuda farklı sırayla tamamlanan yazımları kaçırmamak için.
    const since = cursor ? new Date(Date.parse(cursor) - 60_000).toISOString() : '1970-01-01T00:00:00Z';
    const rows = [];
    for (let offset = 0; ; offset += pageSize) {
      const page = await api(`/rest/v1/words?select=word,context,url,title,translation,saved_at,updated_at,deleted_at&updated_at=gt.${encodeURIComponent(since)}&order=updated_at.asc,word.asc&limit=${pageSize}&offset=${offset}`, { token });
      rows.push(...page);
      if (page.length < pageSize) return rows;
    }
  }

  async function runSync() {
    const token = await accessToken();
    await writeState({ status: 'syncing', error: '' });
    const before = await store.get(['words', keys.base, keys.cursor]);
    const changes = core.pending(before.words || [], before[keys.base] || {});
    await push(token, changes);
    let base = core.afterPush(before[keys.base] || {}, changes);
    const rows = await pull(token, before[keys.cursor] || null);
    // Ağ beklenirken kullanıcı yeni kelime kaydetmiş olabilir: en güncel listeyle birleştir.
    const latest = (await store.get('words')).words || [];
    const merged = core.applyRemote(latest, base, rows);
    base = merged.base;
    const update = { [keys.base]: base };
    if (merged.cursor) update[keys.cursor] = merged.cursor;
    if (merged.changed) update.words = merged.words;
    await store.set(update);
    return writeState({ status: 'idle', error: '', lastSyncAt: new Date().toISOString(), pushed: changes.upserts.length + changes.deletes.length, pulled: rows.length });
  }

  let running = null; let again = false;
  async function sync() {
    if (!(await store.get(keys.session))[keys.session]) return null;
    if (running) { again = true; return running; }
    running = (async () => {
      try {
        let state;
        do { again = false; state = await runSync(); } while (again);
        return state;
      } catch (error) {
        if (error.code === 'signed_out') { await writeState({ status: 'error', error: message(error), email: '' }); return null; }
        await writeState({ status: 'error', error: message(error) });
        throw error;
      } finally { running = null; }
    })();
    return running;
  }

  // Yerel kelimeler değiştiğinde (kaydet / kaldır) kısa bir beklemeyle gönder.
  let timer = null;
  function schedule(delay = 1500) {
    clearTimeout(timer);
    timer = setTimeout(() => { sync().catch(() => {}); }, delay);
  }

  async function hasPendingChanges() {
    const data = await store.get(['words', keys.base, keys.session]);
    if (!data[keys.session]) return false;
    const changes = core.pending(data.words || [], data[keys.base] || {});
    return changes.upserts.length + changes.deletes.length > 0;
  }

  root.SozlookSync = { sendCode, verifyCode, signOut, sync, schedule, hasPendingChanges, message, config };
})(globalThis);
