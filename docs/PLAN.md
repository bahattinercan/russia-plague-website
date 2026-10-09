# Plague Tracker — Rusya'daki Veba Olayları için Kaynak İzleme ve Şeffaflık Panosu

**Plan sürümü:** 1.1
**Tarih:** 6 Ekim 2026 (plan) · **güncellendi:** 9 Ekim 2026, ölçülmüş uygulamaya göre
**Durum:** Kararlar §15'te kayıtlı. F0–F5 uygulandı (8 Eki 2026, `docs/arayuz-plani.md §16`).
Bu dosyada **uygulanmamış** olanlar açıkça işaretlidir: §5.6 (düzeltme günlüğü), §9.7 (söylenti kontrolü), §9.12 (bildirim), `refuted` etiketi, `metrics`/`corrections` tabloları.

---

## 1. Özet

Sibirya/Irkutsk merkezli şüpheli pnömonik veba olayı hakkında **güncel haberleri tek ekranda toplayan**, her haberi **kaynağına ve doğruluk seviyesine göre etiketleyen**, çelişkili iddiaları **gizlemeyip karşı karşıya gösteren** bir izleme sitesi.

Projenin ayırt edici özelliği hız değil, **güvenilirlik ve şeffaflıktır**:

1. Hiçbir haber kaynaksız yayınlanmaz (kaynak adı + tier + orijinal link + arşiv linki zorunlu).
2. **Sistem "doğrulandı" demez.** Tam otomatik bir sistem doğrulama iddia edemez; yalnızca *hangi kaynak ne bildirdi* raporlanır. En yüksek etiket "çoklu bağımsız kaynak bildiriyor"dur.
3. Sistem ne yaptığını açıklar: metodoloji sayfası, kaynak sağlık paneli, düzeltme günlüğü.
4. Güncellik ölçülebilir: her kartta "yayın zamanı" + "sistemimizin gördüğü zaman" ayrı gösterilir.
5. **TR + EN** çift dil; çevirinin makine çevirisi olduğu olay detayında belirtilir, orijinal başlık her zaman görünür.
6. Telegram/X sinyalleri **düşük güvenli iddia katmanı** olarak dahildir — asla tek başına ana akışta "haber" olarak gösterilmez.

---

## 2. Olayın Mevcut Durumu (6 Ekim 2026) — Neden Bu Site Gerekli

| Bilgi | Durum | Kaynak |
|---|---|---|
| Irkutsk Anti-Plague Enstitüsü'nde laborant (28) öldü | Doğrulanmış | Rospotrebnadzor, Meduza, BBC |
| Ölüm nedeni: "bilinmeyen etiyolojili pnömoni" (resmi) | Resmi açıklama | Rospotrebnadzor |
| Medyada geçen iddia: kırık tüpten pnömonik veba | Doğrulanmamış | RFE/RL kaynakları |
| ~200 kişi tıbbi gözlem / karantina | Doğrulanmış | AP, NBC, CNBC |
| Rus yetkililer: "kontaklarda veba tespit edilmedi" | Resmi açıklama (bağımsız teyit yok) | TASS/Rospotrebnadzor |
| WHO: halk sağlığı riski **düşük** | Resmi açıklama | WHO sözcüsü, RTE |
| ECDC: izliyor | Resmi | Euronews |

**Kritik gözlem:** Aynı olay hakkında resmi Rus açıklamaları ile küresel sağlık kurumları ve bağımsız medya arasında **sistematik çelişki** var. Basit bir "haber akışı" sitesi bu çelişkiyi ya yutar (tek taraflı olur) ya da panik üretir. Doğru tasarım bu çelişkiyi **veri olarak** gösterir.

---

## 3. Tasarım İlkeleri

| # | İlke | Uygulama |
|---|---|---|
| 1 | **Kaynaksız içerik yok** | Her kartta kaynak adı, tier, orijinal URL, arşiv URL'i |
| 2 | **Doğrulama dereceli** | `resmi` / `doğrulanmış` / `tek kaynak` / `doğrulanmamış iddia` etiketleri |
| 3 | **Bağımsızlık sayılır** | Aynı medya grubundan 3 haber = 1 kaynak |
| 4 | **Çelişki gizlenmez** | "Taraflar ne diyor" paneli |
| 5 | **Düzeltme şeffaf** | Düzeltme günlüğü + değişiklik geçmişi (audit log) |
| 6 | **Panik değil bağlam** | WHO/ECDC risk seviyesi her zaman görünür |
| 7 | **Ölçülebilir tazelik** | Kaynak sağlık paneli + "son kontrol" göstergesi |
| 8 | **Sadece alıntı, tam kopya yok** | Başlık + ≤2 cümle özet + link (telif güvenliği) |

---

## 4. Mimari ve Stack

### 4.1 Teknoloji Seçimi

