# Zamanlanmış tetikleme: GitHub `schedule` neden yetmiyor, cron-job.org nasıl bağlanır

## Sorun: GitHub'ın cron'u `*/10` sözünü tutmuyor

`.github/workflows/ingest.yml` içinde `cron: "*/10 * * * *"` var; yani **10 dakikada
bir** çalışması beklenir. Ölçülen gerçek:

| Zaman (UTC) | Tetikleyici | Kaynak |
|---|---|---|
| 2026-10-07 14:56 | — | `schedule` yeniden kaydedildi (commit `4f7cf6d`) |
| 2026-10-07 15:27 | `workflow_dispatch` | elle |
| 2026-10-07 20:32 | `schedule` | **ilk ve tek zamanlanmış çalışma** |
| 2026-10-07 21:55 | — | 8 zamanlanmış çalışma **gelmedi** |

`gh run list --workflow=ingest.yml --limit 100` → `schedule: 1`.

Sebep: GitHub, ücretsiz katmanda zamanlanmış workflow'ları yoğun şekilde kısıyor
(geciktirme + atlama). Saatlik `*/10` beklemek gerçekçi değil. Ek olarak `schedule`
**yalnızca workflow dosyası varsayılan dalda (main) varken** tetiklenir ve depoda
60 gün hareket olmazsa devre dışı kalır.

**Çözüm:** zamanlamayı GitHub'a bırakmak yerine dışarıdan `workflow_dispatch`
API'sini çağırmak. `cron-job.org` bunu ücretsiz yapar (dakikada 1'e kadar).

---

## ⚠️ Önce kota matematiği: 10 dakika bu repoda PARA YAKAR

Repo **private**. GitHub Free private repo için **2.000 Actions dakikası/ay**
verir; public repoda Actions dakikaları **sınırsızdır**.

Ölçülen ingest süresi (son 5 başarılı çalışma): `103s, 98s, 104s, 90s, 133s`
→ **ortalama 105 sn = 1.76 dk**.

| Kadans | Çalışma/gün | Dk/gün | **Dk/ay** | Free private (2.000) |
|---|---|---|---|---|
| 10 dk | 144 | 253 | **7.600** | ❌ %380 — ~8. günde biter |
| 20 dk | 72 | 127 | **3.800** | ❌ |
| 30 dk | 48 | 84 | **2.530** | ❌ |
| 45 dk | 32 | 56 | **1.690** | ✅ ama CI'a yer kalmaz |
| 60 dk | 24 | 42 | **1.270** | ✅ rahat |

Kota dolunca **sadece ingest değil, `ci.yml` dahil tüm Actions durur.** Fazla
kullanım $0.008/dk → 10 dk kadansında ~**$45/ay**.

### Karar: **A — repo public**

Repo public yapıldı. Public repolarda Actions dakikaları **sınırsızdır**, yani
10 dakikalık kadans bedava. Yukarıdaki kota tablosu artık yalnızca repo **tekrar
private yapılırsa** geçerli — o durumda kadansı **45–60 dakikaya** çekin, aksi
halde Free planın 2.000 dk/ay kotası ~8 günde biter ve **`ci.yml` dahil tüm
Actions durur** (fazlası ~$0.008/dk ≈ ~$45/ay).

Public olduğu için `.github/workflows/ingest.yml` içindeki `schedule` **yedek
olarak bırakıldı**: bedava, ve `concurrency: ingest` çift çalışmayı zaten engeller.

> `concurrency: ingest` sayesinde üst üste binen istekler birikmez: aynı anda
> yalnızca 1 çalışır + 1 kuyrukta bekler. Yavaş bir ingest sırasında gelen
> tetiklemeler kuyrukta ezilir — bu, maliyeti doğal olarak sınırlar.

---

## Kurulum

### 1. Fine-grained PAT üret

GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens
→ Generate new token**

| Alan | Değer |
|---|---|
| Resource owner | `bahattinercan` |
| Expiration | Örn. 90 gün (dolunca **rotasyon zorunlu** — aşağıdaki tuzağa bak) |
| Repository access | **Only select repositories** → `russia-plague-website` |
| Repository permissions | **Actions: Read and write** (Metadata: Read-only otomatik eklenir) |

Başka **hiçbir** yetki verme. Token'ı bir yere kaydet (`github_pat_...`).

> `gh` CLI'ın kendi OAuth token'ını buraya **koyma**: o token tüm repolara ve
> `repo`+`workflow` scope'una sahiptir. Public bir zamanlayıcı servisine
> verilmemeli.

### 2. İsteği yerelde test et

Script, cron-job.org'a yapıştırılacak isteğin **aynısını** üretir:

```bash
GITHUB_TRIGGER_TOKEN=github_pat_... npm run ingest:trigger
```

Beklenen çıktı:

