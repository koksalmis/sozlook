# Sözlook

**Oku. Anla. Öğren.** İngilizce okurken seçtiğin kelimenin anlamına bak, dinle ve cümlesiyle kaydet.

Seçilen tasarım: beyaz/mavi sözlük kartı, Oxford–Cambridge sekmeleri, altta Dinle / Kaydet / Kaynağı aç araç çubuğu.

## Başlat

Node.js 22+ ile:

```sh
npm ci
npm run dev
```

Önizleme: http://127.0.0.1:4173. `reliable` düğmesine bas veya makalede bir kelime seçip mavi Sözlook düğmesini aç.

## Chrome eklentisini yükle

1. `npm run build` çalıştır.
2. Chrome’da `chrome://extensions` aç, **Geliştirici modu**nu etkinleştir.
3. **Paketlenmemiş öğe yükle** ile `dist/sozlook` klasörünü seç.
4. Mevcut web sayfalarını yenile. Bir İngilizce kelimeyi veya en fazla beş kelimelik ifadeyi seç.
5. Mavi sözlük düğmesine bas veya **Alt + Shift + S** kısayolunu kullan. Escape ile kapat.

Tarayıcının kendi sayfaları, Chrome Web Store ve dahili PDF görüntüleyicisi gibi korumalı yüzeylerde çalışmaz. İlk sürüm üst sayfadaki normal metin seçimini destekler; giriş alanlarına ve düzenlenebilir metinlere müdahale etmez.

## Bu sürümün kapsamı

- Gerçek sayfalarda seçim düğmesi, konuma uyarlanan Shadow DOM kartı, klavye kontrolü.
- Cihazın İngilizce sesiyle telaffuz; gerçek Oxford/Cambridge ses kaydı değildir.
- Kelime, Türkçe karşılık (varsa), sayfa adresi ve metin bağlamıyla yerel kayıt.
- Eklenti menüsünde kelime arama, kaldırma ve JSON dışa aktarma.
- Eklentisiz web önizlemesi; aynı kart kodunu kullanır.

**Oxford ve Cambridge API içerikleri henüz bağlı değildir.** Kartta bu durum açıkça yazılır. 12 kelime/ifade için özgün Sözlook örnek açıklamaları bulunur; Oxford/Cambridge’den alınmamıştır. Sekmeler ilgili gerçek sözlük bağlantısını değiştirir. Diğer kelimelerde uydurma anlam gösterilmez; İngilizce ve Türkçe sözlük sayfalarına yönlendirilir. Bağlama göre otomatik çeviri henüz yoktur.

## Veri ve izinler

`storage` izni kelimeleri `chrome.storage.local` içinde tutar. HTTP/HTTPS sayfalarına içerik betiği eklenir; sayfa metni veya seçimler sunucuya gönderilmez. Yalnızca Kaydet’e basıldığında seçilen kelime, kısa bağlam ve sayfa adresi saklanır. Kaynağı açma işlemi ilgili sözlük sitesini yeni sekmede açar. Web önizlemesinde kayıtlar localStorage’a yazılır. JSON dışa aktarımlarında kayıtlı cümleler ve sayfa adresleri de yer alır.

## Sonraki adım: gerçek sözlük verisi

Oxford’un [resmî API’si](https://developer.oxforddictionaries.com/) ve Cambridge’in [geliştirici programı](https://dictionary.cambridge.org/develop) üzerinden uygun erişim/lisans alınmalı. Erişim anahtarları eklentiye gömülmemeli; sunucu tarafındaki sağlayıcı katmanında tutulmalı. Türkçe karşılık sağlayıcısı ayrıca seçilmeli. Gerçek yanıtlar ile kaynak etiketleri bağlandıktan sonra örnek veri kaldırılabilir. Bu prototip mağazada yayımlanmamıştır.

## Kontroller

```sh
npm test
npm run test:e2e
npm run build
```

İlk Playwright kurulumunda `npx playwright install chromium` gerekebilir.
