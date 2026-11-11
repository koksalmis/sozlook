# Sözlook bulut eşitlemesi (Supabase)

Chrome eklentisindeki kayıtlı kelimeleri iOS uygulamasıyla eşitlemek için kullanılır. Eşitleme isteğe bağlıdır; giriş yapmayan kullanıcıda eklenti tamamen yerel çalışır.

## Proje

| | |
|---|---|
| Proje | `sozlook` · ref `fwiranhsgrzcnnnqkbba` |
| Bölge | eu-central-1 (Frankfurt) |
| API URL | `https://fwiranhsgrzcnnnqkbba.supabase.co` |
| Publishable key | `sb_publishable_wDtWdYXfM2EFP9i4hzNfkw_NbAn5clc` |

Publishable key istemcide (eklenti, iOS) bulunması için tasarlanmıştır; erişimi satır bazlı güvenlik (RLS) sınırlar. **Secret / service_role anahtarı hiçbir istemciye ve repoya konmaz.**

## Şema

`migrations/` altındaki SQL dosyaları sırayla uygulanır.

`public.words`: kullanıcı başına kelime başına tek satır (`unique (user_id, word)`).

| Sütun | Açıklama |
|---|---|
| `word` | Eklentinin `normalize()` ettiği kelime (küçük harf) |
| `context`, `url`, `title` | Kelimenin bulunduğu cümle ve sayfa |
| `translation` | Şimdilik boş; ileride kullanılacak |
| `saved_at` | Kullanıcının kaydettiği an (istemciden gelir) |
| `updated_at` | Son değişiklik, **her zaman sunucu saati** (tetikleyici yazar) |
| `deleted_at` | Dolu ise kelime silinmiştir; diğer cihazın da silmesi için satır tutulur |

RLS: `authenticated` rolü yalnızca `user_id = auth.uid()` olan satırları okuyup yazabilir. `anon` rolünün tabloya erişimi yoktur.

## Giriş: e-posta + 6 haneli kod

İstemci `signInWithOtp({ email })` ile kod ister, `verifyOtp({ email, token, type: 'email' })` ile oturum açar. Kodun e-postada görünmesi için panelde:

1. **Authentication → Emails → Magic link or OTP** şablonunu `{{ .Token }}` içerecek şekilde değiştir.
2. **Authentication → Sign In / Providers → Email**: "Email OTP Length" = 6.

Supabase, şablonların düzenlenebilmesi için özel SMTP ister. Şu an Gmail SMTP bağlı (gönderen: Sözlook, günde ~500 e-posta sınırı). Herkese açık sürümden önce kendi alan adıyla bir e-posta servisine (ör. Resend) geçilmesi planlanıyor; bu yalnızca panel ayarıdır, kod değişmez.

## Eşitleme kuralları (istemciler)

- **Gönder:** yerelde değişen kelimeler `upsert(..., { onConflict: 'user_id,word' })`. Silme = `deleted_at = now()` ile güncelleme.
- **Çek:** `updated_at > son_çekilen - 60 sn` olan satırlar (küçük örtüşme, saat/commit sırası farklarına karşı). Birleştirme idempotent.
- **Çakışma:** aynı kelime iki yerde değiştiyse son yazan kazanır.
- **İlk giriş:** yereldeki tüm kelimeler gönderilir, sonra buluttakiler çekilir; aynı kelime iki tarafta varsa yereldeki kayıt geçerli olur.
- **Bekleyen yerel değişiklik korunur:** eşitleme sürerken kaydedilen veya kaldırılan kelime, buluttan gelen eski bilgiyle ezilmez; bir sonraki eşitlemede gönderilir.

Eklentideki uygulama: `extension/sync-core.js` (saf birleştirme mantığı, `tests/sync-core.test.mjs`) ve `extension/sync.js` (arka plan çalışanında REST istekleri). Eşitleme; giriş sonrası, popup açılınca, kelime kaydedilip kaldırılınca (1,5 sn sonra) ve 15 dakikada bir çalışır.

## Türkçe karşılıklar: Wiktionary

`dictionary_tr` tablosu ve `wiktionary-tr` Edge Function'ı, kaydedilen kelimelerin Türkçe karşılıklarını [Wiktionary](https://en.wiktionary.org)'den (CC BY-SA 4.0) getirir. Oxford/Cambridge içeriği kopyalanmaz.

- **İstek:** `POST /functions/v1/wiktionary-tr` + `{ "words": [...] }` (en fazla 30). Kullanıcının oturum token'ı gerekir; yalnızca publishable/anon anahtarı 401 alır.
- **Yanıt:** `{ results: { kelime: { lemma, senses: [{ pos, gloss, translations }], url } }, source }`. Çekimli kelimede (`took`) kökün (`take`) uygun türdeki karşılıkları önce gelir.
- **Önbellek:** `dictionary_tr` tüm kullanıcılar için ortaktır; yalnızca fonksiyon (service role) yazar, 30 günden eski kayıtlar yenilenir. Ağ hatası önbelleğe yazılmaz.
- **Ayrıştırma:** `functions/wiktionary-tr/parse.ts` (saf modül, `tests/wiktionary-parse.test.mjs` ve `tests/fixtures-wiktionary/`).
- **Kapsam:** Wiktionary'de Türkçe karşılığı olmayan kelimeler (ör. `thorough`) boş döner; uygulama Cambridge İngilizce–Türkçe bağlantısını önerir.
- **Atıf:** Karşılıkların gösterildiği her yerde "Wiktionary · CC BY-SA 4.0" ve sayfa bağlantısı bulunur.

Dağıtım: `supabase functions deploy wiktionary-tr` (veya MCP `deploy_edge_function`, `index.ts` + `parse.ts`).
