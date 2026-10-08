/**
 * cron-job.org işini API üzerinden kurar (10 dakikada bir workflow_dispatch).
 *
 *   # .env.local içine iki satır koy:
 *   #   GITHUB_TRIGGER_TOKEN=github_pat_...
 *   #   CRONJOB_API_KEY=...
 *
 *   npm run cron:setup            → işi oluşturur (varsa güncellemez, uyarır)
 *   npm run cron:setup -- --list  → kurulu işleri listeler
 *   npm run cron:setup -- --dry   → yalnızca oluşturulacak gövdeyi gösterir (sır maskeli)
 *
 * Neden API: konsolda elle 5 alan doldurmak yerine kurulum tekrarlanabilir olur;
 * PAT rotasyonunda `--update=<jobId>` ile tek komutta güncellenir.
 *
 * Gerekli yetki: cron-job.org → Console → Settings → API key.
 * (IP kısıtı açıksa bu makinenin IP'si izinli olmalı, aksi halde 403.)
 *
 * Ayrıntı: docs/dispatch-tetikleme.md
 */
import { loadLocalEnv } from '@/lib/env';

const API = 'https://api.cron-job.org/jobs';
const WORKFLOW_URL =
  'https://api.github.com/repos/bahattinercan/russia-plague-website/actions/workflows/ingest.yml/dispatches';
const TITLE = 'plague-tracker ingest dispatch';
/** Dış zamanlayıcı kritik: 10 dk kadansı bu iş sağlar (GitHub `schedule` yedek). */
const MINUTES = [0, 10, 20, 30, 40, 50];

interface JobBody {
  jobId?: number;
  job: {
    title: string;
    url: string;
    enabled: boolean;
    saveResponses: boolean;
    requestMethod: number;
    extendedData: { headers: Record<string, string>; body: string };
    /** Başarısızlıkta e-posta alarmı — sessiz bayatlamayı kapatan tek uyarı. */
    notification: {
      onFailure: boolean;
      onFailureCount: number;
      onSuccess: boolean;
      onDisable: boolean;
      onSslCertExpiry: boolean;
      onSslCertExpirySeconds: number;
      mode: number;
      selectedChannels: string[];
    };
    schedule: {
      timezone: string;
      expiresAt: number;
      hours: number[];
      mdays: number[];
      minutes: number[];
      months: number[];
      wdays: number[];
    };
  };
}

/**
 * GET /jobs yanıtı DÜZ alanlar döner ({ jobId, enabled, title, url, schedule … }),
 * iç içe `{ job: {…} }` değil — PUT/PATCH gövdesinden farklı. İlk sürümde bu
 * yüzden `--list` çöküyordu.
 */
interface CronJob {
  jobId: number;
  enabled?: boolean;
  title?: string;
  url?: string;
  lastStatus?: number;
  lastExecution?: number;
  nextExecution?: number;
  schedule?: { minutes?: number[]; timezone?: string };
  notification?: { onFailure?: boolean };
}

