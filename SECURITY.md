# Güvenlik Politikası

Son gözden geçirme: **12 Ekim 2026** (Tur 4 / B-13 sonrası).
Ayrıntılı denetim kaydı ve ölçümler: [`docs/guvenlik-denetimi.md`](docs/guvenlik-denetimi.md).

## Bir sorun bulduğunda

**Herkese açık issue açma.** Bu projede kullanıcı verisi ve credential var; açık issue, düzeltilmemiş bir sorunu herkese gösterir.

- GitHub → Security → **Report a vulnerability** (özel advisory) — tercih edilen yol.
- Alternatif: `bahattin.ercan.43@gmail.com`

Şunları ver:

1. Adım adım yeniden üretme
2. Etki (hangi kullanıcı verisi / hangi sır / hangi başlık)
3. Önerilen düzeltme (varsa)

Yanıt hedefi: **7 gün içinde** durum değerlendirmesi, **30 gün içinde** düzeltme veya gerekçeli ret. Düzeltme sonrası isteğe bağlı olarak teşekkür + credit.

## Ödül

Bug bounty yoktur. Açık kaynak katkısı olarak değerlendirilir.

## Kapsam

- `src/`, `scripts/`, `.github/workflows/`, `next.config.ts`, `package.json`
- CSP, nonce üretimi, güvenlik başlıkları, dil yönlendirmesi (`src/proxy.ts`, `src/lib/security/csp.ts`)
- Dış veri işleme: `stripHtml()`, `safeExternalUrl()`, `archiveUrlFor()`, adaptörler
- Log maskeleme (`src/lib/env.ts`)
- Veri katmanı ve fail-safe davranışı (`src/lib/storage/*`)
- Bağımlılık zinciri

## Kapsam dışı

- Kaynakların (yayıncıların) kendi güvenliği veya erişilebilirliği
- Kullanıcının kendi tarayıcı/cihazı
- `data/feed.json` içindeki haber içeriğinin doğruluğu — bu bir güvenlik sorunu değil, editoryal konudur. Yanlış bilgi için issue aç, "güvenlik açığı" diye değil.
- Sosyal mühendislik, toplayıcı (scraping) yasallığı

## Zaten uygulanan korumalar

| Alan | Ne var |
|---|---|
| CSP | Nonce tabanlı `script-src` (`'unsafe-inline'` yok) + `'strict-dynamic'`; `style-src 'self'` + nonce'lu `style-src-elem` + `style-src-attr 'unsafe-inline'` (React inline `style` nitelikleri için); `frame-src`/`frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`; `'unsafe-eval'` yalnızca dev, `upgrade-insecure-requests` yalnızca üretim. Yazı tipleri `next/font` ile self-host → stil/font/img yalnızca `'self'` (+`data:`) |
| Başlıklar | HSTS (preload), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP, **COEP `require-corp`**, CORP `same-origin`, `poweredByHeader: false` |
| Dış veri | `stripHtml()` linear zamanlı + 400 KB sınırı; `safeExternalUrl()` yalnızca http/https; `target="_blank"` tüm kullanımlarda `rel="noopener noreferrer nofollow"` |
| Log | Connection string maskeleme (`userinfo`, `?password=`, `&pwd=`) |
| Sırlar | `.env*` gitignore'da; geçmiş taraması temiz; GitHub Secret + Vercel Env; fine-grained PAT için ayrı script; uygulama/CI/Vercel **`plague_app`** (en az yetkili) rolünü kullanır |
| CI | `permissions` minimal, `pull_request_target` yok, fork PR'larında secret çalışmaz, `npm ci`; `main` korumalı (PR zorunlu, `enforce_admins`, doğrusal geçmiş, `gates` zorunlu status check) |
| Fail-safe | `DATABASE_URL` yoksa veya bağlantı koparsa JSON'a düşer, çökmez |

Regresyon koruması: **`npm run security-check` (63 test)** + `npm run check-all`.
**Yeni bir dış-veri işleme yolu ya da yeni bir başlık/direktif eklerken buraya test eklemelisin.** Kapı listesi ve her testin neyi koruduğu: `docs/guvenlik-denetimi.md` §6.

## Bilinen, kapatılmayan riskler

- `style-src-attr 'unsafe-inline'` duruyor. Nitelik stilleri script çalıştıramaz (yalnızca `--reveal-delay`, `left/top`, `aspect-ratio` gibi değerler); kritik olan `<style>` elemanı tarafı nonce'lu. CSP2 tarayıcılar (`style-src-elem`/`-attr` bilmeyenler) yalnızca `style-src 'self'` görür → kademeli animasyon gecikmesini kaybeder, içerik gizlenmez.
- `npm audit` → 4 moderate (drizzle-kit → esbuild, GHSA-67mh-4wv8-2f99). Zincir `devDependencies` içinde; uygulama çalışma anında drizzle-kit kullanmıyor, `npm audit --omit=dev` **0**. Upstream esbuild'i güncelleyince yükselecek.
- `.env.local`'da canlı credential var (yerel geliştirme). Uygulama, CI ve Vercel `plague_app` rolünü kullanır; `neondb_owner` yalnızca yönetim işleri için `.env.admin.local`'de durur ve şifresi rotate edilmiştir (B-12).
- Uygulama seviyesinde rate limiting yok. Site yalnızca okuma yapar ve API rotası yoktur; platform koruması Vercel tarafında. Gerekirse Vercel WAF / Upstash Ratelimit.
- Vercel'in bot koruması **aralıklı** olarak `curl` isteklerini `403 challenge` ile kesiyor (`X-Vercel-Mitigated: challenge`). Başlık doğrulaması normalde curl ile yapılabilir; challenge geldiğinde tarayıcıya düşülür.
- `data/feed.json` repo'da commit ediliyor (MVP deposu). İçerik yalnızca başlık + kısa alıntı; Postgres'e tam geçişte `data/` gitignore'a alınacak.
- `readLimitedText()` limiti aşan chunk'ı `total`'a ekleyip diziye almıyor → chunk başına en fazla ~64 KB fazla bellek. Kozmetik.

Kapananlar: `style-src`'te `'unsafe-inline'` ve COEP eksikliği (12 Eki 2026, B-13) · Google Fonts dış kaynağı (8 Eki 2026) · `drizzle-kit`'in prod ağacında durması + `main` dal koruması + owner rolü (9 Eki 2026, B-10…B-12).

Bu listedeki bir maddeyi kapatacak PR beklenir; kapandığında bu dosya ve `docs/guvenlik-denetimi.md` güncellenir.
