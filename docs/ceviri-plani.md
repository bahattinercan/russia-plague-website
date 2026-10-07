# TR Çeviri Planı — İngilizce (ve Rusça) haberlerin Türkçeye çevrilmesi

> Durum: **uygulandı** (P1–P5 tamam; P0 sağlayıcı kararı varsayılanlarla verildi).
> Uygulama durumu ve alınan kararlar en altta (§15).
> İlgili: `docs/PLAN.md` §4.3 (adım 6), §8, §10, §15; `README.md` "Çeviri" maddesi.

---

## 1. Sorun (ölçülmüş mevcut durum)

Site `/tr` ve `/en` olmak üzere iki dilde yayınlanıyor, ama **yalnızca arayüz metinleri** çevrili
(`src/lib/i18n.ts`). Haber içeriği her iki dilde de **orijinal dilinde** gösteriliyor.

`data/feed.json` (7 Eki 2026 taraması) üzerinde ölçüm:

| Alan | Adet | Toplam karakter |
|---|---|---|
| Olay başlığı (`event.title`) | 57 | ~4.500 |
| İddia başlığı (`claim.title`) | 93 | ~7.130 |
| Sinyal başlığı (`signal.title`, T5) | 121 | ~9.087 |
| **Tekilleştirilmiş tüm başlıklar** | **211** | **~15.900** |
| Bunlardan Türkçe görünmeyenler | 119 | ~9.180 |

Örnek: `"Russian lab worker dies of suspected plague in Siberia; US monitoring case"` `/tr`
sayfasında da aynen İngilizce görünüyor. `Article.titleOriginal === Article.title` ve
`PlagueEvent.titleOriginal === PlagueEvent.title` — ikisi de **aynı orijinal metni** taşıyor,
yani çeviri alanı bugün boş bir yer tutucu.

Kod tarafında hazır ama kullanılmayan iki iz var:
- `Dict.machineTranslated` → `'makine çevirisi'` / `'machine translation'` (hiç kullanılmıyor)
- `EventModal` içindeki `titleOriginal !== title` koşulu → çeviri geldiğinde "Orijinali oku"
  satırını göstermek için tasarlanmış, bugün hiç tetiklenmiyor.

**Sonuç:** `/tr` seçildiğinde kullanıcı İngilizce/Rusça başlık okuyor. İstenen: başlıklar
Türkçeye **düzgün** çevrilsin, ama orijinal her zaman görünür kalsın.

---

## 2. İlkeler ve kısıtlar (pazarlık dışı)

1. **Editoryal kural (`docs/PLAN.md` §5.3, §10):** Çeviri hiçbir koşulda
   "doğrulandı / teyit edildi / confirmed / verified" anlamı **katmamalı**. Kaynak
   "suspected / possibly / reportedly / allegedly" diyorsa Türkçe karşılığı da
   "şüpheli / olabileceği / bildirildi / iddia edildi" olmalı. Bu, §8'de otomatik kapıyla korunur.
2. **Makine çevirisi beyanı zorunlu — ama görünüm başına tek yerde.** Çeviri olduğu bilgisi olay
   detayında (modal) başlığın altında tek satır olarak verilir ve **orijinal başlık her zaman
   görünür** (PLAN §10, methodology sayfası). Liste/kart görünümünde tekrar eden rozet kullanılmaz
   (gerekçe: §9 görsel kural).
3. **Üretken özet yok.** Yalnızca çeviri yapılır; özet üretilmez, yeni bilgi eklenmez.
4. **Telif.** Yalnızca başlık (ve mevcutsa kaynak özeti) çevrilir; tam metin çekilmez/çevrilmez.
   Başlık çevirisi türev eserdir → yalnızca başlık + link + `readOriginal` ile sınırlı kalınır.
