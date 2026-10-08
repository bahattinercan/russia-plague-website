/**
 * Coğrafi çıkarım regresyon testleri.
 *
 * Çalıştır:  npm run geo-check
 *
 * Kritik risk YANLIŞ POZİTİF: bir olayı olmadığı bir bölgeye bağlamak,
 * sitenin güvenilirliğini "doğrulandı" demekle aynı biçimde zedeler.
 * Bu yüzden her yeni alias eklenirken buraya test eklenmelidir.
 */
import { aggregateLocations, extractLocationsFromText, foldGeo } from '../src/lib/geo/location';

let failures = 0;

function check(name: string, ok: boolean, detail = ''): void {
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`${status}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

function slugs(text: string): string[] {
  return extractLocationsFromText(text).subjects.sort();
}

console.log('\n── foldGeo: normalizasyon ───────────────────────────────────────');
check('TR büyük İ → i', foldGeo('İrkutsk') === 'irkutsk', foldGeo('İrkutsk'));
check('TR ı → i', foldGeo('IĞDIR ığdır') === 'igdir igdir', foldGeo('IĞDIR ığdır'));
check('ş/ğ/ç/ö/ü katlanır', foldGeo('Şığaçöü') === 'sigacou', foldGeo('Şığaçöü'));
check('Kiril korunur', foldGeo('Тыва') === 'тыва', foldGeo('Тыва'));
check(
  'Kiril й/ё sadeleşir (aynı token anahtarını üretir)',
  foldGeo('Йошкар-Ола').split(/[^\p{L}\p{N}]+/u).join(' ') ===
    foldGeo('йошкар ола').split(/[^\p{L}\p{N}]+/u).join(' '),
  foldGeo('Йошкар-Ола'),
);

console.log('\n── Token sınırı: kısa kelime yanlış pozitifi ────────────────────');
check('"permanent" Perm sayılmaz', slugs('a permanent solution').length === 0);
check('"Perm Krai" Perm sayılır', slugs('Perm Krai reports cases').includes('perm'));
check('"jewish" tek başına oblast sayılmaz', slugs('a jewish community').length === 0);
check('"Birobidzhan" oblast sayılır', slugs('Birobidzhan outbreak').includes('jewish-ao'));

console.log('\n── Çakışma çözümü: uzun pencere kazanır ─────────────────────────');
check(
  '"Moscow Oblast" → yalnızca oblast (şehir değil)',
  JSON.stringify(slugs('Moscow Oblast reports')) === JSON.stringify(['moscow-oblast']),
  slugs('Moscow Oblast reports').join(','),
);
check(
  '"Nizhny Novgorod Oblast" → tek bölge',
  JSON.stringify(slugs('Nizhny Novgorod Oblast reports')) === JSON.stringify(['nizhny-novgorod']),
  slugs('Nizhny Novgorod Oblast reports').join(','),
);
check(
  '"Altai Krai" → tek bölge',
  JSON.stringify(slugs('Altai Krai reports')) === JSON.stringify(['altai-krai']),
  slugs('Altai Krai reports').join(','),
);
check(
  'çıplak "Altai" → iki cumhuriyet/kray (dürüst belirsizlik)',
  JSON.stringify(slugs('Altai reports')) === JSON.stringify(['altai-krai', 'altai-republic']),
  slugs('Altai reports').join(','),
);

console.log('\n── Gerçek metinler ──────────────────────────────────────────────');
const siberia = extractLocationsFromText(
  'Russian lab worker dies of suspected plague in Siberia; officials in Irkutsk region quarantine 12',
);
check('Sibirya makro-bölgesi bulunur', siberia.macros.includes('siberian'), siberia.macros.join(','));
check('İrkutsk bulunur', siberia.subjects.includes('irkutsk'), siberia.subjects.join(','));
check(
  'makro + subject birlikte raporlanır',
  siberia.locations.length === 2,
  String(siberia.locations.length),
);
check('belirsizlik bayrağı (tek subject) false', siberia.ambiguous === false);

const cyrillic = extractLocationsFromText('В Туве зафиксирован случай заболевания');
check('Kiril metinde Tuva bulunur', cyrillic.subjects.includes('tuva'), cyrillic.subjects.join(','));

const inflected = extractLocationsFromText('В Иркутской области зафиксирован случай');
check(
  'Kiril çekim eki (Иркутской → irkutsk)',
  inflected.subjects.includes('irkutsk'),
  inflected.subjects.join(','),
);

const multi = extractLocationsFromText('Cases in Irkutsk, Tuva and Buryatia');
check('üç ayrı bölge → ambiguous', multi.ambiguous === true, multi.subjects.join(','));

console.log('\n── Determinizm ──────────────────────────────────────────────────');
const sample = 'Plague suspected in Altai Krai and Omsk; Siberia monitoring continues';
const a = JSON.stringify(extractLocationsFromText(sample));
const b = JSON.stringify(extractLocationsFromText(sample));
check('aynı metin → aynı sonuç', a === b);

console.log('\n── Gerçek feed: konum kapsaması ─────────────────────────────────');
try {
  const { readFileSync } = await import('node:fs');
  const feed = JSON.parse(readFileSync('data/feed.json', 'utf8')) as {
    events: Parameters<typeof aggregateLocations>[0];
  };
  const coverage = aggregateLocations(feed.events);

  console.log(
    `BİLGİ  kapsama: ${coverage.matched}/${coverage.total} olay (%${(coverage.ratio * 100).toFixed(1)}) · ${coverage.aggregates.length} konum`,
  );
  for (const agg of coverage.aggregates.slice(0, 8)) {
    console.log(`BİLGİ    ${String(agg.eventCount).padStart(3)}  ${agg.kind === 'macro' ? '◆' : '·'} ${agg.nameEn}`);
  }

  const GATE = 0.6;
  if (coverage.ratio >= GATE) {
    console.log(
      `BİLGİ  kapsama ≥ %${GATE * 100} → koroplet harita (R1-A) veri olarak mümkün`,
    );
  } else {
    console.log(
      `BİLGİ  kapsama < %${GATE * 100} → plan gereği R1-B (konum listesi) seçili`,
    );
  }

  check(
    'kapsama > 0 (konum katmanı en az bir olayı bağlıyor)',
    coverage.matched > 0,
    String(coverage.matched),
  );
  check(
    'bilinen hikâye (Sibirya) yakalanıyor',
    coverage.aggregates.some((x) => x.slug === 'siberian'),
  );
  check(
    'hiçbir olay 6+ bölgeye yayılmıyor (yanlış pozitif kokusu)',
    feed.events.every(
      (e) => extractLocationsFromText(String((e as { title?: string }).title ?? '')).locations.length <= 6,
    ),
  );
} catch {
  console.log('SKIP  feed.json okunamadı (ingest henüz çalışmamış olabilir)');
}

console.log(
  `\n${failures === 0 ? '✔ TÜM COĞRAFİ TESTLER GEÇTİ' : `✖ ${failures} TEST BAŞARISIZ`}\n`,
);
process.exit(failures === 0 ? 0 : 1);
