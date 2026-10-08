# Bütçe Defteri

Aylık gelir/gider takibi — iOS ana ekranına eklenebilen bir PWA (Progressive Web
App). Kurulum, App Store yok; Safari'de aç, "Ana Ekrana Ekle" de, tam ekran
native gibi açılır.

```bash
npm install
npm run dev      # geliştirme
npm run build    # dist/ üretir — PWA manifest + service worker dahil
npm run preview  # üretim çıktısını yerelde dener
npm test         # vitest birim testlerini çalıştırır
```

## ✨ Özellikler

1. **Aylık Gelir/Gider Takibi & Net Bütçe:** Tek tıkla harcama veya gelir ekleme, silme ve düzenleme.
2. **💳 Taksitli Harcama & Borç Takipçisi:** Taksitle alınan ürünleri (ör. 60.000 ₺ / 6 taksit) kaydetme, her ayın bütçesine ilgili taksiti otomatik paylaştırma ve kalan borç takibi.
3. **🎮 Bütçe Simülatörü ("Ne Olursa?" Senaryoları):** İnteraktif kaydırıcılarla harcama kısma ve gelir artışı projeksiyonları yapma.
4. **⚡ Hızlı Komut Paleti (`Cmd + K` / `Ctrl + K`):** Klavye kısayolu veya arama butonu ile anında işlem arama, kategori filtreleme ve hızlı aksiyon menüsü.
5. **💱 Çoklu Para Birimi Desteği (USD, EUR, GBP, Altın):** Farklı döviz cinsinden işlem ekleme ve anlık TL çevrimi.
6. **📱 Fiş / Fatura Fotoğrafı Notu:** Cihaz kamerasından veya galeriden fiş görseli ekleme (yerel sıkıştırılmış önizleme).
7. **📄 Şık PDF / Yazdırılabilir Rapor:** Tek tıkla temiz, baskıya ve PDF kaydetmeye hazır aylık finans özeti (`@media print`).
8. **📤 Web Paylaşımı (Web Share API):** Aylık gelir/gider ve tasarruf özetini WhatsApp veya mesaj ile tek tıkla paylaşma.
9. **⚡ Akıllı Tek Satır Hızlı Giriş (Smart Quick Entry):** Doğal dil ile tek satırda işlem kaydetme (örn. `"market 350"`, `"$100 freelance"`, `"maaş 65000"`).
10. **🎯 Hedef Birikimler (Kumbara):** Tatil, acil durum fonu veya teknoloji için birikim hedefleri oluşturma, para ekleme/çekme ve ilerleme takibi.
11. **📅 Aylık Harcama Isı Haritası (Calendar Heatmap):** Ayın günlerine göre harcama yoğunluğu görsel takvimi ve güne tıklayarak filtreleme.
12. **📊 Yıllık Özet & Karşılaştırma Raporu (Annual Overview):** 12 ayın gelir/gider/tasarruf kümülatif tablosu ve yılın en çok harcanan ilk 5 kategorisi.
13. **📥 CSV / Excel İçe Aktarma (Import Transactions):** Banka veya harici tablolardan `.csv` formatında toplu işlem yükleme. Bu uygulamanın dışa aktardığı dosyalar başlık ile okunur; kimliği zaten kayıtlı işlemler tekrar eklenmez.
14. **🔒 PIN Kodu / Kilit Ekranı:** 4 haneli PIN ile uygulama açılışını kilitleme (PBKDF2 ile tuzlu hash; 5 hatalı denemede geçici kilit). Bu bir gizlilik kilididir: veriler şifrelenmez, cihaza erişimi olan biri depolamayı okuyabilir.
15. **👁️ Gizlilik / Bakiye Gizleme Modu:** Toplu taşıma veya kalabalık yerlerde tek tıkla tüm parasal tutarları `₺••••` olarak maskeleme (`localStorage` kalıcı).
16. **🧠 50/30/20 Bütçe Kuralı & Akıllı İçgörüler:** Harcamaları otomatik olarak İhtiyaçlar (%50), İstekler (%30) ve Tasarruf (%20) olarak sınıflandırıp görsel bar ve akıllı finansal tavsiyeler sunma.
17. **🎨 Özel Kategori Yönetimi:** Kullanıcının dilediği ikon/emoji ve 50/30/20 sınıfı ile özel gelir/gider kategorileri tanımlayabilmesi.
18. **⚡ Hızlı Tutar Çipleri:** İşlem ekleme ve düzenleme formlarında `+50`, `+100`, `+250`, `+500`, `+1.000` hızlı artırma butonları.
19. **🌓 Manuel Tema Seçici:** Koyu, Açık veya Sistem temasını arayüzden tek tıkla değiştirebilme.
20. **İşlem ve Tekrarlayan Düzenleme (Modal Edit):** Hatalı girilen tutarları, kategorileri, tarihleri veya artan kira/abonelik tutarlarını modal üzerinden doğrudan güncelleme.
21. **Anlık Arama & Filtreleme:** Ayın işlemlerinde açıklamaya veya kategoriye göre anında filtreleme, Gider/Gelir/Tümü filtre sekmeleri.
22. **Tasarruf / Birikim Oranı (%):** Gelirin yüzde kaçının tasarruf edildiğini gösteren dinamik istatistik kartı.
23. **Excel / CSV Dışa Aktarma:** UTF-8 BOM destekli, Excel ve Numbers ile tam uyumlu Türkçe karakterli `.csv` rapor indirme.
24. **JSON Yedekleme ve Geri Yükleme:** Cihazlar arası veya veri güvenliği için tam durum (state) ve fiş fotoğrafları dahil yedekleme/yükleme. Geri yükleme mevcut verinin yerine geçer ve önce onay ister.
25. **Bütçe Limitleri & Uyarı Renkleri:** Kategori bazında limit koyma, %70 (uyarı), %90 (ciddi), %100 (kritik) ilerleme çubukları.
26. **Tekrarlayan İşlemler (Idempotent):** Kira, maaş, abonelikleri ay bazında otomatik işleme ve dilediğinde aktif/pasif yapma.
27. **Kategori Dağılımı & Trend Grafiği:** Bağımlılıksız SVG grafikler ile kategori kırılımı ve son 6 ayın gelir/gider çizgisi.
28. **Akıllı Form Tarihi:** Geçmiş/gelecek ay incelenirken formun o aya göre akıllı açılması.
29. **🛡️ IndexedDB Hibrit Depolama:** Fiş ve fatura fotoğraflarını `localStorage` kotasını (5MB) doldurmamak için arka planda `IndexedDB`'de saklama ve sıfır kayıplı otomatik migrasyon.
30. **👆 Biyometrik Kilit (Face ID / Touch ID / WebAuthn):** PIN kilidine ek olarak cihaz destekliyorsa tek dokunuşla parmak izi veya yüz tanıma ile açma. Sunucu olmadığı için doğrulama cihaz içi bir kısayoldur; assertion imzası kriptografik olarak doğrulanmaz.
31. **⚡ Canlı Kurlar API:** Ayarlar ekranında tek dokunuşla canlı USD, EUR, GBP kurlarını çekme ve anlık TL hesaplama.
32. **📅 Nakit Akışı & Yaklaşan Ödemeler Takvimi:** Ay sonuna kadar bekleyen fatura, kira ve taksitlerin gün bazlı takibi ve tahmini ay sonu kasa projeksiyonu.
33. **🔄 Esnek Tekrarlayan İşlemler (Haftalık / Aylık / Yıllık):** MTV, kasko ve yıllık üyelikler ile haftalık harçlık ve giderler için frekans seçimi.
34. **💳 Taksitlerde Son Ödeme / Hesap Kesim Günü:** Taksitli alışverişlerde her ayın tam ödeme gününü belirleme.
35. **📊 Kategori Grafiği Drill-Down (İnteraktif Filtre):** Kategori çubuk grafiğinde bir kategoriye tıklandığında anında o kategoriye filtreleme ve çip ile tek tıkla geri alma.
36. **💡 Akıllı Finansal İçgörüler (Smart Insights):** Tasarruf oranı, bütçe tüketim hızı ve kategori harcama artışlarını tespit edip dinamik tavsiyeler sunan asistan kartları.
37. **🗓️ Genişletilmiş Tarih Aralığı Filtresi:** "Bu Ay" dışında "Son 30 Gün", "Son 3 Ay" ve "Bu Yıl" filtre seçenekleri.
38. **🔔 Fatura & Taksit Bildirimleri (Web Notifications API):** Bugün veya yarın vadesi gelen ödemeler için yerel tarayıcı bildirimleri. Kontrol uygulama açıldığında yapılır; arka planda zamanlanmış bildirim yoktur. Bildirim metni tutarları içerir ve kilit ekranında görünebilir.

