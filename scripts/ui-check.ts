/**
 * Arayüz kapıları — iddia değil ÖLÇÜM.
 *
 * Çalıştır:  npm run ui-check
 *
 * Neden bu dosya var: arayüz kararları (kontrast, yüzey ayrışması, mikro punto)
 * gözle "iyi görünüyor" diye değil, ölçüyle korunur. Ölçüm (8 Eki 2026, önce):
 *   - 46 opaklıklı metin kullanımının 42'si WCAG AA (4.5:1) sınırının ALTINDA
 *     (text-mist/70 → 3.62 · /60 → 2.94 · /50 → 2.37)
 *   - panel/void 1.098:1 → kartlar zeminden ayrışmıyordu
 *   - 59 adet 10–10.5 px mikro metin
 * Ayrıntı: docs/arayuz-plani.md §1.3–1.4
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { DICTS, LABEL_SHORT_I18N, LABEL_TEXT_I18N } from '../src/lib/i18n';

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

/* ── Renk matematiği (WCAG 2.x) ──────────────────────────────────────────── */

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const channel = (c: number): number => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

const luminance = ([r, g, b]: [number, number, number]): number =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

const ratio = (a: [number, number, number], b: [number, number, number]): number => {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
};

/** CSS alpha kompozisyonu: ön plan `alpha` ile arka plana bindirilir. */
const composite = (
  fg: [number, number, number],
  bg: [number, number, number],
  alpha: number,
): [number, number, number] => [
  alpha * fg[0] + (1 - alpha) * bg[0],
  alpha * fg[1] + (1 - alpha) * bg[1],
  alpha * fg[2] + (1 - alpha) * bg[2],
];

/* ── Token'ları globals.css'ten oku ──────────────────────────────────────── */

const CSS_PATH = path.join(process.cwd(), 'src', 'app', 'globals.css');
const css = readFileSync(CSS_PATH, 'utf8');

const themeBlock = css.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
const tokens = new Map<string, [number, number, number]>();
for (const m of themeBlock.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) {
  tokens.set(m[1], hexToRgb(m[2]));
}

console.log('\n── Token' + 'lar (src/app/globals.css) ─────────────────────────────');
check('@theme bloğu okundu', themeBlock.length > 0, `${tokens.size} renk token'ı`);

/** Metin olarak kullanılan token'lar. */
const TEXT_TOKENS = ['mist', 'mist-2', 'chalk', 'signal', 'caution', 'alarm', 'critical', 'official'];
/** Metnin üzerinde durabileceği yüzeyler. */
const SURFACES = ['void', 'abyss', 'panel', 'panel-2'];

for (const t of [...TEXT_TOKENS, ...SURFACES, 'edge', 'edge-soft']) {
  if (!tokens.has(t)) check(`token tanımlı: --color-${t}`, false, 'BULUNAMADI');
}

/* ── 1. Metin kontrastı: her metin token'ı her yüzeyde AA ────────────────── */

console.log('\n── 1) Metin kontrastı (WCAG AA = 4.5:1) ───────────────────────');
const header = ['token'.padEnd(10), ...SURFACES.map((s) => s.padStart(8))].join('');
console.log(`BİLGİ ${header}`);
for (const t of TEXT_TOKENS) {
  const fg = tokens.get(t);
  if (!fg) continue;
  const cells: string[] = [];
  let worst = Infinity;
  for (const s of SURFACES) {
    const bg = tokens.get(s);
    if (!bg) continue;
    const r = ratio(fg, bg);
    worst = Math.min(worst, r);
    cells.push(r.toFixed(2).padStart(8));
  }
  console.log(`BİLGİ ${t.padEnd(10)}${cells.join('')}`);
  check(`--color-${t} tüm yüzeylerde ≥4.5:1`, worst >= 4.5, `en düşük ${worst.toFixed(2)}`);
}

/* ── 2. Yüzey ayrışması: kartlar zeminden ayrışmalı ──────────────────────── */

console.log('\n── 2) Yüzey ayrışması ─────────────────────────────────────────');
const get = (n: string) => {
  const v = tokens.get(n);
  if (!v) throw new Error(`token yok: ${n}`);
  return v;
};
const panelVoid = ratio(get('panel'), get('void'));
const edgePanel = ratio(get('edge'), get('panel'));
const edgeSoftPanel = ratio(get('edge-soft'), get('panel'));
const panel2Panel = ratio(get('panel-2'), get('panel'));