5. **Cron bütçesi.** `ingest.yml` `timeout-minutes: 12`, 10 dakikada bir çalışır. Çeviri bu
   bütçeyi yememeli → önbellek + zaman bütçesi + eşzamanlılık sınırı zorunlu (§7, §10).
6. **Fail-open.** Çeviri sağlayıcısı çökerse site çökmez: orijinal başlık gösterilir,
   başlık `translationStatus:'failed'` olarak işaretlenir, kullanıcıya yanlış çeviri gösterilmez.
7. **Kümeleme/tekrar giderme çeviriden etkilenmez.** `clusterArticles`, `detectContradiction`,
   `dedupeArticles`, `topEvents` **her zaman orijinal metinle** çalışır. Çeviri, boru hattının
   en sonunda, yayından hemen önce devreye girer.

---

## 3. Mimari kararı: ingest-time çeviri + kalıcı önbellek

| Yaklaşım | Artı | Eksi | Karar |
|---|---|---|---|
| **A. Ingest-time (cron)** | Sayfa anında hızlı; her metin bir kez çevrilir; ISR/`force-dynamic` dostu | Cron süresi artar, GH Actions secret gerekir | ✅ **Seçilen** |
| B. Runtime (istek anında) | Cron değişmez | Sayfa TTFB'si sağlayıcıya bağlı; eşzamanlı ziyaretçide çift çeviri; DB'de yine önbellek gerekir | ❌ |
| C. Build-time (statik) | Ucuz | Veri 10 dk'da bir değişiyor → işe yaramaz | ❌ |