| Katman | Seçim | Gerekçe |
|---|---|---|
| Frontend | **Next.js 16.4 (App Router) + TypeScript 7** | Vercel alışkanlığı, SSR/SEO. `params`/`searchParams` Promise; `middleware.ts` yerine `src/proxy.ts` |
| Stil | **Tailwind v4** + `@theme` token katmanı | Kullanıcının mevcut konvansiyonu |
| UI davranışı | Canlı ticker, scroll-reveal, sayaçlar, `prefers-reduced-motion` | Kullanıcı tercihi: "etkileyici/modern" |
| Veritabanı | **Postgres (Neon, eu-central-1)** + Drizzle ORM | Vercel'de kalıcı dosya yok; full-text arama gerekli |
| Zamanlanmış iş | **GitHub Actions cron (10 dk)** + cron-job.org `workflow_dispatch` | Vercel Hobby cron'u **günde 1 kez** ile sınırlı — yetersiz. GitHub'ın kendi `schedule`ı ücretsiz katmanda sözünü tutmuyor: `docs/dispatch-tetikleme.md` |
| Ingest | Node 24 + `rss-parser` + `cheerio` + `undici` + `tsx` | Tek dil, tek repo, kolay bakım |
| Cache | Bellek içi 60 sn önbellek (`src/lib/data.ts`) + `force-dynamic` | Upstash **kullanılmıyor**. `data/feed.json` izlendiği için ISR/derleme anı kabul edilemez |
| LLM (çeviri/özet) | Sağlayıcıdan bağımsız adaptör; extractive mod zorunlu | Halüsinasyon riski → üretken özet değil, kaynak-cümle seçimi |
| Harita | **Satır içi SVG + kendi varlığımız** (`scripts/build-world-map.ts`) | CSP `img-src 'self' data:` + `connect-src 'self'` dış karo servislerini bloklar → **MapLibre kullanılamaz** (`docs/harita-plani.md §2.4`) |
| Deploy | Vercel (web) + Neon (DB) | Kullanıcının mevcut akışı |

> **Alternatif değerlendirildi:** Astro + statik build. Reddedildi çünkü 10 dakikalık tazelik ve çelişki kümeleri için sunucu tarafı veri katmanı gerekiyor.

### 4.2 Repo Yapısı

> **Basitleştirme kararı (6 Eki 2026):** İlk taslaktaki `apps/` + `packages/` monorepo yapısı terk edildi. Tek Next.js uygulaması daha az parça, daha hızlı MVP ve Vercel'de daha az sürtünme demek. Modülerlik klasör düzeyinde korunuyor; gerçekten gerekirse sonradan workspaces'e taşınabilir.

```
russia-plague-website/
├─ src/
│  ├─ app/
│  │  ├─ [lang]/              # tr + en (dil yönlendirmesi `src/proxy.ts`) — TR varsayılan DEĞİL
│  │  │  ├─ page.tsx          # Pano
│  │  │  ├─ timeline/ · event/[slug]/ · locations/[slug]/ · figures/ · signals/ · sources/ · methodology/
│  │  │  ├─ not-found.tsx · [...rest]/page.tsx
│  │  │  └─ layout.tsx        # next/font (self-host): Inter + Newsreader + JetBrains Mono
│  │  ├─ robots.ts · sitemap.ts · apple-icon.tsx · icon.svg · favicon.ico
│  │  └─ globals.css          # `@theme` token'ları + kontrast + prefers-reduced-motion
│  ├─ components/             # StatusBar, StatusStrip, LeadStory, EventCard, EventModal, ClaimList,
│  │                          # FilterBar, FigurePanels, WorldMap, SignalList, SourceHealthPanel, Nav…
│  ├─ lib/
│  │  ├─ sources/
│  │  │  ├─ registry.ts       # 45 taranan kaynak + 59 tanınan yayıncı: tier, grup, trust, dil
│  │  │  └─ adapters/         # rss.ts, google-news.ts, html.ts, telegram.ts
│  │  ├─ ingest/pipeline.ts   # normalize → relevance → dedupe → cluster
│  │  ├─ trust.ts             # güven skoru + etiket mantığı
│  │  ├─ geo/                 # gazetteer, location (kapsama), map-frame
│  │  ├─ figures.ts · summarize.ts · text-match.ts · format.ts · data.ts · env.ts · health.ts
│  │  ├─ translate/           # glossary, detect, validate, provider, deepl, google, openai, cache, display
│  │  ├─ security/csp.ts      # nonce'lu CSP
│  │  ├─ i18n.ts              # TR/EN sözlükleri (87 anahtar, parite kapısı `ui-check`)
│  │  └─ storage/             # store.ts (fail-safe) → postgres.ts + json.ts + schema.ts
│  ├─ proxy.ts                # dil yönlendirmesi + nonce'lu CSP
│  └─ types.ts
├─ scripts/                   # ingest.ts, db-check.ts, cron-setup.ts, trigger-ingest.ts,
│                             # ui-check.ts, layout-check.ts, security-check.ts, translate-check.ts,
│                             # geo-check.ts, figures-check.ts, summarize-check.ts, build-world-map.ts
├─ data/                      # feed.json (MVP deposu, izleniyor) + figures.json + history/*.jsonl
├─ docs/                      # PLAN.md, arayuz-plani.md, harita-plani.md, ceviri-plani.md,
│                             # kaynak-envanteri.md, guvenlik-denetimi.md, dispatch-tetikleme.md
├─ public/                    # world-map.svg, world-map-focus.svg
├─ LICENSE · CONTRIBUTING.md · SECURITY.md · README.md · AGENTS.md
├─ .github/workflows/ingest.yml   # tek workflow (CI workflow'u YOK)
```

### 4.3 Veri Akışı

