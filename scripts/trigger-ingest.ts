/**
 * Ingest workflow'unu GitHub API üzerinden elle tetikler (workflow_dispatch).
 *
 *   GITHUB_TRIGGER_TOKEN=github_pat_... npm run ingest:trigger
 *   npm run ingest:trigger -- --repo=owner/name --ref=main --workflow=ingest.yml
 *
 * Neden var: GitHub'ın kendi `schedule` tetikleyicisi "her 10 dakika" sözünü
 * tutmuyor (ücretsiz katmanda saatlerce gecikebiliyor veya hiç çalışmıyor). Dış bir
 * zamanlayıcı (cron-job.org) 10 dakikada bir bu API'yi çağırır.
 *
 * Bu script, cron-job.org'a yapıştırılacak İSTEĞİN AYNISINI üretir —
 * yani kurulumun doğru olduğunu buradan test edebilirsin.
 *
 * Not: Bu script ingest'i KENDİSİ çalıştırmaz; GitHub Actions'a "çalıştır"
 * der. Ingest'in kendisi için `npm run ingest`.
 *
 * Ayrıntılı kurulum: docs/dispatch-tetikleme.md
 */

const DEFAULT_REPO = 'bahattinercan/russia-plague-website';
const DEFAULT_WORKFLOW = 'ingest.yml';
const DEFAULT_REF = 'main';

interface Options {
  repo: string;
  workflow: string;
  ref: string;
}

function parseArgs(argv: string[]): Options {
  const get = (name: string, fallback: string): string => {
    const arg = argv.find((a) => a.startsWith(`--${name}=`));
    return arg ? arg.slice(name.length + 3) : fallback;
  };
  return {
    repo: get('repo', process.env.GITHUB_REPOSITORY ?? DEFAULT_REPO),
    workflow: get('workflow', DEFAULT_WORKFLOW),
    ref: get('ref', DEFAULT_REF),
  };
}

/**
 * Token'ı env'den okur. `GH_TOKEN` yedeği bilinçli olarak var: `gh` CLI'ın
 * kendi token'ıyla test etmek için (repo ADMIN isen Actions:write zaten var).
 * Üretimde cron-job.org'a ÖZEL, yalnızca bu repoya yetkili bir PAT koyulmalı —
 * `gh` OAuth token'ı tüm repolara erişir, ona verilmemeli.
 */
function readToken(): string {
  const token = process.env.GITHUB_TRIGGER_TOKEN ?? process.env.GH_TOKEN;
  if (!token) {
    console.error(
      [
        '✖ Token yok.',
        '',
        '  GITHUB_TRIGGER_TOKEN=github_pat_... npm run ingest:trigger',
        '',
        'Fine-grained PAT: Settings → Developer settings → Personal access tokens',
        '  → Fine-grained tokens → Repository access: sadece russia-plague-website',
        '  → Repository permissions → Actions: Read and write',
        '',
        'Ayrıntı: docs/dispatch-tetikleme.md',
      ].join('\n'),
    );
    process.exit(1);
  }
  return token;
}

async function main(): Promise<void> {
  const { repo, workflow, ref } = parseArgs(process.argv.slice(2));
  const token = readToken();
  const url = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`;

  console.log(`→ POST ${url}`);
  console.log(`  ref: ${ref}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'plague-tracker-dispatch/0.1',
    },
    body: JSON.stringify({ ref }),
  });

  // Başarı = 204 No Content (GitHub dispatch için gövde döndürmez).
  if (res.status === 204) {
    console.log('\n✔ Tetiklendi (204). Çalışmayı izle:');
    console.log(`  gh run list --workflow=${workflow} --limit 3`);
    return;
  }

  const body = await res.text();
  console.error(`\n✖ Başarısız: HTTP ${res.status}`);

  // Sık karşılaşılan hataları Türkçe açıkla — aksi halde cron-job.org
  // günlüğünde yalnızca "403" görünür ve nedeni belirsiz kalır.
  const hints: Record<number, string> = {
    401: 'Token geçersiz veya süresi dolmuş. Yeni PAT üret (cron-job.org\'daki değeri de güncelle).',
    403: 'Token\'ın Actions: write yetkisi yok. Fine-grained PAT\'te "Actions: Read and write" seç.',
    404: 'Repo, workflow adı veya ref yanlış — YA DA token bu private repoya erişemiyor.',
    422: 'ref geçersiz. Varsayılan dal "main" mi? (branch adını kontrol et)',
  };
  if (hints[res.status]) console.error(`  ↳ ${hints[res.status]}`);
  if (res.status === 403 || res.status === 404) {
    console.error(
      '  ↳ Not: workflow_dispatch yalnızca workflow dosyası VARSAYILAN DALDA (main) varken çalışır.',
    );
  }
  if (body) console.error(`  ${body.slice(0, 400)}`);
  process.exitCode = 1;
}

main().catch((err) => {
  console.error('✖ Tetikleme başarısız:', err instanceof Error ? err.message : err);
  process.exit(1);
});
