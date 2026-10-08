/**
 * Yerleşim kapıları — mobil kırılmasını ve yatay taşmayı KALICI olarak engeller.
 *
 * Çalıştır:  npm run layout-check            (önce: npm run build && npx next start -p 3211)
 *            npm run layout-check -- --url=http://localhost:3000/tr
 *
 * NEDEN VAR: 8 Eki 2026'da ölçülen hata — "Şu an ne biliyoruz?" satırında etiket
 * rozeti 390 px'te 242 px yer kaplıyor, başlığa 19 px kalıyordu; satır 338 px
 * yüksekliğe çıkıyor ve başlık satır başına bir kelimeye düşüyordu. Bu hata
 * yalnızca dar ekranda göründüğü için masaüstünde fark edilmedi.
 * (docs/arayuz-plani.md §1.1)
 *
 * Chrome'u kendisi başlatır (CDP, 9222) ve kapatır. Ek bağımlılık yoktur.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';

const PORT = 9333;
const DEFAULT_URL = 'http://localhost:3211/tr';

const arg = (name: string, fallback: string): string => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const url = arg('url', DEFAULT_URL);

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH ?? '',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const chromePath = CHROME_CANDIDATES.find((p) => p && existsSync(p));

let failures = 0;
let skips = 0;

function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

function skip(name: string, why: string): void {
  console.log(`SKIP  ${name}  (${why})`);
  skips++;
}

/* ── Chrome + CDP ────────────────────────────────────────────────────────── */

interface Probe {
  viewport: number;
  pageHeight: number;
  horizontalOverflow: number;
  offenders: string[];
  rowHeight: number | null;
  titleWidth: number | null;
  rowWidth: number | null;
  trGlyphs: boolean;
  serifFamily: string;
}

async function withChrome<T>(fn: (send: Send, evaluate: Eval) => Promise<T>): Promise<T> {
  const profile = `${process.cwd()}/.shots/chrome-profile-layout`;
  const chrome: ChildProcess = spawn(
    chromePath as string,
    [
      '--headless=new',
      '--disable-gpu',
      '--force-prefers-reduced-motion',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  // CDP uç noktası açılana kadar bekle.
  let targets: { type: string; webSocketDebuggerUrl: string }[] | null = null;
  for (let i = 0; i < 40 && !targets; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    } catch {
      /* henüz açılmadı */
    }
  }
  if (!targets) throw new Error('Chrome CDP uç noktası açılmadı');

  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('CDP sayfa hedefi bulunamadı');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map<number, (m: unknown) => void>();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(String((e as MessageEvent).data)) as { id?: number };
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)?.(msg);
      pending.delete(msg.id);
    }
  });
  await new Promise((r) => ws.addEventListener('open', r));

  const send: Send = (method, params = {}) =>
    new Promise((resolve) => {
      const myId = ++id;
      pending.set(myId, resolve as (m: unknown) => void);
      ws.send(JSON.stringify({ id: myId, method, params }));
    });

  const evaluate: Eval = async (expression) => {
    const res = (await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })) as { result?: { result?: { value?: unknown } } };
    return res.result?.result?.value;
  };

  await send('Page.enable');
  await send('Runtime.enable');

  try {
    return await fn(send, evaluate);
  } finally {
    ws.close();
    chrome.kill();
    await new Promise((r) => setTimeout(r, 400));
  }
}

type Send = (method: string, params?: Record<string, unknown>) => Promise<unknown>;
type Eval = (expression: string) => Promise<unknown>;

