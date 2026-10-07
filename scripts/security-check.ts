/**
 * Güvenlik regresyon testleri.
 *
 * Çalıştır:  npm run security-check
 *
 * Bu dosya, güvenlik denetiminde bulunan ve düzeltilen sorunların
 * geri gelmemesini sağlar. Yeni bir dış-veri işleme yolu eklendiğinde
 * buraya test eklenmelidir.
 */
import { safeExternalUrl, stripHtml } from '../src/lib/sources/text';

let failures = 0;

function check(name: string, ok: boolean, detail = ''): void {
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`${status}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

console.log('\n── ReDoS: stripHtml linear zamanda mı? ─────────────────────────');
const REDOS_CASES: Record<string, string> = {
  'kapanmayan script (1MB)': `<script>${'a'.repeat(1_000_000)}`,
  'script etiketi tekrarı (400KB)': '<script>'.repeat(50_000),
  'style etiketi tekrarı (400KB)': '<style>'.repeat(50_000),
  'derin iç içe etiket (100k)': `${'<div>'.repeat(100_000)}x${'</div>'.repeat(100_000)}`,
  'uzun nitelik (500KB)': `<a href="${'x'.repeat(500_000)}">t</a>`,
  'karışık script/style': '<script>x</script><style>y</style>'.repeat(20_000),
};

const BUDGET_MS = 400;
for (const [name, input] of Object.entries(REDOS_CASES)) {
  const t0 = performance.now();
  stripHtml(input);
  const ms = performance.now() - t0;
  check(`stripHtml ${name}`, ms < BUDGET_MS, `${ms.toFixed(1)}ms < ${BUDGET_MS}ms`);
}

console.log('\n── stripHtml: içerik temizliği ────────────────────────────────');
check(
  'script içeriği metinden çıkarılır',
  !stripHtml('<script>alert(1)</script>merhaba').includes('alert'),
  stripHtml('<script>alert(1)</script>merhaba'),
);
check(
  'style içeriği metinden çıkarılır',
  !stripHtml('<style>body{color:red}</style>metin').includes('color'),
);
check(
  'normal HTML etiketleri temizlenir',
  stripHtml('<p>Merhaba <b>dünya</b></p>') === 'Merhaba dünya',
  stripHtml('<p>Merhaba <b>dünya</b></p>'),
);
check(
  'HTML varlıkları çözülür',
  stripHtml('A &amp; B &lt;C&gt;') === 'A & B <C>',
  stripHtml('A &amp; B &lt;C&gt;'),
);
check('boş girdi güvenli', stripHtml('') === '');

console.log('\n── safeExternalUrl: şema doğrulaması ──────────────────────────');
check('https kabul edilir', safeExternalUrl('https://example.com/a?b=1') !== null);
check('http kabul edilir', safeExternalUrl('http://example.com') !== null);
check(
  'javascript: REDDEDİLİR',
  safeExternalUrl('javascript:alert(document.cookie)') === null,
);
check('data: REDDEDİLİR', safeExternalUrl('data:text/html,<script>1</script>') === null);
check('vbscript: REDDEDİLİR', safeExternalUrl('vbscript:msgbox(1)') === null);
check('file: REDDEDİLİR', safeExternalUrl('file:///etc/passwd') === null);
check('göreli yol REDDEDİLİR', safeExternalUrl('/relative/path') === null);
check('boş değer REDDEDİLİR', safeExternalUrl('') === null);
check('null REDDEDİLİR', safeExternalUrl(null) === null);
check('undefined REDDEDİLİR', safeExternalUrl(undefined) === null);
check('bozuk URL REDDEDİLİR', safeExternalUrl('http://[bozuk') === null);

console.log('\n── Dış veri akışı: mevcut feed ────────────────────────────────');
// feed.json içindeki tüm URL'lerin şema doğrulamasından geçtiğini doğrular.
// (Bu kontrol ingest sonrası çalıştırıldığında anlamlıdır.)
try {
  const { readFileSync } = await import('node:fs');
  const raw = readFileSync('data/feed.json', 'utf8');
  const feed = JSON.parse(raw) as {
    events: { claims: { url: string }[] }[];
    signals: { url: string }[];
  };
  const urls = [
    ...feed.events.flatMap((e) => e.claims.map((c) => c.url)),
    ...feed.signals.map((s) => s.url),
  ];
  const bad = urls.filter((u) => safeExternalUrl(u) === null);
  check(
    `feed.json: ${urls.length} bağlantının tamamı http(s)`,
    bad.length === 0,
    bad.length ? `geçersiz: ${bad.slice(0, 3).join(', ')}` : '',
  );
} catch {
  console.log('SKIP  feed.json okunamadı (ingest henüz çalışmamış olabilir)');
}

console.log(
  `\n${failures === 0 ? '✔ TÜM GÜVENLİK TESTLERİ GEÇTİ' : `✖ ${failures} TEST BAŞARISIZ`}\n`,
);
process.exit(failures === 0 ? 0 : 1);