```
[ Zamanlanmış tetikleyici: GitHub Actions, 5–10 dk ]
              │
              ▼
   ┌──────────────────────────┐
   │ 1. TOPLA                 │  RSS / HTML parse / JSON API / Google News
   │  (kaynak adaptörleri)    │  her adaptör: timeout + retry + UA
   └───────────┬──────────────┘
               ▼
   ┌──────────────────────────┐
   │ 2. NORMALİZE             │  URL canonicalize, tarih normalize (UTC),
   │                          │  dil tespiti, içerik hash (SHA-256)
   └───────────┬──────────────┘
               ▼
   ┌──────────────────────────┐
   │ 3. TEKRAR GİDERME        │  URL eşleşmesi → başlık benzerliği (Jaccard
   │                          │  ≥0.7) → gövde shingle hash
   └───────────┬──────────────┘
               ▼
   ┌──────────────────────────┐
   │ 4. OLAY KÜMELEME         │  aynı olayı anlatan N haber → 1 "Event"
   │                          │  (anahtar kelime + tarih penceresi ±72s)
   │                          │  → kaynak çeşitliliği ve bağımsızlığı hesaplanır
   └───────────┬──────────────┘
               ▼
   ┌──────────────────────────┐
   │ 5. SINIFLANDIR & SKORLA  │  kategori (resmi/bilimsel/haber/iddia)
   │                          │  trust score, corroboration sayısı
   └───────────┬──────────────┘
               ▼
   ┌──────────────────────────┐
   │ 6. ÇEVİR / ÖZETLE        │  TR başlık + 2 cümle extractive özet
   │  (opsiyonel/LLM)         │  → makine çevirisi beyanı ZORUNLU (detayda)
   └───────────┬──────────────┘
               ▼
   ┌──────────────────────────┐
   │ 7. YAYINLA + İZLE        │  Postgres upsert, ISR revalidate,
   │                          │  kaynak sağlık kaydı, düzeltme tespiti
   └──────────────────────────┘
```

---

## 5. Doğruluk ve Güven Katmanı (Projenin Kalbi)

### 5.1 Kaynak Tier'ları

| Tier | Tanım | Örnekler | Taban güven |
|---|---|---|---|
| **T1 — Küresel otorite** | Salgın verisinin birincil kaynağı | WHO DON, WHO Euro, ECDC, US CDC, ProMED-mail, CIDRAP, ReliefWeb | 90–100 |
| **T2 — Bağımsız ajans/gazetecilik** | Editoryal denetimi kanıtlanmış | Reuters, AP, BBC, Al Jazeera, Euronews, CBC, NBC, PBS, BMJ, Lancet | 80–90 |
| **T3 — Resmi ulusal (Rusya)** | Birincil ama tek taraflı olabilir | Rospotrebnadzor, Sağlık Bakanlığı, İrkutsk yerel yönetimi, TASS, Interfax, RIA | 55–75 |
| **T4 — Bağımsız Rus/sürgün medya** | Sansür ortamında çalışan doğrulanmış gazetecilik | Meduza, RFE/RL, Novaya Gazeta Europe, The Insider, Moscow Times | 65–80 |
| **T5 — Toplayıcı/sinyal** | Doğrulama gerektirir, tek başına yayınlanmaz | Google News, GDELT, Telegram kanalları (Baza, Shot, Astra) | 20–40 |

> Kaynak güven puanı **elle yazılır ve versiyonlanır** (`sources.ts`), otomatik öğrenilmez. Şeffaflık için her kaynağın puanı ve gerekçesi metodoloji sayfasında yayınlanır.

### 5.2 Bağımsızlık Grupları — En Kritik Kural

Aynı sahiplik/editoryal hattaki kaynaklar **tek kaynak** sayılır. Depoda fiilen kullanılan grup adları (`registry.ts → GROUP_LABELS`):

| Grup | Kaynaklar |
|---|---|
| `kremlin` | TASS, RIA Novosti, RT, Sputnik, Zvezda, İzvestia *(devlet medyası — `official` sayılmaz)* |
| `ru-gov` | Rospotrebnadzor, Sağlık Bakanlığı, valilikler |
| `who-family` | WHO, PAHO, WHO Euro (aynı kurum ailesi) |
| `us-cdc` / `eu-ecdc` / `un-agency` | US CDC / ECDC / ReliefWeb |
| `ru-independent` | Meduza, Novaya Gazeta Europe, The Insider, Moscow Times, Astra |
| `aggregator` | Google News, GDELT |
| `social-signal` | Telegram kanalları (Baza, Shot, Astra) |
| tek kaynaklı gruplar | Reuters, AP, BBC, Guardian, NBC, NPR, PBS, Le Monde, Al Jazeera, Euronews, BMJ, Lancet, Science… (her biri kendi grubu) |

> İlk taslakta `intl-agency`, `intl-agency-2`, `research` gibi toplu gruplar vardı; uygulamada her yayıncı **kendi grubudur** ve yalnızca gerçekten aynı çatıdaki kaynaklar (`kremlin`, `who-family`, `ru-gov`) gruplanır.

**Kural:** `corroborated` etiketi için **≥2 farklı bağımsızlık grubu** gerekir. TASS + RIA + Sputnik aynı haberi yazsa corroboration = 1'dir.

### 5.3 Doğruluk Etiketleri (UI'da görünür)