## Neden PWA (native değil)

Bu makinede Xcode kurulu değil ve SDK'yı kuracak disk alanı da yok
(`xcode-select -p` → yalnızca Command Line Tools, `df -h /` → 6.5 GB boş,
Xcode + iOS SDK ~35 GB). Native SwiftUI bugün ne derlenebilir ne test
edilebilir. PWA, aynı işi — özellikle "her harcamayı anında kaydetme"
alışkanlığını — kurulum gerektirmeden bugün çözer. Disk açıldığında,
buradaki veri modeli (`src/state.js`, `src/compute.js`) SwiftData'ya
doğrudan taşınacak şekilde tasarlandı: DOM'dan bağımsız, saf JS.

## iPhone'a kurulum

1. `npm run build`, çıktıyı bir sunucuya koy (Vercel/Netlify/GitHub Pages —
   herhangi bir statik host) **veya** `npm run preview` ile yerel ağda aç.
2. iPhone'da Safari'de aç.
3. Paylaş menüsü → **Ana Ekrana Ekle**.
4. Artık durum çubuğu şeffaf, tam ekran, ikonlu bir "uygulama" gibi açılır.

## Tasarım kararları

1. **Kategori kimlikleri kalıcıdır.** `src/data/categories.js`'teki her
   kategori id'si sabit. Bir kategoriyi kaldırmak istersen `active: false`
   yap, silme — geçmiş işlemler o id'ye referans veriyor.

