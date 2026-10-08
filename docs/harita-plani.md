# Dünya Haritası Planı

**İstek (08 Eki 2026):** (1) Anasayfadaki toplam kartları kaldırılsın. (2) Anasayfaya,
veba olaylarının dünyada nerede ve ne kadar olduğunu gösteren, üzeri işaretli bir
**dünya haritası** konsun; haritada **vaka sayıları** görünsün.

Bu dosya, isteğin ölçülmüş veriyle karşılaştırması ve uygulama planıdır.
Ölçüm tarihi: **08 Eki 2026** · kaynak: canlı besleme (`getFeedSnapshot()`, Postgres) —
`data/feed.json` deposu **bayat** (57 olay) ve plana temel alınmadı.

---

## Günce

| Tarih | Değişiklik | Durum |
|---|---|---|
| 08 Eki 2026 | Anasayfadaki 4 toplam kartı (`71 olay · 41 kaynak sağlıklı · 35 bağımsız grup · 100 sinyal`) kaldırıldı. `typecheck` + `ui-check` geçti. | ✅ Yapıldı |
| 08 Eki 2026 | Dünya haritası: veri ölçümü yapıldı, sayı iddiası taşımayan "bağlam haritası" önerisi yazıldı. | ✅ Onaylandı (Seçenek A) |
| 08 Eki 2026 | **Uygulama:** `public/world-map.svg` (dünya, 41.2 KB) + `public/world-map-focus.svg` (mobil odak, 41.2 KB) üretildi (`scripts/build-world-map.ts`, Natural Earth 110m, DP tolerans 1.1). `WorldMap` bileşeni `Bölgeler` bölümüne eklendi. | ✅ Yapıldı |
| 08 Eki 2026 | **Mobil işaretçi çakışması düzeltildi** (ölçüm: dünya çerçevesinde Sibirya–İrkutsk 13 px → 26 px rozetler üst üste). Odak çerçevesi + Sibirya temsilî noktası 95°D → 85°D. Yeni aralık ~42 px. | ✅ Yapıldı |
| 08 Eki 2026 | **R2 uygulandı:** `cases` ölçütü küratörlü 3 kayıtla açıldı (0 · 0 · 2). `figures-check` değer kapısı `cases` için 0'a izin verir hâle getirildi; `FigureCards` çelişkiyi artık işaretliyor. | ✅ Yapıldı |
| 08 Eki 2026 | **Kapılar:** `check-all` 6/6 geçti · `layout-check` 12/12 geçti (360/390/768/1280/1440 px taşma 0 · pano 1440px'te 3367 px, bütçe 6000). | ✅ Doğrulandı |
| 08 Eki 2026 (akşam) | **`cases-none-tass` KALDIRILDI.** Bağ cümlesi ("WHO confirms no new plague cases…") feed penceresinden düştü — ölçüm 22:41, Postgres: `qgn8g` yok, cümle hiçbir kayıtta geçmiyor. `cases` artık 2 kayıt (0 · 2), çelişki işaretli. `check-all` yeniden 6/6. | ✅ Doğrulandı |

---

## 1. Kaldırma: ne gitti, ne kayboldu

Kaldırılan şerit, dört kutuydu. Ölçüm (grep + canlı sayımlar):

| Kutu | Değer | Başka nerede görünüyor? |
|---|---|---|
| olay | 71 | "Tüm olaylar (71) →" bağlantısı (`/timeline`) |
| kaynak sağlıklı | 41 | "Diğer katmanlar → Kaynak sağlığı" kartı (`41 ok`) |
| bağımsız grup | 35 | **hiçbir yerde** |
| doğrulanmamış sinyal | 100 | "Diğer katmanlar → Sinyaller" kartı (100) |

Yani dört kutunun üçü sayfanın alt yarısında zaten yazılıydı; `docs/arayuz-plani.md §1.6`
bunu "aynı sayılar iki kez, ~300 px arayla" diye zaten kaydetmişti. Toplamların yerini
`StatusStrip` (değişim: son 24 saat / en son gelişme / veri tazeliği) alıyor.

> **Onay gereken tek nokta:** "bağımsız grup 35" sayısı artık arayüzde hiç görünmüyor.
> Ya bırakılır (metodoloji sayfasında zaten tanımlı), ya haritanın altındaki kapsama
> satırına tek satır olarak geri konur.

---

## 2. Ölçülen veri gerçeği (planın tamamı buna dayanıyor)

### 2.1 Olaylar Rusya'dan ibaret

| Ülke/bölge adı geçen olay | Adet (71 olayda) |
|---|---|
| russia | 39 |
| siberia (bölge) | 12 |
| ukraine | 2 |
| mongolia | 1 |
| china | 1 |

Diğer üç ülkenin **hepsi tek olayda ve ilgisiz**:

- `ukraine-grapples-with-a-shortage-of-troops-...` — "a shortage of combat-ready troops has
  **plagued** Ukraine". Veba haberi değil; alaka skoru "plagued" kelimesine takılmış.
- `mongolia` / `china` — komşuluk/bağlam cümlesi içinde tek geçiş.

**Sonuç:** dünya haritasında işaretlenecek anlamlı ülke **1** (Rusya). Ülke bazlı bir
koroplet haritada Ukrayna, savaş nedeniyle yanar — bu, sitenin "yanlış pozitif
güvenilirliği doğrulamakla aynı ağırlıkta hasar verir" ilkesinin ihlali olur.

### 2.2 Konum kapsaması proje eşiğinin altında

`npm run geo-check` canlı besleme üzerinde:

```
kapsama: 28/71 olay (%39.4) · 3 konum
  siberian (makro)  23
  irkutsk           8
  moscow            3
```

`scripts/geo-check.ts` içindeki kapı **%60**; ölçülen **%39.4** → kapı geçmiyor.
Bu yüzden `/locations` sayfası bugün harita değil liste gösteriyor ve bunu açıkça yazıyor.

### 2.3 "Vaka sayısı" hiç yok — sıfır

`data/figures.json` ölçümü: **`cases` = 0 kayıt**, `deaths` = 1, `restricted` = 3.

Rakam içeren **6** olay var; hiçbiri vaka sayısı bildirmiyor:

| Olaydan gelen cümle | Ne diyor |
|---|---|
| "Suspected plague incident leaves **1 dead, 200** under quarantine in Siberia" | 1 ölüm, 200 karantina |
| "Russian lab worker dies ... as **200** enter medical observation" | 200 tıbbi gözlem |
| "Russia hospitalizes **almost 200** people ..." | ~200 hastane |
| "Rospotrebnadzor said **nearly 5,000 tests** found no dangerous pathogens" | ~5.000 test — **negatif bulgu** |

Vaka *sayısı* olarak okunabilecek tek metinler, kaynağın **doğrulanmamış iddia** olarak
verdiği başlıklar:

- "Russia dismisses transparency calls amid **reports of second** Siberia plague case"
- "WHO to investigate **reports of second plague case** after death of Russian lab worker"
- "WHO confirms **no new plague cases reported** in Siberian region"

Yani sayı, kaynağın kendi ağzında "iddia" ve "reddedildi" arasında. Bunu haritada
"2 vaka" diye yazmak, `figures.ts` başlığındaki "naif çıkarım yasak" kuralının ihlali olur.

### 2.4 Teknik kısıt: dış harita servisi CSP tarafından bloklu

`src/lib/security/csp.ts`:

```
img-src 'self' data: ;
connect-src 'self'
```

MapLibre + OSM/Mapbox karoları bu politikada **çalışmaz**; açmak `docs/guvenlik-denetimi.md §3`'te
bilinçli olarak daraltılmış dış kaynak yüzeyini geri genişletir (ziyaretçi IP'si karo
sunucusuna gider). Ayrıca `package.json`'da harita bağımlılığı yok.

**Karar:** harita, **satır içi SVG + kendi varlığımız**, JS'siz, yeni bağımlılıksız olacak.

---

## 3. Önerilen tasarım — "Bağlam haritası" (Seçenek A)

Haritayı **sayı iddiası taşımayan bir bağlam katmanı** olarak koyuyoruz: "salgın nerede"
sorusunu dünya ölçeğinde cevaplar, "kaç" sorusunu ise yalnızca kaynağa bağlı rakamlarla
cevaplar ve bilmediğini açıkça yazar.

```
┌─ BÖLGELER ───────────────────────────────── Tüm bölgeler → ┐
│  [ dünya SVG · Rusya vurgulu ]                             │
│   ● Sibirya 24   ● İrkutsk 8   ● Moskova 3                 │
│                                                            │
│  "İşaretçideki sayı bildirilen OLAY sayısıdır, vaka        │
│   sayısı değildir."                                        │
│                                                            │
│  [ Sibirya Federal Bölgesi 24 ] [ İrkutsk 8 ] [ Moskova 3 ]│
│  70 olayın 29'unda konum belirlenebildi (%41) — harita     │
│  yalnızca bunları gösterir; kalanı "atanmamış".             │
└────────────────────────────────────────────────────────────┘

Rakamlar ayrı bölümde (mevcut `Rakamlar` kartları) ve R2 ile artık vaka da var:
  vaka  0 · 2 (2 kaynak, 6 bağımsız grup) ⚑ kaynaklar farklı değer veriyor
  ölüm  1 (CIDRAP)
  kısıtlama ≈200 (CIDRAP · NBC · CNBC)
```

Kurallar:

1. **İşaretçideki sayı = kaynak bildirimi sayısı.** `24 / 8 / 3` OLAY sayısıdır, vaka
   sayısı değildir; `mapMarkerNote` bunu hem haritanın altında hem ekran okuyucu
   etiketinde açıkça yazar.
2. **Rakam yalnızca `figures.json`'dan çözülürse gösterilir** (`buildFigures()`), yani
   ekrandaki her sayı kaynağın kendi cümlesine ve `as_of` zamanına bağlıdır.
3. **Vaka rakamı R2 ile geldi, ama uydurma yok:** yalnızca kaynağın kendi cümlesi
   taşınır ("no plague cases" → 0; "reports of second plague case" → 2, SIRA sayısı).
   Çelişki (`disagreement`) arayüzde otomatik işaretlenir: aynı ölçüt için birden çok
   değer varsa sayılar ayrı ayrı ve "kaynaklar farklı değer veriyor" notuyla durur.
4. **Kapsama notu görünür kalır**; harita "hiçbir yerde yok" izlenimi vermez.
5. **Ülke boyaması yok.** Koroplet (ülke renkleriyle yoğunluk) kapıyı geçmiyor (§2.1).
   Yalnızca Rusya sınırı vurgulanır + 3 işaretçi.
6. JS'siz çalışır: harita bir `<img>` varlığı + üstünde HTML işaretçi bağlantıları
   (`aria-label`, klavye ile gezilebilir). `ui-check` kuralları: mikro punto ≥ 11 px,
   metin renginde opaklık yok, TR/EN sözlük paritesi (yeni anahtarlar iki dile eklendi).

---

## 4. Aşamalar

| # | İş | Çıktı | Süre |
|---|---|---|---|
| **P0** | Dünya SVG varlığı: Natural Earth 110m'den sadeleştirilmiş ülke yolları, quantize edilmiş, `public/world-map.svg` (hedef **≤ 60 KB**) | varlık | ✅ 41.2 KB |
| **P1** | `WorldMap.tsx` — equirectangular, Rusya vurgulu, işaretçiler, `aria` etiketleri, dil duyarlı | bileşen | ✅ Yapıldı |
| **P2** | Anasayfa bölümü: `Bölgeler` içinde harita + liste + rakamlar + kapsama notu; `i18n.ts` TR/EN anahtarları | bölüm | ✅ Yapıldı |
| **P3** | Kapılar: `check-all` (6/6), `layout-check` (12/12), mobil işaretçi aralığı ölçümü | test | ✅ Yapıldı |
| **P4** | Headless Chrome ile kanıt (`.shots/map3-*.png`) + `docs/arayuz-plani.md` ve bu dosyanın güncellenmesi | kanıt | ✅ Yapıldı |

**Sonuç: ~1 günde tamamlandı** (planda öngörülen 2.25 gün; P0'ın çoğu otomatik
üretim olduğu için kısaldı). Ek bulgu: mobil işaretçi çakışması planda yoktu —
ölçümde çıktı (`MAP_FOCUS_FRAME` ile çözüldü).

> **Ölçüldü (ekran görüntüsü, `.shots/home-after.png`):** anasayfada haritanın
> göstereceği her şeyin **metin hâli zaten var**:
>
> - `Bölgeler` bölümü `Sibirya Federal Bölgesi 23 · İrkutsk Oblastı 8 · Moskova 3` +
>   `"71 olayın 28'inde konum belirlenebildi (%39) — bu yüzden harita değil liste gösteriyoruz"`
> - `Rakamlar` bölümü vaka kutusunu **şimdiden boş durumla** çiziyor:
>   `BİLDİRİLEN VAKA → bildirilen rakam yok`
>
> Yani harita yeni bir veri katmanı **getirmiyor**; mevcut `Bölgeler` bölümünün görsel
> karşılığı. Bu yüzden **P2, yeni bir bölüm açmak yerine mevcut `Bölgeler` bölümünü
> haritayla birlikte sunmak** olarak daraltılabilir (aynı bölümde: harita üstte, liste
> altta, kapsama notu korunur). Tasarım kararı onay sorularına eklenmiştir (§6, S4).

### Rakam tarafı için ayrı, editoryal bir karar

İstenirse `cases` metriği için `figures.json`'a **küratörlü** kayıt eklenebilir; ama
§2.3'teki cümleler "iddia/reddedildi" olduğu için bu bir editoryal karardır, otomatik
değildir. Seçenekler:

- **(R1)** Hiç eklemeyiz; harita "vaka: kaynak bildirmedi" der. *Önerilen.*
- **(R2)** İki kaydı **ayrı ayrı** ekleriz — biri "ikinci vaka iddiası", biri "yeni vaka
  yok" — ve `FigureGroup.disagreement` çelişkiyi zaten işaretler. `value` kaynağın
  söylediği sayıyı taşır, "vaka" diye toplam gösterilmez.

---

## 5. Kapılar ve yedek plan

Harita bölümü **iki farklı eşiğe** tabidir — biri bugün, biri koroplet istenirse:

| Kapı | Eşik | Ölçülen (08 Eki 2026) | Sonuç |
|---|---|---|---|
| Bağlam haritası (Seçenek A) — **sayı iddiası yok** | Ülke katmanı gerekmez; işaretçiler yalnızca doğrulanmış bölge toplamları | siberian 24 · irkutsk 8 · moscow 3 | ✅ Uygulandı |
| Koroplet / ülke boyaması (Seçenek B) | ≥3 anlamlı ülke **ve** kapsama ≥ %60 **ve** ilgisiz eşleşme = 0 | 1 anlamlı ülke · %41 · Ukrayna ilgisiz eşleşiyor | ❌ Geçmiyor (bilinçli olarak yok) |
| Vaka sayısı gösterimi | `cases` metriğinde ≥1 çözülen kayıt | 2 kayıt (0/2), 6 bağımsız grup, çelişki işaretli | ✅ R2 ile karşılandı |

**Yedek plan:** koroplet kapısı geçmediği sürece ülke boyaması yapılmaz; harita bağlam
katmanı olarak kalır ve kapsama notu görünür olur. Bu, `/locations` sayfasının bugünkü
dürüst davranışının (`"harita değil liste: kapsama %60'ın altında"`) haritalı karşılığıdır.

---

## 6. Kararlar (08 Eki 2026 — onaylandı)

1. ~~"Bağımsız grup" sayısı geri gelsin mi?~~ → **Gitsin.** (Kavram `Rakamlar`
   kartlarında ölçüt bazında duruyor: "4 bağımsız grup".)
2. ~~Seçenek A mı, B mi?~~ → **Seçenek A** (bağlam haritası, ülke boyaması yok).
3. ~~Vaka sayısı R1 mi, R2 mi?~~ → **R2** (iddia/ret çifti küratörlü kayıt olarak
   eklendi; çelişki arayüzde işaretli). Yorum riski `_readme`de yazılı:
   `value: 2` bir TOPLAM değil, kaynağın cümlesindeki sıra sayısıdır.
   **Güncelleme (08 Eki 2026, akşam):** çiftin "ret" tarafı (`cases-none-tass`)
   feed penceresinden düştüğü için kaldırıldı; çelişki yine duruyor, çünkü
   0 tarafı Reuters'ın kendi cümlesinden geliyor ("no plague cases").
4. ~~Harita ayrı bölüm mü, mevcut bölümde mi?~~ → **Pano sayfasında**, mevcut
   `Bölgeler` bölümünün içinde (harita üstte, liste altta). Aynı üç bölgeyi
   ~200 px arayla iki kez göstermek, §1'de kaldırdığımız çift gösterimin
   tekrarı olurdu.
