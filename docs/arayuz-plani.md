# Arayüz ve Bilgi Mimarisi Planı (v2)

> **Durum:** ÖNERİ — bu dosya yazılırken hiçbir üretim kodu değiştirilmedi.
> Uygulama, sahibin onayından sonra fazlar hâlinde yapılır (bkz. §12).
> Bu plan `docs/PLAN.md` §9 (Arayüz Bölümleri) ve §13 (Kabul Kriterleri)'nin
> yerini almaz; onları **uygulanabilir hâle getirir**.

## 0. Karar özeti (sahibin cevapları, 8 Eki 2026)

| # | Soru | Karar |
|---|---|---|
| 1 | Birincil kitle | **(c) İlk kez gelen kamuoyu** — "10 saniyede durum ne?" |
| 2 | "Yeni" işaretleri | **Var** (ziyaretçi başına, izleme olmadan) |
| 3 | Kimlik | **Mevcut koyu tema rafine edilir** + **editoryal yazı işi dili** denenir; mobilde rozetler kısaltılır |
| 4 | Rakamlar paneli | **Yapılır** (`data/figures.json` zaten hazır) |
| 5 | Yapı | **Çok sayfalı** |
| 6 | Sıra | **Önce plan** (bu dosya — yazıldı) |

### 0.1 Kesinleşen kararlar (§15 kapandı, 8 Eki 2026)