2. **Tekrarlayan işlemler idempotent işlenir.** Kira/maaş gibi kalemleri bir
   kez tanımlarsın; her ay açıldığında (`materializeRecurring`) o aya
   otomatik işlenir, ama aynı ay ikinci kez tetiklense de tekrar eklenmez —
   `state.materialized["YYYY-MM"]` hangi tekrarlayanların o ay işlendiğini
   tutar.

3. **"Diğer" katlaması veri kaybetmez.** Kategori grafiğinde 6'dan fazla
   kategori varsa kalanı tek bir "Diğer" dilimine katlanır (bkz.
   `src/compute.js:categoryBreakdown`) — ama toplam işlem listesinde ve
   dışa aktarılan yedekte tüm kategoriler ayrı ayrı durur. Grafik sadeleşir,
   veri sadeleşmez.

4. **3 aylık ortalama gider, "Future-Proof Canvas" planının girdisidir.**
   Üst bilgideki "Son 3 ayın ortalama gideri" satırı, `../gelecek tahmini`
   projesindeki Faz 1 · "aylık gider tabanını ölç" maddesinin doğrudan
   çıktısı — acil durum fonu hedefi buradan hesaplanır.

## Veri ve yedekleme

`localStorage["butceDefteri.v1"]` — şema versiyonlu (bkz. `src/state.js:normalize`).
Yüklemede geçersiz bir kayıt atlanırsa veya dosya bozuksa ham içerik
`localStorage["butceDefteri.v1.rawBackup"]` anahtarında saklanır; bir sonraki
kayıt onu silmez. **localStorage kalıcı değildir**: Safari verisi temizlenince
veya cihaz değişince gider. **Yedek al (JSON)** düğmesi bu yüzden çekirdek
özellik, süs değil; fiş fotoğrafları (IndexedDB) dahil edilir.

