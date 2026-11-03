# Chrome Web Store başvuru metinleri

Developer Dashboard → **Add new item** → `dist/sozlook-<sürüm>.zip` yükle. Aşağıdaki metinleri ilgili alanlara kopyala.

Paket ve görseller:

```sh
npm run package       # dist/sozlook-0.2.4.zip
npm run screenshots   # docs/store/images/*.png
```

---

## 1. Store listing

**Ad (manifest'ten gelir):** Sözlook

**Kısa açıklama (manifest'ten gelir, en fazla 132 karakter):**
İngilizce kelimeleri seç, anlamlarına bak ve cümleleriyle kaydet.

**Kategori:** Education (Eğitim)

**Dil:** Türkçe

**Ayrıntılı açıklama:**

```
Sözlook ile İngilizce okurken takıldığın kelimenin anlamını sayfadan ayrılmadan öğren.

Bir kelimeyi ya da en fazla beş kelimelik bir ifadeyi seç. Sözlook kartı hemen yanında açılır:

• İngilizce açıklama ve örnek cümle (Oxford ve Cambridge sekmeleri)
• Türkçe karşılık
• Telaffuz yazımı ve cihazının İngilizce sesiyle dinleme
• Kelime türü
• Sözlükteki tam sayfaya tek tıkla geçiş

KELİMELERİNİ CÜMLESİYLE KAYDET
Kaydet'e bastığında kelime, bulduğun cümle ve sayfa adresiyle birlikte saklanır. Araç çubuğundaki Sözlook simgesinden kelimelerini görebilir, arayabilir, kaldırabilir veya JSON olarak dışa aktarabilirsin.

SANA GÖRE ÇALIŞIR
Kartın kelime seçince otomatik mi, yoksa küçük bir düğmeye tıklayınca mı açılacağını Seçenekler'den belirleyebilirsin. Alt + Shift + S ile kartı istediğin an aç, Esc ile kapat.

GİZLİLİK
• Sözlook'un sunucusu yoktur. Analiz veya takip aracı kullanılmaz.
• Sözlüğe yalnızca seçtiğin kelime gönderilir. Okuduğun sayfanın adresi ya da metni gönderilmez.
• Kayıtların yalnızca kendi tarayıcında saklanır.

NOTLAR
• İlk sözlük anlamı gösterilir. Diğer anlamlar için "Kaynağı aç" bağlantısını kullanabilirsin.
• Sözlük siteleri erişimi kısıtlarsa veya sayfa yapılarını değiştirirse anlamlar geçici olarak gösterilemeyebilir.
• Chrome'un kendi sayfalarında, Chrome Web Store'da ve dahili PDF görüntüleyicide çalışmaz.

Sözlook bağımsız bir projedir. Oxford University Press veya Cambridge University Press & Assessment ile bağlantılı değildir ve bu kuruluşlar tarafından onaylanmamıştır. Sözlük içerikleri ilgili yayıncılara aittir.

Oku. Anla. Öğren.
```

**Görseller (`docs/store/images/`):**

| Alan | Dosya |
|---|---|
| Store icon (128×128) | `extension/icons/icon128.png` |
| Screenshot 1 | `01-kelime-karti.png` |
| Screenshot 2 | `02-cambridge-kaydet.png` |
| Screenshot 3 | `03-kelimelerim.png` |
| Screenshot 4 | `04-secenekler.png` |
| Small promo tile (440×280) | `promo-kucuk-440x280.png` |
| Marquee promo tile (1400×560, isteğe bağlı) | `promo-buyuk-1400x560.png` |

Ekran görüntülerindeki sözlük açıklaması, örnek amaçlı yazılmış özgün bir metindir (sözlüklerden kopyalanmadı).

---

## 2. Privacy practices

**Single purpose description:**

```
Sözlook, kullanıcının web sayfalarında seçtiği İngilizce kelimenin sözlük anlamını ve Türkçe karşılığını sayfanın üzerinde bir kartta gösterir ve kullanıcının isterse bu kelimeyi geçtiği cümleyle birlikte yerel olarak kaydetmesini sağlar.
```

**Permission justification — storage:**

```
Kullanıcının kaydettiği kelimeleri (kelime, geçtiği kısa metin, sayfa adresi/başlığı, tarih) ve sözlük kartının açılma tercihini chrome.storage.local içinde cihazda saklamak için kullanılır. Veriler senkronize edilmez ve hiçbir sunucuya gönderilmez.
```

**Host permission justification:**

```
https://www.oxfordlearnersdictionaries.com/* ve https://dictionary.cambridge.org/*: Kullanıcı bir kelime seçtiğinde, arka plan çalışanı yalnızca o kelimenin sözlük sayfasını bu iki siteden alır ve ilk açıklamayı, örnek cümleyi ve Türkçe karşılığı kartta gösterir. Çerez gönderilmez, arka planda tarama veya önceden yükleme yapılmaz.

İçerik betiği (http://*/* ve https://*/*): Eklentinin tek amacı, kullanıcının okuduğu herhangi bir İngilizce sayfada kelime seçip anlamına bakabilmesidir. Hangi sitede okuma yapılacağı önceden bilinemediği için betik tüm sayfalarda çalışır. Betik sayfa içeriğini toplamaz veya göndermez; yalnızca kullanıcının metin seçimine tepki verir ve sözlük kartını gölge DOM içinde gösterir.
```

**Are you using remote code?** → **No, I am not using remote code.**

```
Tüm JavaScript dosyaları paketin içindedir. Sözlük sitelerinden alınan HTML çalıştırılmaz; etkinleşmeyen bir <template> içinde ayrıştırılıp yalnızca metin alanları okunur.
```

**Data usage — hangi verileri topluyorsun?**

Google'ın tanımında "collect", verinin cihazdan çıkması ya da eklenti tarafından işlenmesi anlamına gelir. Seçilen kelime sözlük sitelerine gönderildiği için şunu işaretle:

- [x] **Website content**: kullanıcının seçtiği kelime/ifade, anlamı alınmak üzere Oxford ve Cambridge'e gönderilir.

Diğer kategoriler işaretlenmez. Kayıtlı sayfa adresleri yalnızca cihazda kalır ve hiçbir yere iletilmez. İnceleme sırasında "web history" sorulursa açıklamada bunu belirt.

**Certifications (üçünü de işaretle):**

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** `docs/privacy.md` dosyasının herkese açık adresi.

---

## 3. Distribution

- **Visibility:** Public. İstersen önce **Unlisted** ile yayımlayıp bağlantıyla test edebilirsin.
- **Regions:** All regions.
- **Payments:** Free.

## Yeni sürüm yayımlarken

1. `extension/manifest.json` ve `package.json` içindeki `version` değerini artır (iki dosyada aynı olmalı).
2. `npm test && npm run test:e2e && npm run package`
3. Dashboard → Package → **Upload new package** → Submit for review.
