# Güvenlik Denetimi

**Kapsam:** `russia-plague-website` (public repo, canlıya çıkmadan önce)
**Yöntem:** Otomatik tarama (sır, bağımlılık, kod deseni), manuel kod incelemesi, canlı başlık doğrulaması, sentetik saldırı testleri.

| Tur | Tarih | Not |
|---|---|---|
| 1 | 7 Ekim 2026 | İlk denetim — B-1…B-5 bulundu ve düzeltildi |
| 2 | 7 Ekim 2026 | Bağımsız yeniden doğrulama — B-6…B-9 bulundu ve düzeltildi |

---

## 1. Doğrulanan kontroller

| Kontrol | Sonuç | Kanıt |
|---|---|---|
| Sır / API anahtarı taraması (repo) | ✅ Temiz | `git grep` + `git log --all` — api_key/secret/token/private key deseni yok |
| `.env` dosyalarının git durumu | ⚠️ Ayrıntı B-7 | `.env.local` **çalışma dizininde var** (canlı Neon + Vercel OIDC) ama `.gitignore` kapsamında ve geçmişte **hiç commit edilmemiş** |
| `.gitignore` kapsamı | ✅ Yeterli | `.env*`, `.next/`, `node_modules/`, `*.tsbuildinfo`, `.shots/`, `.vercel` |
| Bağımlılık zafiyetleri | ⚠️ Ayrıntı B-8 | `npm audit` → 4 moderate, hepsi **dev-only** (drizzle-kit → esbuild) |
| Lisans uyumu | ✅ Temiz | next/react/react-dom/cheerio/rss-parser/zod MIT, drizzle-orm Apache-2.0 |
| XSS yüzeyi (kod) | ✅ Yok | `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.write` hiç kullanılmıyor |
| Dış link şema filtresi | ✅ Tam | Tüm dinamik `href` değerleri `safeExternalUrl()`'den geçer |
| `target="_blank"` güvenliği | ✅ Tam | 3/3 kullanımda `rel="noopener noreferrer nofollow"` |
| Açık yönlendirme (proxy) | ✅ Yok | `//evil.com` → `308 /evil.com`; `%2e%2e%2f` → 404 |
| SQL enjeksiyonu | ✅ Yok | Tüm sorgular parametreli; tablo/kolon adları sabit (kullanıcı girdisi değil) |
| Komut enjeksiyonu | ✅ Yok | `child_process`/`exec` hiç yok; dosya yolları sabit |
| GitHub Actions | ✅ Yeterli | `permissions` minimal, `pull_request_target` yok, fork secret'ı yok, `npm ci` |
| Next.js dosya sözleşmesi | ✅ Doğru | Next 16'da `middleware.ts` → `proxy.ts`; dosya `src/proxy.ts` (docs ile teyit edildi) |
| `X-Powered-By` | ✅ Kapalı | Canlı yanıtta başlık yok (`poweredByHeader: false`) |
| Feed içeriği şema kontrolü | ✅ Tam | 214 bağlantının tamamı http(s) |
| TypeScript derlemesi | ✅ Temiz | `tsc --noEmit` hatasız |

**Canlı başlık doğrulaması** (`GET /tr`, `next dev`):