| Madde | Karar |
|---|---|
| Serif adayı | **Newsreader** |
| Düzeltmeler günlüğü (`PLAN §9.9`) | **Kapsam dışı** (veri ve elle bakım gerektiriyor) |
| Yerel saat anahtarı | **Var** (UTC ↔ yerel, localStorage) |
| Modal | **Kalır** (yanına kalıcı sayfa adresi eklenir) |
| Mobil nav | **Yatay kaydırılabilir şerit** (JS'siz) |
| Fazlama | **F0→F4 tek seferde**, ara onay yok |

**Sıra değişikliği (gerekçe):** tipografi temeli (`next/font` + serif + ölçek + kontrast token'ları)
F4'ten **F0'a alındı**. Sebep: manşet/başlık/kart bileşenleri F1–F3'te yazılacak; serif ve ölçek
sonradan eklenirse aynı dosyalar iki kez düzenlenir. Böylece her yeni bileşen **nihai tipografiyle
yazılır**. F4'te kalan iş: ledger dili, manşet bloğu, durum şeridi, "ne değişti", saat dili.

**Yorum notu:** "Editoryal yazı işi dili" ile kastedilen, gazete/dergi tipografisidir:
serif manşet, hairline kurallar, spot/deck satırı, ölçülü satır uzunluğu —
"kutulu dashboard" yerine "dizilmiş sayfa". Bu yorum yanlışsa düzeltilmeli, çünkü
§8'deki tipografi kararlarının tamamı buna bağlı.

---

## 1. Bugünkü durum: ölçülen kanıt

Aşağıdaki sayılar **tahmin değil**: canlı sitede headless Chrome ile (390/768/1440 px),
kaynak kod taraması ve WCAG kontrast matematiği ile ölçüldü.

### 1.1 🔴 Mobilde "Şu an ne biliyoruz?" okunamaz durumda (bug)

| Ölçüm (390 px) | Değer |
|---|---|
| Etiket rozeti genişliği (`◆ ÇOKLU BAĞIMSIZ KAYNAK BİLDİRİYOR`) | **242 px** |
| Başlık butonuna kalan genişlik | **19 px** |
| İlk üç satırın yüksekliği | **338 / 266 / 242 px** |
| 1440 px'teki başlık genişliği (karşılaştırma) | 765 px |

Sebep: `LabelBadge` → `shrink-0` + uzun Türkçe etiket metni; satır `flex flex-wrap`,
başlık `flex-1 min-w-0`. Başlık satır başına ~1 kelimeye düşüyor. Etki sadece ≤600 px'te
görüldüğü için masaüstünde fark edilmemiş. **Sitenin en önemli bölümü telefonda çalışmıyor.**

### 1.2 🔴 Uzunluk var, erişim yapısı yok

| | 390 px | 1440 px |
|---|---|---|
| Toplam sayfa yüksekliği | **31.211 px** (~37 telefon ekranı) | 21.434 px |
| Zaman çizelgesi bölümü | 22.851 px (**sayfanın %73'ü**) | 16.598 px |
| Doğrulanmamış sinyaller | 2.701 px | 1.800 px |
| Kaynak sağlığı | 3.040 px | 1.744 px |

74 olay kartı tek sonsuz listede: **arama yok, filtre yok, tarih gruplaması yok, sayfalama yok.**
`PLAN.md §9.11 (Arşiv & Arama)` uygulanmamış. Yatay taşma 0 px — o konuda temiz.

### 1.3 🔴 Kontrast borcu (erişilebilirlik + okunurluk)

`--color-mist` (#8593a8) tam opakken AA'yı geçiyor (void üzerinde 6.39:1); ama sahada
**opaklık çarpanıyla** kullanılıyor ve 10–10.5 px metinde sınırın altına düşüyor:

| Sınıf | void üzerinde | panel üzerinde | Kullanım |
|---|---|---|---|
| `text-mist/85` | 4.86 ✓ | 4.55 ✓ | 4 |
| `text-mist/80` | **4.42 ✗** | **4.17 ✗** | 2 |
| `text-mist/75` | **4.00 ✗** | **3.82 ✗** | 4 |
| `text-mist/70` | **3.62 ✗** | **3.49 ✗** | 19 |
| `text-mist/65` | **3.26 ✗** | **3.18 ✗** | 1 |
| `text-mist/60` | **2.94 ✗** | **2.89 ✗** | 10 |
| `text-mist/55` | **2.64 ✗** | **2.63 ✗** | 2 |
| `text-mist/50` | **2.37 ✗** | **2.39 ✗** | 4 |

**46 opaklık kullanımının 42'si WCAG AA (4.5:1) sınırının altında** — üstelik 10 px mono
metinde. Bu, "soluk ve yorgun" görünen ikincil metnin ölçülebilir sebebi.

### 1.4 🟠 Yüzeyler neredeyse görünmez → "her şey aynı gri kutu" hissi

| Çift | Kontrast |
|---|---|
| panel / void | **1.098:1** |
| panel-2 / panel | 1.050:1 |
| edge / panel | **1.221:1** |
| edge-soft / panel | 1.123:1 |

Kart yüzeyi arka plandan %10, kenarlık %22 fark ediyor: kartlar birbirinden ve zeminden
ayrışmıyor. 5 grup bildiren `corroborated` olay ile tek kaynaklı `single` olay **aynı boyut,
aynı ağırlık, aynı çerçeve** — etiket sistemi "biri önemli" diyor, yerleşim "hepsi eşit" diyor.

### 1.5 🟠 Yapılmış ama ekranda olmayan veri katmanları

| Katman | Kod | Ölçüm | Arayüz |
|---|---|---|---|
| Sayısal durum (`PLAN §9.5`) | `src/lib/figures.ts` — `buildFigures()` | `figures-check` **geçiyor**: ölüm 1 (2 bağımsız grup) · kısıtlama 200 (4 grup) · ~~vaka yok~~ vaka 0/2 (4 grup) | **yok** — hiçbir component `figures.ts`'i import etmiyor |
| Konum (`PLAN §9.6`) | `src/lib/geo/location.ts` — `aggregateLocations()` | `geo-check`: kapsama **16/57 (%28)**, plan gereği harita değil **R1-B liste** | **yok** |

Yani iki veri katmanı, testleri yeşil şekilde bekliyor.

> **Güncelleme (08 Eki 2026): ikisi de ekrana çıktı.** Rakamlar panodaki `Rakamlar`
> kartlarında (`FigureCards`) ve `/figures` tablosunda; konum haritası `Bölgeler`
> bölümünde (`WorldMap` — dünya varlığı + işaretçiler). Satır 1'in "vaka yok"
> ölçümü de değişti: `cases` ölçütü küratörlü iki kayıtla açıldı (0 vs 2, çelişki
> arayüzde işaretli) — gerekçe `data/figures.json` `_readme` ve
> **`docs/harita-plani.md`** §4. Harita kararının ölçümü ve kapıları da o dosyada.
> Kapsama ölçümü son durumda **29/70 (%41)**.

### 1.6 🟡 Diğer sürtünmeler

- ~~**Aynı sayılar iki kez:** durum bandı + hero'daki 4 kutu, ~300 px arayla aynı metrikleri söylüyor.~~
  **Çözüldü (08 Eki 2026):** hero'daki 4 toplam kutusu kaldırıldı; değişimi `StatusStrip`,
  toplamları `Diğer katmanlar` ve `Rakamlar` bölümleri söylüyor. (Yalnızca "bağımsız grup"
  toplamı artık panoda yok; kavram `Rakamlar` kartlarında ölçüt bazında duruyor.)
- **Karışık saat dili:** nav `08 Eki 14:20 UTC` · kart `Yayın: 08 Eki 10:00 UTC` + `Güncellendi: 17 dakika önce`.
- **Sinyaller düz metin duvarı:** 121 sinyal, 24'ü gösteriliyor, arama/gezinme yok.
- **Sakin durum yok:** hiçbir şey olmadığında ekran "74 olay" diyor; "şu an durum nedir?" cevabı vermiyor.
- **Olayın kalıcı adresi yok:** her şey modal içinde; paylaşılabilir link üretilemiyor.

---

## 2. Bu plandan beklenen sonuç

1. Telefonda ilk 10 saniyede: **durum ne · nerede · kaç kişi · kim söylüyor · ne kadar taze.**
2. 74 olay, kaybolmadan **aranabilir ve filtrelenebilir** hâle gelir.
3. Küratörlü rakamlar ve konum katmanı **dürüstlük kapılarıyla** ekrana çıkar.
4. Her olayın **paylaşılabilir bir adresi** olur.
5. Editoryal tipografi + ölçülmüş kontrast ile site "daha güzel" **ve** daha okunur olur.
6. Yukarıdakilerin hepsi **kalıcı kapılarla** korunur (bug tekrar etmez).

---

## 3. Tasarım ilkeleri (yeni bileşenler için bağlayıcı)

Mevcut ilkeler korunur (`PLAN §3`, §10): sistem "doğrulandı" demez · etiket ve kaynak her
zaman en yüksek görsel öncelik · panik üretilmez · `prefers-reduced-motion` tam destek ·
veri yoksa "neden yok" yazılır.

**Yeni: iki register kuralı.** Her metin üç kayıttan birine girer; karışım yasak:

| Register | Yazı tipi | Ne girer | Örnek |
|---|---|---|---|
| **Anlatı** | Serif | Manşet, bölüm başlığı, olay başlığı, spot/deck, boş durum cümlesi | "Rus laboratuvar çalışanının ölümü uzmanları şaşırttı" |
| **Ölçüm** | Mono | Zaman, sayı, tier, kaynak kodu, etiket rozeti, tablo hücresi | `08 Eki 10:00 UTC · T2 · 3 GRUP` |
| **Gövde** | Sans (Inter) | Açıklama paragrafı, uyarı, form etiketi | "Bu site haber izleme aracıdır…" |

**Ek kurallar:**
- **JS'siz çalışır:** filtre ve sayfalama URL + GET form ile; JS yalnızca kolaylık ekler.
- **Opaklıkla metin soluklaştırma yasak:** ikincil metin tam opak token kullanır (§8.3).
- **Her sayı kaynağını taşır:** rakam/tier/as_of yan yana; kaynağı olmayan sayı gösterilmez.
- **Konum ve rakamlar için dürüstlük satırı zorunlu:** kapsama oranı ve "sistem bu sayıları toplamaz" notu.

---

## 4. Bilgi mimarisi (çok sayfalı)

Rota adları proje geleneğine uyar: **her iki dil için aynı İngilizce slug**
(`/[lang]/methodology` gibi), içerik dile göre değişir.

| Rota | Ad (TR) | Amaç | Veri kaynağı |
|---|---|---|---|
| `/[lang]` | **Pano** | 10 saniyelik durum özeti | `getFeedSnapshot`, `rankEvents`, `topEvents`, `buildFigures`, `aggregateLocations` |
| `/[lang]/timeline` | **Akış** | Tüm olaylar: filtre + arama + sayfalama | `feed.events` + `searchParams` |
| `/[lang]/event/<slug>` | **Olay** | Tek olayın kalıcı sayfası | `feed.events` (yumuşak çözümleme, §10.3) |
| `/[lang]/locations` | **Bölgeler** | Konum listesi + kapsama dürüstlüğü | `aggregateLocations` |
| `/[lang]/locations/<slug>` | **Bölge** | Bölgedeki olaylar | `extractLocations` + olay filtresi |
| `/[lang]/figures` | **Rakamlar** | Küratörlü sayısal durum | `buildFigures` |
| `/[lang]/signals` | **Sinyaller** | T5 katmanı (Telegram / kayıt dışı) | `feed.signals` |
| `/[lang]/sources` | **Kaynaklar** | Sağlık + tier + bağımsızlık grupları + trust formülü | `feed.report.sources`, `registry.ts` |
| `/[lang]/methodology` | **Metodoloji** | Mevcut sayfa (korunur, "düzeltmeler" bölümü opsiyonel) | mevcut |

**Yeni teknik rotalar:** `sitemap.ts`, `robots.ts`, `not-found.tsx` (dil duyarlı 404).

**Navigasyon (iki katmanlı üst bar):**
- 1. satır: kelime markası + canlı nokta + son tarama + **dil değiştirici** + "Metodoloji"
- 2. satır (yeni): `Pano · Akış · Bölgeler · Rakamlar · Sinyaller · Kaynaklar`
  → aktif öğe `aria-current="page"`; mobilde yatay kaydırılabilir şerit (hamburger yok, §15.6)
- Ayrıca: **skip-link** ("içeriğe geç") — şu an yok.

---

## 5. Sayfa tasarımları

### 5.1 Pano (`/[lang]`) — 10 saniye testi

Dikey sıra (her blok tek bir soruyu cevaplar):

1. **Durum şeridi** (yeni, anlatı registerı): "Son 24 saatte **4 yeni olay** · Veri **3 dk önce** güncellendi · Kaynak sağlığı **41/45**"
   + varsa "**3 yeni · 1 güncellendi**" (son ziyaretten beri, §7)
   → Nötr renk. Veri türetimi: `firstSeenAt`/`lastUpdateAt` + `healthSummary`. "Resmî açıklama" satırı
   yalnızca `label === 'official'` olay varsa görünür (bugün feed'de yok — uydurulmaz).
2. **Manşet** (anlatı): en çok bağımsız grup bildiren olay büyük serif başlıkla + spot + kaynak satırı.
   Kural: **etiket rozeti manşetin ÜSTÜNDE**; sansasyon yok.
3. **Rakamlar** (3 kart): Vaka / Ölüm / Kısıtlanan kişi → değer + `qualifier` ("neredeyse 200") +
   `as_of` + bağımsız grup sayısı; çelişkide **iki değer birlikte**. Detay → `/figures`.
4. **Bölgeler** (harita + liste): dünya haritası — Rusya vurgulu, olay bildirilen bölgeler
   sayı rozetiyle işaretli (mobilde odak çerçevesi) + `Sibirya 24 · İrkutsk 8 · Moskova 3`
   listesi + **"70 olayın 29'unda konum belirlenebildi (%41)"** dürüstlük satırı ve
   "işaretçideki sayı OLAY sayısıdır, vaka değildir" notu. **Ülke boyaması yok** — kapsama
   %60 kapısını geçmiyor (`docs/harita-plani.md` §2.1, §5). Detay → `/locations`.
5. **Son gelişmeler** (5 satır, kompakt ledger) → "Tüm akış (74) →"
6. **Sinyaller + Kaynaklar özeti** (tek satır sayı + link; 24'lük duvar panodan kalkar)
7. **Uyarı** (disclaimer) + footer

Beklenen etki: pano yüksekliği masaüstünde ~21.400 → **~6.000 px**, mobilde 31.200 → **~8.000 px**.

### 5.2 Akış (`/timeline`)

- **Yapışkan filtre çubuğu:** etiket (5) · kaynak grubu · tier · tarih aralığı · serbest arama (q)
- **URL durumu:** `?label=corroborated&group=ap&tier=2&from=2026-10-01&q=sibirya`
  → paylaşılabilir; geri/ileri tuşları çalışır; **JS kapalıyken de çalışır** (GET form)
- Aktif filtre çipleri + "temizle"
- **Tarih grupları** (gün başlıkları) + sayfalama ("daha fazla yükle" linki = `?page=2`)
- Sonuç sayısı ve "filtreye uyan 0 olay → neden boş" açıklaması (mevcut boş durum dili)
- Kartlar: `PLAN §13.2` gereği kaynak + tier + yayın + orijinal link + arşiv linki korunur

### 5.3 Olay (`/event/<slug>`)

- Tam sayfa: iddialar tablosu (**kaynak | iddia | saat | tier** — dikey liste yerine), çelişki paneli,
  kaynakların kendi özetleri, arşiv linkleri, TR ise makine çevirisi beyanı + orijinal başlık
- Modal **kalır** (hızlı bakış); modal içine "**kalıcı bağlantı**" ve "sayfayı aç" satırı eklenir
- `generateMetadata` olay bazlı; bilinmeyen slug → `notFound()`
- **Bilinen sınır:** olay kimlikleri her ingest'te yeniden üretilebiliyor (`figures.ts` başlığında
  ölçülmüş: 3 saatte 9 kaydın 4'ü koptu). Bu yüzden bağlantı **yumuşak çözümleme** ile karşılanır (§10.3).

### 5.4 Bölgeler (`/locations`) ve Bölge (`/locations/<slug>`)

- Liste: iki katman (makro-bölge / federal subject), olay sayısı + bağımsızlık grubu sayısı
- **Zorunlu dürüstlük notu:** kapsama oranı, yöntem ("konum kaynak metninden çıkarıldı"),
  yanlış pozitif riski ve düzeltme yolu
- Bölge sayfası: o bölgenin olayları (aynı olay satırı bileşeni) + kaynak dağılımı + "konum
  eşleşmesi hatalı olabilir" bildirim bağlantısı

### 5.5 Rakamlar (`/figures`)

- Ölçüt grupları: Vaka / Ölüm / Kısıtlanan kişi; her satır:
  **değer + qualifier + kaynak adı + T-tier + as_of + kaynağın kendi cümlesi (`phrase`) + olay linki**
- `disagreement` ise iki değer yan yana, **ortalama yok**, "sistem bu sayıları toplamaz/teyit etmez" notu
- Ölçüt için rakam yoksa: **"bildirilen rakam yok"** (boş bırakılmaz — `figures-check` bunu bekliyor)
- Cümle alıntısı telif kuralına uyar (kaynağın kendi cümlesi, ≤2 cümle)

### 5.6 Sinyaller (`/signals`) ve Kaynaklar (`/sources`)

- Sinyaller: grup (Telegram / kayıt dışı) + arama + sayfalama; her kayıtta orijinal + arşiv linki;
  ana akıştan görsel olarak geri planda kalma kuralı korunur
- Kaynaklar: mevcut sağlık tablosu (mobilde kendi içinde kaydırılır — korunur) + tier/bağımsızlık
  grubu açıklaması + trust formülü (`PLAN §5.5`)

---

## 6. Bileşen envanteri

| Bileşen | Durum | Not |
|---|---|---|
| `StatusBar` | **değişir** | 2 satır + nav; hero'daki tekrarlanan 4 kutu kaldırılır |
| `LabelBadge` | **değişir** | `xs` varyantı + mobilde kısa metin (§8.4) |
| `EventCard` | **değişir** | ledger satırı + sol şerit (etiket rengi) + tipografi |
| `TopEventList` | **değişir** | mobil kırılması düzeltilir |
| `EventModal` | **değişir** | iddia tablosu + kalıcı bağlantı |
| `SignalList` | **değişir** | panodan çıkar, `/signals`'ta filtrelenebilir |
| `SourceHealthPanel` | **taşınır** | `/sources` |
| `StatusStrip` | **yeni** | "son 24 saat" + tazelik + "ne değişti" özeti |
| `LeadStory` | **yeni** | manşet bloğu |
| `FigureCards` / `FigureTable` | **yeni** | sunucu bileşeni; `buildFigures` (node:fs → client'a sızmaz) |
| `LocationList` / `LocationSummary` | **yeni** | `aggregateLocations` |
| `FilterBar` | **yeni** | GET form + URL durumu |
| `NewSinceLastVisit` | **yeni** | tek yeni client bileşeni (§7) |
| `LocalTime` (opsiyonel) | **yeni** | UTC ↔ yerel saat anahtarı (§15.4) |
| `Pager`, `EmptyState`, `SkipLink`, `Nav` | **yeni** | küçük, ortak |
| `Counter`, `TimeAgo`, `RevealProvider`, `Disclaimer`, `LangSwitch` | korunur | |

---

## 7. "Ne değişti" mekaniği

- `localStorage['pt.lastVisit']` ziyaret başında okunur, ziyaret sonunda yazılır.
- `NewSinceLastVisit` (client, ~1–2 KB) `firstSeenAt > lastVisit` olanlara "**yeni**",
  `lastUpdateAt > lastVisit` olanlara "**güncellendi**" sınıfı ekler.
- **Yerleşim kaydırması yok:** işaret, yeni DOM düğümü eklemek yerine **arka plan/sol şerit vurgusu**
  ile verilir; özet satırı için yükseklik rezerve edilir (CLS ≈ 0).
- **Gizlilik:** çerez yok, sunucuya gönderim yok, profil yok. "İşaretleri temizle" butonu var.
- JS yoksa: hiçbir şey görünmez, site normal çalışır (bozulma yok).

---

## 8. Tipografi, token ve renk planı

### 8.1 Yazı tipleri

- **Anlatı serifi adayları:** `Source Serif 4` (**öneri**) veya `Newsreader`.
  İkisi de `latin-ext` ile Türkçe kapsıyor *varsayımı* doğrulanacak (§11.4) — kanıtlanmadan kullanılmaz.
- **Gövde:** Inter (korunur). **Ölçüm:** JetBrains Mono (korunur).
- **Yükleme:** Google Fonts `@import` → **`next/font/google`** (kendi sunucumuzdan servis).
  Kazanç: dış istek yok, `font-display`/preload otomatik, gizlilik notu kapanır ve
  **CSP `style-src`/`font-src` `'self'`'e sıkılaştırılabilir** (`docs/guvenlik-denetimi.md §3`).
  Bedel: derleme sırasında font indirilir (ağ gerekir).

### 8.2 Tipografi ölçeği

| Rol | Mobil | Masaüstü | Register |
|---|---|---|---|
| Manşet (h1) | 26/32 | 34/40 | serif |
| Bölüm (h2) | 20/26 | 22/28 | serif |
| Olay başlığı (h3) | 16/22 | 17/24 | serif |
| Spot/deck | 15/24 | 15/24 | sans, `mist` |
| Gövde | 14/22 | 14/22 | sans |
| Ölçüm mikro | **11/16** | 11/16 | mono, uppercase, `0.08em` |
| Ölçüm veri | 12/18 | 12/18 | mono, tabular |

10 px → **11 px**: hem AA/okunurluk hem de "yorgun" görünümün sebebi. (`PLAN §13.8` Lighthouse ≥90
hedefiyle çelişmez; toplam 59 adet 10–10.5 px metin var.)

### 8.3 Renk / kontrast tabanı

- İkincil metin için yeni token: `--color-mist-2` (yaklaşık `#93a1b5`, §11.3 kapısıyla doğrulanır).
- **Kural:** metin renginde opaklık çarpanı kullanılmaz. `text-mist/5x|6x|7x|8x` **yasak** (kapı ile zorlanır).
- **Yüzey ayrışması:** panel/void 1.098:1 → hedef **≥1.25:1**; kenarlık görünürlüğü artırılır.
- Etiket tonları korunur (hepsi AA üstü: signal 10.42 · caution 10.88 · alarm 7.71 · critical 5.84 · official 7.59).
- Kart dili: birincil akışta **hairline kurallar** (ledger), çerçeveli kart yalnızca ikincil/etkileşimli yüzeylerde.

### 8.4 Mobil rozet kuralı

- ≥640 px: tam metin (`◆ ÇOKLU BAĞIMSIZ KAYNAK BİLDİRİYOR`)
- <640 px: **`◆ ÇOKLU KAYNAK`** (kısa etiket), tam metin `title` + yardımcı teknoloji için `sr-only`
- **Kural:** iki metinden yalnızca biri yardımcı teknolojiye açılır (aynı metin iki kez okunmaz).
- Küçük ekranda rozet, `Şu an ne biliyoruz?` satırında **kendi satırına** geçer; başlık tam genişlik alır.

---

## 9. Teknik kararlar ve tuzaklar (Next.js 16)

Proje `next@16.4` kullanıyor ve `AGENTS.md` "bu tanıdığın Next.js değil" diyor; aşağıdakiler
`node_modules/next/dist/docs/` okunarak yazıldı.

1. **`params` ve `searchParams` Promise'tir** — `await` edilmeli (`03-layouts-and-pages.md`).
2. **`searchParams` kullanmak sayfayı dinamik render'a sokar.** Akış sayfası zaten dinamik;
   site geneli `force-dynamic` olduğu için tutarlı.
3. **YENİ ROTA TUZAĞI:** `generateStaticParams` içeren bir rota, dinamik API kullanmıyorsa
   **derleme anında** prerender edilir. `data/feed.json` depoda izlendiği için (`.gitignore` notu)
   bu, sayfaların **son deploy'daki anlık görüntüye donması** demektir. Kural: **feed okuyan her
   rota `export const dynamic = 'force-dynamic'` taşır.** ISR kullanmak istersek bilinçli karar olur
   ve en fazla `revalidate = 600` (10 dk) ile sınırlanır — derleme anında donma asla kabul edilmez.
4. **`sitemap.ts` de feed okuyorsa** aynı riski taşır → aynı kural. (Doğrulanacak: §11.5)
5. **Proxy matcher:** uzantısız metadata rotaları (`apple-icon` gibi) ayrıca listelenmeliydi;
   `/sitemap.xml` ve `/robots.txt` zaten hariç. İleride `opengraph-image` eklenirse matcher'a yazılmalı.
6. **CSP:** `style-src` `'unsafe-inline'` **kalmalı** (React inline `style={{--reveal-delay}}` kullanıyor);
   `script-src` nonce'lu kalır. Font self-host sonrası `style-src`/`font-src` dış kaynakları kaldırılır.
7. **`figures.ts` `node:fs` kullanır** → yalnızca sunucu. Client bileşenine import edilmez;
   çözülmüş `FiguresSnapshot` prop olarak geçirilir (mevcut "pg sızmasın" kuralının devamı).
8. **İstemciye korpus gönderilmez:** 450 KB'lık feed client'a inmez; filtre/arama sunucuda.
   Tek yeni client bileşeni `NewSinceLastVisit` (§7).
9. **Postgres erişimi:** `getFeedSnapshot()` 60 sn bellek içi önbellek taşır. Yeni rotalar aynı
   fonksiyonu kullanır; ek DB yükü doğurmaz.

### 9.3 Kararlı olay bağlantısı (bilinen sınır + çözüm)

Olay kimlikleri ingest'te yeniden üretilebiliyor (`figures.ts` ölçümü: 3 saatte 9 kaydın 4'ü koptu).
Bu yüzden `/event/<slug>`:

1. tam slug eşleşmesi →
2. yoksa normalize başlık benzerliği ≥0.6 olan en güncel/çok kaynaklı olay →
3. yoksa: "**Bu olay yeniden gruplanmış olabilir**" sayfası + slug'dan türetilen arama ile `/timeline` linki

**Alternatif (F3b, +0.5 gün):** ingest'te içerikten türetilen **kararlı `publicRef`** (ör. en eski
makalenin `content_hash`'i + normalize başlık) saklanır; kalıcı bağlantı ona oturur. Öneri:
önce yumuşak çözümleme (F3), kırılma ölçülürse `publicRef` eklenir.

---

## 10. Kapılar (bu projenin kültürü: iddia değil ölçüm)

### 10.1 Yeni: `npm run ui-check`

1. **Yasak sözcük kapısı:** `doğrulandı|teyit edildi|confirmed|verified` — sözlükler + render edilen çıktı.
2. **Kontrast kapısı:** token çiftleri için WCAG matematiği (metin/yüzey tablosu §1.3–1.4), eşik AA.
3. **Opaklık kapısı:** `text-mist/5x|6x|7x|8x` deseni kaynakta bulunursa **hata**.
4. **Sözlük parite kapısı:** `tr` ve `en` anahtar kümeleri eşit.
5. **Mist-2 tokenı** gerçekten AA'yı geçiyor mu (`--color-mist-2` ölçümü).

### 10.2 Yeni: `npm run layout-check` (Chrome varsa; CDP, ek bağımlılık yok)

1. 360/390/768/1280/1440 px'te **yatay taşma = 0**.
2. 390 px'te `Şu an ne biliyoruz?` başlığı satır genişliğinin **≥%60'ını** alır ve satır yüksekliği **≤120 px**.
3. Pano yüksekliği bütçesi: mobil ≤8.000 px, masaüstü ≤6.000 px.
4. Yazı tipi glif kontrolü: `document.fonts.check('16px "Source Serif 4"', 'ığşçöü İĞŞÇÖÜ')` → `true`.
5. Konsol hatası 0 (hidrasyon uyarısı dâhil).

### 10.3 Mevcut kapılar korunur

`typecheck` · `security-check` · `translation-check` · `geo-check` · `summarize-check` · `figures-check`
→ `npm run check-all` bunlara `ui-check` ekler (Chrome'a bağlı olan `layout-check` ayrı kalır, CI'da opsiyonel).

### 10.4 İnsan doğrulaması (her fazda)

- Her faz sonunda **ekran görüntüsü kanıtı** (390 + 1440 px) `verify-ui-headless-chrome` yordamıyla.
- Faz kabul kriterleri §13'ten işaretlenir; ölçüm çıktısı PR/commit mesajına yazılır.

---

## 11. Fazlar ve iş kalemleri

| Faz | İçerik | Efor |
|---|---|---|
| **F0 — Temel onarım + tipografi temeli** | Mobil rozet/satır düzeltmesi (§1.1) · kontrast tabanı, `mist-2`, opaklık temizliği (§1.3) · yüzey ayrışması (§1.4) · 11 px mikro ölçek · **`next/font` + Newsreader + CSP sıkılaştırma** · nav iskeleti + skip-link | **1 gün** |
| **F1 — Erişim yapısı** | `/timeline` (filtre + arama + tarih grubu + sayfalama, URL/GET, JS'siz) · pano sadeleşmesi · `sitemap.ts`/`robots.ts`/`not-found.tsx` · nav aktiflik | **1.5–2 gün** |
| **F2 — Veri katmanları** | `/figures` + pano rakam kartları · `/locations` + `/locations/<slug>` · dürüstlük notları | **1–1.5 gün** |
| **F3 — Olay sayfası** | `/event/<slug>` + yumuşak çözümleme · modal uyumu + kalıcı bağlantı · olay bazlı metadata | **1 gün** |
| **F3b — (opsiyonel)** | Kararlı `publicRef` (ingest değişikliği) | +0.5 gün |
| **F4 — Editoryal kimlik** | ledger kart dili + manşet bloğu + durum şeridi · `NewSinceLastVisit` · saat dili birleştirme + yerel saat anahtarı | **1–1.5 gün** |
| **F5 — Kapılar ve doküman** | `ui-check`, `layout-check` · README + `PLAN.md §9` güncellemesi · güvenlik denetimi notu (font/CSP) | **0.5–1 gün** |

**Toplam:** ~**6.5–8.5 iş günü** (F3b hariç). F0 ve F1 birlikte sitenin kullanılabilirliğini
zaten değiştirir; F4 zevk katmanıdır ve F0–F2 oturduktan sonra yapılmalıdır (iki kez boyamamak için).

**Sıra gerekçesi:** F0 kırık olanı düzeltir · F1–F2 *işlevi* değiştirir (bugünkü veriyle) ·
F3 paylaşılabilirliği getirir · F4 görsel kimliği oturtur · F5 hepsini kalıcı kılar.

---

## 12. Riskler

| Risk | Olasılık | Etki | Önlem |
|---|---|---|---|
| Olay slug'ları yeniden gruplama ile değişir → bağlantı 404 | Yüksek | Orta | Yumuşak çözümleme (§9.3); gerekirse `publicRef` (F3b) |
| Derleme anında donma (feed.json izleniyor) | Orta | Yüksek | Her feed okuyan rotada `force-dynamic` (§9.3) |
| Serif Türkçe glifi eksik (ı/ğ/ş) | Orta | Orta | `latin-ext` şartı + `document.fonts.check` kapısı (§10.2) |
| `next/font` derleme anında ağ ister | Düşük | Düşük | Yerel `localFont`'a düşme planı; CI'da ağ var |
| Çok sayfa = daha çok fonksiyon çağrısı (Vercel Hobby) | Orta | Düşük | 60 sn bellek içi önbellek; gerekirse `revalidate=600` |
| Editoryal dil panik üretir (manşet etkisi) | Orta | Yüksek | Etiket manşetin üstünde; nötr dil; §3 kuralları; her fazda gözden geçirme |
| Kapsam büyümesi (7 rota) | Orta | Orta | F0–F2'den sonra ara karar; F3/F4 ayrı onay |
| Düzeltme günlüğü (`§9.9`) elle bakım gerektirir | — | — | Kapsam dışı bırakıldı, karar bekliyor (§15.2) |

---

## 13. Kabul kriterleri (ölçülebilir)

1. 390 px'te `Şu an ne biliyoruz?` satırı: başlık genişliği ≥ satırın %60'ı, satır yüksekliği ≤120 px.
2. 360/390/768/1280/1440 px'te yatay taşma **0**.
3. Her metin/yüzey çifti **≥4.5:1** (büyük metin ≥3:1); `text-mist/<opaklık>` kullanımı **0**.
4. Pano yüksekliği: masaüstü ≤6.000 px, mobil ≤8.000 px.
5. Her olayın `/event/<slug>` adresi 200 döner (TR+EN); kırık bağlantı yumuşak çözülür.
6. Filtre/arama durumu URL'de ve **JS kapalıyken çalışır**.
7. `/figures`: her sayının yanında kaynak + `as_of`; çelişkide iki değer; çözülemeyen kayıt gösterilmez.
8. `/locations`: kapsama oranı ve yöntem notu ekranda.
9. "Ne değişti" işaretleri CLS ≈ 0 üretir; localStorage dışında hiçbir izleme yok.
10. `npm run check-all` + `ui-check` yeşil; sitede "doğrulandı/confirmed/verified" **yok**.
11. Lighthouse performans ≥90 ve erişilebilirlik ≥95 (mobil).

---

## 14. Onay sonrası ilk adım

**F0'ın ilk iki işi** (yarım günden az, geri alınabilir, hiçbir tasarım kararını değiştirmez):

1. Mobil rozet/satır düzeltmesi → 390 px önce/sonra ekran görüntüsü kanıtı
2. Kontrast temizliği (`mist` tam opak + `mist-2`) + `ui-check` kontrast/opaklık kapıları

Bu ikisi, planın geri kalanı için de **ölçüm altyapısını** kurar.

---

## 15. Karar bekleyen maddeler (KAPANDI — bkz. §0.1)

1. ~~Serif adayı~~ → **Newsreader**
2. ~~Düzeltmeler günlüğü~~ → **kapsam dışı**
3. Sinyaller kendi sayfasına taşınır (öneri kabul edildi)
4. ~~Yerel saat anahtarı~~ → **var**
5. ~~Modal~~ → **kalır**
6. ~~Mobil nav~~ → **yatay şerit**
7. ~~Ara onay~~ → **F0→F4 tek seferde**

---

## 16. Uygulama günlüğü (F0–F5, 8 Eki 2026)

### 16.1 Ölçülen sonuç (önce → sonra)

| Ölçüm | Önce | Sonra |
|---|---|---|
| 390 px: kompakt satır yüksekliği ("Şu an ne biliyoruz?") | 338 px | **127 px** |
| 390 px: başlığa kalan genişlik | 19 px | **tam genişlik (%90)** |
| Pano yüksekliği (1440 px) | 21.434 px | **2.962 px** |
| Pano yüksekliği (390 px) | 31.211 px | **4.259 px** |
| Zaman çizelgesi bölümü (1440 px) | 16.598 px tek listede | **5.514 px** (günlere bölünmüş, filtreli) |
| AA altı metin kullanımı | **42 / 46** | **0** |
| `text-mist/70` kontrastı | 3.62:1 | **yok** (token tam opak: 5.01:1) |
| panel/void ayrışması | 1.098:1 | **1.25:1** |
| edge/panel | 1.221:1 | **1.44:1** |
| Mikro punto | 10 / 10.5 px (59 kullanım) | **11 px** |
| Yatay taşma (360–1440 px) | 0 | **0** (korundu) |
| Harici font isteği | Google Fonts | **yok** (`next/font` self-host) |

### 16.2 Yapılanlar

- **F0:** mobil rozet/satır düzeltmesi (kısa etiket + kendi satırı) · kontrast tabanı ve yeni `--color-mist-2` · yüzey ayrışması · 11 px mikro ölçek · `next/font` ile Newsreader + Inter + JetBrains Mono (Türkçe glif doğrulandı) · CSP `style-src`/`font-src` yalnızca `'self'` · skip-link · iki satırlı üst bar + yatay gezinme.
- **F1:** `/[lang]/timeline` (GET formu ile JS'siz filtre: etiket · kaynak grubu · katman · tarih aralığı · arama · sayfalama), gün grupları, `sitemap.xml`, `robots.txt`, dil duyarlı 404 + `[...rest]` yakalayıcı; pano sadeleşti.
- **F2:** `/figures` (küratörlü rakamlar: değer + belirsizlik sembolü + kaynak + tier + `as_of` + kaynağın kendi cümlesi) · `/locations` + `/locations/<slug>` (kapsama oranı dürüstçe yazılı) · pano özetleri.
- **F3:** `/event/<slug>` kalıcı sayfa + **yumuşak çözümleme** (tam eşleşme → başlık benzerliği → "yeniden gruplanmış olabilir" sayfası) · modal ile sayfa **aynı** `ClaimList` bileşenini kullanır · olay bazlı metadata.
- **F4:** durum şeridi (son 24 saat / en son gelişme / tazelik) · manşet bloğu · "son ziyaretten beri yeni/güncellendi" işaretleri (CLS = 0, inset gölge) · UTC ↔ yerel saat anahtarı · zaman dili birleştirildi ("Yayın" → "Sistemimiz gördü").
- **F5:** `npm run ui-check` (kontrast · yüzey · opaklık yasağı · mikro punto · sözlük paritesi · etiket saflığı) ve `npm run layout-check` (360–1440 px taşma · mobil satır oranı · sayfa bütçesi · Türkçe glif) · README ve bu dosya güncellendi.

### 16.3 Bilinen sınırlar (ölçülmüş, kabul edilmiş)

1. **404 gövdesi istemcide render edilir.** Next 16'da `notFound()` ile üretilen yanıtta SSR DOM'u boştur; içerik yalnızca RSC yükünde gelir. Denenen yollar: `params` (gelmiyor), saf sunucu bileşeni (DOM'da yok), `headers()`/`cookies()` (statik prerender'ı bozuyor, gövde yine boş), `html[lang]`+CSS (nitelikler 404 yanıtında kayboluyor). Sonuç: **JS kapalıysa 404 boş görünür**; JS'li ziyaretçi doğru dilde okunur bir 404 görür (HTTP durumu 404 kalır).
2. **Olay bağlantıları yeniden gruplamada kayabilir.** Yumuşak çözümleme bağlantıyı karşılar ama garanti vermez; kalıcı `publicRef` (F3b) hâlâ opsiyonel ve yapılmadı.
3. **`data/figures.json` bakım ister.** Uygulama sırasında 2 küratörlü kaydın bağ cümlesi canlı feed penceresinden düştü (`figures.ts` başlığındaki bilinen kırılganlık: The Moscow Times makale seti değişti). Kayıtlar kaldırıldı, gerekçe dosyanın `_readme` alanına yazıldı; panel o sırada kaydı **göstermedi** ve uyarı verdi (tasarlandığı gibi).
4. **Konum kapsaması %41** (29/70, ölçüm 08 Eki 2026). Harita artık VAR ama **ülke boyaması
   bilinçli olarak yok**: kapsama %60 kapısını geçmediği için koplet yanlış yoğunluk gösterirdi
   (ölçüm: "Ukrayna" ilgisiz bir cümleyle eşleşiyor). Harita yalnızca Rusya'yı vurgular ve
   konumu belirlenebilen olayların işaretçilerini gösterir; kapsama notu ekranda yazılıdır.
   Ayrıntı ve kapılar: `docs/harita-plani.md`.
5. **`sitemap.xml` olay adreslerini her ingest'te yeniden üretir** (slug devinimi). Google tarafında geçici 404'ler görülebilir; F3b bu maddeleri de çözer.