| Etiket | Koşul | Görsel | Durum |
|---|---|---|---|
| ✅ **Resmi açıklama** (`official`) | Gerçek resmi kurum açıklaması (`who-family`, `us-cdc`, `eu-ecdc`, `ru-gov`) | Mavi | uygulandı |
| 🟢 **Çoklu bağımsız kaynak bildiriyor** (`corroborated`) | ≥2 farklı bağımsızlık grubu aynı olayı bildirdi | Yeşil | uygulandı |
| 🟡 **Tek kaynak bildiriyor** (`single`) | Sadece 1 grup bildirdi | Sarı | uygulandı |
| 🟠 **Doğrulanmamış iddia** (`unverified`) | T5 / Telegram / "kaynaklara göre" | Turuncu | uygulandı |
| 🔴 **Çelişkili** (`contradicted`) | Aynı olay için zıt iddialar var | Kırmızı | uygulandı |
| ⚪ **Çürütüldü** (`refuted`) | Resmi/bilimsel kanıtla yanlışlandı | Gri + üstü çizili | **uygulanmadı** — otomatik sistem çürütme iddia edemez |

> **Dil kuralı (editoryal karar):** Sitenin hiçbir yerinde "doğrulandı", "confirmed", "teyit edildi" ifadesi kullanılmaz. Bunun yerine "N bağımsız kaynak grubu bildiriyor" denir. Sistem doğrulama yapmaz; **kaynak durumunu raporlar**. Bu kural metodoloji sayfasında da açıkça yazılır ve UI testi ile korunur.

### 5.4 Çelişki Motoru

Her `Event` altında `claims` tutulur. Aynı event'te karşıt yönlü claim'ler varsa (örn. "veba tespit edilmedi" ↔ "şüpheli pnömonik veba") UI otomatik olarak **"Taraflar ne diyor?"** panelini açar:

```
┌──────────────────────────────────────────────────────────────┐
│  Taraflar ne diyor?              Çelişki: RESMİ vs MEDYA     │
├──────────────────────────┬───────────────────────────────────┤
│ Rospotrebnadzor (T3)     │ WHO / bağımsız medya              │
│ "Kontaklarda veba tespit │ "Testler sürüyor; kesin tanı      │
│  edilmedi, durum stabil" │  açıklanmadı"                     │
│ 5 Eki 2026 · ru-state    │ 5–6 Eki 2026 · who-family + T2    │
└──────────────────────────┴───────────────────────────────────┘
```

Bu panel **elle yazılmaz**, claim çıkarımı + sınıflandırmadan otomatik üretilir (`src/components/ContradictionPanel.tsx`). Yanlış pozitif olursa editör 1 tıkla kapatabilir — **bu editör arayüzü henüz yok** (kapalı sistem, §15 karar 3).

### 5.5 Trust Score Formülü

Planlanan formül:

```
trust = tier_base
      + min(bağımsız_grup_sayısı - 1, 4) × 6      // çoklu teyit
      + (peer-reviewed veya T1 doğrulaması ? +8 : 0)
      + (birincil belge/veri var mı ? +5 : 0)
      - (kaynağın geçmiş düzeltme oranı × 20)      // hatalı kaynak ceza alır
      - (devlet kontrolü cezası: rus-state -8, rus-gov -5)
```

**Uygulanan hâli** (`src/lib/trust.ts`):

```
trust = clamp(trustBase + min(max(grup - 1, 0), 4) × 6 + stateControlPenalty, 0, 100)
```

`trustBase` elle belirlenir ve otomatik öğrenilmez. `peer-reviewed`, `birincil belge` ve `geçmiş düzeltme oranı` terimleri **uygulanmadı** — düzeltme günlüğü (§5.6) kapsam dışı olduğu için ölçülecek bir geçmiş yok. Devlet kontrolü cezası `registry.ts`'teki `stateControlPenalty` ile verilir.

Skor kartta **rakam olarak değil, etiket olarak** gösterilir (kullanıcıyı yanlış kesinlik hissine sokmamak için). Rakam metodoloji sayfasında formülüyle açıklanır.

### 5.6 Düzeltme ve Şeffaflık Mekanizması

- Her haber ve event için **değişiklik geçmişi** (kim/ne zaman/ne değişti). → **uygulanmadı** (kapalı sistemde editör yok; `docs/arayuz-plani.md §0.1` kapsam dışı kararı).
- Bir kaynak yanlış çıktıysa: ilgili makale "düzeltildi" olarak işaretlenir, **silinmez**. → uygulanmadı.
- **Düzeltmeler günlüğü** sayfası: `Tarih · Ne düzeltildi · Neden · Kaynak`. → uygulanmadı (kapsam dışı).
- Her makale için **arşiv anlık görüntüsü**: `archive.org` linki + kendi `content_hash`'i (metin değişirse uyarı). → **kısmen uygulandı**: `archiveUrlFor()` ile arşiv linki her kayıtta var (`EventCard`, `ClaimList`); `content_hash` üretilir ve çeviri önbelleği için kullanılır, ama "metin değişti" uyarısı yok. Google News toplayıcı linkleri arşivlenemez → `archiveUrlFor` null döner.

---

## 6. Güncellik Stratejisi

| Katman | Sıklık | İçerik |
|---|---|---|
| Sıcak katman | **5–10 dk** | Google News RSS (çok dilli sorgular), T2 haber feed'leri, Meduza, RFE/RL, TASS |
| Resmi katman | **30 dk** | WHO DON (HTML parse), ECDC, Rospotrebnadzor (proxy/ayna), CIDRAP RSS |
| Derin katman | **6 saat** | BMJ/Lancet/akademik, ProMED haftalık özetler, ReliefWeb |
| Sağlık kontrolü | **her çalıştırmada** | her adaptörün HTTP kodu, gecikmesi, dönen öğe sayısı |

