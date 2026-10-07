# Plague Tracker — Rusya'daki Veba Olayları için Kaynak İzleme ve Şeffaflık Panosu

**Plan sürümü:** 1.0
**Tarih:** 6 Ekim 2026
**Durum:** Onaylandı — kararlar §15'te kayıtlı (6 Eki 2026)

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
| Frontend | **Next.js 15 (App Router) + TypeScript** | Vercel alışkanlığı, ISR ile taze veri, SSR/SEO |
| Stil | **Tailwind v4** + `@theme` token katmanı | Kullanıcının mevcut konvansiyonu |
| UI davranışı | Canlı ticker, scroll-reveal, sayaçlar, `prefers-reduced-motion` | Kullanıcı tercihi: "etkileyici/modern" |
| Veritabanı | **Postgres (Neon free tier)** + Drizzle ORM | Vercel'de kalıcı dosya yok; full-text arama gerekli |
| Zamanlanmış iş | **GitHub Actions cron (10 dk)** | Vercel Hobby cron'u **günde 1 kez** ile sınırlı — yetersiz |
| Ingest | Node 24 + `rss-parser` + `cheerio` + `undici` | Tek dil, tek repo, kolay bakım |
| Cache | Next.js `revalidate` + Upstash Redis (opsiyonel) | Aynı içeriği tekrar işlememek için |
| LLM (çeviri/özet) | Sağlayıcıdan bağımsız adaptör; extractive mod zorunlu | Halüsinasyon riski → üretken özet değil, kaynak-cümle seçimi |
| Deploy | Vercel (web) + Neon (DB) | Kullanıcının mevcut akışı |

> **Alternatif değerlendirildi:** Astro + statik build. Reddedildi çünkü 10 dakikalık tazelik ve çelişki kümeleri için sunucu tarafı veri katmanı gerekiyor.

### 4.2 Repo Yapısı

> **Basitleştirme kararı (6 Eki 2026):** İlk taslaktaki `apps/` + `packages/` monorepo yapısı terk edildi. Tek Next.js uygulaması daha az parça, daha hızlı MVP ve Vercel'de daha az sürtünme demek. Modülerlik klasör düzeyinde korunuyor; gerçekten gerekirse sonradan workspaces'e taşınabilir.