```
→ POST https://api.github.com/repos/bahattinercan/russia-plague-website/actions/workflows/ingest.yml/dispatches
  ref: main

✔ Tetiklendi (204). Çalışmayı izle:
  gh run list --workflow=ingest.yml --limit 3
```

`gh` OAuth token'ıyla da denenebilir (yalnızca doğrulama için):
`GITHUB_TRIGGER_TOKEN=$(gh auth token) npm run ingest:trigger`

### 3. cron-job.org işi oluştur

İki yol var: **API (tercih edilen, tekrarlanabilir)** veya konsoldan elle. İkisi de
aynı işi kurar; API yolu PAT rotasyonunu tek komuta indirir.

#### 3-A. API ile (önerilen)

```bash
# 1) console.cron-job.org → Settings → API key → anahtar üret
# 2) .env.local dosyasına ekle (gitignore'da, repoya girmez):
#      GITHUB_TRIGGER_TOKEN=github_pat_...
#      CRONJOB_API_KEY=...

npm run cron:setup -- --dry     # isteği önizle (ağa çıkmaz, sır maskeli)
npm run cron:setup              # işi oluştur → jobId=#...
npm run cron:setup -- --list    # kurulu işleri listele
```

Script, isteği `docs`deki elle kurulumla **aynı** gönderir: `POST` + dört header,
gövde `{"ref":"main"}`, kadans `0,10,20,30,40,50`. Güvenlik davranışları:

- **Çift iş koruması:** aynı başlıkta iş varsa ikinci kez oluşturmaz (`concurrency`
  zaten üst üste binmeyi engeller ama iki iş = iki kat tetikleme = boşa CI yükü).
- **PAT rotasyonu:** `npm run cron:setup -- --update=<jobId>` → işi günceller.
- **Sır maskeleme:** çıktıda token yalnızca `github_pat_… (25 karakter)` biçiminde.
- **Sır komut satırına yazılmaz:** token/anahtar `.env.local`dan okunur (`GH_TOKEN`
  yedeği de destekli; `scripts/trigger-ingest.ts` artık `.env.local`ı yükler).

> cron-job.org kotası: 1 istek/sn, 5 istek/dk. 10 dk kadans bu sınırın çok altında.
>
> GitHub dispatch `204 No Content` (gövdesiz) döner. cron-job.org başarı ölçütü
> 2xx'i kapsar; işi "başarısız" görürsen konsoldaki **Success status code**
> ayarını `204` yap.

Kurulumu doğrula: `npm run cron:setup -- --list` → iş **aktif** görünmeli, ardından
`npm run ingest:trigger` (token `.env.local`dan) ile aynı isteği bir kez elle at.

#### Kurulum kaydı — ölçülen gerçekler (2026-10-08)

API ile kuruldu, jobId **#8605239**. Kurulumdan sonra ölçülen davranış:

| Ölçüm | Değer |
|---|---|
| Çalıştırma 1 | planlanan `13:30:00Z` → gerçekleşen `13:30:51Z` (jitter 51 sn) |
| Çalıştırma 2 | planlanan `13:40:00Z` → gerçekleşen `13:40:28Z` (jitter 28 sn) |
| GitHub'a etki | run `13:30:53Z` ve `13:40:30Z` → dispatch'ten ~2 sn sonra |
| DB'ye etki | `reports 15 → 16`, `Son ingest 13:36:05Z` (Neon) |
| HTTP sonucu | **`204 No Content` → `status:1` (başarı)** |

İki pratik sonuç:

- **Başarı ölçütü ayarı gerekmiyor:** cron-job.org `204`ü başarı sayıyor (`statusText:
  "No Content"`). Konsolda "success status code" değiştirmeye gerek yok.
- **Gerçek kadans 10 dk ± ~1 dk:** ücretsiz katmanda işler jitter ile atılıyor, yani
  tetikleme `:00` yerine `:28–:51` arasında düşebilir. 10 dakikalık ortalama korunuyor;
  "dakikası dakikasına" beklemeyin.

Ek olarak `onFailure` bildirimi **API üzerinden açıldı** (`npm run cron:setup` işi
kurarken set eder; `--list` çıktısında `hata alarmı: açık` görünür). Bu, aşağıdaki
"sessiz bayatlama" tuzağını kapatan asıl mekanizma.

