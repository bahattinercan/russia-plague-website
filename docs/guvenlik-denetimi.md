# Güvenlik Denetimi

**Tarih:** 7 Ekim 2026
**Kapsam:** `russia-plague-website` (public repo, canlıya çıkmadan önce)
**Yöntem:** Otomatik tarama (sır, bağımlılık, kod deseni), manuel kod incelemesi, canlı başlık doğrulaması, sentetik saldırı testleri.

---

## 1. Temiz çıkan kontroller

| Kontrol | Sonuç | Kanıt |
|---|---|---|
| Sır / API anahtarı taraması | ✅ Temiz | `grep` ile api_key, secret, token, private key desenleri — yalnızca "tema token" gibi yanlış eşleşmeler |
| `.env` ve anahtar dosyaları | ✅ Yok | `find` ile `.env*`, `*.pem`, `*.key`, `id_rsa`, `.npmrc`, `.netrc` — hiçbiri yok |
| Git geçmişinde sızıntı | ✅ Temiz | `git log -p --all` taraması |
| `.gitignore` kapsamı | ✅ Yeterli | `.env*`, `.next/`, `node_modules/`, `*.tsbuildinfo`, `.shots/` |
| Bağımlılık zafiyetleri | ✅ 0 | `npm audit` → `{info:0, low:0, moderate:0, high:0, critical:0}` |
| Lisans uyumu | ✅ Temiz | next/react/react-dom/cheerio/rss-parser/zod MIT, drizzle-orm Apache-2.0 |
| XSS yüzeyi (kod) | ✅ Yok | `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.write` hiç kullanılmıyor |
| `target="_blank"` güvenliği | ✅ Tam | 3 kullanımın 3'ünde `rel="noopener noreferrer nofollow"` |
| Açık yönlendirme (proxy) | ✅ Yok | `//evil.com` → `localhost:3113/evil.com` (host korunuyor) |
| Feed içeriği şema kontrolü | ✅ Tam | 212 bağlantının tamamı http(s) |

---

## 2. Bulunan ve düzeltilen sorunlar

### B-1 — `stripHtml` içinde O(n²) ReDoS (Yüksek)

**Sorun:** `/<script[\s\S]*?<\/script>/gi` deseni kapanmayan etiketlerde her `<script>` için tüm metni yeniden tarıyordu.

**Ölçüm:** 1 MB `<script>` tekrarı → **4904 ms** CPU.

**Etki:** Bozuk veya kötü niyetli bir kaynak, ingest sürecini saniyelerce kilitler; çok kaynaklı taramada toplam süre katlanır.

**Düzeltme:** `stripBlocks()` — `indexOf` tabanlı linear tarama. Ayrıca giriş 400 KB ile sınırlandı ve etiket regex'i `<[^>]{0,4000}>` (geri izleme yok).

**Doğrulama:** Aynı girdi → **0.8 ms** (≈6000× iyileşme).

### B-2 — Dış bağlantılarda şema doğrulaması yok (Yüksek)

**Sorun:** RSS/HTML/Telegram adaptörlerinden gelen `url` doğrudan `<a href>` içine konuyordu. React `href` değerini temizlemez.

**Etki:** `javascript:alert(document.cookie)` gibi bir bağlantı tıklandığında kod çalışır (XSS). Kaynak feed'i ele geçirilirse veya bozulursa tetiklenir.

**Düzeltme:** `safeExternalUrl()` — yalnızca `http:`/`https:` kabul eder. `normalizeItem` geçersiz şemada `null` döner ve öğe elenir. UI'da savunma derinliği olarak bağlantılar yeniden filtrelenir.

**Doğrulama:** `javascript:`, `data:`, `vbscript:`, `file:`, göreli yol, boş, `null`, bozuk URL → hepsi reddedilir.

### B-3 — Yanıt gövdesi boyut sınırı yok (Orta)

**Sorun:** `res.text()` sınırsızdı.

**Etki:** Bozuk/kötü niyetli kaynak gigabaytlarca gövde döndürüp belleği tüketebilir.

**Düzeltme:** `readLimitedText()` — 3 MB üstünde okuma iptal edilir (HTML ve Telegram adaptörleri).

### B-4 — HTTP güvenlik başlıkları yok (Orta)

**Düzeltme:** `next.config.ts` içine eklendi ve canlı doğrulandı:

```
Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none';
  frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:;
  connect-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Cross-Origin-Opener-Policy: same-origin
```

Ayrıca `poweredByHeader: false` ile `X-Powered-By` kaldırıldı (doğrulandı: 0 eşleşme).

### B-5 — `proxy.ts` yol normalizasyonu (Düşük)

`//evil.com` gibi protokol-göreli bir yol birleştirme sırasında yorumlanmasın diye yol normalize edildi.

---

## 3. Kalan riskler (kabul edilen)

| Risk | Neden kabul edildi | Plan |
|---|---|---|
| `script-src 'unsafe-inline'` | Next.js hydration inline script kullanır; nonce tabanlı CSP kurulumu gerektirir. Sitede **kullanıcı girdisi render edilmez**, dış içerik React tarafından escape edilir → pratik risk düşük | F2: nonce tabanlı CSP |
| Google Fonts dış kaynak | Kullanıcı IP'si Google'a iletilir (gizlilik, KVKK/GDPR notu) | F2: fontları self-host et |
| Uygulama seviyesinde rate limiting yok | Vercel platform koruması mevcut; site yalnızca okuma yapar | Gerekirse Vercel WAF / Upstash Ratelimit |
| Bağımlılıklar elle güncelleniyor | `npm audit` temiz, lockfile sabit | Dependabot etkinleştir |
| `data/feed.json` repo'da commit ediliyor | MVP deposu; üretimde Postgres'e geçilecek | A adımı |

---

## 4. Regresyon koruması

```bash
npm run security-check
```

`scripts/security-check.ts` şunları doğrular:
- `stripHtml` tüm sentetik ReDoS girdilerinde < 400 ms
- script/style içeriği temizleniyor
- `safeExternalUrl` tehlikeli şemaları reddediyor
- `feed.json` içindeki tüm bağlantılar http(s)

**Yeni bir dış-veri işleme yolu eklendiğinde buraya test eklenmelidir.**

---

## 5. Yayın öncesi kontrol listesi (A adımı)

- [ ] GitHub Actions workflow'u: `permissions` minimal, `npm ci` kullan, `pull_request_target` **kullanma**, fork PR'larında secret çalıştırma
- [ ] Neon bağlantı dizesi yalnızca GitHub Secret / Vercel Env olarak; repoya asla yazılmaz
- [ ] `DATABASE_URL` yoksa uygulama JSON'a düşer (fail-safe), çöker değil
- [ ] Vercel ortam değişkenleri Production/Preview ayrımıyla tanımlanır
- [ ] Cron başarısızlığında bildirim (Actions hata kodu 2 → dead man's switch)
- [ ] Deploy sonrası `curl -I` ile güvenlik başlıkları yeniden doğrulanır
