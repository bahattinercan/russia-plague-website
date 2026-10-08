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
| **Sessiz bayatlama** | Site eski snapshot'ı gösterir, alarm yok | Dead man's switch yalnızca `if: failure()` — **cron hiç çalışmazsa çalışmaz.** cron-job.org'un failure bildirimi bu boşluğu kısmen kapatır. |

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
