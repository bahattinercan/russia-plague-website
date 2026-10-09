# Güvenlik Politikası

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
- CSP, nonce üretimi, dil yönlendirmesi (`src/proxy.ts`)
- Dış veri işleme: `stripHtml()`, `safeExternalUrl()`, `archiveUrlFor()`, adaptörler
- Log maskeleme (`src/lib/env.ts`)
- Bağımlılık zinciri

## Kapsam dışı

- Kaynakların (yayıncıların) kendi güvenliği veya erişilebilirliği
- Kullanıcının kendi tarayıcı/cihazı
- `data/feed.json` içindeki haber içerığinin doğruluğu — bu bir güvenlik sorunu değil, editoryal konudur. Yanlış bilgi için issue aç, "güvenlik açığı" diye değil.
- Sosyal mühendislik, toplayıcı (scraping) yasallığı

## Zaten uygulanan korumalar

| Alan | Ne var |
|---|---|
| CSP | Nonce tabanlı `script-src` (`'unsafe-inline'` yok), `frame-src`/`frame-ancestors` `none`, `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`, `strict-dynamic`. Yazı tipleri self-host → `style-src`/`font-src` yalnızca `'self'` |
| Başlıklar | HSTS (preload), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP, CORP, `poweredByHeader: false` |
| Dış veri | `stripHtml()` linear zamanlı + 400 KB sınırı; `safeExternalUrl()` yalnızca http/https; `target="_blank"` tüm kullanımlarda `rel="noopener noreferrer nofollow"` |
| Log | Connection string maskeleme (`userinfo`, `?password=`, `&pwd=`) |
| Sırlar | `.env*` gitignore'da; geçmiş taraması temiz; GitHub Secret + Vercel Env; fine-grained PAT için ayrı script |
| CI | `permissions` minimal, `pull_request_target` yok, fork PR'larında secret çalışmaz, `npm ci` |
| Fail-safe | `DATABASE_URL` yoksa veya bağlantı koparsa JSON'a düşer, çökmez |

Regresyon koruması: `npm run security-check` (58 test). **Yeni bir dış-veri işleme yolu eklerken buraya test eklemelisin.**

Ayrıntılı denetim kaydı: [`docs/guvenlik-denetimi.md`](docs/guvenlik-denetimi.md).

## Bilinen, kapatılmayan riskler

- `style-src`'te `'unsafe-inline'` duruyor. Nonce ile birlikte çalışmadığı için bilinçli: React SSR inline `style` nitelikleri (`--reveal-delay`) bloklanırdı. Kritik olan `script-src` nonce'lu.
- COEP yok.
- `npm audit` → 4 moderate (drizzle-kit → esbuild). Uygulama çalışma anında drizzle-kit kullanmıyor; `npm audit --omit=dev` temiz.
- `.env.local`'da canlı credential var; uygulama, CI ve Vercel **`plague_app`** (en az yetkili) rolünü kullanır — `neondb_owner` yalnızca yönetim işleri için `.env.admin.local`'de durur ve şifresi rotate edilmiştir (B-12).
- Vercel'in bot koruması `curl -I` ile başlık doğrulamayı engelliyor (403 challenge) — üretim başlıkları tarayıcıdan doğrulanmalı.

Bu listedeki bir maddeyi kapatacak PR beklenir; kapandığında bu dosya ve `docs/guvenlik-denetimi.md` güncellenir.
