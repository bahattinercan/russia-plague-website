# Plague Tracker

Rusya'daki şüpheli veba (pnömonik/hıyarcıklı) olayları hakkındaki haberleri tek ekranda toplayan, **her haberi kaynağına ve kaç bağımsız kaynağın bildirdiğine göre etiketleyen** canlı izleme sitesi.

> **Bu site haber izleme aracıdır. Tıbbi tavsiye değildir, resmî bilgi kaynağı değildir.**
> Resmî kurum açıklamalarını (WHO, ECDC, Sağlık Bakanlıkları) esas alın.

---

## Temel ilke: sistem "doğrulandı" demez

Tam otomatik bir sistem doğrulama iddia edemez. Bu proje yalnızca **hangi kaynağın ne bildirdiğini** raporlar.

| Etiket | Anlamı |
|---|---|
| ✅ Resmî açıklama | WHO / CDC / ECDC / resmî devlet kurumu açıklaması |
| 🟢 Çoklu bağımsız kaynak bildiriyor | ≥2 farklı bağımsızlık grubu aynı olayı bildirdi |
| 🟡 Tek kaynak bildiriyor | Yalnızca 1 grup bildirdi |
| 🟠 Doğrulanmamış iddia | Telegram / kayıt dışı yayıncı / sosyal sinyal |
| 🔴 Çelişkili bilgi | Aynı olay için zıt iddialar var (deneysel) |

Sitede **"doğrulandı", "teyit edildi", "confirmed", "verified" ifadeleri hiçbir yerde geçmez.**

### Bağımsızlık grupları — en kritik kural

Aynı sahiplik çatısındaki kaynaklar **tek kaynak** sayılır. TASS + RIA + RT + Sputnik aynı haberi yazsa bile bağımsız kaynak sayısı **1**'dir. Bu, "tek kaynağı çok kaynak gibi gösterme" riskine karşı temel korumadır.

---

## Hızlı başlangıç

```bash
npm install
npm run ingest          # tüm kaynakları tara, data/feed.json yaz
npm run ingest -- --dry # yazmadan raporla
npm run ingest -- --only=tass,meduza,reuters
npm run typecheck
npm run ui-check         # arayüz kapıları: kontrast (AA), yüzey ayrışması, opaklık/mikro punto kuralları, sözlük paritesi
npm run layout-check     # yerleşim kapıları: 360–1440 px yatay taşma, mobil satır düzeni, sayfa bütçesi (Chrome gerekir)
npm run build:world-map  # dünya haritası varlıklarını yeniden üret (Natural Earth 110m → public/world-map*.svg; internet gerekir)
npm run security-check   # güvenlik regresyon testleri (ReDoS, URL şeması, varlık DoS, log maskeleme, nonce CSP)
npm run translation-check # çeviri doğrulama kapıları (ağsız)
npm run geo-check        # konum çıkarımı + kapsama oranı
npm run figures-check    # küratörlü rakamların gerçek kaynak cümlesine bağlılığı
npm run summarize-check  # editoryal dil kapısı (yasak sözcükler)
npm run db:check         # Neon bağlantısı + şema + satır sayıları
npm run check-all        # typecheck + ui-check + security-check + translation-check + geo-check + summarize-check + figures-check
```

`check-all` `layout-check`'i **içermaz** (Chrome gerektirir); `ui-check` 19, `security-check` 58, `translation-check` 30, `geo-check` 24, `figures-check` 59, `summarize-check` 22 kapı koşar.

Örnek çıktı (7 Eki 2026 koşusu, `data/feed.json`):

```
── KAYNAK SAĞLIĞI ────────────────────────────────────────────────────────────
KAYNAK                T  DURUM   ÖĞE   MS     EN YENİ
reuters               2  ok      100   579    2026-10-06 22:21
meduza                4  ok      30    152    2026-10-06 22:26
promed                1  BAYAT   4     169    2025-11-10 20:33
...

── ÖZET ──────────────────────────────────────────────────────────────────────
Çekilen ham öğe       : 1793
İlgili bulunan        : 230
Tekrar giderme sonrası: 214
Olay (event)          : 57
BAYAT kaynaklar       : minzdrav, promed, who-euro
Etiket dağılımı       : { official: 0, corroborated: 15, single: 42, unverified: 0, contradicted: 0 }
Dead man's switch     : 26/26 kaynak sağlıklı, 57 olay işlendi
Süre                  : 8495 ms
```

