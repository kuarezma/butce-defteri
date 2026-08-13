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
2. **⚡ Akıllı Tek Satır Hızlı Giriş (Smart Quick Entry):** Doğal dil ile tek satırda işlem kaydetme (örn. `"market 350"`, `"kahve 85"`, `"maaş 65000"`).
3. **🎯 Hedef Birikimler (Kumbara):** Tatil, acil durum fonu veya teknoloji için birikim hedefleri oluşturma, para ekleme/çekme ve ilerleme takibi.
4. **📅 Aylık Harcama Isı Haritası (Calendar Heatmap):** Ayın günlerine göre harcama yoğunluğu görsel takvimi ve güne tıklayarak filtreleme.
5. **📊 Yıllık Özet & Karşılaştırma Raporu (Annual Overview):** 12 ayın gelir/gider/tasarruf kümülatif tablosu ve yılın en çok harcanan ilk 5 kategorisi.
6. **📥 CSV / Excel İçe Aktarma (Import Transactions):** Banka veya harici tablolardan `.csv` formatında toplu işlem yükleme.
7. **🔒 PIN Kodu / Kilit Ekranı:** 4 haneli PIN ile uygulama açılışını kilitleme ve gizliliği koruma.
8. **👁️ Gizlilik / Bakiye Gizleme Modu:** Toplu taşıma veya kalabalık yerlerde tek tıkla tüm parasal tutarları `₺••••` olarak maskeleme (`localStorage` kalıcı).
9. **🧠 50/30/20 Bütçe Kuralı & Akıllı İçgörüler:** Harcamaları otomatik olarak İhtiyaçlar (%50), İstekler (%30) ve Tasarruf (%20) olarak sınıflandırıp görsel bar ve akıllı finansal tavsiyeler sunma.
10. **🎨 Özel Kategori Yönetimi:** Kullanıcının dilediği ikon/emoji ve 50/30/20 sınıfı ile özel gelir/gider kategorileri tanımlayabilmesi.
11. **⚡ Hızlı Tutar Çipleri:** İşlem ekleme ve düzenleme formlarında `+50`, `+100`, `+250`, `+500`, `+1.000` hızlı artırma butonları.
12. **🌓 Manuel Tema Seçici:** Koyu, Açık veya Sistem temasını arayüzden tek tıkla değiştirebilme.
13. **İşlem ve Tekrarlayan Düzenleme (Modal Edit):** Hatalı girilen tutarları, kategorileri, tarihleri veya artan kira/abonelik tutarlarını modal üzerinden doğrudan güncelleme.
14. **Anlık Arama & Filtreleme:** Ayın işlemlerinde açıklamaya veya kategoriye göre anında filtreleme, Gider/Gelir/Tümü filtre sekmeleri.
15. **Tasarruf / Birikim Oranı (%):** Gelirin yüzde kaçının tasarruf edildiğini gösteren dinamik istatistik kartı.
16. **Excel / CSV Dışa Aktarma:** UTF-8 BOM destekli, Excel ve Numbers ile tam uyumlu Türkçe karakterli `.csv` rapor indirme.
17. **JSON Yedekleme ve Geri Yükleme:** Cihazlar arası veya veri güvenliği için tam durum (state) yedekleme/yükleme.
18. **Bütçe Limitleri & Uyarı Renkleri:** Kategori bazında limit koyma, %70 (uyarı), %90 (ciddi), %100 (kritik) ilerleme çubukları.
19. **Tekrarlayan İşlemler (Idempotent):** Kira, maaş, abonelikleri ay bazında otomatik işleme ve dilediğinde aktif/pasif yapma.
20. **Kategori Dağılımı & Trend Grafiği:** Bağımlılıksız SVG grafikler ile kategori kırılımı ve son 6 ayın gelir/gider çizgisi.
21. **Akıllı Form Tarihi:** Geçmiş/gelecek ay incelenirken formun o aya göre akıllı açılması.

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

`localStorage["butceDefteri.v1"]` — şema versiyonlu, bozuk veriye dayanıklı
(bkz. `src/state.js:normalize`). **localStorage kalıcı değildir**: Safari
verisi temizlenince veya cihaz değişince gider. **Yedek al (JSON)** düğmesi
bu yüzden çekirdek özellik, süs değil.

```js
{
  schema: 1,
  transactions: [{ id, type, amount, categoryId, date, note, recurringId, createdAt }],
  recurring: [{ id, name, type, amount, categoryId, day, active, note }],
  budgets: { [categoryId]: monthlyLimit },
  materialized: { "YYYY-MM": [recurringId, ...] },
}
```

## Dosya düzeni

| Dosya | İş |
|---|---|
| `src/data/categories.js` | Kategori tanımları — tek kaynak, kalıcı id'ler |
| `src/palette.js` | Sabit renk sırası (dataviz iskeletinin referans paleti) |
| `src/state.js` | Şema versiyonlu depolama, doğrulama, materyalizasyon |
| `src/compute.js` | Aylık toplam, kategori kırılımı, trend, bütçe durumu, tasarruf oranı — DOM'a bakmaz |
| `src/charts.js` | Bağımlılıksız SVG grafikler (sıralı çubuk, çizgi) + hover/tooltip |
| `src/render.js` | Veriden DOM üretimi |
| `src/export.js` | Excel / Numbers uyumlu CSV dışa aktarma |
| `src/main.js` | Olay bağlama, ay gezinme, arama/filtre, düzenleme modalleri, yedek al/yükle |
| `tests/` | Vitest ile yazılmış `state` ve `compute` birim testleri |
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
