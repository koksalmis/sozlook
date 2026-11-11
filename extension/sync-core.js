// Eşitlemenin saf mantığı: ağ ve depolama yok, Node testlerinden de kullanılır.
//
// base: son eşitlemede iki tarafın da bildiği hal ({ kelime: parmak izi }).
// Yereldeki bir kelimenin parmak izi base'den farklıysa (veya base'de yoksa) gönderilmeyi bekler;
// base'de olup yerelde olmayan kelime silinmeyi bekler. Bekleyen yerel değişiklik, buluttan gelen
// eski bilgiyle ezilmez; bir sonraki eşitlemede gönderilir.
(function (root) {
  const limits = { context: 1000, url: 2048, title: 500, translation: 200 };
  const text = (value, max) => (typeof value === 'string' ? value : '').slice(0, max);
  const fingerprint = w => JSON.stringify([w.context || '', w.url || '', w.title || '', w.translation || '', w.savedAt || '']);
  const time = value => { const t = Date.parse(value); return Number.isFinite(t) ? t : 0; };

  function pending(local, base) {
    const upserts = []; const deletes = []; const seen = new Set();
    for (const w of local) {
      if (!w || typeof w.word !== 'string' || !w.word || seen.has(w.word)) continue;
      seen.add(w.word);
      if (base[w.word] !== fingerprint(w)) upserts.push(w);
    }
    for (const word of Object.keys(base)) if (!seen.has(word)) deletes.push(word);
    return { upserts, deletes };
  }

  function isPending(localByWord, base, word) {
    const w = localByWord.get(word);
    if (w) return base[word] !== fingerprint(w);
    return word in base;
  }

  const toRow = w => ({
    word: w.word,
    context: text(w.context, limits.context),
    url: text(w.url, limits.url),
    title: text(w.title, limits.title),
    translation: text(w.translation, limits.translation),
    saved_at: w.savedAt && time(w.savedAt) ? w.savedAt : new Date().toISOString(),
    deleted_at: null
  });

  const fromRow = row => ({ word: row.word, translation: row.translation || '', context: row.context || '', url: row.url || '', title: row.title || '', savedAt: row.saved_at });

  // Gönderim başarılı olduktan sonra base'i günceller.
  function afterPush(base, { upserts, deletes }) {
    const next = { ...base };
    for (const w of upserts) next[w.word] = fingerprint(w);
    for (const word of deletes) delete next[word];
    return next;
  }

  // Buluttan gelen satırları en güncel yerel listeye uygular.
  function applyRemote(local, base, rows) {
    const byWord = new Map();
    for (const w of local) if (w && typeof w.word === 'string' && !byWord.has(w.word)) byWord.set(w.word, w);
    const nextBase = { ...base };
    const result = new Map(byWord);
    let cursor = null; let changed = false;
    for (const row of rows) {
      if (!cursor || time(row.updated_at) > time(cursor)) cursor = row.updated_at;
      if (isPending(byWord, nextBase, row.word)) continue;
      if (row.deleted_at) {
        if (result.delete(row.word)) changed = true;
        delete nextBase[row.word];
      } else {
        const w = fromRow(row);
        const before = result.get(row.word);
        if (!before || fingerprint(before) !== fingerprint(w)) changed = true;
        result.set(row.word, w);
        nextBase[row.word] = fingerprint(w);
      }
    }
    const words = [...result.values()].sort((a, b) => time(b.savedAt) - time(a.savedAt));
    return { words, base: nextBase, cursor, changed };
  }

  root.SozlookSyncCore = { fingerprint, pending, toRow, fromRow, afterPush, applyRemote };
})(globalThis);
