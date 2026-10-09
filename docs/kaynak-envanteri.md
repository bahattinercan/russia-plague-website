# Kaynak Envanteri ve Erişim Durumu

**Son test:** 6 Ekim 2026 · Türkiye'den (curl 8.17, Windows)
**Kural:** Hiçbir kaynak tek erişim yoluna bağlı kalmayacak. Her T1 kaynağı için ≥2 yol zorunlu.

> **Bu tablo aday envanteridir.** Aşağıdaki satırların bir kısmı taranmıyor (yalnızca erişim testi yapıldı ya da yayıncı kimliği olarak tanınıyor). Depoda fiilen taranan set ve ad farkları: **§7.1** ve **§7.2**. Erişim testleri `npm run ingest` sağlık raporu ve `npm run db:check` ile yeniden üretilebilir; tabloda anılan `scripts/verify-sources.ts` depoda **yok**.

Erişim testi komutu (yeniden çalıştırılabilir):

```bash
curl -s -o /dev/null -w "%{http_code}" -L -m 15 -A "Mozilla/5.0" "<URL>"
```

---

## 1. Tier 1 — Küresel Otorite

| Kaynak                    | URL                                         | Yöntem                              | Test                      | Yedek Yol                                                                 | Tier |
| ------------------------- | ------------------------------------------- | ----------------------------------- | ------------------------- | ------------------------------------------------------------------------- | ---- |
| WHO Disease Outbreak News | `who.int/emergencies/disease-outbreak-news` | HTML parse                          | 200 (sayfa) · **RSS 404** | ReliefWeb `+source:"WHO"`, Google News `who don plague`                   | 100  |
| WHO Euro (Basın)          | `who.int/europe` newsroom                   | HTML parse                          | —                         | RSSHub, ReliefWeb                                                         | 98   |
| ECDC                      | `ecdc.europa.eu`                            | HTML parse                          | **RSS 404**               | Google News `site:ecdc.europa.eu`, EpiPulse raporları                     | 95   |
| US CDC — Plague           | `cdc.gov/plague`                            | HTML parse                          | —                         | CDC MMWR RSS, Google News                                                 | 95   |
| ProMED-mail (ISID)        | `promedmail.org`                            | HTML parse (arşiv)                  | **RSS yok (404)**         | E-posta arşivi, Google News `promed`                                      | 92   |
| CIDRAP (U. Minnesota)     | `cidrap.umn.edu`                            | **RSS ✅ 200** (`/rss.xml`)         | ✅                        | Sitede topic sayfası, Google News                                         | 90   |
| ReliefWeb (UN OCHA)       | `reliefweb.int`                             | **RSS ✅ 200** (`/updates/rss.xml`) | ✅                        | API v2 (`api.reliefweb.int/v2`) → **403**, appname+UA ayarı test edilecek | 90   |

## 2. Tier 2 — Bağımsız Ajans / Gazetecilik

| Kaynak                            | URL                             | Yöntem                                      | Test | Not                                           |
| --------------------------------- | ------------------------------- | ------------------------------------------- | ---- | --------------------------------------------- |
| Reuters                           | `reuters.com`                   | RSS denemesi başarısız (404) → sitemap/HTML | ⚠️   | Google News `site:reuters.com` daha güvenilir |
| AP                                | `apnews.com`                    | HTML/sitemap                                | —    | Google News                                   |
| BBC                               | `bbc.co.uk/news`                | **RSS** (`/news/rss.xml`) test edilecek     | —    | Health bölümü                                 |
| Al Jazeera                        | `aljazeera.com`                 | **RSS** (`/xml/rss/all.xml`) test edilecek  | —    | Health bölümü                                 |
| Euronews                          | `euronews.com`                  | RSS test edilecek                           | —    | Salgın haberlerinde hızlı                     |
| CBC / NBC / PBS                   | —                               | RSS test edilecek                           | —    | ABD/Kanada kapsaması                          |
| BMJ                               | `bmj.com`                       | RSS/e-alert                                 | —    | Bilimsel yorum                                |
| The Lancet ID                     | `thelancet.com/journals/laninf` | RSS                                         | —    | Peer-reviewed                                 |
| RNZ / Straits Times / Global News | —                               | RSS                                         | —    | Doğrulama çeşitliliği                         |