### 6.1 Tazelik göstergeleri (UI)

- Kartlarda: "yayınlandı: 3 sa önce" **ve** "sistemimiz gördü: 4 dk önce" — ikisi ayrı.
- Üst barda (`StatusBar`): `CANLI ● Son tarama …` — sayı taşımaz, kaynak sağlığı nokta renginde. Sayılar panonun durum şeridinde (`StatusStrip`: son 24 saat, en son gelişme, veri tazeliği, son ziyaretten beri) ve `/sources` sayfasındadır.
- **Sakinlik modu:** Son 2 saatte yeni gelişme yoksa: "Son gelişme 3 saat önce — durum stabil" (boş ekran panik hissi vermez). → **uygulanmadı** (karar duruyor, kodda karşılığı yok).
- **Dead man's switch:** ingest 60 dk çalışmazsa GitHub Actions issue açar + alarm. → **kısmen uygulandı**: issue yalnızca bir koşu **başarısız olduğunda** açılıyor; "hiç koşmadı" durumu GitHub'ın kendi `if` koşuluyla ölçülemez. 60 dk eşiği pratikte cron-job.org alarmı + `schedule` yedeği ile kapatılıyor (`docs/dispatch-tetikleme.md §5`).

### 6.2 Kaynak Sağlık Paneli

Her kaynak için: son başarı zamanı, HTTP kodu, gecikme, dönen öğe sayısı, en yeni öğe tarihi, bayatlık ve hata (`/sources` sayfası + durum şeridi). Bozuk feed **kullanıcıya görünür**: "şu an şu kaynağı çekemiyoruz" demek, sessizce eksik göstermekten iyidir.

> "Ardışık hata sayısı" uygulanmadı — `source_health` tablosunda sayaç yok, her çalıştırma ayrı satır. Bayatlık eşiği 30 gün (`STALE_DAYS`).

---

## 7. Kaynak Envanteri

Ayrıntılı liste, erişim testi sonuçları ve yedek stratejiler: **`docs/kaynak-envanteri.md`**

Depoda fiilen taranan: **45 kaynak** (`SOURCES`) · yalnızca kimlik ataması için tanınan yayıncı: **59** (`KNOWN_PUBLISHERS`). Tarananların katman dağılımı: T1 7 · T2 25 · T3 5 · T4 4 · T5 4.

