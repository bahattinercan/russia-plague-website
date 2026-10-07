/**
 * Güvenlik regresyon testleri.
 *
 * Çalıştır:  npm run security-check
 *
 * Bu dosya, güvenlik denetiminde bulunan ve düzeltilen sorunların
 * geri gelmemesini sağlar. Yeni bir dış-veri işleme yolu eklendiğinde
 * buraya test eklenmelidir.
 */
import { decodeEntities, safeExternalUrl, stripHtml, cleanTitle } from '../src/lib/sources/text';
import { maskedDbUrl } from '../src/lib/env';
import { buildCsp, generateNonce } from '../src/lib/security/csp';

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

console.log('\n── decodeEntities: bozuk sayısal varlık (kaynak bazlı DoS) ─────');
// Regresyon: `String.fromCodePoint` geçersiz kod noktasında RangeError atar;
// dış kaynaklı bir `&#99999999999;` tüm kaynağın taramasını düşürüyordu.
const ENTITY_ATTACKS: Record<string, string> = {
  'aşırı büyük (&#99999999999;)': '&#99999999999;',
  'sınır üstü (&#1114112;)': '&#1114112;',
  'vekil aralığı (&#55296;)': '&#55296;',
  'NUL (&#0;)': '&#0;',
  [`taşma (&${"9".repeat(40)};)`]: `&#${"9".repeat(40)};`,
};
for (const [name, input] of Object.entries(ENTITY_ATTACKS)) {
  let out = '<threw>';
  let threw = false;
  try {
    out = decodeEntities(input);
  } catch {
    threw = true;
  }
  check(`decodeEntities ${name} fırlatmaz`, !threw, threw ? 'RangeError' : `→ ${JSON.stringify(out)}`);
}

const HTML_WITH_BAD_ENTITY = '<p>&#99999999999; metin</p>';
let stripThrew = false;
try {
  stripHtml(HTML_WITH_BAD_ENTITY);
} catch {
  stripThrew = true;
}
check('stripHtml bozuk varlıkta fırlatmaz', !stripThrew);
let titleThrew = false;
try {
  cleanTitle('Başlık &#1114112; son');
} catch {
  titleThrew = true;
}
check('cleanTitle bozuk varlıkta fırlatmaz', !titleThrew);
check('geçerli sayısal varlık çözülür (&#65; → A)', decodeEntities('&#65;') === 'A');
check('astral düzlem varlığı çözülür (&#128169;)', decodeEntities('&#128169;') === '\u{1F4A9}');
check('maksimum geçerli kod noktası (&#1114111;)', decodeEntities('&#1114111;').codePointAt(0) === 0x10ffff);
check(
  'bilinmeyen adlı varlık ham kalır',
  decodeEntities('&bozuk;') === '&bozuk;',
  decodeEntities('&bozuk;'),
);

console.log('\n── maskedDbUrl: log sızıntısı ─────────────────────────────────');
const ORIGINAL_DB_URL = process.env.DATABASE_URL;
const MASK_CASES: { name: string; url: string; secret: string }[] = [
  {
    // Not: dize kasıtlı olarak sahte — gerçek credential kalıbına (npg_…)
    // benzemesin diye sır tarayıcılarını yanlış pozitife düşürmeyecek
    // biçimde seçildi.
    name: 'userinfo şifresi',
    url: 'postgresql://kullanici:test-parola-123@db.example.invalid:5432/veritabani',
    secret: 'test-parola-123',
  },
  {
    name: 'sorgu parametresi (?password=)',
    url: 'postgresql://host/db?password=test-parola-456&sslmode=require',
    secret: 'test-parola-456',
  },
  {
    name: 'sorgu parametresi (&pwd=)',
    url: 'postgresql://user@host/db?sslmode=require&pwd=test-parola-789',
    secret: 'test-parola-789',
  },
];
for (const c of MASK_CASES) {
  process.env.DATABASE_URL = c.url;
  const masked = maskedDbUrl();
  check(
    `maskedDbUrl ${c.name} sızdırmaz`,
    !masked.includes(c.secret) && masked.includes('***'),
    masked,
  );
}
process.env.DATABASE_URL = 'postgresql://user@host/db';
check(
  'maskedDbUrl şifresiz dizede host\'u korur',
  maskedDbUrl().includes('host'),
  maskedDbUrl(),
);
if (ORIGINAL_DB_URL === undefined) delete process.env.DATABASE_URL;
else process.env.DATABASE_URL = ORIGINAL_DB_URL;

console.log('\n── CSP: nonce tabanlı politika ────────────────────────────────');
const NONCE = 'TESTNONCE123';
const prodCsp = buildCsp(NONCE, false);
const devCsp = buildCsp(NONCE, true);
const scriptSrc = (csp: string) => csp.split('; ').find((d) => d.startsWith('script-src ')) ?? '';
const styleSrc = (csp: string) => csp.split('; ').find((d) => d.startsWith('style-src ')) ?? '';

check('script-src nonce içerir', scriptSrc(prodCsp).includes(`'nonce-${NONCE}'`), scriptSrc(prodCsp));
check(
  "script-src 'unsafe-inline' İÇERMEZ",
  !scriptSrc(prodCsp).includes('unsafe-inline'),
  scriptSrc(prodCsp),
);
check(
  "style-src 'unsafe-inline' KORUR (React inline style nitelikleri)",
  styleSrc(prodCsp).includes('unsafe-inline'),
  styleSrc(prodCsp),
);
check('üretimde unsafe-eval yok', !prodCsp.includes('unsafe-eval'));
check('geliştirmede unsafe-eval var', devCsp.includes("'unsafe-eval'"));
check(
  'upgrade-insecure-requests yalnızca üretimde',
  prodCsp.includes('upgrade-insecure-requests') && !devCsp.includes('upgrade-insecure-requests'),
);
check("object-src 'none'", prodCsp.includes("object-src 'none'"));
check("frame-ancestors 'none'", prodCsp.includes("frame-ancestors 'none'"));
check("base-uri 'self'", prodCsp.includes("base-uri 'self'"));
check("form-action 'self'", prodCsp.includes("form-action 'self'"));
check('strict-dynamic var', prodCsp.includes("'strict-dynamic'"));
check('nonce yeni satır/boşluk içermez', !/\s/.test(NONCE) && /^[A-Za-z0-9+/=]+$/.test(NONCE));
check('generateNonce her çağrıda farklı', generateNonce() !== generateNonce());
check(
  'generateNonce geçerli base64 üretir',
  /^[A-Za-z0-9+/]+={0,2}$/.test(generateNonce()),
  generateNonce(),
);

// CSP statik başlık olarak next.config.ts'e geri dönerse nonce'lu politika
// sessizce ezilir. Bu yüzden yapılandırmada CSP olmadığını test ediyoruz.
try {
  const { readFileSync } = await import('node:fs');
  const config = readFileSync('next.config.ts', 'utf8');
  check(
    "next.config.ts statik CSP başlığı tanımlamaz (nonce proxy.ts'te)",
    !/key:\s*'Content-Security-Policy'/.test(config),
  );
} catch {
  console.log('SKIP  next.config.ts okunamadı');
}

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