## 3. Tier 3 — Resmi Rusya Kaynakları

| Kaynak                  | URL                            | Yöntem                         | Test                     | Not                                          |
| ----------------------- | ------------------------------ | ------------------------------ | ------------------------ | -------------------------------------------- |
| Rospotrebnadzor         | `rospotrebnadzor.ru`           | HTML                           | ❌ **000 (erişilemedi)** | Proxy/VPN gerekli; alternatif: TASS aktarımı |
| Rusya Sağlık Bakanlığı  | `minzdrav.gov.ru`              | HTML                           | test edilecek            | Proxy gerekebilir                            |
| İrkutsk Oblast yönetimi | `irkobl.ru`                    | HTML                           | test edilecek            | Yerel birincil kaynak                        |
| TASS                    | `tass.com`                     | **RSS ✅ 200** (`/rss/v2.xml`) | ✅                       | İngilizce + Rusça feed ayrı                  |
| Interfax                | `interfax.ru` / `interfax.com` | RSS                            | test edilecek            | `ru-state` grubunda sayılır                  |
| RIA Novosti             | `ria.ru`                       | RSS                            | test edilecek            | `ru-state` grubunda sayılır                  |

> **Bağımsızlık notu:** Rospotrebnadzor + Sağlık Bakanlığı + TASS + RIA + RT → UI'da **tek kaynak** olarak sayılır (`kremlin` / `ru-gov` grupları). Bkz. PLAN.md §5.2.

## 4. Tier 4 — Bağımsız Rus / Sürgün Medya

| Kaynak                     | URL                                | Yöntem                         | Test | Not                                                    |
| -------------------------- | ---------------------------------- | ------------------------------ | ---- | ------------------------------------------------------ |
| Meduza                     | `meduza.io`                        | **RSS ✅ 200** (`/rss/en/all`) | ✅   | Letonya merkezli; RU ve EN feed var                    |
| RFE/RL (Sibirya.Realities) | `rferl.org`                        | **RSS/API ✅ 200** (`/api/`)   | ✅   | Bölgesel muhabir ağı güçlü                             |
| The Moscow Times           | `themoscowtimes.com`               | **RSS ✅ 200** (`/rss/news`)   | ✅   | Amsterdam merkezli                                     |
| Novaya Gazeta Europe       | `novayagazeta.eu`                  | RSS test edilecek              | —    |                                                        |
| The Insider                | `theinsider.ua` / `theinsider.com` | RSS/HTML                       | —    |                                                        |
| Astra (Telegram)           | `t.me/astrapress`                  | opsiyonel                      | —    | **T5 seviyesi**: sadece sinyal, tek başına yayınlanmaz |

## 5. Tier 5 — Toplayıcılar ve Sinyaller

| Kaynak                                 | Yöntem                                | Test                            | Not                                                                                                                 |
| -------------------------------------- | ------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Google News RSS                        | `news.google.com/rss/search?q=...`    | ✅ **200**                      | Sorgular: `plague russia`, `чума россия`, `veba rusya`, `pneumonic plague siberia`, `irkutsk anti-plague institute` |
| GDELT Project                          | `api.gdeltproject.org/api/v2/doc/doc` | ✅ 200 (429 rate-limit görüldü) | Backoff + 15 dk aralık; retry-after'a saygı                                                                         |
| Telegram kanalları (Baza, Shot, Astra) | opsiyonel, t.me/s/ HTML               | —                               | **Sadece "doğrulanmamış iddia" katmanı**                                                                            |
| X/Twitter                              | API ücretli → atlanıyor               | —                               | Faz 4'te değerlendirilir                                                                                            |

## 6. Çok Dilli Arama Sorguları (Google News)

| Dil                 | Örnek sorgu                                                            |
| ------------------- | ---------------------------------------------------------------------- |
| Türkçe              | `rusya veba`, `sibirya veba salgını`, `hıyarcıklı veba`                |
| İngilizce           | `russia plague outbreak`, `irkutsk plague`, `pneumonic plague siberia` |
| Rusça               | `чума россия`, `иркутск чума`, `вспышка чумы`                          |
| Almanca / Fransızca | `pest russland`, `peste russie` (Avrupa kapsaması)                     |

## 7. Kaynak Skorlama Girdileri