Seçilen akış (`docs/PLAN.md` §4.3 adım 6'nın somutlaşmış hali):

```
normalize → relevance → dedupe → cluster → buildEvents
                                              │
                                              ▼
                         ┌───────────────────────────────────┐
                         │ ÇEVİRİ (yeni adım)                │
                         │  1) dil tespiti (tr ise atla)     │
                         │  2) content_hash ile önbellek bak │
                         │  3) eksikleri toplu çevir (batch) │
                         │  4) doğrulama kapılarından geçir  │
                         │  5) önbelleğe yaz                 │
                         └───────────────────────────────────┘
                                              │
                                              ▼
                              saveFeed (Postgres / JSON)
```

**Neden önbellek kritik:** her 10 dakikada aynı 211 başlık yeniden çevrilirse hem para hem
süre israfı olur. `contentHash` (zaten `normalizeItem`'da üretiliyor) + hedef dil anahtarıyla
kalıcı bir `translations` tablosu tutulur; tekrar eden içerik **0 maliyet** olur. Gerçek yeni
içerik hacmi turda genelde 0–15 başlık.

---

## 4. Çeviri sağlayıcısı seçenekleri

Adaptör **sağlayıcıdan bağımsız** yazılır (PLAN §4.1 "LLM (çeviri/özet): Sağlayıcıdan bağımsız
adaptör"). Tek dosya değiştirilerek sağlayıcı değiştirilebilir.

| Sağlayıcı | TR kalitesi | Halüsinasyon riski | Maliyet / limit | Not |
|---|---|---|---|---|
| **DeepL Free** (EN/RU→TR) | Yüksek, doğal | Çok düşük (gerçek MT) | 500k karakter/ay ücretsiz | Glossary'yi TR dahil destekler; ANCAK glossary kaynak dil otomatik tespitiyle birlikte kullanılamaz → `source_lang` açık verilmeli. `:fx` anahtar → `api-free.deepl.com` |
| **LLM mini** (gpt-4.1-mini / gemini-flash) | En yüksek (deyim, bağlam) | **Orta** → §8 kapıları şart | ~kuruş mertebesi | Sözlük + katı prompt + JSON çıktı ile hedging korunabilir |
| **Google Cloud Translation v2** | Orta-yüksek | Çok düşük | 500k karakter/ay ücretsiz | Kurulum (GCP projesi) ağır |
| **LibreTranslate (self-host)** | Düşük-orta | Düşük | Ücretsiz | TR kalitesi düşük; altyapı gerekir |
| **Yerel model (NLLB/Marian)** | Orta | Düşük | Ücretsiz | Barındırma gerekir, cron'a sığmaz |

**Öneri (iki aşamalı):**
1. **Başlangıç: DeepL Free.** Gerçek MT olduğu için "bilgi uydurma" riski yok; proje
   "doğrulanmış" iması taşımayan çeviri istiyor, bu yüzden deterministik sağlayıcı doğal başlangıç.
2. **Kalite ölçümü:** 30 gerçek başlık (EN + RU) üzerinde DeepL vs. LLM çıktısını elle
   puanla (§11 P5). LLM belirgin şekilde daha "düzgün"se ve §8 kapılarından geçiyorsa primary
   LLM'e, DeepL fallback'e çekilir.

**Anahtar yönetimi:** `.env.local` (`TRANSLATE_API_KEY`), GitHub Actions → Settings → Secrets,
Vercel → Environment Variables. Anahtar yoksa çeviri adımı sessizce atlanır (`translationStatus:'skipped'`),
site bugünkü gibi orijinal başlıkla çalışmaya devam eder.

---

## 5. Terim sözlüğü (glossary) — kalitenin anahtarı

`src/lib/translate/glossary.ts` — hem prompt'a enjekte edilir hem de doğrulama kapılarında
referans olur. Vazgeçilmez çünkü genel MT "plague"i bağlama göre "veba / bela / salgın" diye
çevirebiliyor.

**Zorunlu çeviriler (kilitli):**

| Kaynak | Türkçe | Not |
|---|---|---|
| plague / bubonic plague / pneumonic plague | veba / hıyarcıklı veba / pnömonik (akciğer) veba | |
| Yersinia pestis | Yersinia pestis | çevrilmez (bilimsel ad) |
| outbreak | salgın | "outbreak fears" → "salgın korkusu" |
| suspected / possibly / reportedly / allegedly | şüpheli / olabileceği / bildirildiğine göre / iddiaya göre | **hedging korunur** |
| lab worker / laboratory technician | laboratuvar çalışanı / laborant | |
| quarantine | karantina | |
| case / cases | vaka / vakalar | |
| death toll / died | ölü sayısı / hayatını kaybetti | "died of plague" → "vebadan hayatını kaybetti" |
| travel warning / advisory | seyahat uyarısı | |
| State Department | ABD Dışişleri Bakanlığı | |
| Centers for Disease Control (CDC) | ABD Hastalık Kontrol ve Önleme Merkezleri (CDC) | kısaltma korunur |

**Korunacak özel adlar (çevrilmez):** WHO, CDC, ECDC, Rospotrebnadzor, ProMED, CIDRAP,
RT, TASS, RIA, Meduza, Irkutsk, Sibirya/Siberia → Sibirya, Moğolistan, Kazakistan, Yersinia
pestis, kişi adları (Trump, Putin, Rubio, …). Kurum/kişi adları asla "Türkçeleştirilmez".

**Rusça kaynaklar için** aynı tablo RU→TR girdileriyle genişletilir (чума→veba,
бубонная→hıyarcıklı, лёгочная→pnömonik, карантин→karantina, случай→vaka, вспышка→salgın,
Роспотребнадзор→Rospotrebnadzor …), çünkü `meduza`, `tass`, `rian`, Telegram sinyalleri RU'dur.

---

## 6. Veri modeli değişiklikleri

### 6.1 Tipler (`src/types.ts`)

`Article` ve `PlagueEvent`'e ortak bir "çeviri bloğu" eklenir; `title` daima **orijinal**
kalır (mevcut semantik korunur, kümeleme bozulmaz):

```ts
export type TranslationStatus = 'ok' | 'failed' | 'skipped';

export interface TranslationMeta {
  titleTr: string | null;        // TR görünüm; yoksa null → UI orijinali gösterir
  excerptTr?: string | null;     // Article için
  summaryTr?: string | null;     // PlagueEvent için
  translatedAt: string | null;
  translationProvider: string | null; // 'deepl' | 'openai' | ...
  translationStatus: TranslationStatus;
}
```

- `Article extends TranslationMeta`
- `PlagueEvent extends TranslationMeta` (ayrıca `summaryTr`)
- `EventClaim`'e `titleTr: string | null`
- `IngestReport`'a `translated: number; translationSkipped: number; translationFailed: number; translationChars: number`

> Kural: `title` = orijinal. `titleTr` = TR. UI `locale === 'tr' ? (titleTr ?? title) : title`
> seçer. Böylece `EventModal`'daki mevcut `titleOriginal !== title` mantığı
> `titleOriginal !== displayedTitle`'a döner ve "Orijinali oku" doğru tetiklenir.

### 6.2 Postgres (`src/lib/storage/schema.ts` + `postgres.ts`)

⚠ **Repo tuzağı:** `ensureSchema()` yalnızca `CREATE TABLE IF NOT EXISTS` koşar; bu, var olan
tabloya **kolon eklemez**. Bu yüzden hem Drizzle tanımına hem `SCHEMA_SQL` sonuna
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` eklenmeli.

Eklenecek kolonlar (articles / events / event_claims):
`title_tr text`, `excerpt_tr text` (articles), `summary_tr text` (events),
`translated_at timestamptz`, `translation_provider text`,
`translation_status text NOT NULL DEFAULT 'skipped'`.

Kalıcı çeviri önbelleği — AYRI TABLO YOK:

Mevcut `articles` kayıtları önbellek olarak kullanılır. Her makale `content_hash`
taşır; aynı içerik sonraki turda yeniden görülürse `title_tr`/`excerpt_tr`
buradan geri okunur (`loadTranslationCache()` önceki feed'i `loadFeed()` ile okur).
Böylece hem yeni tablo/indeks hem de retention kodu gerekmez; ömrü zaten
`ARTICLE_RETENTION_DAYS` (180 gün) ile sınırlıdır. JSON modunda aynı bilgi önceki
`data/feed.json`'dan okunur. Önbellek okunamazsa çeviri yine denenir (fail-open).

> İlk taslakta ayrı bir `translations` tablosu öngörülmüştü; uygulamada
> makale satırlarını yeniden kullanmak daha az kod ve aynı faydayı sağladı.

### 6.3 JSON yedeği (`src/lib/storage/json.ts`)

`FeedFile` zaten `PlagueEvent[]`/`Article[]` taşıdığı için tip genişlemesiyle otomatik uyumlu.
`readFeed` eski snapshot'ı okuduğunda yeni alanlar `undefined` olur → UI `titleTr ?? title`
ile güvenli. Ek migrasyon gerekmez.

---

## 7. Pipeline entegrasyonu

Yeni modüller:

| Dosya | Sorumluluk |
|---|---|
| `src/lib/translate/provider.ts` | `Translator` arayüzü + sağlayıcı seçimi (env) |
| `src/lib/translate/deepl.ts` | DeepL adaptörü (batch, glossary) |
| `src/lib/translate/llm.ts` | (opsiyonel, P5 sonrası) LLM adaptörü |
| `src/lib/translate/glossary.ts` | Terim sözlüğü (EN/RU→TR) |
| `src/lib/translate/validate.ts` | Doğrulama kapıları (§8) |
| `src/lib/translate/index.ts` | `translateFeed(feed, opts)` orkestrasyonu |

`src/lib/ingest/pipeline.ts` içine eklenecek saf fonksiyon:

```ts
export function collectTranslatableTexts(
  events: PlagueEvent[],
  signals: Article[],
): { id: string; text: string; kind: 'event' | 'claim' | 'signal' | 'summary'; lang: string }[]
```

`scripts/ingest.ts` akışına `buildEvents` sonrası, `saveFeed` öncesi:

```ts
const translations = await translateFeed({ events, signals }, {
  provider: process.env.TRANSLATE_PROVIDER,
  apiKey: process.env.TRANSLATE_API_KEY,
  maxMs: 90_000,          // cron 12 dk bütçesinin içinde kal
  concurrency: 4,
  budgetChars: 60_000,    // tur başına sert üst sınır (kaza koruması)
});
```

`--dry` ile birlikte `--translate` bayrağı: ağa çıkmadan rapor (CI testleri için).
`--no-translate` bayrağı: anahtar/limit sorununda ingest'i bloklamadan kapatma.

**Sıra ve öncelik (zaman bütçesi dolduğunda):**
1. Olay başlıkları (en görünür, en çok okunan) → 2. Olay özetleri → 3. İddia başlıkları →
4. Sinyal başlıkları (T5, en düşük öncelik). Bütçe biterse kalan `skipped`; sonraki turda
önbellek zaten dolu olduğu için devam edilir.

---

## 8. Doğrulama kapıları (halüsinasyon/editoryal koruma)

Her çeviri, DB'ye yazılmadan önce `validate.ts`'ten geçer. **Bir kapı düşerse çeviri
kullanılmaz** (`translationStatus:'failed'`, UI orijinali gösterir + "çevrilmedi" notu).

1. **Yasaklı kelime kapısı.** Çıktıda `doğrulandı|teyit edildi|kesinleşti|resmen onaylandı`
   (ve büyük/küçük harf / diakritik varyantları) **hiç geçemez**. Bu, `npm run security-check`
   tarzı bir regresyon testiyle CI'da da korunur.
2. **Hedging korunumu.** Kaynak `suspected|possible|possibly|reportedly|allegedly|likely|
   unconfirmed` içeriyorsa çıktı `şüpheli|olası|olabileceği|bildirildi|iddia|doğrulanmamış|
   muhtemel` içermeli. Kaynak hedging içermiyorsa çıktı `kesin|doğrulandı` **eklememeli**.
3. **Sayı korunumu.** Kaynaktaki tüm sayılar/tarihler (örn. `5,500`, `2026`, `100`) çıktıda
   birebir bulunmalı (rakam normalizasyonu ile).
4. **Özel ad korunumu.** Glossary'deki korunacak adlardan kaynakta bulunanlar çıktıda da
   bulunmalı (WHO→WHO, Rospotrebnadzor→Rospotrebnadzor).
5. **Uzunluk oranı.** `len(çıktı)/len(kaynak)` 0,5–2,0 aralığında olmalı (anormal kırpma/şişme
   işareti).
6. **Dil tespiti.** Çıktı Türkçe olmalı (basit stopword/diakritik sezgisi + `lang` alanı).
   Zaten Türkçe olan kaynak hiç çevrilmez (`skipped`).
7. **Boşluk/bütünlük.** Çıktı boş olamaz, kaynağın uzunluğuna göre anlamsız kısa olamaz.

Testler: `scripts/translation-check.ts` + `npm run translation-check` (mevcut
`security-check` desenine uygun) ve `src/lib/translate/validate.test.ts` fixture'ları.
Ağa çıkmayan saf fonksiyon testleri → CI'da hızlı ve deterministik.

---

## 9. Arayüz değişiklikleri

| Dosya | Değişiklik |
|---|---|
| `src/app/[lang]/page.tsx` | Etiket/başlık gösterimi değişmez; sayaçlara "çeviri" durumu opsiyonel eklenir |
| `src/components/EventCard.tsx` | `title = locale==='tr' ? event.titleTr ?? event.title : event.title`; `titleTr` kullanıldıysa altında `Orijinali oku: <orijinal>` satırı (rozet yok) |
| `src/components/EventModal.tsx` | Başlık çevrilmişse altında **tek** beyan satırı: `makine çevirisi · Orijinali oku: <orijinal>`; iddialarda `claim.titleTr ?? claim.title` |
| `src/components/TopEventList.tsx` | Aynı başlık seçimi (rozet yok) |
| `src/components/SignalList.tsx` | Aynı başlık seçimi (rozet yok) |
| `src/components/ContradictionPanel.tsx` | `side.statement` yerine çevrilmiş iddia başlığı (claim'den çözülür) |
| `src/lib/i18n.ts` | `machineTranslated` zaten var; `translationUnavailable: 'çevrilmedi' / 'not translated'` eklenir |
| `src/app/[lang]/methodology/page.tsx` | "Çeviri yapılırsa makine çevirisidir" maddesi, hangi sağlayıcı/nasıl etiketlendiğiyle güncellenir |

**Görsel/editoryal kural (07 Eki 2026 revizyonu):** çeviri olduğu bilgisi görünüm başına **tek**
kez verilir — detay modalında, başlığın hemen altındaki küçük mono satır. Liste/kart görünümünde
tekrar eden rozet kullanılmaz: aynı etiket tek bir sayfada 100'den fazla kez çıktığı için
okunabilirliği bozuyor ve "Çoklu bağımsız kaynak bildiriyor" gibi asıl editoryal sinyali
bastırıyordu. `readOriginal` her görünümde erişilebilir kalır. `/en` görünümü **hiç değişmez**.

---

## 10. Maliyet, hacim ve süre tahmini

Ölçülen tam snapshot: **211 benzersiz başlık ≈ 16k karakter** (+ özetler ≈ 6k). Önbellekle
turdaki gerçek yeni içerik tipik olarak 0–15 başlık ≈ **0–2k karakter**.

- **DeepL Free (500k karakter/ay):** yoğun ayda (≈1.000 yeni başlık + özet) ≈ 150–250k karakter
  → ücretsiz katmana sığar. Sinyal+iddia+özet tamamı da çevrilse bile sınırda kalır.
- **LLM mini:** aynı hacim için aylık **< 1 USD** mertebesi.
- **Süre:** önbellek isabetli turda ~0 sn; 15 yeni başlık, eşzamanlılık 4, batch → birkaç saniye.
  `maxMs: 90s` sert tavanı cron'un 12 dk bütçesini güvenceye alır.
- **İlk backfill (tek seferlik):** mevcut 211 başlık + 57 özet → tek turda ~25k karakter, saniyeler.

---

## 11. Faz planı

| Faz | İş | Çıktı / kabul kriteri |
|---|---|---|
| **P0 — Karar** | Sağlayıcı + bütçe + anahtar yeri (§13) | Karar kaydı `docs/PLAN.md` §15'e eklenir |
| **P1 — Sağlayıcı adaptörü** | `provider.ts` + `deepl.ts` + `glossary.ts`, ağa çıkmayan birim testler | `translate("plague case")` → "veba vakası"; anahtar yoksa `skipped` |
| **P2 — Şema** | Tip alanları + Drizzle + `SCHEMA_SQL` + `ALTER TABLE` + `translations` tablosu + postgres read/write | `npm run db:check` yeni kolonları gösterir; mevcut DB migrate olur |
| **P3 — Pipeline** | `collectTranslatableTexts`, `translateFeed`, ingest entegrasyonu, rapor sayaçları, `--no-translate`/`--translate` | `npm run ingest -- --dry --translate` raporu çeviri sayılarını yazar |
| **P4 — Doğrulama kapıları** | `validate.ts` + `translation-check` script + CI | Yasaklı kelime testi geçer; 7 kapı fixture'larla doğrulanır |
| **P5 — UI** | 6 bileşen + i18n + methodology; `/en` değişmez | `/tr` başlıklar Türkçe + rozet + orijinal erişilebilir |
| **P6 — Kalite ölçümü** | 30 gerçek başlık (EN+RU) üzerinde insan değerlendirmesi; DeepL vs. LLM kararı | Ortalama kalite ≥ "kabul edilebilir"; 0 editoryal ihlal |
| **P7 — İzleme** | Tur başına çeviri/maliyet/süre raporu, hata alarmı, aylık kota kontrolü | Dead man's switch çeviri hatasında da görünür olur |

**Kabul kriterleri (Definition of Done):**
1. `/tr`'de bir İngilizce haber başlığı Türkçe görünür ve `readOriginal` erişilebilir.
2. Çevrilmiş hiçbir metinde yasaklı kelime yok (otomatik test).
3. Hedging korunur; kaynak "suspected" → çıktı "şüpheli".
4. Sağlayıcı çökerse site orijinal başlıkla çalışır, tur 2xx döner, dead man's switch alarm üretmez.
5. Cron süresi `timeout-minutes: 12` altında kalır.
6. `/en` görünümü bit düzeyinde değişmez.
7. Aylık çeviri karakteri bütçe üst sınırını aşmaz.

---

## 12. Riskler ve önlemler

| Risk | Olasılık | Etki | Önlem |
|---|---|---|---|
| Hedef dil kayması (MT "suspected"i düşürür, kesinlik iması) | Orta | **Yüksek** | §8 kapı 1–2, yasaklı kelime testi, DeepL/LLM eval |
| Halüsinasyon (özellikle LLM) | Orta | Yüksek | Katı prompt + glossary + kapılar; şüphede `failed` → orijinal |
| Cron timeout (12 dk) | Orta | Yüksek | Önbellek, `maxMs`, batch, eşzamanlılık 4, öncelik sırası |
| Kota/maliyet aşımı | Orta | Orta | `budgetChars` tur sınırı, aylık sayaç, önbellek, `--no-translate` |
| Sağlayıcı kesintisi (DeepL 429/5xx) | Orta | Düşük | Fail-open, `failed` etiketi, sonraki tur tekrar |
| Kümeleme/çelişki çeviriden bozulur | Düşük | Yüksek | Çeviri boru hattının **en sonunda**; tüm eşleştirme orijinal metinle |
| Telif tartışması | Düşük | Orta | Yalnızca başlık; tam metin yok; link + orijinal zorunlu |
| Eski JSON snapshot uyumsuzluğu | Düşük | Düşük | `titleTr ?? title` ile güvenli okuma; migrasyon gerekmez |
| Şema migrasyonu unutulması | Orta | Yüksek | Drizzle + `SCHEMA_SQL` + `ALTER TABLE` üçü birlikte; `db:check` doğrular |

---

## 13. Açık kararlar (kullanıcıdan onay bekleyen)

1. **Sağlayıcı & bütçe** — DeepL Free ile başlayıp eval sonrası LLM'e geçmek mi, yoksa doğrudan
   LLM mini mi? (PLAN §15'teki açık soru #2)
2. **Kapsam** — Yalnızca olay başlıkları mı, yoksa olay + iddia + sinyal + özet tamamı mı?
   (Öneri: tamamı; önbellekle maliyeti düşük.)
3. **Görünüm** — TR başlık birincil + orijinal alt satır (öneri), yoksa iki dilli yan yana mı?
4. **Backfill** — Mevcut 57 olay + 121 sinyal tek seferde çevrilsin mi?
5. **Anahtar sahipliği** — DeepL/LLM anahtarı hangi hesapta; GH Actions + Vercel secret kimde?
6. **RU kaynaklar** — Rusça başlıklar da TR'ye çevrilsin mi (öneri: evet, aynı akış)?
7. **EN görünümü** — TR/RU kaynaklar için `/en`'de orijinal gösterilmeye devam etsin mi (kapsam dışı)?

---

## 14. Dokunulacak dosyaların özet listesi

**Yeni:** `src/lib/translate/{provider,deepl,llm,glossary,validate,index}.ts`,
`scripts/translation-check.ts`, `src/lib/translate/validate.test.ts`, `docs/ceviri-plani.md` (bu dosya).

**Değişecek:** `src/types.ts`, `src/lib/ingest/pipeline.ts`, `scripts/ingest.ts`,
`src/lib/storage/schema.ts`, `src/lib/storage/postgres.ts`, `src/lib/storage/json.ts` (opsiyonel),
`src/components/{EventCard,EventModal,TopEventList,SignalList,ContradictionPanel}.tsx`,
`src/lib/i18n.ts`, `src/app/[lang]/methodology/page.tsx`, `docs/PLAN.md`, `README.md`,
`package.json` (`translation-check` script), `.github/workflows/ingest.yml` (secret).

---

## 15. Uygulama durumu (bu sürümde yapılanlar)

**Alınan varsayılan kararlar (§13'ün yanıtı):**

| # | Karar | Seçim |
|---|---|---|
| 1 | Sağlayıcı | `auto`: **DeepL → OpenAI-uyumlu LLM → anahtarsız Google**. Anahtar yoksa Google devreye girer, çeviri kutudan çıktığı gibi çalışır. `TRANSLATE_PROVIDER=off` ile tamamen kapatılır. |
| 2 | Kapsam | **Tamamı**: olay başlıkları + özetler + iddia başlıkları + sinyal başlıkları. |
| 3 | Görünüm | TR birincil; orijinal başlık kartta "Orijinali oku" satırı, detayda başlığın altında; çeviri beyanı yalnızca detayda (07 Eki 2026 revizyonu). |
| 4 | Backfill | Otomatik: anahtar/uygun sağlayıcı varsa ilk ingest turu mevcut içeriği çevirir (önbellek boş olduğu için). |
| 5 | RU kaynaklar | Evet, aynı akıştan (RU→TR). |
| 6 | EN görünümü | Değişmedi; `/en` daima orijinali gösterir. |

**Eklenen dosyalar:** `src/lib/translate/{glossary,detect,validate,provider,deepl,google,openai,cache,display,index}.ts`,
`src/components/MachineTranslatedBadge.tsx`, `scripts/translation-check.ts`.

**Değiştirilenler:** `src/types.ts` (`TranslationStatus`, `titleTr`, `excerptTr`, `summaryTr`),
`src/lib/ingest/pipeline.ts`, `scripts/ingest.ts` (`--translate`, `--no-translate`),
`src/lib/storage/{schema,postgres}.ts` (kolonlar + `ALTER TABLE ... IF NOT EXISTS`),
6 UI bileşeni, `src/lib/i18n.ts`, `package.json` (`translation-check`).

**Ortam değişkenleri:**

| Değişken | Varsayılan | Not |
|---|---|---|
| `TRANSLATE_PROVIDER` | `auto` | `auto`/`deepl`/`openai`/`google`/`off` |
| `DEEPL_API_KEY` (veya `TRANSLATE_API_KEY`) | — | Ücretsiz plan `:fx` ile biter → api-free |
| `DEEPL_API_URL` / `DEEPL_GLOSSARY_ID` | — | Opsiyonel (kurumsal uç / sözlük) |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` | — / api.openai.com/v1 / gpt-4.1-mini | Uyumlu her sunucu |
| `TRANSLATE_MAX_MS` | `90000` | Cron 12 dk bütçesi |
| `TRANSLATE_BUDGET_CHARS` | `60000` | Tur başına sert sınır |
| `TRANSLATE_CONCURRENCY` | `3` | Google/LLM istek eşzamanlılığı |

**Doğrulama:** `npm run translation-check` (28 test, ağsız) · `npm run typecheck` · `npm run build`.

**Kalan işler:** P7 (tur başına maliyet/hata izleme, aylık kota sayacı) ve anahtarsız
Google katmanı için üretim öncesi DeepL anahtarı eklenmesi (önerilir).
