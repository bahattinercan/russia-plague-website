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
npm run security-check   # güvenlik regresyon testleri (ReDoS, URL şeması, CSP)
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
| Depo (MVP: JSON → Neon Postgres) | `src/lib/storage/json.ts` |
| Cron giriş noktası | `scripts/ingest.ts` |

### Ölçülen kaynak gerçekleri

Bu projede kaynak davranışı **iddia değil, ölçüm** ile belgelenir:

- **WHO** RSS feed'ini kaldırdı (404) → HTML/Google News yedeği
- **CIDRAP** RSS'i canlı görünüyor ama en yeni öğesi **Kasım 2022** → bayat feed tespiti bu yüzden zorunlu
- **ProMED** ve **ECDC** RSS sunmuyor
- **Rospotrebnadzor** Türkiye'den doğrudan erişilemiyor (HTTP 000) → Google News önbelleği
- **RFE/RL** `/api/` uç noktası çalışıyor, `/api/zrqiteuuir` 0 öğe döndürüyor
- **Novaya Gazeta Europe** RSS uçları kapalı (404/521/403)

---

## Dokümanlar

- [`docs/PLAN.md`](docs/PLAN.md) — tam proje planı: mimari, doğruluk katmanı, veri modeli, fazlar, riskler
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
