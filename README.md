# VebaTakip

Rusya'daki şüpheli veba (pnömonik/hıyarcıklı) olayları hakkındaki haberleri tek ekranda toplayan, **her haberi kaynağına ve doğruluk seviyesine göre etiketleyen** canlı izleme sitesi.

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
npm run security-check   # güvenlik regresyon testleri (53 test: ReDoS, URL şeması, varlık DoS, log maskeleme, nonce CSP)
```

Örnek çıktı:

```
── KAYNAK SAĞLIĞI ────────────────────────────────────────────────────────
KAYNAK                DURUM   ÖĞE   MS     EN YENİ
reuters               ok      100   543    2026-10-06 23:44
meduza                ok      30    145    2026-10-06 22:26
promed                BAYAT   4     203    2025-11-10 20:33
...
── ÖZET ──────────────────────────────────────────────────────────────────
Olay (event)          : 54
BAYAT kaynaklar       : minzdrav, promed, who-euro
Etiket dağılımı       : { corroborated: 13, single: 40, contradicted: 1 }
```

### Yayın (Vercel)

Bu depo Vercel projesine bağlıdır: **`main` dalına yapılan her push otomatik production deploy tetikler**
(Vercel → Project → Git, production dalı `main`). PR/dal push'ları preview deploy üretir.

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
| Doğruluk pipeline'ı | `src/lib/ingest/pipeline.ts` |
| Güven skoru + etiket mantığı | `src/lib/trust.ts` |
| Depo seçimi (fail-safe) | `src/lib/storage/store.ts` |
| Postgres şeması + Neon yazımı | `src/lib/storage/schema.ts`, `src/lib/storage/postgres.ts` |
| JSON yedeği | `src/lib/storage/json.ts` |
| Cron giriş noktası | `scripts/ingest.ts` |
| Cron işi + dead man's switch | `.github/workflows/ingest.yml` |
| Dil yönlendirme + nonce'lu CSP | `src/proxy.ts`, `src/lib/security/csp.ts` |

### Güvenlik

- **CSP nonce tabanlı:** `script-src` istek başına üretilen nonce ile çalışır (`'unsafe-inline'` yok). Ek olarak HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP ve CORP başlıkları `next.config.ts`'te tanımlıdır.
- **Dış veriye güvenilmez:** her bağlantı `safeExternalUrl()` (yalnızca http/https), her metin `stripHtml()` (linear zamanlı, 400 KB sınırlı) filtresinden geçer.
- **Regresyon testleri:** `npm run security-check` — ayrıntılar ve kalan riskler: [`docs/guvenlik-denetimi.md`](docs/guvenlik-denetimi.md).

### Veri deposu: Neon Postgres, JSON yedeği ile

`DATABASE_URL` tanımlıysa ingest Neon'a (eu-central-1) yazar; tanımlı **değilse** veya bağlantı koparsa `data/feed.json`'e düşer. JSON her zaman yazılır: lokal debug, CI artifact ve Vercel'de DB erişilemezse statik yedek. Site bu durumu üst barda **"Veri kaynağı: Neon Postgres / JSON yedek"** olarak gösteriyordu; bu gösterge kaldırıldı. Yedek davranışı değişmedi — DB erişilemezse site JSON'dan çalışmaya devam eder. Üst barda kalan metrikler: olay sayısı, kaynak sağlığı, doğrulanmamış sinyal sayısı ve **son güncelleme** zamanı.

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
| Site | Vercel → Environment Variables → **`DATABASE_URL`** | Neon pooler bağlantısı |
| Çeviri (lokal/cron/Vercel) | `DEEPL_API_KEY` **veya** `OPENAI_API_KEY` | Tanımlıysa TR çeviri o sağlayıcıyla yapılır |
| Çeviri (tercihe bağlı) | `TRANSLATE_PROVIDER` (`auto`/`deepl`/`openai`/`google`/`off`) | Tanımsızsa `auto`: DeepL → OpenAI → anahtarsız Google |
| Çeviri (opsiyonel) | `TRANSLATE_MAX_MS`, `TRANSLATE_BUDGET_CHARS`, `TRANSLATE_CONCURRENCY` | Cron bütçesi ve kota koruması |

**Cron:** `.github/workflows/ingest.yml` 10 dakikada bir çalışır. İş başarısız olursa `ingest-failure` etiketli bir issue açılır (dead man's switch) ve `data/feed.json` debug artifact'ı yüklenir.

### Arayüz: olay detay modalı

Zaman çizelgesinde **kartın herhangi bir yerine**, başlığa veya **Detay** butonuna tıklamak olayın tüm iddialarını, bağımsızlık gruplarını ve kaynak bağlantılarını açar. "Şu an ne biliyoruz?" listesi de aynı modalı kullanır. Kapanma üç yoldan: **Esc**, **arka plana tıklama**, **Kapat ×**. Native `<dialog>` + `showModal()` kullanılıyor (top-layer) — kartların `transform`/`backdrop-filter` taşımaları `position: fixed` modalını hapsetmesin diye. Odak, kapanınca tetikleyiciye geri döner.

### Ölçülen kaynak gerçekleri

Bu projede kaynak davranışı **iddia değil, ölçüm** ile belgelenir:

- **WHO** RSS feed'ini kaldırdı (404) → HTML/Google News yedeği
- **CIDRAP** RSS'i canlı görünüyor ama en yeni öğesi **Kasım 2022** → bayat feed tespiti bu yüzden zorunlu
- **ProMED** ve **ECDC** RSS sunmuyor
- **Rospotrebnadzor** Türkiye'den doğrudan erişilemiyor (HTTP 000) → Google News önbelleği
- **RFE/RL** `/api/` uç noktası çalışıyor, `/api/zrqiteuuir` 0 öğe döndürüyor
- **Novaya Gazeta Europe** RSS uçları kapalı (404/521/403)

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

- [`docs/PLAN.md`](docs/PLAN.md) — tam proje planı: mimari, doğruluk katmanı, veri modeli, fazlar, riskler
- [`docs/ceviri-plani.md`](docs/ceviri-plani.md) — TR çeviri planı: sağlayıcı seçimi, doğrulama kapıları, veri modeli
- [`docs/kaynak-envanteri.md`](docs/kaynak-envanteri.md) — kaynak listesi, erişim testleri, yedek yollar
- [`docs/guvenlik-denetimi.md`](docs/guvenlik-denetimi.md) — güvenlik denetimi: bulgular, düzeltmeler, kalan riskler

---

## Yasal ve etik

- **Telif:** Yalnızca başlık + kısa alıntı + kaynak bağlantısı. Tam metin kopyalanmaz.
- **Çeviri:** Makine çevirisi olarak etiketlenir; orijinal başlık her zaman görünür.
- **Kişisel veri:** Kişi adları yalnızca resmî/kamuya açık bildirimlerde gösterilir.
- **Düzeltme:** Yanlış bilgi silinmez; zaman damgalı düzeltme kaydı ile düzeltilir.

## Lisans

Kod: MIT. Toplanan içerik ilgili yayıncıların telifine tabidir.
