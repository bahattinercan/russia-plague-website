# Katkı Rehberi

Bu proje açık kaynaktır (MIT). Katkılar için teşekkürler — ama bazı kurallar **pazarlık konusu değildir**, çünkü projenin tek değeri şeffaflık ve kaynak dürüstlüğüdür.

## Dokunmadan önce oku

- [`docs/PLAN.md`](docs/PLAN.md) — mimari, doğruluk katmanı, kararlar
- [`docs/kaynak-envanteri.md`](docs/kaynak-envanteri.md) — ölçülmüş kaynak gerçekleri
- [`docs/guvenlik-denetimi.md`](docs/guvenlik-denetimi.md) — güvenlik kararları ve kalan riskler
- [`docs/arayuz-plani.md`](docs/arayuz-plani.md) + [`docs/harita-plani.md`](docs/harita-plani.md) — arayüz kararları ve ölçümler

## Pazarlık konusu olmayan kurallar

1. **Sistem "doğrulandı" demez.** Sitede hiçbir yerde `doğrulanmış`, `confirmed`, `teyit edildi`, `verified` geçmez. En yüksek etiket **"çoklu bağımsız kaynak bildiriyor"** (`corroborated`). Bu kural `ui-check` ve `summarize-check` ile kapı altında; sözlükte yasak sözcük testi var.
2. **Bağımsızlık grubu = sahiplik çatısı.** TASS + RIA + RT + Sputnik aynı haberi yazsa bağımsız kaynak sayısı **1**'dir. Bir kaynağı kendi grubuna taşımak, etiket sayısını değiştiren bir karardır ve gerekçeli olmalıdır.
3. **Tam metin kopyalanmaz.** Başlık + en fazla 2 cümle alıntı + kaynak linki + arşiv linki.
4. **Üretken özet yok.** Özet, kaynak metninden cümle seçimidir (extractive). LLM yeniden yazım yapmaz.
5. **Sır commit edilmez.** `.env.local`, connection string, API anahtarı yok. Loglarda connection string maskelenir (`src/lib/env.ts`).
6. **Harita için dış karo servisi yok.** CSP `img-src 'self' data:` ve `connect-src 'self'` dış tile/worker servislerini bloklar. MapLibre/Leaflet + OSM/Google tiles eklemek güvenlik regresyonudur; harita satır içi SVG olarak kalır.

## Tier ve trust puanı değişiklikleri

`src/lib/sources/registry.ts` içindeki `tier` ve `trustBase` değerleri **elle belirlenir ve otomatik öğrenilmez** — bunlar editoryal kararlardır ve metodoloji sayfasında yayınlanır.

Bir değişiklik PR'ında şunlar zorunludur:

- **Gerekçe:** neden değişti (erişim testi sonucu, yayıncı kimliği, sahiplik çatısı, devlet kontrolü cezası).
- **Kanıt:** ölçüm (HTTP kodu, en yeni öğe tarihi, dönen öğe sayısı) — iddia değil.
- **Etki:** hangi etiketlerin değişeceği (`corroborated` sayısı, `official` olup olmadığı).
- **Yeni T1 kaynağı için en az iki erişim yolu** (birincil + yedek). Tek yola bağlı kaynak tek nokta arıza sayılır.

Yalnızca kimlik ataması için yayıncı eklemek istiyorsan `KNOWN_PUBLISHERS`'a ekle (taranmaz, Google News üzerinden gelen haberin gerçek yayıncısını tanımak için).

## Kapılar (PR'dan önce koşmalı)

```bash
npm run typecheck
npm run ui-check          # kontrast AA, yüzey ayrışması, opaklık/mikro punto, TR/EN sözlük paritesi, yasak sözcükler
npm run security-check    # ReDoS, URL şeması, varlık DoS, log maskeleme, nonce CSP
npm run translation-check # çeviri doğrulama kapıları (ağsız)
npm run geo-check         # konum çıkarımı + kapsama oranı
npm run figures-check     # rakamların gerçek kaynak cümlesine bağlılığı
npm run summarize-check   # editoryal dil kapısı
npm run check-all         # yukarıdakiler (layout-check hariç)
```

`npm run layout-check` yalnızca yerelde ve Chrome ister: önce `npm run build && npx next start -p 3211`, sonra `npm run layout-check`. Bu kapı mobil kırılmasını (rozetin başlığı satır başına bir kelimeye düşürmesi) ve yatay taşmayı engeller.

Yeni bir dış-veri işleme yolu eklersen `scripts/security-check.ts`'e test eklemelisin.

## Ölçüm yazarken

Dokümanlardaki sayılar **ölçüm tarihine** bağlıdır ve feed penceresiyle değişir. Bir sayı yazıyorsan tarihini ve komutunu yaz (`npm run geo-check` gibi), yoksa bir sonraki okuyucu onu güncel sanır.

## Commit ve PR

- Conventional Commits: `feat(scope): ...`, `fix(scope): ...`, `docs(scope): ...`.
- Türkçe commit mesajı ve gerekçeli body (proje konvansiyonu).
- Bir PR tek iş yapmalı. Kapıların tamamı geçmeli.
- Kapsam dışı istekler: düzeltme günlüğü, editör onay arayüzü, bildirim/bot, ülke boyaması (koroplet kapısı geçmiyor), X API entegrasyonu. Bunlar için önce issue aç.

## Kapsam dışı (bilinçli)

- İnsan onaylı doğrulama — sistem tam otomatik ve doğrulama iddia etmiyor.
- Tıbbi tavsiye — site haber izleme aracıdır; her sayfada uyarı var.
- Gizlilik: ziyaretçi verisi yalnızca `localStorage` ("son ziyaretimden beri yeni") ve `lang` çerezi. Analitik, izleme, reklam yok.
