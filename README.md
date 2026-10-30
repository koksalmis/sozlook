# Sözlook

**Oku. Anla. Öğren.** İngilizce okurken seçtiğin kelimenin Oxford ve Cambridge anlamlarına bak, Türkçesini gör, dinle ve cümlesiyle kaydet.

## 0.2.4 — Kelime işareti logosu

Sözlük içeriği artık örnek veriden gelmez. Kartı açtığında Oxford’un kelime sayfası ve Cambridge’in İngilizce–Türkçe sayfası istenir. Cambridge sekmesine geçince Cambridge’in İngilizce sayfası da okunur. Kartta ilk açıklama ve ona ait ilk örnek cümle, kelime türü, telaffuz yazımı ve kaynak bağlantısı gösterilir. Türkçe karşılık Cambridge Learner’s Dictionary sayfasından gelir.

Bu deneysel bir kişisel geliştirme sürümüdür. Erişim engellenebilir ve sayfa yapısı değişebilir; kesintisiz çalışma garantisi yoktur. Erişim engelleri, CAPTCHA veya ücretli içerik aşılmaz. Başarısız istek otomatik tekrarlanmaz; **Kaynağı aç** bağlantısı sunulur. Kişisel denemenin çalışması, kaynak içeriğini herkese açık bir üründe yeniden yayımlama hakkı anlamına gelmez. Mağaza yayını yapılmamıştır.

## Web önizlemesi

Node.js 22+:

```sh
npm ci
npm run dev
```

http://127.0.0.1:4173 adresini aç. **reliable** düğmesine bas veya makalede bir kelime seç; sözlük kartı otomatik açılır.

Web önizlemesinde tarayıcılar arası erişim kısıtları nedeniyle sayfaları yerel Node sunucusu alır. Sunucu yalnızca bilgisayarın loopback adresini dinler, sadece iki sabit sözlük alanına istek gönderir. Kurulu eklenti bu sunucuya ihtiyaç duymaz.

## Chrome eklentisini yükle / güncelle

1. `npm run build` çalıştır.
2. Chrome’da `chrome://extensions` aç, **Geliştirici modu**nu etkinleştir.
3. **Paketlenmemiş öğe yükle** ile `dist/sozlook` klasörünü seç. Daha önce yüklediysen eklentinin **Yenile** düğmesine bas.
4. Yeni sürüm için Oxford ve Cambridge alanlarına erişim izinlerini kabul et; açık web sayfalarını yenile.
5. Bir İngilizce kelimeyi veya en fazla beş kelimelik ifadeyi seç. Kart varsayılan olarak otomatik açılır. Escape ile kapat.
6. Chrome araç çubuğundaki **Sözlook → Seçenekler** sayfasında **Sözlük kartı ne zaman açılsın?** bölümünden **Düğmeye tıklayınca aç** seçeneğine geçebilirsin. Seçenekler sayfasına eklenti simgesinin sağ tık **Seçenekler** menüsünden de ulaşabilirsin. Kelimeler penceresi 600 × 600 piksel boyutundadır; uzun listeler kendi içinde kaydırılır. Tercihin cihazda saklanır ve açık sayfalara da uygulanır. **Alt + Shift + S** iki modda da kartı açar.

Tarayıcının kendi sayfaları, Chrome Web Store ve dahili PDF görüntüleyicisi gibi korumalı yüzeylerde çalışmaz. Üst sayfadaki normal metin seçimini destekler; giriş alanlarına ve düzenlenebilir metinlere müdahale etmez.

## Nasıl çalışıyor?

- `sources.js`: izin verilen sözlük adreslerini üretir; 12 saniyelik süre ve 2 MB yanıt sınırıyla HTML alır. Yönlendirmeler aynı alanla sınırlıdır.
- `background.js`: eklentinin arka plan çalışanı HTTP isteklerini yapar. Anahtar ve haricî sunucu yoktur.
- `parser.js`: HTML’yi etkinleşmeyen bir template içinde ayrıştırır; yalnızca metin alanlarını çıkarır. Kaynak sayfanın scriptleri, görselleri veya HTML’si okuduğun sayfaya eklenmez.
- `lookup.js` ve `content.js`: yükleniyor / sonuç / hata durumlarını, kaynak sekmelerini ve eski isteklerin yeni kelimeyi bozmamasını yönetir.
- Seslendirme cihazın İngilizce sesiyle yapılır; sözlük ses kaydı değildir.

İlk sözlük anlamı gösterilir; cümleye göre otomatik anlam seçimi yoktur. Çekimli kelimeler ve deyimler, sözlüklerin kelime sayfası/yönlendirme yapısına göre bulunamayabilir. Diğer anlamlar için kaynağı aç.

## Kayıtlar ve veri

- Sözlük sayfalarına yalnızca seçilen kelime/ifade gönderilir; okuduğun sayfanın cümlesi ve adresi gönderilmez.
- Sözlük isteklerinde oturum çerezleri gönderilmez. Normal ağ erişiminde IP adresin ilgili sözlük tarafından görülebilir.
- Toplu indirme, arka planda tarama ve kalıcı sözlük önbelleği yoktur. Çıkarılan açıklamalar yalnızca kartın geçici belleğinde tutulur.
- **Kaydet** kelimeyi, senin okuduğun sayfadaki kısa bağlamı, sayfa adresini ve kayıt tarihini yerel olarak tutar. Çekilen sözlük açıklamaları ve Türkçe karşılık kalıcı kayda/dışa aktarıma eklenmez.
- Eklentide `chrome.storage.local`, web önizlemesinde `localStorage` kullanılır. Kelimeler menüsünde arama, kaldırma ve JSON dışa aktarma vardır. Önceki sürümden kalan kayıtlar değiştirilmez.

## Kontroller

```sh
npm test
npm run test:e2e
npm run build
```

Normal tarayıcı testleri özgün, yapay test HTML’siyle çalışır; üçüncü taraf sitelere bağımlı değildir. İstek engeli, eski yanıtlar, mobil yerleşim, klavye kontrolü, gerçek eklenti mesajlaşması, kayıt kalıcılığı ve etkinleşmeyen HTML ayrıştırma kontrol edilir.

Canlı sözlük denemesi ayrı olarak çalıştırılır:

```sh
npm run test:e2e -- --config=playwright.live.config.js
```

30 Ekim 2026 denemesinde **reliable**, **curious**, **improve** için Oxford İngilizce, Cambridge İngilizce ve Cambridge İngilizce–Türkçe sayfalarının 9/9’u alınıp ayrıştırıldı. Yüklü eklentide de iki İngilizce kaynak ve Türkçe karşılık alındı. Bu anlık erişim sonucudur; gelecekteki erişimi garanti etmez.

İlk Playwright kurulumunda `npx playwright install chromium` gerekebilir.

## Logo

Seçilen yön: **04 / Kelime işareti**. Mavi kitap ayracı içinde beyaz açılış alıntıları ve lacivert serif sözlook yazısı. Simge, açılır pencere, seçenekler sayfası, sözlük kartı ve web önizlemesinde kullanılır.

Vektör kaynak: `extension/brand/mark.svg`. İlk tasarım referansı: `docs/brand/04-kelime-isareti-reference.png`. Arayüz yazısı sistemdeki Georgia serif yazı tipiyle oluşturulur; konsept görselindeki özel harf çiziminin birebir font dosyası değildir.

`npm run icons` vektör kaynaktan şeffaf 16, 32, 48 ve 128 piksel PNG ikonları ve içerik betiği için `brand/mark.js` üretir. İkonlar repoya dahildir; normal kurulumda yeniden üretmek gerekmez.