### Yayın (Vercel)

Bu depo Vercel projesine bağlıdır: **`main` dalına yapılan her push otomatik production deploy tetikler**
(Vercel → Project → Git, production dalı `main`). PR/dal push'ları preview deploy üretir.

Vercel proje adı `plague-tracker`, canlı adres `https://plague-tracker.vercel.app` (özel alan adı yok).
Deploy durumu: `npx vercel ls plague-tracker`.

Elle yayın gerekirse:

```bash
npx vercel --prod
```

---

## Mimari

```
Kaynak adaptörleri → normalize → relevance → dedupe → olay kümeleme
                   → etiketleme → data/feed.json (MVP) → Next.js UI
```

| Katman | Dosya |
|---|---|
| Kaynak envanteri + yayıncı kimlikleri | `src/lib/sources/registry.ts` |
| Adaptörler (RSS / Google News / HTML / Telegram) | `src/lib/sources/adapters/` |
| Metin normalizasyonu (TR/RU/EN diakritik katlama) | `src/lib/sources/text.ts` |
| Doğruluk pipeline'ı (normalize → relevance → dedupe → cluster) | `src/lib/ingest/pipeline.ts` |
| Güven skoru + etiket mantığı | `src/lib/trust.ts` |
| Konum çıkarımı + gazetteer + harita çerçevesi | `src/lib/geo/` |
| Küratörlü rakamlar (`data/figures.json` bağı) | `src/lib/figures.ts` |
| Editoryal dil kapısı (yasak sözcükler) | `src/lib/summarize.ts` |
| Çeviri (sağlayıcı + sözlük + doğrulama + önbellek) | `src/lib/translate/` |
| Arayüz sözlükleri (TR/EN) | `src/lib/i18n.ts` |
| Depo seçimi (fail-safe) | `src/lib/storage/store.ts` |
| Postgres şeması + Neon yazımı | `src/lib/storage/schema.ts`, `src/lib/storage/postgres.ts` |
| JSON yedeği | `src/lib/storage/json.ts` |
| Cron giriş noktası | `scripts/ingest.ts` |
| Cron işi + dead man's switch | `.github/workflows/ingest.yml` |
| Dış zamanlayıcı (cron-job.org) araçları | `scripts/cron-setup.ts`, `scripts/trigger-ingest.ts` |
| Dil yönlendirme + nonce'lu CSP | `src/proxy.ts`, `src/lib/security/csp.ts` |

Stack: Next.js 16.4 (App Router) + TypeScript 7 + Node 24 + Tailwind v4 + Drizzle/Neon. Tek Next.js uygulaması — monorepo yok.

### Güvenlik

- **CSP nonce tabanlı:** `script-src` istek başına üretilen nonce ile çalışır (`'unsafe-inline'` yok). `style-src` bilinçli olarak `'unsafe-inline'` tutuyor (React inline `style` nitelikleri — nonce ile birlikte çalışmaz). Yazı tipleri `next/font` ile self-host: `style-src`/`font-src` yalnızca `'self'`.
- Ek olarak HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP ve CORP başlıkları `next.config.ts`'te tanımlıdır; CSP `proxy.ts`'te üretilir (statik CSP yok, çakışma olmasın diye).
- **Dış veriye güvenilmez:** her bağlantı `safeExternalUrl()` (yalnızca http/https), her metin `stripHtml()` (linear zamanlı, 400 KB sınırlı) filtresinden geçer.
- **Regresyon testleri:** `npm run security-check` — ayrıntılar ve kalan riskler: [`docs/guvenlik-denetimi.md`](docs/guvenlik-denetimi.md).

### Veri deposu: Neon Postgres, JSON yedeği ile

`DATABASE_URL` tanımlıysa ingest Neon'a (eu-central-1) yazar; tanımlı **değilse** veya bağlantı koparsa `data/feed.json`'e düşer. JSON her zaman yazılır: lokal debug, CI artifact ve Vercel'de DB erişilemezse statik yedek. Site bu durumu üst barda **"Veri kaynağı: Neon Postgres / JSON yedek"** olarak gösteriyordu; bu gösterge kaldırıldı. Yedek davranışı değişmedi — DB erişilemezse site JSON'dan çalışmaya devam eder.

