# Bütçe Defteri

Aylık gelir/gider takibi — iOS ana ekranına eklenebilen bir PWA (Progressive Web
App). Kurulum, App Store yok; Safari'de aç, "Ana Ekrana Ekle" de, tam ekran
native gibi açılır.

```bash
npm install
npm run dev      # geliştirme
npm run build    # dist/ üretir — PWA manifest + service worker dahil
npm run preview  # üretim çıktısını yerelde dener
```

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
| `src/compute.js` | Aylık toplam, kategori kırılımı, trend, bütçe durumu — DOM'a bakmaz |
| `src/charts.js` | Bağımlılıksız SVG grafikler (sıralı çubuk, çizgi) + hover/tooltip |
| `src/render.js` | Veriden DOM üretimi |
| `src/main.js` | Olay bağlama, ay gezinme, yedek al/yükle |
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
- `prefers-reduced-motion` geçişleri kapatır.
- Açık/koyu tema OS tercihine göre otomatik (`prefers-color-scheme`).

## Kapsam dışı

Sunucu yok, hesap yok, cihazlar arası senkron yok. Tek cihaz, açık yedek.
Bu araç kişisel takip amaçlıdır; muhasebe veya vergi beyanı yerine geçmez.