const MEASURE = `(() => {
  const de = document.documentElement;
  // Kompakt liste satırı (manşet listesi) — kart değil: asıl mobil hata buradaydı.
  const row = document.querySelector('[data-summary-row]');
  const titleEl = row?.querySelector('button');
  return JSON.stringify({
    viewport: window.innerWidth,
    pageHeight: de.scrollHeight,
    horizontalOverflow: de.scrollWidth - window.innerWidth,
    offenders: [...document.querySelectorAll('*')]
      .filter(el => el.getBoundingClientRect().right > window.innerWidth + 1 && !el.closest('.overflow-x-auto'))
      .slice(0, 5)
      .map(el => el.tagName + '.' + String(el.className).split(' ').slice(0, 2).join('.')),
    rowHeight: row ? Math.round(row.getBoundingClientRect().height) : null,
    rowWidth: row ? Math.round(row.getBoundingClientRect().width) : null,
    titleWidth: titleEl ? Math.round(titleEl.getBoundingClientRect().width) : null,
    trGlyphs: document.fonts.check('16px "Newsreader"', 'ığşçöü İĞŞÇÖÜ'),
    serifFamily: getComputedStyle(document.querySelector('h1')).fontFamily,
  });
})()`;

async function measure(send: Send, evaluate: Eval, width: number, height = 900): Promise<Probe> {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 700,
  });
  await send('Page.navigate', { url });
  await new Promise((r) => setTimeout(r, 2500));
  return JSON.parse(String(await evaluate(MEASURE))) as Probe;
}

/* ── Kapılar ─────────────────────────────────────────────────────────────── */

console.log(`\n── Yerleşim kapıları · ${url} ───────────────────────────────`);

if (!chromePath) {
  skip('tüm kapılar', 'Chrome bulunamadı (CHROME_PATH ile verilebilir)');
} else {
  try {
    await withChrome(async (send, evaluate) => {
      const widths = [360, 390, 768, 1280, 1440];
      const probes: Probe[] = [];
      for (const w of widths) probes.push(await measure(send, evaluate, w));

      console.log('\n── 1) Yatay taşma ─────────────────────────────────────────────');
      for (const probe of probes) {
        check(
          `${probe.viewport} px: yatay taşma yok`,
          probe.horizontalOverflow <= 0,
          probe.offenders.length > 0
            ? `taşan: ${probe.offenders.join(', ')}`
            : `${probe.horizontalOverflow} px`,
        );
      }

      console.log('\n── 2) Mobil satır düzeni (olay kartı) ─────────────────────────');
      const narrow = probes[0];
      if (narrow.titleWidth === null || narrow.rowWidth === null) {
        skip('satır ölçümü', 'sayfada olay kartı yok');
      } else {
        const ratio = narrow.titleWidth / narrow.rowWidth;
        check(
          `360 px: başlık satır genişliğinin ≥%60’ını alır`,
          ratio >= 0.6,
          `%${Math.round(ratio * 100)}`,
        );
        check(
          '360 px: kompakt satır yüksekliği ≤ 170 px (hata anında 338 px)',
          (narrow.rowHeight ?? 0) <= 170,
          `${narrow.rowHeight} px`,
        );
      }

      console.log('\n── 3) Sayfa yüksekliği bütçesi (pano) ─────────────────────────');
      const desktop = probes[probes.length - 1];
      check('1440 px: pano ≤ 6000 px', desktop.pageHeight <= 6000, `${desktop.pageHeight} px`);
      check('390 px: pano ≤ 8000 px', probes[1].pageHeight <= 8000, `${probes[1].pageHeight} px`);

      console.log('\n── 4) Tipografi ───────────────────────────────────────────────');
      check('Türkçe glifler serifte mevcut (ığşçöü İĞŞÇÖÜ)', desktop.trGlyphs === true);
      check(
        'başlıklar serif (Newsreader)',
        /newsreader/i.test(desktop.serifFamily),
        desktop.serifFamily.slice(0, 40),
      );
    });
  } catch (error) {
    check('ölçüm çalıştı', false, String(error));
  }
}

console.log(`\n${'─'.repeat(60)}`);
if (failures > 0) {
  console.log(`✖ ${failures} YERLEŞİM KAPISI BAŞARISIZ${skips ? ` · ${skips} atlandı` : ''}`);
  process.exit(1);
}
console.log(`✔ TÜM YERLEŞİM KAPILARI GEÇTİ${skips ? ` · ${skips} atlandı` : ''}`);