**Test sonucu özeti (6 Eki 2026, TR'den):**

| Kaynak | Metot | Durum |
|---|---|---|
| Google News RSS | RSS (çok dilli sorgu) | ✅ 200 |
| Meduza | RSS | ✅ 200 |
| RFE/RL | RSS/API | ✅ 200 |
| Moscow Times | RSS | ✅ 200 |
| TASS | RSS (`tass.com/rss/v2.xml`) | ✅ 200 |
| CIDRAP | RSS (`cidrap.umn.edu/rss.xml`) | ✅ 200 |
| ReliefWeb | RSS (`reliefweb.int/updates/rss.xml`) | ✅ 200 (API v2 → 403, RSS fallback) |
| GDELT | JSON API | ✅ 200 (429 rate-limit → backoff gerekli) |
| **WHO DON** | RSS **kaldırılmış (404)** | ⚠️ HTML parse + ReliefWeb yedeği |
| **ProMED** | RSS **yok (404)** | ⚠️ HTML parse (haftalık, düşük sıklık) |
| **ECDC** | RSS **404** | ⚠️ HTML parse |
| **Rospotrebnadzor** | Erişilemedi (000) | ⚠️ proxy/VPN gerekli, alternatif: TASS üzerinden aktarım |

> **GDELT satırı bir erişim testidir, tarama değildir:** `SOURCES`'ta GDELT adaptörü yok; yalnızca `aggregator` grubu etiketi var. X/Twitter API'si ücretli olduğu için kapsam dışı.

> **Kural:** Her T1 kaynağının **en az iki erişim yolu** olmalı (birincil + yedek). Tek yola bağlı kaynak "tek nokta arıza" sayılır.

---

## 8. Veri Modeli

### 8.1 Uygulanan şema (`src/lib/storage/schema.ts`)

```
articles        (id, source_slug, source_name, url, canonical_url, title_original,
                 title_tr, lang, published_at, fetched_at, excerpt_original, excerpt_tr,
                 content_hash, archive_url, via_aggregator, original_publisher_slug,
                 translation_status)

events          (id, slug, title, title_original, title_tr, summary, summary_tr,
                 label, first_seen_at, last_update_at, translation_status)

event_claims    (event_id, source_slug, source_name, tier, independence_group,
                 title, title_tr, url, published_at)

event_articles  (event_id, article_id)

source_health   (source_slug, checked_at, ok, http_status, latency_ms, items_found,
                 newest_item_at, stale, error)

ingest_reports (id, started_at, finished_at, duration_ms, sources, articles_fetched,
                 articles_new, articles_relevant, events, label_counts,
                 ingest_healthy, dead_man_message)
```

Bağlantı ilk bağlantıda `CREATE TABLE IF NOT EXISTS` ile kurulur; `ensureSchema` yalnızca var olmayan tabloları koşar, mevcut tabloyu değiştirmez. Bu yüzden şema değişikliğinde üç yer birlikte güncellenmeli: Drizzle tablosu, `SCHEMA_SQL` ve `ALTER TABLE` (`docs/ceviri-plani.md §11`).

Retention: `source_health` 90 gün, `articles` 180 gün (`src/lib/storage/schema.ts` → `HEALTH_RETENTION_DAYS` / `ARTICLE_RETENTION_DAYS`).

### 8.2 Planda olan, uygulanmayan

- `sources` tablosu → yerine `registry.ts` (kod, veri değil).
- `claims.status` / `claim_type` / `independence_groups[]` → uygulanan claim satırında **durum yok**; etiket olay düzeyinde hesaplanıyor (`src/lib/trust.ts`). `status` değerleri arasında `confirmed` geçiyordu — editoryal kural gereği UI'da "doğrulandı" denmez, bu yüzden claim düzeyinde durum tutulmuyor.
- `metrics` tablosu → yerine `data/figures.json` + `src/lib/figures.ts` (küratörlü rakamlar, her kayıt bir kaynak cümlesine bağlı).
- `corrections` tablosu → kapsam dışı (§5.6).
- `events.status` / `severity` / `location` / `confidence_score` → uygulanmadı; konum `src/lib/geo/` ile çıkarım, güven puanı hesap anında.
- `roles[]`, `consecutive_failures`, `image_url` → uygulanmadı.

---

## 9. Arayüz Bölümleri

1. **Durum Bandı (üst, sabit)** — canlı tarama göstergesi · son güncelleme · "metodoloji" linki. Sayılar ve veri kaynağı göstergesi kaldırıldı; sağlık nokta renginde. *(uygulandı)*
2. **"Şu an ne biliyoruz?"** — en fazla 6 madde, her madde kaynak rozetli ve doğruluk etiketli. *(uygulandı — `TopEventList`)*
3. **Taraflar ne diyor?** — çelişki paneli (otomatik). *(uygulandı — `ContradictionPanel`)*
4. **Zaman Çizelgesi** — kronolojik akış; her kart: TR başlık (varsa orijinali yanında), kaynak badge'i, tier, doğruluk etiketi, bağımsız kaynak sayısı, yayın/sistem zamanları, arşiv linki. *(uygulandı — `/timeline`, sayfalı + filtreli)*
5. **Sayısal Durum** — vaka / ölüm / karantina sayıları; her sayının yanında kaynağı ve `as_of` tarihi. Resmi ve bağımsız veriler çelişiyorsa ikisi de gösterilir. *(uygulandı — `/figures`; `test` metrik henüz yok)*
6. **Harita** — İrkutsk + komşu bölgeler, olay yoğunluğu. *(uygulandı — satır içi SVG bağlam haritası; **MapLibre kullanılamaz**, CSP dış karo servislerini bloklar: `docs/harita-plani.md §2.4`)*
7. **Söylenti Kontrolü** — dolaşımdaki iddialar: Doğru / Yanlış / Kanıtlanmamış, gerekçesiyle. *(uygulanmadı — "Doğru/Yanlış" yargısı §5.3 dil kuralıyla çelişiyor)*
8. **Kaynak Güven Panosu** — tier tablosu, sağlık durumu, bağımsızlık grupları, trust formülü. *(uygulandı — `/sources` + metodoloji sayfası)*
9. **Düzeltmeler Günlüğü**. *(kapsam dışı — §5.6)*
10. **Metodoloji / Bu site nasıl çalışır?** *(uygulandı)*
11. **Arşiv & Arama** — tarih aralığı, kaynak, etiket filtresi. *(uygulandı — `/timeline` filtreleri, JS'siz form)*
12. **Bildirim (opsiyonel, Faz 4)** — Telegram bot (varsayılan sessiz; sadece "çoklu bağımsız kaynak + kritik" seviye). *(uygulanmadı)*

Ek olarak uygulanan ama planda olmayanlar: `Bölgeler` (`/locations`), `Sinyaller` (`/signals`), kalıcı olay sayfaları (`/event/<slug>`), "son ziyaretten beri yeni" katmanı, saat dilimi düğmesi (UTC varsayılan), `sitemap`/`robots`, dil duyarlı 404. Ayrıntı: `docs/arayuz-plani.md`.

**Etkileşim dili:** scroll-reveal, sayaçlar, hover mikro-etkileşimleri — ancak **`prefers-reduced-motion` tamamen desteklenir**. Acil sağlık durumunda süsün bilgiyi gölgelemesi yasak: doğruluk etiketi ve kaynak her zaman en yüksek görsel öncelik.

---

## 10. İçerik, Hukuk ve Etik

| Konu | Karar |
|---|---|
| Telif | Başlık + ≤2 cümle alıntı + kaynak linki + arşiv linki. **Tam metin asla kopyalanmaz.** |
| Lisans | Kod ve dokümantasyon **MIT** (9 Eki 2026, açık kaynak kararı): `LICENSE` depoda, `package.json` `MIT`. Lisans yalnızca kodu kapsar; toplanan içerik yayıncıların telifine tabidir. |
| Çeviri | LLM kullanılırsa her TR metin makine çevirisidir; beyan olay detayında verilir, orijinal başlık her zaman görünür. |
| Özet | **Üretken değil, çıkarımsal (extractive):** kaynak metinden cümle seçilir, yeniden yazılmaz. Halüsinasyon yüzeyi sıfırlanır. |
| Tıbbi tavsiye | Sitede açık uyarı: "Bu site haber izleme aracıdır, tıbbi tavsiye değildir. Resmi kurum açıklamalarını esas alın." |
| Kişisel veri | Kişi adları yalnızca resmi kurum/kamuya açık bildirimde geçiyorsa gösterilir. Sağlık verisi işlenmez, KVKK/GDPR notu eklenir. |
| Panik önleme | Her sayfada güncel risk seviyesi bağlamı; "şüpheli/doğrulanmamış" dili asla sansasyona çevrilmez. |
| Tarafsızlık | Kaynak çeşitliliği zorunlu: hiçbir olay tek bakış açısıyla (yalnız resmi Rusya ya da yalnız Batı medyası) gösterilmez. |
| Düzeltme | Yanlış bilgi yayınlanırsa silinmez; düzeltme notu + zaman damgasıyla düzeltilir. |

---

## 11. Yol Haritası

| Faz | Süre | Çıktı | Kabul kriteri |
|---|---|---|---|
| **F0 — İskelet & kaynak doğrulama** | 0.5–1 gün | Repo, Drizzle şema, kaynak envanteri testi, erişim yedekleri | Her T1 kaynağı için çalışan ≥1 erişim yolu kanıtlandı |
| **F1 — Ingest MVP** | 2–3 gün | 6–8 adaptör, dedupe, Postgres upsert, ham akış UI | Yeni haber ≤15 dk içinde sitede |
| **F2 — Doğruluk katmanı** | 2–3 gün | Olay kümeleme, bağımsızlık grupları, trust score, çelişki paneli, etiketler | Etiketler 20 gerçek örnek üzerinde elle denetlendi; yanlış "doğrulanmış" = 0 |
| **F3 — Güncellik & operasyon** | 1–2 gün | GitHub Actions cron, kaynak sağlık paneli, dead man's switch, tazelik UI | Kaynak çöktüğünde ≤1 saat içinde panelde görünür |
| **F4 — Zenginleştirme** | 2–4 gün | TR çeviri/özet, metodoloji sayfası, düzeltme günlüğü, harita, arama, (ops.) Telegram | Metodoloji sayfası yayında; arama ve filtre çalışıyor |
| **F5 — Sürekli** | — | Aylık kaynak denetimi, yeni kaynak ekleme, doğruluk örneklemi | Ayda 1 doğruluk denetim raporu |

**Toplam tahmini:** ~8–13 iş günü (F0–F4).

**Durum (9 Eki 2026):** F0–F4 uygulandı, F5 sürüyor. Faz faz uygulama günlüğü ve ölçümler: `docs/arayuz-plani.md §16`, `docs/harita-plani.md §5`. F4'te planlanan düzeltme günlüğü kapsam dışına alındı; harita MapLibre yerine satır içi SVG olarak yapıldı (CSP kısıtı).

---

## 12. Riskler ve Önlemler

| Risk | Olasılık | Etki | Önlem |
|---|---|---|---|
| Rus sitelerine erişim engeli (Rospotrebnadzor testte erişilemedi) | Yüksek | Orta | Proxy/VPN, TASS üzerinden aktarım, Google News cache, ayna |
| Kaynak feed'i kaldırılır (WHO RSS kanıtlandı) | Yüksek | Orta | Çoklu metot: RSS → HTML → API → toplayıcı; her kaynağa ≥2 yol |
| **Yanlış bilgi yayma** | Orta | **Çok yüksek** | Bağımsızlık grupları, ≥2 grup kuralı, extractive özet, düzeltme günlüğü, editör onayı opsiyonu |
| LLM halüsinasyonu | Orta | Yüksek | Üretken özet yok; sadece seçme/çeviri; her cümle kaynak span'ına bağlı; çeviri etiketi |
| Telif ihlali | Orta | Orta | Başlık + 2 cümle + link; tam metin ve görsel hotlink yok |
| Panik/yanlış yönlendirme | Orta | Yüksek | Bağlam bandı, WHO risk seviyesi, "sakin dönem" modu |
| Cron'un sessizce durması | Orta | Yüksek | Dead man's switch, sağlık paneli, monitoring |
| Bakım yorgunluğu | Yüksek | Orta | Adaptör başına 1 dosya, otomatik health check, ayda 1 denetim |
| Haber akışının kesilmesi → boş site | Orta | Düşük | Arşiv, "durum stabil" modu, geçmiş timeline |
| Sitenin kendisinin engellenmesi (Rusya'dan) | Düşük | Düşük | Statik/önbellekli görünüm, ayna, IPFS opsiyonel |

---

## 13. Kabul Kriterleri (Definition of Done)

1. Yeni bir haber, kaynağı yayınladıktan sonra **≤15 dakika** içinde sitede görünür. *(cron-job.org ile 10 dk kadans — `docs/dispatch-tetikleme.md`)*
2. Her kartta **kaynak adı + tier + yayın zamanı + orijinal link + arşiv linki** bulunur. *(uygulandı)*
3. "Çoklu bağımsız kaynak bildiriyor" etiketi, 20 örnek vaka denetiminde **yanlış pozitif üretmez**. *(denetim yapıldı; aynı haberi iki olay sayma hatası 2c10892 ile kapatıldı)*
4. TASS + RIA + Sputnik aynı haberi yazdığında bağımsız kaynak sayısı **1** olarak hesaplanır. *(uygulandı — `kremlin` grubu)*
5. Sitede "doğrulandı/confirmed/teyit edildi" ifadesi **hiçbir yerde geçmez** — `ui-check` + `summarize-check` ile kapı altında.
6. Kaynak bozulduğunda sağlık panelinde **≤1 saat** içinde görünür. *(uygulandı — `/sources`)*
7. Metodoloji sayfası yayında ve trust formülü açıkça yazılı. *(uygulandı)*
8. Her düzeltme kaydı zaman damgalı ve geriye dönük görülebilir. *(kapsam dışı — §5.6)*
9. Mobil dahil Lighthouse performans ≥ 90; `prefers-reduced-motion` çalışıyor. *(reduced-motion uygulandı; Lighthouse skoru henüz ölçülmedi)*
10. Sitede tıbbi tavsiye olmadığına dair uyarı her sayfada erişilebilir. *(uygulandı — `Disclaimer`)*
11. Sayfa hatası veya boş veri durumunda kullanıcı "neden boş" sorusunun cevabını görür. *(uygulandı — `not-found.tsx` + boş durum metinleri)*

---

## 14. Kabul Edilmiş Varsayımlar

- Yayın ücretsiz katmanlarda yapılır (Neon free + Vercel Hobby + GitHub Actions public repo).
- Kaynak güven puanları **elle** belirlenir ve sürümlenir; otomatik öğrenme yok.
- Site **haber izleme aracıdır**, tıbbi tavsiye veya resmi bilgi kaynağı değildir.

---

## 15. Alınan Kararlar (6 Ekim 2026)

| # | Karar | Sonuç |
|---|---|---|
| 1 | **Dil:** TR + EN | Rotalar `[lang]` (tr + en); içerik TR çeviri + orijinal başlık. Varsayılan dil `en` (`DEFAULT_LOCALE`); tarayıcı dili TR ise `/tr`, `lang` çerezi geçersiz kılar (`src/proxy.ts`) |
| 2 | **Otomasyon:** Tam otomatik, **"doğrulanmış" etiketi yok** | İnsan onayı yok → sistem doğrulama iddia etmez; en yüksek etiket "çoklu bağımsız kaynak bildiriyor". Ayrıca bkz. §5.3 dil kuralı |
| 3 | **Telegram/X katmanı:** Dahil | T5, sadece "doğrulanmamış iddia" olarak; ana akışta tek başına haber sayılmaz |
| 4 | **Repo:** Public — proje **açık kaynak**, lisans **MIT** (9 Eki 2026) | GitHub Actions cron sınırsız dakika; kaynak kod ve güven puanları şeffaf. `LICENSE` depoda, `package.json` `MIT`; katkı kuralları `CONTRIBUTING.md`, bildirme yolu `SECURITY.md`. Doğrulama: `gh repo view` → PUBLIC. Kota matematiği ve geri dönüş riski: `docs/dispatch-tetikleme.md` |
| 5 | **TR çeviri:** Sağlayıcıdan bağımsız ingest-time çeviri + önbellek (7 Eki 2026) | `auto`: DeepL → OpenAI → anahtarsız Google; makine çevirisi beyanı olay detayında, orijinal başlık her zaman görünür; doğrulama kapıları editoryal kuralı korur. Ayrıntı: `docs/ceviri-plani.md` |
| 6 | **Marka adı:** `Plague Tracker` (7 Eki 2026) | Wordmark boşluklu yazılır (`Plague Tracker`); crawler User-Agent teknik kimlik olarak boşluksuz kalır (`PlagueTrackerBot`, bkz. `sources/registry.ts`). UI `siteName` artık README ile aynı; eski "What is new about plague" başlığı ve ilk çalışma adı `VebaTakip` kaldırıldı. Alan adı seçimi hâlâ açık. |

### Kalan açık sorular

1. **Alan adı:** Marka adı `Plague Tracker` olarak kararlaştırıldı (7 Eki 2026, §15 karar 6). Özel alan adı seçimi hâlâ açık — Vercel proje adı `plague-tracker`, canlı adres `https://plague-tracker.vercel.app` (`vercel domains ls` boş).
2. **LLM bütçesi:** Karar (7 Eki 2026): sağlayıcıdan bağımsız adaptör; `DEEPL_API_KEY`/`OPENAI_API_KEY` varsa o kullanılır, yoksa anahtarsız Google. Bkz. `docs/ceviri-plani.md` §15.
3. **Neon hesabı:** Kapandı — Postgres fiilen kullanılıyor (Neon eu-central-1). Connection string `.env.local`'da ve GitHub Secret olarak; Vercel'de Production/Preview ayrımı `docs/guvenlik-denetimi.md §6`.
4. **Bildirim:** Telegram bot / e-posta uyarısı isteniyor mu (F4)?
5. **Hedef kitle ağırlığı:** Kapandı (8 Eki 2026): birincil kitle **ilk kez gelen kamuoyu** ("10 saniyede durum ne"). Bkz. `docs/arayuz-plani.md §1`.
6. **Lisans:** Kapandı (9 Eki 2026): proje açık kaynak, **MIT**. `LICENSE` eklendi, `package.json` `ISC` → `MIT`. Toplanan içerik yayıncıların telifine tabidir (§10 Telif satırı).