```
content-security-policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-src 'none';
  frame-ancestors 'none'; form-action 'self';
  script-src 'self' 'nonce-<istek başına>' 'strict-dynamic' 'unsafe-eval';   ← 'unsafe-eval' yalnızca dev
  style-src 'self' 'unsafe-inline';
  font-src 'self' data:; img-src 'self' data:; connect-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

Nonce akışı uçtan uca doğrulandı: HTML'deki **20 `<script>` etiketinin tamamı** başlıktaki nonce'u taşıyor (nonce'suz tek bir script yok).

---

## 2. Tur 1 — bulunan ve düzeltilen sorunlar

### B-1 — `stripHtml` içinde O(n²) ReDoS (Yüksek)

**Sorun:** `/<script[\s\S]*?<\/script>/gi` deseni kapanmayan etiketlerde her `<script>` için tüm metni yeniden tarıyordu.
**Ölçüm:** 1 MB `<script>` tekrarı → **4904 ms** CPU.
**Düzeltme:** `indexOf` tabanlı linear `stripBlocks()`, 400 KB giriş sınırı, `<[^>]{0,4000}>` (geri izleme yok).
**Doğrulama:** Aynı girdi → **0.8 ms** (≈6000× iyileşme); regresyon testi security-check'te.

### B-2 — Dış bağlantılarda şema doğrulaması yok (Yüksek)

**Sorun:** Adaptörlerden gelen `url` doğrudan `<a href>` içine konuyordu; React `href`'i temizlemez.
**Etki:** `javascript:`/`data:`/`vbscript:` bağlantısı tıklandığında kod çalışır.
**Düzeltme:** `safeExternalUrl()` yalnızca `http:`/`https:` kabul eder; `normalizeItem` geçersiz şemada `null` döner, UI ikinci kez filtreler (savunma derinliği).

### B-3 — Yanıt gövdesi boyut sınırı yok (Orta)

**Düzeltme:** `readLimitedText()` — 3 MB üstünde okuma iptal edilir (HTML ve Telegram adaptörleri).

### B-4 — HTTP güvenlik başlıkları yok (Orta)

**Düzeltme:** `next.config.ts` + (Tur 2'den sonra) `src/proxy.ts`; canlı doğrulandı (bkz. §1).

### B-5 — `proxy.ts` yol normalizasyonu (Düşük)

`//evil.com` gibi protokol-göreli bir yol birleştirme sırasında yorumlanmasın diye yol normalize edildi.

---

## 3. Tur 2 — bulunan ve düzeltilen sorunlar

### B-6 — Bozuk HTML varlığı ingest'i düşürüyordu (Orta · DoS)

**Sorun:** `decodeEntities()` içinde `String.fromCodePoint(Number(code))` çağrısı, 0x10FFFF üstündeki kod noktalarında `RangeError` fırlatır.
**Kanıt (düzeltme öncesi):**

```
decodeEntities("&#99999999999;")  → RangeError: Invalid code point 99999999999
cleanTitle(...)                   → RangeError
stripHtml("<p>&#99999999999;</p>")→ RangeError
```

