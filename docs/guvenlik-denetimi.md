# Güvenlik Denetimi

**Kapsam:** `russia-plague-website` (public repo — 9 Eki 2026'da `gh repo view` ile doğrulandı; canlıya çıkmadan önce)
**Yöntem:** Otomatik tarama (sır, bağımlılık, kod deseni), manuel kod incelemesi, canlı başlık doğrulaması, sentetik saldırı testleri.

| Tur | Tarih       | Not                                                        |
| --- | ----------- | ---------------------------------------------------------- |
| 1   | 7 Ekim 2026 | İlk denetim — B-1…B-5 bulundu ve düzeltildi                |
| 2   | 7 Ekim 2026 | Bağımsız yeniden doğrulama — B-6…B-9 bulundu ve düzeltildi |
| 3   | 9 Ekim 2026 | Bağımsız denetim — B-10…B-12 bulundu ve düzeltildi          |

---

## 1. Doğrulanan kontroller

| Kontrol                            | Sonuç          | Kanıt                                                                                                                              |
| ---------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Sır / API anahtarı taraması (repo) | ✅ Temiz       | `git grep` + `git log --all` — api_key/secret/token/private key deseni yok                                                         |
| `.env` dosyalarının git durumu     | ⚠️ Ayrıntı B-7 | `.env.local` **çalışma dizininde var** (canlı Neon + Vercel OIDC) ama `.gitignore` kapsamında ve geçmişte **hiç commit edilmemiş** |
| `.gitignore` kapsamı               | ✅ Yeterli     | `.env*`, `.next/`, `node_modules/`, `*.tsbuildinfo`, `.shots/`, `.vercel`                                                          |
| Bağımlılık zafiyetleri             | ✅ Çözüldü (9 Eki 2026) | `npm audit` → 4 moderate (drizzle-kit → esbuild). **Düzeltme:** drizzle-kit `dependencies`'teydi, `devDependencies`'te değil — bu yüzden `npm audit --omit=dev` de 4 moderate veriyordu. Paket `devDependencies`'e taşındı (çalışma ağacında, henüz commit edilmemiş); artık `npm audit --omit=dev` → **0**, tam `npm audit` → 4 moderate. Uygulama çalışma anında drizzle-kit kullanmıyor (yalnızca `drizzle-orm`); artık `security-check`'te **B-10** kapısı var: drizzle-kit'in `dependencies`'te olmaması doğrulanıyor |
| Lisans uyumu                       | ✅ Temiz       | next/react/react-dom/cheerio/rss-parser/zod MIT, drizzle-orm Apache-2.0. **Kapandı (9 Eki 2026):** proje açık kaynak — `LICENSE` (MIT) depoda, `package.json` `ISC` → `MIT`. Eski çelişki: README MIT diyordu ama LICENSE dosyası yoktu. **Not:** `LICENSE`, `CONTRIBUTING.md` ve `SECURITY.md` açık kaynak hazırlığı commit'inde yer alıyor; bu satır o dosyaların içeriğini değil, kararı kaydeder |
| XSS yüzeyi (kod)                   | ✅ Yok         | `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.write` hiç kullanılmıyor                                 |
| Dış link şema filtresi             | ✅ Tam         | Tüm dinamik `href` değerleri `safeExternalUrl()`'den geçer                                                                         |
| `target="_blank"` güvenliği        | ✅ Tam         | 7/7 kullanımda `rel="noopener noreferrer nofollow"` (ClaimList, EventCard, SignalList, Disclaimer)                                        |
| Açık yönlendirme (proxy)           | ✅ Yok         | `//evil.com` → `308 /evil.com`; `%2e%2e%2f` → 404                                                                                  |
| SQL enjeksiyonu                    | ✅ Yok         | Tüm sorgular parametreli; tablo/kolon adları sabit (kullanıcı girdisi değil)                                                       |
| Komut enjeksiyonu                  | ✅ Yok         | `child_process`/`exec` hiç yok; dosya yolları sabit                                                                                |
| GitHub Actions                     | ✅ Yeterli     | `permissions` minimal, `pull_request_target` yok, fork secret'ı yok, `npm ci`. **Not:** depoda tek workflow var — `ingest.yml`; ayrı bir CI workflow'u (`ci.yml`) **yok**                                    |
| Dal koruması (`main`)              | ✅ Açık (B-11) | PR zorunlu, force-push ve dal silme kapalı, `enforce_admins: true`; `gh api …/branches/main/protection` ile doğrulandı                                                  |
| En az yetkili DB rolü              | ✅ Açık (B-12) | Uygulama/CI/Vercel `plague_app` (`NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`); `neondb_owner` yalnızca yönetim için ve şifresi rotate edildi                     |
| Next.js dosya sözleşmesi           | ✅ Doğru       | Next 16'da `middleware.ts` → `proxy.ts`; dosya `src/proxy.ts` (docs ile teyit edildi)                                              |
| `X-Powered-By`                     | ✅ Kapalı      | Canlı yanıtta başlık yok (`poweredByHeader: false`)                                                                                |
| Feed içeriği şema kontrolü         | ✅ Tam         | 214 bağlantının tamamı http(s)                                                                                                     |
| TypeScript derlemesi               | ✅ Temiz       | `tsc --noEmit` hatasız                                                                                                             |

**Canlı başlık doğrulaması** (`GET /tr`, `next dev`):

> 9 Eki 2026 notu: Vercel'in bot koruması `curl -I` isteklerini `403 challenge` ile yanıtlıyor (`X-Vercel-Mitigated: challenge`). Canlı başlıklar curl ile değil tarayıcıdan doğrulanmalı; aşağıdaki çıktı dev sunucusundan alınmıştır.

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

## 4. Tur 3 — bulunan ve düzeltilen sorunlar

### B-10 — `drizzle-kit` prod ağacında duruyordu (Orta · tedarik zinciri)

**Sorun:** Paket `dependencies` içindeydi, oysa çalışma zamanında hiç import edilmiyor (`drizzle.config.*` yok, şema `SCHEMA_SQL` ile kuruluyor, migration kullanılmıyor). Sonuç: `npm audit --omit=dev` prod ağacında 4 moderate (esbuild dev-server, GHSA-67mh-4wv8-2f99) gösteriyordu ve Tur 2'deki "hepsi dev-only" ifadesi yanlıştı — zincir prod ağacındaydı, kodu prod bundle'ına girmiyordu.
**Düzeltme:** `devDependencies`'e taşındı (`c87361b`). `security-check`'e kapı eklendi: drizzle-kit prod bağımlılığı **değil**, drizzle-orm prod bağımlılığı.
**Doğrulama:** `npm audit --omit=dev` → 0 · `npm audit` → 4 moderate (dev-only) · `security-check` 58/58 PASS · `vercel --prod` bu `package.json` ile build+deploy etti · CI ingest run `37865542406` success.

### B-11 — `main` dalı korumasızdı (Orta · tedarik zinciri)

**Sorun:** Repo public ve `main`'e push otomatik production deploy tetikliyor; dal koruması yoktu. Yazma yetkisi olan biri (veya sızmış bir token) doğrudan canlıya çıkabilir, force-push ile geçmiş yeniden yazılabilirdi.
**Düzeltme:** Branch protection — PR zorunlu, force-push ve dal silme kapalı, doğrusal geçmiş, admin dahil (`enforce_admins: true`).
**Doğrulama:** `gh api repos/…/branches/main/protection` → `required_pull_request_reviews` dolu, `enforce_admins.enabled = true`, `allow_force_pushes = false`; doğrudan `main` güncellemesi API üzerinden reddedildi.
**Ek:** cron-job.org'daki tetikleyici token **fine-grained PAT** (`GET /user` yanıtında `x-oauth-scopes` yok). GitHub UI'dan yalnızca `Actions: read/write` ve tek repo olduğu teyit edilmeli.

### B-12 — Uygulama/CI owner rolüyle çalışıyordu (Orta · yetki fazlalığı)

**Sorun:** `.env.local`, Vercel ve GitHub secret'ı `neondb_owner` kullanıyordu; `pg_roles` ölçümü bu rolde `BYPASSRLS + CREATEDB + CREATEROLE` gösterdi. Ayrıca şifre oturum loglarına düşmüştü.
**Düzeltme:** `plague_app` rolü açıldı (`NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION`), altı tablo + sequence sahipliği devredildi, üç tüketici (yerel env, Vercel production, Actions secret) bu role geçirildi. Owner şifresi rotate edildi; yönetici bağlantısı `.env.admin.local`'de (gitignore: `.env*`).
**Doğrulama:** `db:check` ✅ · `SCHEMA_SQL` + INSERT/UPDATE/DELETE geri alınan transaction'da ✅ · `CREATE DATABASE`/`CREATE ROLE` → `42501` ✅ · CI ingest run success + yeni `ingest_reports` satırı ✅ · canlı site "Son tarama" DB'deki son ingest ile aynı (JSON yedeği 2 gün eski olduğu için ayırt edici) ✅ · eski owner şifresi reddediliyor ✅
**Prosedür:** kalıcı skill `project:russia-plague-website:neon-least-privilege-app-role`.

---

## 5. Kalan riskler (kabul edilen)

| Risk                                      | Neden kabul edildi                                                                               | Plan                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `style-src 'unsafe-inline'`               | Bkz. B-9: nonce + inline style nitelikleri birlikte çalışmaz; script tarafı sertleştirildi       | Gerekirse `style-src-attr 'unsafe-inline'` + nonce'lu `style-src-elem` ayrımı |
| Google Fonts dış kaynak                   | ✅ **KAPANDI (8 Eki 2026):** yazı tipleri `next/font` ile self-host edildi (`Inter`, `Newsreader`, `JetBrains Mono`); `style-src`/`font-src` artık yalnızca `'self'`. Regresyon kapısı: `security-check` (dış host yasağı) + `ui-check`. | —                                                                             |
| COEP yok (`Cross-Origin-Embedder-Policy`) | `require-corp` dış font CDN'i ile uyumsuzdu; **artık dış font yok**, denenebilir                  | `require-corp` denenip görsel doğrulama yapılacak                             |
| Uygulama seviyesinde rate limiting yok    | Vercel platform koruması mevcut; site yalnızca okuma yapar; API rotası yok                       | Gerekirse Vercel WAF / Upstash Ratelimit                                      |
| Dev-only zafiyetler (B-8/B-10)            | Artık gerçekten dev-only: drizzle-kit `devDependencies`'te (`c87361b`), `npm audit --omit=dev` → 0; kod prod bundle'ına girmiyor | Dependabot + drizzle-kit'in esbuild'i güncelleyen sürümü çıkınca yükselt          |
| `data/feed.json` repo'da commit ediliyor  | MVP deposu; içerik yalnızca başlık + kısa alıntı                                                 | A adımı: Postgres'e geçiş, `data/` gitignore                                  |
| `readLimitedText` fazla ayırma            | Limiti aşan chunk `total`'a eklenip diziye alınmıyor → chunk başına en fazla ~64 KB fazla bellek | Kozmetik; limit sınırına çekilebilir                                          |

---

## 6. Regresyon koruması

```bash
npm run security-check     # 58 test (9 Eki 2026, B-10 kapısı eklendikten sonra)
npm run typecheck
```

`scripts/security-check.ts` şunları doğrular:

| Grup                | Kapsam                                                                                                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ReDoS               | `stripHtml` 6 sentetik girdide < 400 ms                                                                                                                                                 |
| İçerik temizliği    | script/style içeriği, etiketler, varlıklar                                                                                                                                              |
| Şema filtresi       | `javascript:`, `data:`, `vbscript:`, `file:`, göreli yol, boş, `null`, bozuk URL                                                                                                        |
| Bozuk varlık (B-6)  | aşırı büyük/taşan/sınır üstü/vekil/NUL kod noktaları fırlatmaz; geçerli varlıklar çözülür                                                                                               |
| Log maskeleme (B-7) | `userinfo` + `?password=` + `&pwd=` sızdırmaz                                                                                                                                           |
| CSP (B-9)           | nonce `script-src`'te, `'unsafe-inline'` yok, `style-src` inline'ı korur, `'unsafe-eval'` yalnızca dev, `upgrade-insecure-requests` yalnızca üretim, `next.config.ts`'te statik CSP yok |
| Feed                | `data/feed.json` içindeki tüm bağlantılar http(s)                                                                                                                                       |
| Bağımlılık hijyeni (B-10) | `drizzle-kit` prod bağımlılığı değil (yalnızca migration CLI) — `package.json` üzerinden doğrulanır                                                                       |

**Yeni bir dış-veri işleme yolu eklendiğinde buraya test eklenmelidir.**

---

## 7. Yayın öncesi kontrol listesi (A adımı)

- [x] `.env.local` sırlarını rotate et; uygulama için owner olmayan, yetkisi kısıtlı DB rolü kullan (B-7) *(9 Eki 2026: B-12 — `plague_app` rolü + owner şifresi rotate edildi)*
- [x] GitHub Actions workflow'u: `permissions` minimal, `npm ci`, `pull_request_target` **kullanma**, fork PR'larında secret çalıştırma *(`ingest.yml`: `contents: read` + `issues: write`)*
- [x] Neon bağlantı dizesi yalnızca GitHub Secret / Vercel Env olarak; repoya asla yazılmaz
- [x] `DATABASE_URL` yoksa uygulama JSON'a düşer (fail-safe), çöker değil
- [ ] Vercel ortam değişkenleri Production/Preview ayrımıyla tanımlanır
- [x] Deploy sonrası başlıklar **ve nonce'lu CSP** yeniden doğrulanır; tarayıcı konsolunda CSP ihlali olmamalı *(9 Eki 2026: alias üzerinden doğrulandı — CSP nonce'lu, 14/14 `<script>` nonce taşıyor, `X-Powered-By` yok; Vercel bot challenge bazı curl isteklerini 403 ile kesiyor)*
- [x] Nonce'lu CSP üretimde test edilir (`'unsafe-eval'` görünmemeli, `upgrade-insecure-requests` görünmeli) *(9 Eki 2026: ikisi de doğrulandı)*
- [x] `main` dalı korumalı: PR zorunlu, force-push/dal silme kapalı, `enforce_admins: true` (B-11)
- [x] `npm audit --omit=dev` temiz *(9 Eki 2026: 0 — drizzle-kit `devDependencies`'e taşındı, `c87361b`. Tam `npm audit` hâlâ 4 moderate, dev-only)*
- [x] Cron başarısızlığında bildirim (Actions hata kodu 2 → dead man's switch) + cron-job.org başarısızlık alarmı