```
russia-plague-website/
├─ src/
│  ├─ app/                    # Next.js 15 App Router
│  │  ├─ (tr)/                # /tr (varsayılan dil)
│  │  └─ en/
│  ├─ components/
│  ├─ lib/
│  │  ├─ sources/
│  │  │  ├─ registry.ts       # kaynak envanteri: tier, grup, trust, dil
│  │  │  └─ adapters/         # rss.ts, google-news.ts, html.ts, telegram.ts
│  │  ├─ ingest/              # normalize → dedupe → cluster → label
│  │  ├─ trust.ts             # güven skoru + bağımsızlık grupları
│  │  ├─ i18n.ts              # TR/EN sözlükleri
│  │  └─ storage/             # json.ts (MVP) → postgres.ts (Neon)
│  └─ types.ts
├─ scripts/ingest.ts          # cron giriş noktası
├─ data/                      # MVP: feed.json + arşiv
├─ docs/                      # PLAN.md, kaynak-envanteri.md, metodoloji.md
└─ .github/workflows/ingest.yml
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

Aynı sahiplik/editoryal hattaki kaynaklar **tek kaynak** sayılır:

| Grup | Kaynaklar |
|---|---|
| `ru-state` | TASS, RIA Novosti, RT, Sputnik, Zvezda, İzvestia |
| `ru-gov` | Rospotrebnadzor, Sağlık Bakanlığı, valilikler |
| `ru-independent` | Meduza, Novaya, The Insider, Moscow Times, Astra |
| `intl-agency` | Reuters (kendi grubu) |
| `intl-agency-2` | AP (kendi grubu) |
| `who-family` | WHO, PAHO, WHO Euro (aynı kurum ailesi) |
| `research` | BMJ, Lancet, NEJM, CIDRAP (akademik/yorum) |

**Kural:** `doğrulanmış` etiketi için **≥2 farklı bağımsızlık grubu** gerekir. TASS + RIA + Sputnik aynı haberi yazsa corroboration = 1'dir.

### 5.3 Doğruluk Etiketleri (UI'da görünür)

| Etiket | Koşul | Görsel |
|---|---|---|
| ✅ **Resmi açıklama** | T1/T3 resmi kurum açıklaması | Mavi |
| 🟢 **Çoklu bağımsız kaynak bildiriyor** | ≥2 farklı bağımsızlık grubu aynı olayı bildirdi | Yeşil |
| 🟡 **Tek kaynak bildiriyor** | Sadece 1 grup bildirdi | Sarı |
| 🟠 **Doğrulanmamış iddia** | T5 / Telegram / "kaynaklara göre" | Turuncu |
| 🔴 **Çelişkili** | Aynı olay için zıt iddialar var | Kırmızı |
| ⚪ **Çürütüldü** | Resmi/bilimsel kanıtla yanlışlandı | Gri + üstü çizili |

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

Bu panel **elle yazılmaz**, claim çıkarımı + sınıflandırmadan otomatik üretilir. Yanlış pozitif olursa editör 1 tıkla kapatabilir.

### 5.5 Trust Score Formülü

```
trust = tier_base
      + min(bağımsız_grup_sayısı - 1, 4) × 6      // çoklu teyit
      + (peer-reviewed veya T1 doğrulaması ? +8 : 0)
      + (birincil belge/veri var mı ? +5 : 0)
      - (kaynağın geçmiş düzeltme oranı × 20)      // hatalı kaynak ceza alır
      - (devlet kontrolü cezası: rus-state -8, rus-gov -5)
```

Skor kartta **rakam olarak değil, etiket olarak** gösterilir (kullanıcıyı yanlış kesinlik hissine sokmamak için). Rakam metodoloji sayfasında açıklanır.

### 5.6 Düzeltme ve Şeffaflık Mekanizması

- Her haber ve event için **değişiklik geçmişi** (kim/ne zaman/ne değişti).
- Bir kaynak yanlış çıktıysa: ilgili makale "düzeltildi" olarak işaretlenir, **silinmez**.
- **Düzeltmeler günlüğü** sayfası: `Tarih · Ne düzeltildi · Neden · Kaynak`.
- Her makale için **arşiv anlık görüntüsü**: `archive.org` linki + kendi `content_hash`'i (metin değişirse uyarı).

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
- Üst barda: `CANLI ● Son tarama 2 dk önce · 47 kaynak sağlıklı · 1 kaynak hatalı`.
- **Sakinlik modu:** Son 2 saatte yeni gelişme yoksa: "Son gelişme 3 saat önce — durum stabil" (boş ekran panik hissi vermez).
- **Dead man's switch:** ingest 60 dk çalışmazsa GitHub Actions issue açar + alarm.

### 6.2 Kaynak Sağlık Paneli

Her kaynak için: son başarı zamanı, ardışık hata sayısı, ortalama gecikme. Bozuk feed **kullanıcıya görünür** (güvenin parçası: "şu an şu kaynağı çekemiyoruz" demek, sessizce eksik göstermekten iyidir).

---

## 7. Kaynak Envanteri

Ayrıntılı liste, erişim testi sonuçları ve yedek stratejiler: **`docs/kaynak-envanteri.md`**

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

> **Kural:** Her T1 kaynağının **en az iki erişim yolu** olmalı (birincil + yedek). Tek yola bağlı kaynak "tek nokta arıza" sayılır.

---

## 8. Veri Modeli

```
sources        (id, slug, name, homepage, feed_url, tier, independence_group,
                trust_base, roles[], status, last_ok_at, last_error, consecutive_failures)