```js
{
  schema: 1,
  transactions: [{ id, type, amount, currency, originalAmount, categoryId, date, note,
                   recurringId, installmentId, hasReceipt, createdAt }],
  recurring: [{ id, name, type, amount, categoryId, day, frequency, month, active, note }],
  installments: [{ id, name, totalAmount, monthlyAmount, totalInstallments, startPeriod, dueDay, categoryId, active }],
  goals: [{ id, name, targetAmount, currentAmount, targetDate, icon }],
  customCategories: [{ id, type, name, icon, bucket, active }],
  currencies: { USD, EUR, GBP, GLD },
  currencyLastUpdated: "ISO-8601",
  budgets: { [categoryId]: monthlyLimit },
  materialized: { "YYYY-MM": [recurringId, ...] },
  receipts: { [transactionId]: "data:image/jpeg;base64,..." }, // yalnızca yedek dosyasında
}
```

## Dosya düzeni

| Dosya | İş |
|---|---|
| `src/data/categories.js` | Kategori tanımları — tek kaynak, kalıcı id'ler |
| `src/palette.js` | Sabit renk sırası (dataviz iskeletinin referans paleti) |
| `src/state.js` | Şema versiyonlu depolama, doğrulama, tekrarlayan/taksit materyalizasyonu |
| `src/compute.js` | Aylık toplam, kategori kırılımı, trend, bütçe durumu, taksit ve tasarruf hesapları — DOM'a bakmaz |
| `src/charts.js` | Bağımlılıksız SVG grafikler (sıralı çubuk, çizgi) + hover/tooltip |
| `src/render.js` | Veriden DOM üretimi |
| `src/export.js` | Excel / Numbers uyumlu CSV dışa aktarma ve başlık tabanlı içe aktarma (kimlikli) |
| `src/notifications.js` | Yerel ödeme hatırlatıcıları (bugün/yarın, yıllık/haftalık/taksit kuralları) |
| `src/pin.js` | PIN: PBKDF2 ile tuzlu hash, deneme sınırı ve geçici kilit |
| `src/biometrics.js` | WebAuthn platform doğrulaması (cihaz içi kısayol; sunucu olmadığı için imza doğrulanmaz) |
| `src/idb.js` | Fiş görsellerinin IndexedDB deposu, migrasyon ve yetim kayıt temizliği |
| `src/currency.js` | Canlı kur çekme (open.er-api.com) |
| `src/main.js` | Olay bağlama, ay gezinme, arama/filtre, düzenleme modalleri, yedek al/yükle |
| `tests/` | Vitest birim testleri: `state`, `compute`, `export`, `pin`, `notifications`, `idb` |
| `vite.config.js` | PWA manifest + service worker (`vite-plugin-pwa`) |

## Grafik tasarımı

`src/charts.js` bağımlılıksız SVG üretir; renk ataması dataviz iskeletinin
referans paletine uyar: kategori çubuğu tek hue (Gider=turuncu, Gelir=mavi —
büyüklük sıralaması, kimlik değil), trend çizgisinde iki sabit seri rengi
(Gelir=mavi slot 1, Gider=turuncu slot 2 — asla döngüsel), bütçe ölçerinde
durum renkleri (`good/warning/serious/critical`) her zaman ikon + etiketle
birlikte. Çubuk uçları 4px yuvarlak, çizgiler 2px, tüm hover katmanları
klavye odağıyla da çalışır.

## Erişilebilirlik notları

- Tüm ölçerler `role="progressbar"` + `aria-valuenow` taşır.
- Segmented kontroller `role="radiogroup"` + `aria-checked`.
- Grafik satırları `tabindex="0"` ile klavyeden erişilebilir; odaklanınca
  aynı tooltip gösterilir.
- Modaller standart `<dialog>` ve `aria-label` etiketleri ile erişilebilirdir.
- `prefers-reduced-motion` geçişleri kapatır.
- Açık/koyu tema OS tercihine göre otomatik (`prefers-color-scheme`).

## Kapsam dışı