function buildJob(pullToken: string): JobBody['job'] {
  return {
    title: TITLE,
    url: WORKFLOW_URL,
    enabled: true,
    saveResponses: true,
    // 1 = POST (0 GET, 4 PUT …). GitHub dispatch POST bekliyor.
    requestMethod: 1,
    extendedData: {
      headers: {
        Authorization: `Bearer ${pullToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      // GitHub dispatch gövdesi: tam olarak {"ref":"main"} olmalı.
      body: JSON.stringify({ ref: 'main' }),
    },
    notification: {
      onFailure: true,
      onFailureCount: 1,
      onSuccess: false,
      onDisable: true,
      onSslCertExpiry: true,
      onSslCertExpirySeconds: 604800,
      mode: 1,
      selectedChannels: [],
    },
    schedule: {
      timezone: 'UTC',
      expiresAt: 0,
      hours: [-1], // her saat
      mdays: [-1],
      minutes: MINUTES,
      months: [-1],
      wdays: [-1],
    },
  };
}

/** Loglarda sır görünmesin: yalnızca ilk 12 karakter + uzunluk. */
function mask(secret: string): string {
  return `${secret.slice(0, 12)}… (${secret.length} karakter)`;
}

function redact(job: JobBody['job']): JobBody['job'] {
  const auth = job.extendedData.headers.Authorization ?? '';
  return {
    ...job,
    extendedData: {
      ...job.extendedData,
      headers: { ...job.extendedData.headers, Authorization: `Bearer ${mask(auth.replace(/^Bearer /, ''))}` },
    },
  };
}

async function call(
  method: 'GET' | 'PUT' | 'PATCH',
  url: string,
  key: string,
  body?: unknown,
): Promise<{ status: number; json: unknown; text: string }> {
  const res = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      'user-agent': 'plague-tracker-cron-setup/0.1',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* gövde JSON değilse text yeterli */
  }
  return { status: res.status, json, text };
}

/**
 * GitHub'ın 204 (gövdesiz) yanıtını cron-job.org başarı saymazsa iş "başarısız"
 * görünür ve gürültülü uyarı üretir. Panelde beklenen durum kodunu 204'e
 * çekmek bazı planlarda API'de yok — o yüzden bunu uyarı olarak not ediyoruz.
 */
function explain(status: number, text: string): void {
  const hints: Record<number, string> = {
    401: 'cron-job.org API anahtarı geçersiz. Console → Settings → API key.',
    403: 'IP kısıtı açık olabilir veya anahtar yetkisiz. Settings → API key → IP allowlist.',
    404: 'jobId bulunamadı (--update=<jobId> yanlış).',
    429: 'Hız sınırı: 1 istek/sn, 5 istek/dk. Biraz bekleyip tekrar dene.',
  };
  if (hints[status]) console.error(`  ↳ ${hints[status]}`);
  if (text) console.error(`  ${text.slice(0, 300)}`);
}

function jobsOf(json: unknown): CronJob[] {
  const j = json as { jobs?: CronJob[] };
  return Array.isArray(j?.jobs) ? j.jobs : [];
}

/** epoch → `YYYY-MM-DD HH:MM:SS UTC` (0 = hiç çalışmadı). */
function when(epoch?: number): string {
  if (!epoch) return 'hiç';
  return `${new Date(epoch * 1000).toISOString().slice(0, 19).replace('T', ' ')} UTC`;
}

/**
 * Kurulumdan sonra işi API'den geri okuyup gerçekten istediğimiz gibi mi diye
 * bakar. "Oluşturuldu" mesajı tek başına yeterli değil: kadans ve bildirim
 * sessizce farklı ayarlanmış olabilir.
 */
async function verify(jobId: number, key: string, expectCd: string): Promise<void> {
  const res = await call('GET', `${API}/${jobId}`, key);
  if (res.status !== 200) {
    console.warn(`⚠ İş okunamadı (HTTP ${res.status}) — doğrulama atlandı.`);
    return;
  }
  const d = (res.json as { jobDetails?: CronJob } | null)?.jobDetails ?? ({} as CronJob);  const minutes = d.schedule?.minutes ?? [];
  console.log('  Doğrulama — API\'den geri okundu:');
  console.log(`    durum         : ${d.enabled ? 'aktif' : 'KAPALI'}`);
  console.log(`    kadans (UTC)  : ${minutes.join(', ')}. dakika`);
  console.log(`    sıradaki      : ${when(d.nextExecution)}`);
  console.log(`    son çalışma   : ${when(d.lastExecution)}${d.lastStatus ? ` (HTTP ${d.lastStatus})` : ''}`);
  console.log(`    hata alarmı   : ${d.notification?.onFailure ? 'açık (e-posta)' : 'KAPALI ⚠'}`);

  if (minutes.join(',') !== MINUTES.join(',')) {
    console.warn(`⚠ Kadans beklenenden farklı! Beklenen: ${expectCd}`);
  }
  if (!d.notification?.onFailure) {
    console.warn(
      [
        '⚠ Başarısızlık bildirimi kapalı: PAT süresi dolduğunda (90 gün) veri SESSİZCE',
        '  bayatlar ve dead man\'s switch de tetiklenmez. Konsoldan aç:',
        '  console.cron-job.org → job → Notifications → "On failure"',
      ].join('\n'),
    );
  }
}

/**
 * Tekil iş detayı. Neden gerekli: `GET /jobs` (liste) yanıtı `notification`
 * alanını İÇERMİYOR — listenin tek başına "alarm kapalı" demesi yanlış alarmdı.
 */
async function detail(jobId: number, key: string): Promise<CronJob | null> {
  const res = await call('GET', `${API}/${jobId}`, key);
  if (res.status !== 200) return null;
  return (res.json as { jobDetails?: CronJob } | null)?.jobDetails ?? null;
}

async function main(): Promise<void> {
  loadLocalEnv();
  const argv = process.argv.slice(2);
  const dry = argv.includes('--dry');
  const list = argv.includes('--list');
  const updateArg = argv.find((a) => a.startsWith('--update='));
  const updateId = updateArg ? Number(updateArg.slice('--update='.length)) : null;

  // `--dry` istek atmaz: API anahtarı istemez, yalnızca gövdeyi önizler.
  // `--list` ise API çağrısı yapar, anahtar zorunlu.
  const needsApi = !dry;
  const key = process.env.CRONJOB_API_KEY;
  if (needsApi && !key) {
    console.error(
      [
        '✖ CRONJOB_API_KEY yok.',
        '',
        '  1) https://console.cron-job.org → Settings → API key → yeni anahtar üret',
        '  2) .env.local dosyasına ekle (bu dosya gitignore\'da):',
        '       CRONJOB_API_KEY=...',
        '       GITHUB_TRIGGER_TOKEN=github_pat_...',
        '',
        '  Anahtar olmadan yalnızca önizleme: npm run cron:setup -- --dry',
        '',
        '  Ayrıntı: docs/dispatch-tetikleme.md',
      ].join('\n'),
    );
    process.exit(1);
  }

  if (list) {
    const res = await call('GET', API, key!);
    if (res.status !== 200) {
      console.error(`✖ Liste alınamadı: HTTP ${res.status}`);
      explain(res.status, res.text);
      process.exitCode = 1;
      return;
    }
    const jobs = jobsOf(res.json);
    if (jobs.length === 0) {
      console.log('Kayıtlı cron-job yok.');
      return;
    }
    for (const listed of jobsOf(res.json)) {
      // `notification` yalnızca tekil endpoint'te var; eksikse detayı çek.
      const j = listed.notification ? listed : ((await detail(listed.jobId, key!)) ?? listed);
      const state = j.enabled ? 'aktif' : 'kapalı';
      console.log(`#${j.jobId}  [${state}]  ${j.title ?? '(başlıksız)'}`);
      console.log(`        hedef   : ${j.url ?? ''}`);
      console.log(
        `        kadans  : ${(j.schedule?.minutes ?? []).join(', ')}. dakika (${j.schedule?.timezone ?? 'UTC'})`,
      );
      console.log(`        sıradaki: ${when(j.nextExecution)}`);
      console.log(
        `        son     : ${when(j.lastExecution)}${j.lastStatus ? ` (HTTP ${j.lastStatus})` : ''}` +
          `  ·  hata alarmı: ${j.notification ? (j.notification.onFailure ? 'açık' : 'KAPALI ⚠') : 'bilinmiyor'}`,
      );
    }
    return;
  }

  const token = process.env.GITHUB_TRIGGER_TOKEN;
  if (!token) {
    console.error('✖ GITHUB_TRIGGER_TOKEN yok (.env.local). PAT üretimi: docs/dispatch-tetikleme.md §1');
    process.exit(1);
  }
  if (!/^github_pat_/.test(token)) {
    console.warn('⚠ Token `github_pat_` ile başlamıyor — fine-grained PAT bekleniyordu (devam ediliyor).');
  }

  const job = buildJob(token);

  if (dry) {
    console.log('→ PUT https://api.cron-job.org/jobs (dry, istek atılmadı)');
    console.log(JSON.stringify({ job: redact(job) }, null, 2));
    return;
  }

  // Aynı başlıkta iş varsa ikinci bir iş açma (çift tetikleme = boşa maliyet).
  const existing = needsApi ? await call('GET', API, key!) : { status: 0, json: null, text: '' };
  const dup = existing.status === 200 ? jobsOf(existing.json).find((j) => j.title === TITLE) : undefined;

  if (dup && !updateId) {
    console.error(
      [
        `✖ "${TITLE}" başlıklı iş zaten var (jobId=#${dup.jobId}).`,
        '',
        '  PAT rotasyonu için güncelle:  npm run cron:setup -- --update=' + dup.jobId,
        '  Kasıtlı ikinci iş istiyorsan: önce cron-job.org konsolundan eskisini sil.',
      ].join('\n'),
    );
    process.exitCode = 1;
    return;
  }

  const target = updateId ? `${API}/${updateId}` : API;
  const method: 'PUT' | 'PATCH' = updateId ? 'PATCH' : 'PUT';
  console.log(`→ ${method} ${target}`);

  const res = await call(method, target, key!, { job });
  if (res.status !== 200 && res.status !== 201) {
    console.error(`✖ Başarısız: HTTP ${res.status}`);
    explain(res.status, res.text);
    process.exitCode = 1;
    return;
  }

  const id = (res.json as { jobId?: number } | null)?.jobId ?? updateId;
  console.log(`\n✔ İş ${updateId ? 'güncellendi' : 'oluşturuldu'}: jobId=#${id}`);
  console.log(`  Hedef : ${WORKFLOW_URL}`);
  if (id) await verify(id, key!, MINUTES.join(', '));
  console.log('');
  console.log('Doğrula:');
  console.log('  npm run cron:setup -- --list');
  console.log('  gh run list --workflow=ingest.yml --limit 5 --json createdAt,event,conclusion');
}

main().catch((err) => {
  console.error('✖ cron:setup başarısız:', err instanceof Error ? err.message : err);
  process.exit(1);
});