**Etki:** RSS/Google News öğesinde bu kalıbı taşıyan bir başlık, tüm kaynağın taramasını düşürür (`kaynak HATA` + yanlış dead-man's-switch alarmı). Dış kaynak tarafından tetiklenebilen kaynak-bazlı DoS.
**Ek yol:** `&#0;` → NUL karakteri, Postgres `text` kolonuna yazılamaz; transaction'ı geri sarıp feed yazımını JSON'a düşürürdü (fail-safe çalışır ama gereksiz).
**Düzeltme:** `decodeNumericEntity()` — `Number.isSafeInteger`, `0…0x10FFFF` sınırı, vekil (surrogate) aralığı ve NUL reddedilir; geçersizse ham metin korunur.
**Doğrulama:** 5 sentetik saldırı girdisi + `stripHtml`/`cleanTitle` yolları + geçerli varlık (astral düzlem, 0x10FFFF) testleri security-check'te.

### B-7 — Canlı DB credential ve OIDC token çalışma dizininde (Orta · operasyonel)

**Durum:** `.env.local` şunları içeriyor:

- `postgresql://neondb_owner:npg_…@…neon.tech/neondb` — **owner** yetkili rol
- `VERCEL_OIDC_TOKEN`

**Sızıntı yok:** dosya `.gitignore` kapsamında, `git log --all -- .env.local` boş, `git grep` temiz. Yani repo üzerinden yayılmadı.
**Riskler:** (a) Tur 1 denetimindeki "`.env` ve anahtar dosyaları → hiçbiri yok" satırı artık yanlıştı ve bu dokümanla düzeltildi; (b) sır ajan oturum loglarına girdi; (c) uygulama için owner rolü gereğinden yetkili; (d) `maskedDbUrl()` yalnızca `//user:pass@` kalıbını maskeliyordu — şifresi `?password=` biçiminde taşınan dize `console.warn` ile loglara sızardı.
**Düzeltme (kod):** `maskedDbUrl()` artık `?password=` / `&pwd=` parametrelerini de maskeler; regresyon testleri eklendi.
**Yapılacak (sahip):**

```bash
# 1) Neon panelinden mevcut şifreyi rotate et, Vercel OIDC token'ını yenile
# 2) Uygulama için owner yerine yetkisi kısıtlı bir rol aç (yalnızca kendi tabloları)
# 3) .env.local'i commit etme; secret'ları yalnızca GitHub Secret + Vercel Env'de tut
```

### B-8 — `npm audit` artık temiz değil (Orta · dev-only)

**Kanıt:** `drizzle-kit → @esbuild-kit/esm-loader → esbuild ≤0.24.2` (GHSA-67mh-4wv8-2f99, dev sunucusuna cross-origin istek) → **4 moderate**.
**Değerlendirme:** Bağımlılık zinciri yalnızca `devDependencies` içinde; üretim bundle'ına girmiyor, uygulama `drizzle-kit`'i çalışma zamanında kullanmıyor. Otomatik düzeltme breaking downgrade istediği için uygulanmadı.
**Yapılacak:** Dependabot etkinleştir; drizzle-kit'in esbuild'i güncelleyen sürümü çıktığında yükselt; `npm audit --omit=dev` temiz kalmalı.

### B-9 — CSP nonce tabanlı hale getirildi (Düşük → kapandı)

**Önce:** `script-src 'self' 'unsafe-inline'` — Next.js'in inline script'leri için inline izni veriliyordu (Tur 1'de "F2'ye bırakıldı" olarak kabul edilmişti).
**Sonra:** Next 16'nın resmî nonce reçetesi uygulandı:

- `src/lib/security/csp.ts` — `buildCsp(nonce, isDev)` + `generateNonce()` (istek başına `crypto.randomUUID()` → base64)
- `src/proxy.ts` — nonce'u **istek** başlığına yazar (Next.js nonce'u yalnızca oradan okuyup framework inline script'lerine ekler) ve **yanıt** başlığına koyar
- `script-src 'self' 'nonce-…' 'strict-dynamic'` — `'unsafe-inline'` kaldırıldı; `'unsafe-eval'` yalnızca dev
- `next.config.ts`'ten statik CSP kaldırıldı (iki CSP'nin çakışmasını engellemek için; bunu doğrulayan bir test var)
- Ek başlık: `Cross-Origin-Resource-Policy: same-origin`; CSP'ye `frame-src 'none'` ve (yalnızca üretim) `upgrade-insecure-requests` eklendi

**Kasıtlı olarak yapılmayan:** `style-src`'ten `'unsafe-inline'` çıkarmak. CSP3 kuralı gereği bir direktifte nonce varsa `'unsafe-inline'` yok sayılır; React `style={{ '--reveal-delay': … }}` nitelikleri SSR'da inline yazıldığı için sayfa yerleşimi bozulurdu (`style="--reveal-delay:55ms"` canlı HTML'de doğrulandı). XSS için kritik olan taraf script olduğu için sertleştirme orada yapıldı.

---

## 4. Kalan riskler (kabul edilen)

| Risk | Neden kabul edildi | Plan |
|---|---|---|
| `style-src 'unsafe-inline'` | Bkz. B-9: nonce + inline style nitelikleri birlikte çalışmaz; script tarafı sertleştirildi | Gerekirse `style-src-attr 'unsafe-inline'` + nonce'lu `style-src-elem` ayrımı |
| Google Fonts dış kaynak | ✅ **KAPANDI (8 Eki 2026):** yazı tipleri `next/font` ile self-host edildi (`Inter`, `Newsreader`, `JetBrains Mono`); `style-src`/`font-src` artık yalnızca `'self'`. Regresyon kapısı: `security-check` (dış host yasağı) + `ui-check`. | — |
| COEP yok (`Cross-Origin-Embedder-Policy`) | `require-corp` dış font CDN'i ile uyumsuzdu; **artık dış font yok**, denenebilir | `require-corp` denenip görsel doğrulama yapılacak |
| Uygulama seviyesinde rate limiting yok | Vercel platform koruması mevcut; site yalnızca okuma yapar; API rotası yok | Gerekirse Vercel WAF / Upstash Ratelimit |
| Dev-only zafiyetler (B-8) | Üretim bundle'ına girmiyor; düzeltme breaking downgrade | Dependabot + drizzle-kit güncellemesi |
| `data/feed.json` repo'da commit ediliyor | MVP deposu; içerik yalnızca başlık + kısa alıntı | A adımı: Postgres'e geçiş, `data/` gitignore |
| `readLimitedText` fazla ayırma | Limiti aşan chunk `total`'a eklenip diziye alınmıyor → chunk başına en fazla ~64 KB fazla bellek | Kozmetik; limit sınırına çekilebilir |

---

## 5. Regresyon koruması

```bash
npm run security-check     # 53 test
npm run typecheck
```

`scripts/security-check.ts` şunları doğrular:

| Grup | Kapsam |
|---|---|
| ReDoS | `stripHtml` 6 sentetik girdide < 400 ms |
| İçerik temizliği | script/style içeriği, etiketler, varlıklar |
| Şema filtresi | `javascript:`, `data:`, `vbscript:`, `file:`, göreli yol, boş, `null`, bozuk URL |
| Bozuk varlık (B-6) | aşırı büyük/taşan/sınır üstü/vekil/NUL kod noktaları fırlatmaz; geçerli varlıklar çözülür |
| Log maskeleme (B-7) | `userinfo` + `?password=` + `&pwd=` sızdırmaz |
| CSP (B-9) | nonce `script-src`'te, `'unsafe-inline'` yok, `style-src` inline'ı korur, `'unsafe-eval'` yalnızca dev, `upgrade-insecure-requests` yalnızca üretim, `next.config.ts`'te statik CSP yok |
| Feed | `data/feed.json` içindeki tüm bağlantılar http(s) |

**Yeni bir dış-veri işleme yolu eklendiğinde buraya test eklenmelidir.**

---

## 6. Yayın öncesi kontrol listesi (A adımı)

- [ ] `.env.local` sırlarını rotate et; uygulama için owner olmayan, yetkisi kısıtlı DB rolü kullan (B-7)
- [ ] GitHub Actions workflow'u: `permissions` minimal, `npm ci`, `pull_request_target` **kullanma**, fork PR'larında secret çalıştırma
- [ ] Neon bağlantı dizesi yalnızca GitHub Secret / Vercel Env olarak; repoya asla yazılmaz
- [ ] `DATABASE_URL` yoksa uygulama JSON'a düşer (fail-safe), çöker değil
- [ ] Vercel ortam değişkenleri Production/Preview ayrımıyla tanımlanır
- [ ] Deploy sonrası `curl -I` ile başlıklar **ve nonce'lu CSP** yeniden doğrulanır; tarayıcı konsolunda CSP ihlali olmamalı
- [ ] Nonce'lu CSP üretimde test edilir (`'unsafe-eval'` görünmemeli, `upgrade-insecure-requests` görünmeli)
- [ ] `npm audit --omit=dev` temiz
- [ ] Cron başarısızlığında bildirim (Actions hata kodu 2 → dead man's switch)