Sunucu yok, hesap yok, cihazlar arası senkron yok. Tek cihaz, açık yedek.
Bu araç kişisel takip amaçlıdır; muhasebe veya vergi beyanı yerine geçmez.

---

## 📝 Değişiklik Günlüğü (Changelog)

### Unreleased (denetim düzeltmeleri)
- 📥 **CSV içe aktarma:** Dışa aktarılan dosya başlıkla okunur; kategori ve not doğru geri gelir, kimliği zaten kayıtlı işlemler tekrar eklenmez.
- 🔔 **Bildirimler:** Yıllık ve haftalık kalemler yalnızca doğru günlerde bildirilir; bitmiş veya başlamamış taksitler bildirilmez; tarih kontrolü yerel saate göre yapılır; ay sonu "yarın" hesabı düzeltildi.
- 💳 **Taksit:** Son taksit kuruş farkını taşır (ör. 1.000 ₺ / 3 → 333,33 + 333,34). Kalan borç buna göre hesaplanır.
- 🔁 **Yıllık tekrarlayan:** Ödeme ayı seçilebilir (önceden her zaman Ocak'a düşüyordu). Haftalık kalemde gün 1–7 arasıdır; her 7 günde bir işlenir (eski kayıtlar aynı şekilde devam eder).
- 🔐 **PIN:** PBKDF2 ile tuzlu hash (eski PIN'ler ilk doğru girişte yeni formata geçer); 5 hatalı denemede geçici kilit. Biyometrik kayıt, credential ID'yi saklar ve yalnızca o kimlikle açar.
- 💾 **Yedek:** Fiş fotoğrafları dahil edilir. Geri yükleme onay ister, doğrulama bitmeden mevcut veriye dokunmaz ve yetim fiş görsellerini temizler. Fiş görseli kaydedilemezse görsel kaybolmaz, uyarı verilir. "Sıfırla" fiş görsellerini de siler. Geri yüklemeden önceki durum `butceDefteri.v1.beforeImport` anahtarında bir kez saklanır (arayüzde geri alma düğmesi yok).
- 🗃️ **Veri koruma:** Bozuk veya atlanan kayıtların ham hali `butceDefteri.v1.rawBackup` içinde saklanır; mevcut bir ham kopya üzerine yazılmaz. Kopya varsa Araçlar sekmesinde "Ham Kopyayı İndir (Kurtarma)" düğmesi görünür; indirilen dosya JSON Yükle ile geri yüklenebilir. Kur zaman damgası yeniden açılışta korunur.
- 🔔 **Gizlilik ve bildirim:** Gizlilik modu açıksa bildirim gövdesinde ad ve tutar yazılmaz (kilit ekranında görünebileceği için).
- 🛡️ **Silme:** İşlem, taksit, hedef ve tekrarlayan silmede onay istenir. Kullanımda olan özel kategori silinmez.
- 🧪 **CI:** Deploy öncesi `npm test` çalışır.

### v0.7.0 (2026-09-06)
- 🛡️ **IndexedDB Hibrit Depolama & Fiş Güvenliği:** Fiş görselleri `localStorage` kotasını (5MB) doldurmasın diye arka planda `IndexedDB`'ye taşındı; mevcut fotoğraflar için sıfır veri kayıplı otomatik migrasyon kuruldu.
- 👆 **Biyometrik Kilit (Face ID / Touch ID / WebAuthn):** 4 haneli PIN koduna ek olarak cihazın biyometrik doğrulama donanımıyla tek dokunuşla kilit açma sağlandı.
- ⚡ **Canlı Kurlar API Entegrasyonu:** open.er-api.com üzerinden döviz kurlarını tek tıkla çekip USD, EUR ve GBP tutarlarını güncelleyen sistem eklendi.
- 📅 **Aylık Nakit Akışı & Yaklaşan Ödemeler:** Ay sonuna kadar bekleyen fatura, taksit ve sabit giderlerin gün sıralı takibi ve tahmini ay sonu bakiye projeksiyonu.
- 🔄 **Haftalık / Aylık / Yıllık Tekrarlayan İşlemler:** MTV, kasko ve yıllık üyelikler ile haftalık harçlık ve giderler için frekans seçimi desteği.
- 💳 **Taksitlerde Son Ödeme / Hesap Kesim Günü:** Kredi kartı taksitleri için her ayın kesim günü seçeneği.
- 📊 **İnteraktif Grafik Drill-Down:** Kategori çubuk grafiğine tıklandığında anında o kategoriye filtreleme ve çip ile tek tıkla geri alma.
- 💡 **Akıllı Finansal İçgörüler (Smart Insights):** Tasarruf başarısı, bütçe tüketim hızı ve kategori harcama artışlarını bildiren dinamik tavsiye kartları.
- 🗓️ **Genişletilmiş Tarih Aralığı Filtresi:** "Bu Ay" dışında "Son 30 Gün", "Son 3 Ay" ve "Bu Yıl" filtre seçenekleri.
- 🔔 **Fatura & Taksit Bildirimleri:** Vadesi gelen ödemeler için yerel tarayıcı bildirimleri (Web Notifications API).
- 📲 **PWA Web Share Target:** Cihazdan veya harici uygulamalardan Bütçe Defteri'ne hızlı işlem paylaşım yakalayıcısı.
- 🧪 **34 Kapsamlı Birim Testi:** %100 doğrulukla tüm yeni modeller ve işlevler test edildi.

### v0.6.0 (2026-08-14)
- 🗂️ **Modern Sekmeli Arayüz Mimarisi (Tab Navigation):** Monolitik ve uzun sayfa akışı 4 net, odaklı ve modern sekmeye bölündü (`📊 İşlemler`, `📈 Analiz & Grafikler`, `🎯 Planlama & Birikim`, `⚙️ Araçlar & Ayarlar`).
- 💎 **Sadeleştirilmiş Üst Çubuk (Uncluttered Header):** 10 adet sıkışık buton yerine en kritik eylemler (Komut Paleti, Gizlilik, Tema, Paylaşım, Yazdır) üstte tutuldu; özel araçlar sekme içine şık kartlar olarak taşındı.
- ⚡ **Komut Paleti ile Sekme Geçişi:** `Cmd + K` paletine doğrudan sekmeler arası gezinme ve hızlı form odaklanması entegre edildi.
- 📅 **Isı Haritasından İşlemlere Akıllı Geçiş:** Harcama ısı haritasında bir güne tıklandığında filtrelenen işlemler sekmesine anında ve pürüzsüz geçiş sağlandı.
- 🧪 **Vitest & Build Doğrulaması:** 24 birim testi ve üretim derlemesi %100 sıfır hatayla doğrulandı.

### v0.5.0 (2026-08-14)
- 💳 **Taksitli Harcama & Borç Takipçisi:** Taksitli alışverişleri (telefon, beyaz eşya, vb.) tanımlama, aylara otomatik paylaştırma ve kalan borç ilerleme çubuğu.
- 🎮 **Bütçe Simülatörü ("Ne Olursa?" Senaryoları):** Harcama kısma ve ek gelir kaydırıcıları ile anlık tasarruf ve yıllık ek birikim projeksiyonu.
- ⚡ **Hızlı Komut Paleti (`Cmd + K` / `Ctrl + K`):** Spotlight benzeri klavye odaklı hızlı işlem arama, kategori filtreleme ve aksiyon paleti.
- 💱 **Çoklu Para Birimi Desteği:** USD ($), EUR (€), GBP (£) ve Altın (gr) işlemlerini ekleyebilme ve anlık TL konsolidasyonu.
- 📱 **Fiş / Fatura Fotoğrafı Notu:** Cihazdan fiş fotoğrafı yükleme, yerel sıkıştırma ve tam ekran görsel inceleme.
- 📄 **Şık PDF / Yazdırılabilir Rapor:** `@media print` stil şablonu ile tek tıkla temiz, beyaz arka planlı aylık bütçe çıktısı ve PDF kaydetme.
- 📤 **Web Paylaşımı (Web Share API):** Aylık finans durumunu tek tıkla mesaj veya WhatsApp üzerinden paylaşma.
- 🧪 **24 Birim Testi:** %100 test kapsamı ile tüm durum ve hesaplama modelleri doğrulandı.

### v0.4.0 (2026-08-14)
- ⚡ **Akıllı Tek Satır Hızlı Giriş (Smart Quick Entry):** Doğal dil ile tek satırda işlem kaydetme (`"market 350"`, `"kahve 85"`, `"maaş 65000"` vb.) ve otomatik kategori eşleme.
- 🎯 **Hedef Birikimler (Kumbara):** Hedef tanımlama, para ekleme (`+`) ve çekme (`-`), kalan süre ve hedef ilerleme çubuğu.
- 📅 **Aylık Harcama Isı Haritası (Calendar Heatmap):** Ayın günlerine göre harcama yoğunluğu görsel takvimi ve güne tıklayarak o günün işlemlerini anında filtreleme.
- 📊 **Yıllık Özet & Karşılaştırma Raporu (Annual Overview):** 12 ayın gelir/gider/tasarruf kümülatif tablosu ve yılın en çok harcanan ilk 5 kategorisi.
- 📥 **CSV / Excel İçe Aktarma (Import Transactions):** Banka veya harici tablolardan `.csv` formatında toplu işlem yükleme.
- 🔒 **PIN Kodu / Kilit Ekranı:** 4 haneli PIN ile uygulama açılışını kilitleme ve gizliliği koruma.
- 🧪 **Genişletilmiş Test Kapsamı:** 20 birim testi ile %100 doğrulandı.

### v0.3.0 (2026-08-14)
- 👁️ **Gizlilik / Bakiye Gizleme Modu:** Başlık alanındaki göz butonu ile tek tıkla tüm parasal tutarları `₺••••` olarak maskeleme ve `localStorage`'da tercihi hatırlama.
- 🧠 **50/30/20 Bütçe Dengesi:** İhtiyaçlar, İstekler ve Tasarruf kategorilerini otomatik gruplayıp 3 segmentli görsel ilerleme çubuğu ve finansal durum değerlendirme kartı.
- 🎨 **Özel Kategori Yönetimi:** Kullanıcının dilediği emoji ve 50/30/20 sınıfı ile sınırsız özel gelir/gider kategorisi ekleyip silebilmesi.
- ⚡ **Hızlı Tutar Çipleri:** İşlem ekleme ve düzenleme formlarında `+50`, `+100`, `+250`, `+500`, `+1.000` hızlı artırma butonları.
- 🌓 **Manuel Tema Seçici:** Koyu ve Açık tema arasında anında geçiş yapabilme (`localStorage`'a kaydedilir).
- 🧪 **Genişletilmiş Test Kapsamı:** Vitest testlerine özel kategoriler ve 50/30/20 kural hesaplama testleri eklendi (14 test).

### v0.2.0 (2026-08-14)
- 🚀 **İşlem Düzenleme:** Yanlış girilen işlemleri doğrudan modal üzerinden tutar, tarih, kategori ve not bazında güncelleyebilme.
- 🚀 **Tekrarlayan İşlem Düzenleme:** Kira ve abonelik gibi tekrarlayan işlemlerin tutar/gün/ad bilgilerini güncelleyebilme.
- 🚀 **Arama & Hızlı Filtre:** İşlem listesinde metin araması ve Gider/Gelir tür filtresi.
- 🚀 **Tasarruf / Birikim Oranı:** Üst bilgi paneline dinamik `% (Gelir - Gider) / Gelir` oran kartı.
- 🚀 **Excel / CSV Dışa Aktarma:** UTF-8 BOM destekli, Türkçe karakterlerle tam uyumlu `.csv` indirme.
- 🛠️ **Akıllı Tarih:** Geçmiş veya gelecek ay seçildiğinde form tarihinin o aya göre otomatik ayarlanması.
- 🧪 **Otomatik Testler:** `state` ve `compute` saf fonksiyonları için Vitest birim test paketi (12 test).