Trust puanı `src/lib/sources/registry.ts` içinde **elle ve sürümlenir** (`packages/shared/trust.ts` yok — monorepo değil, tek Next.js uygulaması); hesap `src/lib/trust.ts` içinde yapılır.

Uygulanan girdiler:

1. `trustBase` — yukarıdaki tablolar
2. `independence_group` — bağımsızlık grupları (PLAN.md §5.2)
3. `state_control_penalty` — `kremlin` ve `ru-gov` için negatif (plandaki −8/−5 sabitleri yerine kaynak bazında `stateControlPenalty`)

Uygulanmayan girdiler: `correction_history` (düzeltme günlüğü kapsam dışı) ve `primary_document`.

Skorların gerekçesi metodoloji sayfasında yayınlanır. **Otomatik öğrenme yoktur** — güven puanı bir editoryal karardır, şeffaf biçimde versiyonlanır.

### 7.1 Depoda fiilen taranan set (`SOURCES`, 45 kaynak)

| Tier | Sayı | Slugs |
|---|---|---|
| T1 | 7 | `who-don`, `who-euro`, `ecdc`, `cdc-plague`, `cidrap`, `promed`, `reliefweb` |
| T2 | 25 | `reuters`, `ap`, `bbc`, `aljazeera`, `euronews`, `guardian`, `nbc`, `axios`, `nytimes`, `wapo`, `npr`, `pbs`, `lemonde`, `abc`, `cnbc`, `atlantic`, `skynews`, `globalnews`, `thehill`, `vox`, `newsweek`, `nypost`, `foxnews`, `science`, `bmj` |
| T3 | 5 | `rospotrebnadzor`, `minzdrav`, `tass`, `ria`, `interfax` |
| T4 | 4 | `meduza`, `rferl`, `moscowtimes`, `novaya` |
| T5 | 4 | `discovery` (çok dilli Google News), `discovery-tr` (Türkçe), `tg-astrapress`, `tg-shot_shot` |

Bunlara ek olarak **59 yayıncı yalnızca kimlik ataması** için tanınır (`KNOWN_PUBLISHERS`): Google News'ten gelen bir haberin gerçek yayıncısı tanınmazsa T5'e düşüp ana akıştan kopuyordu. Yukarıdaki tablolarda **kimlik-only** olan satırlar: `wsj`, `politico`, `dw`, `spiegel`, `cbc`, `rnz`, `straitstimes`, `bellingcat`, `thebell`, `cbs`, `cnn`, `bloomberg`, `dailymail`, `latimes`, `usatoday`, `independent`, `telegraph`, `nature`, `sciam`, `lancet`, `nejm`, `statnews`.

Son ölçüm (9 Eki 2026, canlı feed): 45 kaynak taranıyor — 41 sağlıklı, 3 bayat, 1 hatalı.

### 7.2 Tablo ile registry arasındaki ad farkları

| Tabloda | Registry'de | Durum |
|---|---|---|
| `us-cdc` | `cdc-plague` | taranan slug |
| `google-news` | `discovery`, `discovery-tr` | |
| `yandex` | `yandex-news` | |
| `commersant` | `kommersant` | yazım |
| `the-insider` | `insider` | |
| `x` | `x-russia` | **taranmıyor** (API ücretli) |
| `telegram-baza` | `tg-baza` | **taranmıyor** — yalnızca `tg-astrapress` ve `tg-shot_shot` aktif |
| `gdelt` | — | erişim testi geçti, `SOURCES`'ta adaptör yok |
| `rt`, `sputnik`, `izvestia`, `zvezda`, `rbc` | — | envanterde; `kremlin` grubu etiketi var, tek tek taranmıyor |

## 8. Erişim Engeli Notları

- **Rospotrebnadzor** Türkiye'den açılmadı (HTTP 000). `proxy` altyapısı veya ayna gerekiyor. Yedek: TASS/RIA aktarımı + Google News önbelleği.
- Rus devlet siteleri için `User-Agent` ve TLS parmak izi filtresi olasılığı yüksek; scraping yerine RSS tercih edilmeli.
- WHO, RSS'i kaldırmış → HTML parse kırılganlığı yüksek. **Sağlık kontrolü zorunlu:** parse 0 öğe dönerse "kaynak bozuk" alarmı.