articles       (id, source_id, url, canonical_url, title_original, lang,
                published_at, fetched_at, excerpt_original, content_hash,
                archive_url, image_url, is_machine_translated)

events         (id, slug, title_tr, title_en, summary_tr, first_seen_at,
                last_update_at, status [active/monitoring/resolved],
                severity, location, confidence_score)

event_articles (event_id, article_id, relation [primary/corroborating/contradicting])

claims         (id, event_id, text_tr, claim_type, status [official/confirmed/
                reported/unverified/refuted], asserted_by_source_id,
                independence_groups[], checked_at, notes)

metrics        (id, event_id, metric [cases/deaths/quarantined/tested],
                value, unit, as_of, source_id, is_official)

corrections    (id, entity_type, entity_id, field, old_value, new_value,
                reason, created_by, created_at)

health_checks  (id, source_id, checked_at, http_status, latency_ms, items_found)
```

Tüm tablolarda `created_at` / `updated_at`; `claims` ve `metrics` **kaynak zorunlu** (FK NOT NULL).

---

## 9. Arayüz Bölümleri

1. **Durum Bandı (üst, sabit)** — canlı tarama göstergesi · olay/kaynak sağlığı · doğrulanmamış sinyal sayısı · **son güncelleme** · "metodoloji" linki. (Haber şeridi ve veri kaynağı göstergesi kaldırıldı.)
2. **"Şu an ne biliyoruz?"** — en fazla 6 madde, her madde kaynak rozetli ve doğruluk etiketli.
3. **Taraflar ne diyor?** — çelişki paneli (otomatik).
4. **Zaman Çizelgesi** — kronolojik akış; her kart: TR başlık (varsa orijinali yanında), kaynak badge'i, tier, doğruluk etiketi, bağımsız kaynak sayısı ("4 farklı kaynak grubu bildirdi"), yayın/sistem zamanları, arşiv linki.
5. **Sayısal Durum** — vaka / ölüm / karantina / test sayıları; her sayının yanında kaynağı ve `as_of` tarihi. Resmi ve bağımsız veriler çelişiyorsa ikisi de gösterilir.
6. **Harita** — İrkutsk + komşu bölgeler, olay yoğunluğu (MapLibre).
7. **Söylenti Kontrolü** — dolaşımdaki iddialar: Doğru / Yanlış / Kanıtlanmamış, gerekçesiyle.
8. **Kaynak Güven Panosu** — tier tablosu, sağlık durumu, bağımsızlık grupları, trust formülü.
9. **Düzeltmeler Günlüğü**.
10. **Metodoloji / Bu site nasıl çalışır?** — toplama, etiketleme, çelişki, sınırlar (kendi zayıflıklarını yazar).
11. **Arşiv & Arama** — tarih aralığı, kaynak, etiket filtresi.
12. **Bildirim (opsiyonel, Faz 4)** — Telegram bot (varsayılan sessiz; sadece "doğrulanmış + kritik" seviye).

**Etkileşim dili:** scroll-reveal, sayaçlar, hover mikro-etkileşimleri — ancak **`prefers-reduced-motion` tamamen desteklenir**. Acil sağlık durumunda süsün bilgiyi gölgelemesi yasak: doğruluk etiketi ve kaynak her zaman en yüksek görsel öncelik.

---

## 10. İçerik, Hukuk ve Etik

| Konu | Karar |
|---|---|
| Telif | Başlık + ≤2 cümle alıntı + kaynak linki + arşiv linki. **Tam metin asla kopyalanmaz.** |
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

1. Yeni bir haber, kaynağı yayınladıktan sonra **≤15 dakika** içinde sitede görünür.
2. Her kartta **kaynak adı + tier + yayın zamanı + orijinal link + arşiv linki** bulunur.
3. "Çoklu bağımsız kaynak bildiriyor" etiketi, 20 örnek vaka denetiminde **yanlış pozitif üretmez**.
4. TASS + RIA + Sputnik aynı haberi yazdığında bağımsız kaynak sayısı **1** olarak hesaplanır.
5. Sitede "doğrulandı/confirmed/teyit edildi" ifadesi **hiçbir yerde geçmez** (otomatik test ile kontrol edilir).
5. Kaynak bozulduğunda sağlık panelinde **≤1 saat** içinde görünür.
6. Metodoloji sayfası yayında ve trust formülü açıkça yazılı.
7. Her düzeltme kaydı zaman damgalı ve geriye dönük görülebilir.
8. Mobil dahil Lighthouse performans ≥ 90; `prefers-reduced-motion` çalışıyor.
9. Sitede tıbbi tavsiye olmadığına dair uyarı her sayfada erişilebilir.
10. Sayfa hatası veya boş veri durumunda kullanıcı "neden boş" sorusunun cevabını görür.

---

## 14. Kabul Edilmiş Varsayımlar

- Yayın ücretsiz katmanlarda yapılır (Neon free + Vercel Hobby + GitHub Actions public repo).
- Kaynak güven puanları **elle** belirlenir ve sürümlenir; otomatik öğrenme yok.
- Site **haber izleme aracıdır**, tıbbi tavsiye veya resmi bilgi kaynağı değildir.

---

## 15. Alınan Kararlar (6 Ekim 2026)

| # | Karar | Sonuç |
|---|---|---|
| 1 | **Dil:** TR + EN | Rotalar `/(tr)` ve `/en`; içerik TR çeviri + orijinal başlık |
| 2 | **Otomasyon:** Tam otomatik, **"doğrulanmış" etiketi yok** | İnsan onayı yok → sistem doğrulama iddia etmez; en yüksek etiket "çoklu bağımsız kaynak bildiriyor". Ayrıca bkz. §5.3 dil kuralı |
| 3 | **Telegram/X katmanı:** Dahil | T5, sadece "doğrulanmamış iddia" olarak; ana akışta tek başına haber sayılmaz |
| 4 | **Repo:** Public | GitHub Actions cron sınırsız dakika; kaynak kod ve güven puanları şeffaf |
| 5 | **TR çeviri:** Sağlayıcıdan bağımsız ingest-time çeviri + önbellek (7 Eki 2026) | `auto`: DeepL → OpenAI → anahtarsız Google; makine çevirisi beyanı olay detayında, orijinal başlık her zaman görünür; doğrulama kapıları editoryal kuralı korur. Ayrıntı: `docs/ceviri-plani.md` |
| 6 | **Marka adı:** `Plague Tracker` (7 Eki 2026) | Wordmark boşluklu yazılır (`Plague Tracker`); crawler User-Agent teknik kimlik olarak boşluksuz kalır (`PlagueTrackerBot`, bkz. `sources/registry.ts`). UI `siteName` artık README ile aynı; eski "What is new about plague" başlığı ve ilk çalışma adı `VebaTakip` kaldırıldı. Alan adı seçimi hâlâ açık. |

### Kalan açık sorular

1. **Alan adı:** Marka adı `Plague Tracker` olarak kararlaştırıldı (7 Eki 2026, §15 karar 6). Özel alan adı seçimi açık — Vercel proje adı/URL buna bağlı.
2. **LLM bütçesi:** Karar (7 Eki 2026): sağlayıcıdan bağımsız adaptör; `DEEPL_API_KEY`/`OPENAI_API_KEY` varsa o kullanılır, yoksa anahtarsız Google. Bkz. `docs/ceviri-plani.md` §15.
3. **Neon hesabı:** Postgres connection string kime ait olacak (F1 sonunda gerekli)?
4. **Bildirim:** Telegram bot / e-posta uyarısı isteniyor mu (F4)?
5. **Hedef kitle ağırlığı:** Türkiye kamuoyu mu, küresel takipçi mi? (UI vurgusunu etkiler)