Üst bar (StatusBar) artık yalnızca **marka + canlı nokta + son tarama + gezinme + dil**; sayı taşımaz. Sayılar panonun durum şeridinde (`StatusStrip`: son 24 saat, en son gelişme, veri tazeliği) ve `/sources` sayfasındadır. Kaynak sağlığı üst barda **nokta rengi** olarak görünür (sağlık özeti: `healthSummary`).

Tablolar: `articles`, `events`, `event_claims`, `event_articles`, `source_health`, `ingest_reports`. Şema ilk bağlantıda `CREATE TABLE IF NOT EXISTS` ile kurulur (migration koşmak gerekmez). Retention: kaynak sağlığı 90 gün, makaleler 180 gün.

```bash
npm run db:check        # bağlantı + şema + satır sayıları
npm run ingest          # tarar, Postgres'e (yoksa JSON'a) yazar
```

`.env.local` iki formatı da kabul eder: `DATABASE_URL=postgresql://...` veya ham connection string tek satır olarak.

**Env değişkenleri**

| Nerede | Değişken | Not |
|---|---|---|
| Lokal | `.env.local` (gitignore'da) | `DATABASE_URL` |
| Cron | GitHub → Settings → Secrets → **`DATABASE_URL`** | yoksa ingest JSON'a düşer, cron yine çalışır |
| Cron tetikleyici (yalnızca yerel) | `.env.local` → **`GITHUB_TRIGGER_TOKEN`** (fine-grained PAT, Actions: RW), **`CRONJOB_API_KEY`** | cron-job.org'a yüklenen sırlar; `npm run cron:setup` / `npm run ingest:trigger` bunları okur |
| Site | Vercel → Environment Variables → **`DATABASE_URL`** | Neon pooler bağlantısı |
| Çeviri (lokal/cron/Vercel) | `DEEPL_API_KEY` **veya** `OPENAI_API_KEY` | Tanımlıysa TR çeviri o sağlayıcıyla yapılır |
| Çeviri (tercihe bağlı) | `TRANSLATE_PROVIDER` (`auto`/`deepl`/`openai`/`google`/`off`) | Tanımsızsa `auto`: DeepL → OpenAI → anahtarsız Google |
| Çeviri (opsiyonel) | `TRANSLATE_MAX_MS`, `TRANSLATE_BUDGET_CHARS`, `TRANSLATE_CONCURRENCY` | Cron bütçesi ve kota koruması |

**Cron:** İki tetikleyici var. **Asıl olan** dış zamanlayıcı: cron-job.org 10 dakikada bir `workflow_dispatch` API'sini çağırır — kurulum `npm run cron:setup` (`docs/dispatch-tetikleme.md`). `.github/workflows/ingest.yml` içindeki `schedule: */10` yalnızca **yedektir**; GitHub ücretsiz katmanda zamanlanmış işleri saatlerce geciktirir veya atlar (ölçüm: 2 günde 3 çalışma). İkisi de `concurrency: ingest` grubunda, üst üste binme olmaz.

İş başarısız olursa `ingest-failure` etiketli bir issue açılır (dead man's switch) ve `data/feed.json` debug artifact'ı yüklenir. Dikkat: bu switch **yalnızca başarısız çalışmada** tetiklenir — hiç tetikleme gelmezse (PAT süresi dolması gibi) veri sessizce bayatlar, bu yüzden cron-job.org'un e-posta bildirimi açık olmalı.

### Arayüz: sayfalar

Bilgi mimarisi ve gerekçeleri: [`docs/arayuz-plani.md`](docs/arayuz-plani.md).

| Rota | Ne işe yarar |
|---|---|
| `/[lang]` | **Pano** — 10 saniyelik durum: durum şeridi, manşet, kaynağa bağlı rakamlar, bölge özeti (dünya haritası), "şu an ne biliyoruz?", son gelişmeler, diğer katmanlar |
| `/[lang]/timeline` | **Akış** — tüm olaylar, filtrelenebilir (etiket · kaynak grubu · katman · tarih aralığı · arama) ve günlere göre gruplu, sayfalı |
| `/[lang]/event/<slug>` | **Olay** — kalıcı adres; modalın tam sayfa hâli (iddialar, çelişki, arşiv bağlantıları) |
| `/[lang]/locations` + `/<slug>` | **Bölgeler** — kaynak metninden çıkarılan konum listesi + kapsama oranı |
| `/[lang]/figures` | **Rakamlar** — küratörlü vaka/ölüm/kısıtlama sayıları, her biri kaynağına ve cümlesine bağlı |
| `/[lang]/signals` | **Sinyaller** — T5 katmanı (Telegram / kayıt dışı yayıncılar), sayfalı |
| `/[lang]/sources` | **Kaynaklar** — canlı sağlık tablosu + bağımsızlık grupları |
| `/[lang]/methodology` | **Metodoloji** — site ne yapar, ne YAPMAZ |

Ek olarak `sitemap.xml`, `robots.txt` (ikisi de `force-dynamic` — `data/feed.json` izlendiği için derleme anına donmamalı), dil duyarlı `not-found.tsx` ve `[...rest]` yakalayıcı. Alan adı istek başlıklarından türetilir, `NEXT_PUBLIC_SITE_URL` ile sabitlenebilir.

**Harita:** `Bölgeler` bölümündeki dünya haritası **bağlam katmanıdır** — satır içi SVG, JS'siz, bağımlılıksız. İşaretçideki sayı **olay sayısıdır, vaka sayısı değildir**. Ülke boyaması (koroplet) yok: konum kapsaması %60 kapısını geçmiyor (`docs/harita-plani.md`).

**Akış filtreleri JS'siz çalışır:** durum URL'de taşınır (`?label=single&q=sibirya&page=2`), form `GET` ile gönderilir. Sunucuda filtreleme yapıldığı için 450 KB'lık feed tarayıcıya gönderilmez.

**"Son ziyaretinizden beri yeni":** ziyaret damgası yalnızca `localStorage`'da tutulur (çerez yok, sunucuya gönderim yok); yeni/güncellenen olaylar kartın sol kenarında işaretlenir. İşaretler istemcide konur, sayfa JS'siz de normal çalışır.

**Saatler:** sunucu çıktısı her zaman UTC ve "UTC" etiketi görünür; üst bardaki **UTC/Yerel** düğmesi tüm zaman damgalarını ziyaretçinin saat dilimine çevirir (tercih yine yalnızca `localStorage`'da).

### Arayüz: olay detay modalı

Zaman çizelgesinde **kartın herhangi bir yerine**, başlığa veya **Detay** butonuna tıklamak olayın tüm iddialarını, bağımsızlık gruplarını ve kaynak bağlantılarını açar. "Şu an ne biliyoruz?" listesi de aynı modalı kullanır. Kapanma üç yoldan: **Esc**, **arka plana tıklama**, **Kapat ×**. Native `<dialog>` + `showModal()` kullanılıyor (top-layer) — kartların `transform`/`backdrop-filter` taşımaları `position: fixed` modalını hapsetmesin diye. Odak, kapanınca tetikleyiciye geri döner. Modalın alt satırında olayın **kalıcı bağlantısı** bulunur.

### Ölçülen kaynak gerçekleri

Bu projede kaynak davranışı **iddia değil, ölçüm** ile belgelenir (test: 6 Eki 2026, TR'den):

- **WHO** RSS feed'ini kaldırdı (404) → HTML/Google News yedeği
- **CIDRAP** RSS'i canlı görünüyor ama en yeni öğesi **Kasım 2022** → bayat feed tespiti bu yüzden zorunlu
- **ProMED** ve **ECDC** RSS sunmuyor
- **Rospotrebnadzor** Türkiye'den doğrudan erişilemiyor (HTTP 000) → Google News önbelleği
- **RFE/RL** `/api/` uç noktası çalışıyor, `/api/zrqiteuuir` 0 öğe döndürüyor
- **Novaya Gazeta Europe** RSS uçları kapalı (404/521/403)

Depoda fiilen taranan kaynak sayısı **45** (`registry.ts → SOURCES`); bunlara ek olarak **59 yayıncı yalnızca kimlik ataması** için tanınır (`KNOWN_PUBLISHERS`) — Google News'ten gelen bir haberin gerçek yayıncısı tanınmazsa T5'e düşer. Ayrıntı ve erişim testleri: [`docs/kaynak-envanteri.md`](docs/kaynak-envanteri.md).

> **GDELT test edildi ama taranmıyor:** tablodaki ✅ 200 sonucu erişim testinden geliyor, `SOURCES`'ta adaptörü yok. X/Twitter API'si ücretli olduğu için kapsam dışı.

---

### Çeviri (TR görünümü)

İngilizce ve Rusça başlıklar `/tr` görünümünde Türkçeye çevrilir. Kurallar:

- **Makine çevirisi beyanı zorunlu** (olay detayında) ve **orijinal başlık her zaman görünür** (`Orijinali oku`). Liste/kart görünümünde tekrar eden rozet yok.
- Çeviri **ingest sırasında** yapılır ve `content_hash` üzerinden önbelleğe alınır; aynı içerik her 10 dakikada yeniden çevrilmez.
- **Doğrulama kapıları** (`npm run translation-check`): çıktıda `doğrulandı/teyit edildi` geçemez, belirsizlik (`suspected → şüpheli`) korunur, sayılar ve özel adlar (WHO, CDC, Rospotrebnadzor…) korunur. Kapıdan geçmeyen çeviri gösterilmez; orijinal başlık gösterilir.
- Sağlayıcı **bağımsız**: `DEEPL_API_KEY` veya `OPENAI_API_KEY` varsa o kullanılır; yoksa anahtarsız Google katmanı devrededir (üretim için DeepL anahtarı önerilir). `TRANSLATE_PROVIDER=off` ile kapatılır.
- Detaylı plan: [`docs/ceviri-plani.md`](docs/ceviri-plani.md)

---

## Dokümanlar

| Dosya | Ne içerir | Durum |
|---|---|---|
| [`docs/PLAN.md`](docs/PLAN.md) | Tam proje planı: mimari, doğruluk katmanı, veri modeli, fazlar, riskler | planlandı → F0–F5 uygulandı |
| [`docs/arayuz-plani.md`](docs/arayuz-plani.md) | Arayüz ve bilgi mimarisi planı (v2) + ölçüm + uygulama günlüğü | uygulandı |
| [`docs/harita-plani.md`](docs/harita-plani.md) | Dünya haritası: ölçümler, kapılar, kararlar | uygulandı |
| [`docs/ceviri-plani.md`](docs/ceviri-plani.md) | TR çeviri planı: sağlayıcı, doğrulama kapıları, veri modeli | uygulandı |
| [`docs/kaynak-envanteri.md`](docs/kaynak-envanteri.md) | Kaynak listesi, erişim testleri, yedek yollar | test 6 Eki 2026 |
| [`docs/guvenlik-denetimi.md`](docs/guvenlik-denetimi.md) | Güvenlik denetimi: bulgular, düzeltmeler, kalan riskler | 3 tur tamamlandı |
| [`docs/dispatch-tetikleme.md`](docs/dispatch-tetikleme.md) | Cron: GitHub `schedule` neden yetmiyor, cron-job.org kurulumu | kurulu (jobId #8605239) |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Katkı kuralları: pazarlık konusu olmayan editoryal ilkeler, tier/trust değişikliği, kapılar | yayında |
| [`SECURITY.md`](SECURITY.md) | Güvenlik bildirme yolu, kapsam, bilinen açık riskler | yayında |

> Bu dosyalardaki sayılar **ölçüm tarihine** bağlıdır ve feed penceresiyle birlikte değişir. Bir ölçümün tarihi yazılıysa o anın değeridir; güncel durumu anlamak için kapıları yeniden koşmak gerekir (`npm run check-all`).

---

## Yasal ve etik

- **Telif:** Yalnızca başlık + kısa alıntı + kaynak bağlantısı. Tam metin kopyalanmaz.
- **Çeviri:** Makine çevirisi olarak etiketlenir; orijinal başlık her zaman görünür.
- **Kişisel veri:** Kişi adları yalnızca resmî/kamuya açık bildirimlerde gösterilir.
- **Düzeltme:** Yanlış bilgi silinmez; zaman damgalı düzeltme kaydı ile düzeltilir.

## Lisans ve açık kaynak

Kod: **MIT** — [`LICENSE`](LICENSE) dosyası depoda, `package.json` `MIT`. Proje açık kaynaktır.

Toplanan içerik (haber başlıkları, özetler, bağlantılar) ilgili yayıncıların telifine tabidir; lisans yalnızca kodu ve dokümantasyonu kapsar.

- Katkı kuralları (tier/trust değişikliğinin gerekçesi, kapılar, commit konvansiyonu): [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Güvenlik sorunlarını **özel** bildirme yolu ve bilinen açık riskler: [`SECURITY.md`](SECURITY.md)

> Katkı için temel kural: kaynak envanteri ve güven puanları `src/lib/sources/registry.ts` içinde elle ve sürümlenir — değişiklikler ölçüme dayalı gerekçeli olmalı (metodoloji sayfası bunu yayınlar).