> API tuzağı (script'te düzeltildi): `GET /jobs` **liste** yanıtı `notification`
> alanını içermiyor — yalnızca `GET /jobs/{id}` döndürüyor. Liste çıktısına güvenip
> "alarm kapalı" sonucuna varmak yanlış alarmdı; script artık detayı ayrıca çekiyor.

#### 3-B. Konsoldan elle

[cron-job.org](https://cron-job.org) → hesap aç → **Create cronjob**:

| Alan | Değer |
|---|---|
| Title | `plague-tracker ingest dispatch` |
| URL | `https://api.github.com/repos/bahattinercan/russia-plague-website/actions/workflows/ingest.yml/dispatches` |
| Schedule | **Every 10 minutes** |
| Request method | **POST** |
| Request body | `{"ref":"main"}` |

**Headers** (Advanced/Headers bölümü — birebir bu isimlerle):

| Header | Değer |
|---|---|
| `Authorization` | `Bearer github_pat_...` |
| `Accept` | `application/vnd.github+json` |
| `Content-Type` | `application/json` |
| `X-GitHub-Api-Version` | `2022-11-28` |

Kaydet → **"Run now"** ile bir kez elle dene. **Beklenen yanıt: `204 No Content`**
(GitHub dispatch'te gövde döndürmez; `204` gövdesiz olması normaldir).

Hesap ayarlarında **"Notify me when a job fails"** seçeneğini aç.

> Not: hesabı oluşturup API anahtarı almak da yeterli — 3-A yolunda konsolda tek tek
> alan doldurmak gerekmez. 3-B yalnızca API tercih edilmiyorsa kullanılır.

### 4. Doğrula

```bash
gh run list --workflow=ingest.yml --limit 5 --json createdAt,event,status,conclusion
npm run db:check          # "Son ingest: <şimdi>" görünmeli
```

---

## Tuzaklar

| Tuzak | Belirti | Çözüm |
|---|---|---|
| **PAT süresi doldu** | cron-job.org'da 401; veri sessizce bayatlar | Yeni PAT üret, cron-job.org'daki header'ı güncelle. Expiration'ı takvime al. |
| `Actions: write` yok | `403` | Fine-grained PAT'te "Actions: Read and write" seç. |
| Repo private + token erişemiyor | `404` (403 değil, aldatıcı) | Token'ın repo erişiminde `russia-plague-website` seçili mi? |
| Workflow `main`'de yok | `404`/`422` | `workflow_dispatch` yalnızca varsayılan daldaki sürümü tetikler. Dal'ı merge et. |
| Yanlış `ref` | `422` | Varsayılan dal `main`. |
| Gövde JSON değil | `422` | Body tam olarak `{"ref":"main"}`. |
| Aynı anda iki tetikleyici | Gereksiz maliyet | cron-job.org kurulduktan sonra `.github/workflows/ingest.yml` içindeki `schedule`ı kaldır ya da aynı kadansa çek. |
| **Sessiz bayatlama** | Site eski snapshot'ı gösterir, alarm yok | Dead man's switch yalnızca `if: failure()` — **cron hiç çalışmazsa çalışmaz.** Çözüm: işin `onFailure` bildirimi açık olmalı (API kurulumu açar; `--list` → `hata alarmı: açık` ile doğrula). PAT süresi dolduğunda cron-job.org 401 alır ve e-posta atar. |

## Public yapmadan önce yapılan denetim

Tüm geçmiş tarandı (`git rev-list --all` → 32 commit): `neon.tech`,
`postgresql://kullanıcı:şifre@`, `sk-…`, `ghp_…`, `github_pat_…`, `AIza…`
kalıpları arandı. **Gerçek sır bulunamadı.** Eşleşen tek iki dosya kasıtlı
sahte/maskeli dize içeriyor:

- `scripts/security-check.ts` — maskeleme testleri için üretilmiş sahte credential'lar
- `docs/guvenlik-denetimi.md` — `postgresql://neondb_owner:npg_…@…neon.tech` (maskeli, gerçek değer yok)

`data/feed.json` ve `data/history/*.jsonl` takip ediliyor ama içerik yalnızca
haber başlıkları + kaynak sağlığı. `screenshots/`, `.shots/` ve `.env.local`
gitignore kapsamında ve hiç commit edilmemiş.

### Bilinçli karar gerektiren tek dosya

`docs/guvenlik-denetimi.md` şunları açıkça yayınlar:

- **B-7:** `.env.local`'de **owner yetkili** Neon rolü ve `VERCEL_OIDC_TOKEN` var
- **B-8:** dev-only zafiyetler (`npm audit`, 4 moderate)
- **§4:** kabul edilen kalan riskler — rate limiting yok, COEP yok,
  `style-src 'unsafe-inline'`, Google Fonts dış kaynak

Hassas sır yok, ama kalan riskleri listelemek saldırgana yol haritası verir. Bir
şeffaflık projesinde denetimi yayınlamak savunulabilir; yine de bilinçli seçim
olsun. İstenirse §4 çıkarılıp yalnızca "düzeltilen bulgular" yayınlanabilir.

---

## Bahaneler / neden Vercel Cron değil

Vercel **Hobby** planında cron **günde 1 kez** ile sınırlıdır (projede bunu
belgeleyen yorum `scripts/ingest.ts` başında var). Ayrıca ingest ~105 sn sürer;
Vercel Hobby fonksiyon süre limiti bu iş için dar. Bu yüzden ingest GitHub
Actions'ta kalır, yalnızca **tetikleme** dışarıdan yapılır.