check('panel/void ≥ 1.25 (önce 1.098)', panelVoid >= 1.25, panelVoid.toFixed(3));
check('edge/panel ≥ 1.35 (önce 1.221)', edgePanel >= 1.35, edgePanel.toFixed(3));
check('edge-soft/panel ≥ 1.15', edgeSoftPanel >= 1.15, edgeSoftPanel.toFixed(3));
check(
  'panel-2 ÇÖKÜK (panel’den koyu)',
  luminance(get('panel-2')) < luminance(get('panel')),
  `panel-2/panel ${panel2Panel.toFixed(3)}`,
);

// `.surface` panel'i opaklıkla kullanıyor → bindirilmiş hâli ölçülür.
const surfaceAlphaRaw = css.match(/\.surface\s*\{[^}]*--color-panel\)\s*(\d+)%/)?.[1];
if (!surfaceAlphaRaw) {
  check('.surface opaklığı CSS’ten okundu', false, 'color-mix deseni bulunamadı');
} else {
  const alpha = Number(surfaceAlphaRaw) / 100;
  const effective = composite(get('panel'), get('void'), alpha);
  const r = ratio(effective, get('void'));
  check(
    `.surface (panel ${surfaceAlphaRaw}% + void) / void ≥ 1.25`,
    r >= 1.25,
    r.toFixed(3),
  );
}

/* ── 3. Kaynak taraması: opaklıklı metin + mikro punto ───────────────────── */

console.log('\n── 3) Kaynak kuralları ────────────────────────────────────────');

const files: string[] = [];
(function walk(dir: string): void {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(entry)) files.push(p);
  }
})(path.join(process.cwd(), 'src'));

const opacityHits: string[] = [];
const microHits: string[] = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  text.split('\n').forEach((line, i) => {
    // Metin renginde opaklık çarpanı yasak (ölçüldü: AA altına düşürüyor).
    for (const m of line.matchAll(/text-[a-z0-9-]+\/\d+\b/g)) {
      opacityHits.push(`${path.relative(process.cwd(), file)}:${i + 1} ${m[0]}`);
    }
    for (const m of line.matchAll(/text-\[10(\.5)?px\]/g)) {
      microHits.push(`${path.relative(process.cwd(), file)}:${i + 1} ${m[0]}`);
    }
  });
}
check(
  'metin renginde opaklık çarpanı yok (text-<renk>/<sayı>)',
  opacityHits.length === 0,
  opacityHits.slice(0, 5).join(' · '),
);
check(
  'mikro punto ≥ 11 px (10 / 10.5 px yok)',
  microHits.length === 0,
  microHits.slice(0, 5).join(' · '),
);

/* ── 4. Sözlük paritesi ve etiket saflığı ───────────────────────────────── */

console.log('\n── 4) Sözlük ve etiket kuralları ──────────────────────────────');
const trKeys = Object.keys(DICTS.tr).sort();
const enKeys = Object.keys(DICTS.en).sort();
check(
  'TR/EN sözlük anahtarları eşit',
  trKeys.length === enKeys.length && trKeys.every((k, i) => k === enKeys[i]),
  `${trKeys.length} / ${enKeys.length}`,
);

const banned = ['doğrulandı', 'teyit edildi'];
const bannedEn = /\b(confirmed|verified)\b/i;
const labelStrings: string[] = [];
for (const [label, entry] of Object.entries(LABEL_TEXT_I18N)) {
  labelStrings.push(`${label}:tr:${entry.tr}`, `${label}:en:${entry.en}`);
}
for (const [label, entry] of Object.entries(LABEL_SHORT_I18N)) {
  labelStrings.push(`${label}:tr:${entry.tr}`, `${label}:en:${entry.en}`);
}
const dirty = labelStrings.filter(
  (s) => banned.some((b) => s.includes(b)) || bannedEn.test(s),
);
check('etiket sözlüklerinde yasak sözcük yok', dirty.length === 0, dirty.join(' · '));

// "unverified" / "doğrulanmamış" YASAK DEĞİLDİR (yalnızca "doğrulandı" yasak).
const unverifiedOk = !bannedEn.test(LABEL_TEXT_I18N.unverified.en) &&
  !banned.some((b) => LABEL_TEXT_I18N.unverified.tr.includes(b));
check('"unverified"/"doğrulanmamış" yasak sayılmaz', unverifiedOk);

/* ── Özet ───────────────────────────────────────────────────────────────── */

console.log(`\n${'─'.repeat(60)}`);
if (failures > 0) {
  console.log(`✖ ${failures} KAPI BAŞARISIZ${skips ? ` · ${skips} atlandı` : ''}`);
  process.exit(1);
}
console.log(`✔ TÜM ARAYÜZ KAPILARI GEÇTİ${skips ? ` · ${skips} atlandı` : ''}`);
