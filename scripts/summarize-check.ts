/**
 * Özet + editoryal dil regresyon testleri.
 *
 * Çalıştır:  npm run summarize-check
 *
 * İki şeyi korur:
 *  1. Özet DETERMİNİSTİK ve sayısal olarak doğru (uydurma yok).
 *  2. UI metinlerinin hiçbir yerinde yasaklı "doğrulama" ifadesi yok
 *     (PLAN.md §13.5). Tek istisna `disclaimerLong`: o metin ifadeyi
 *     OLUMSUZLAMAK için bilinçli olarak içerir.
 */
import { DICTS, LABEL_TEXT_I18N, LOCALES } from '../src/lib/i18n';
import { FORBIDDEN_VERIFICATION_PHRASES } from '../src/lib/trust';
import { buildDigest } from '../src/lib/summarize';
import type { Article, EventClaim, PlagueEvent } from '../src/types';

let failures = 0;

function check(name: string, ok: boolean, detail = ''): void {
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`${status}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

function claim(tier: number, group: string, sourceName = `S${tier}`): EventClaim {
  return {
    sourceSlug: sourceName.toLowerCase(),
    sourceName,
    tier: tier as EventClaim['tier'],
    independenceGroup: group,
    title: 't',
    titleTr: null,
    url: `https://example.com/${sourceName}`,
    publishedAt: '2026-10-06T00:00:00.000Z',
  };
}

function article(tier: number, group: string): Article {
  return {
    id: `${group}-${tier}`,
    sourceSlug: group,
    sourceName: group,
    tier: tier as Article['tier'],
    independenceGroup: group,
    trustBase: 50,
    url: `https://example.com/${group}`,
    canonicalUrl: `https://example.com/${group}`,
    title: 't',
    titleOriginal: 't',
    lang: 'en',
    publishedAt: '2026-10-06T00:00:00.000Z',
    fetchedAt: '2026-10-06T00:00:00.000Z',
    excerpt: '',
    contentHash: 'h',
    archiveUrl: null,
    viaAggregator: null,
    originalPublisher: null,
    sourceStale: false,
    titleTr: null,
    excerptTr: null,
    translatedAt: null,
    translationProvider: null,
    translationStatus: 'skipped',
  };
}

function event(partial: Partial<PlagueEvent>): PlagueEvent {
  return {
    id: 'e1',
    slug: 'e1',
    title: 'Event',
    titleOriginal: 'Event',
    summary: 'Event',
    firstSeenAt: '2026-10-05T00:00:00.000Z',
    lastUpdateAt: '2026-10-07T00:00:00.000Z',
    label: 'single',
    independentGroupCount: 1,
    groups: ['reuters'],
    claims: [],
    articles: [],
    titleTr: null,
    summaryTr: null,
    translatedAt: null,
    translationProvider: null,
    translationStatus: 'skipped',
    contradiction: { hasContradiction: false, sides: [] },
    ...partial,
  };
}

console.log('\n── Özet: sayısal doğruluk ───────────────────────────────────────');
const multi = event({
  independentGroupCount: 3,
  claims: [claim(2, 'reuters'), claim(3, 'meduza'), claim(5, 'social-signal')],
  articles: [article(2, 'reuters'), article(3, 'meduza'), article(5, 'social-signal')],
});
const dMulti = buildDigest(multi);
check('grup sayısı olaydan gelir', dMulti.groupCount === 3, String(dMulti.groupCount));
check('iddia sayısı', dMulti.claimCount === 3, String(dMulti.claimCount));
check('tier kovaları sıralı', JSON.stringify(dMulti.tiers.map((x) => x.tier)) === '[2,3,5]', JSON.stringify(dMulti.tiers));
check('en iyi / en zayıf tier', dMulti.bestTier === 2 && dMulti.worstTier === 5, `${dMulti.bestTier}/${dMulti.worstTier}`);
check('resmî açıklama YOK olarak işaretlenir', dMulti.officialPresent === false);
check('çoklu grup → singleGroup false', dMulti.singleGroup === false);
check('iki günlük yayılma = 48 saat', Math.round(dMulti.spanHours) === 48, String(dMulti.spanHours));

console.log('\n── Özet: resmî kaynak tespiti ───────────────────────────────────');
const official = event({ independentGroupCount: 2, claims: [claim(1, 'who-family'), claim(2, 'reuters')] });
check('WHO ailesi → resmî açıklama var', buildDigest(official).officialPresent === true);

const research = event({ claims: [claim(1, 'cidrap')] });
check(
  'T1 araştırma kuruluşu (CIDRAP) resmî SAYILMAZ',
  buildDigest(research).officialPresent === false,
);

console.log('\n── Özet: boşluk ve tekil kaynak ─────────────────────────────────');
const single = event({ independentGroupCount: 1, claims: [claim(2, 'reuters')] });
const dSingle = buildDigest(single);
check('tek grup', dSingle.singleGroup === true);
check('tekil sinyal', dSingle.signals.includes('single-group'), dSingle.signals.join(','));
check('resmî yok sinyali', dSingle.signals.includes('official-absent'), dSingle.signals.join(','));

const noClaims = event({ claims: [], articles: [article(3, 'meduza')] });
check('iddia yoksa makalelerden sayar', buildDigest(noClaims).claimCount === 0 && buildDigest(noClaims).articleCount === 1);

const contradiction = event({
  contradiction: {
    hasContradiction: true,
    sides: [{ group: 'reuters', statement: 'a', statementTr: null, sourceSlug: 'reuters' }],
  },
});
check('çelişki sinyali', buildDigest(contradiction).signals.includes('contradiction'));

console.log('\n── Özet: determinizm ────────────────────────────────────────────');
check(
  'aynı girdi → aynı çıktı',
  JSON.stringify(buildDigest(multi)) === JSON.stringify(buildDigest(multi)),
);

console.log('\n── Editoryal dil: yasaklı ifadeler ──────────────────────────────');
/** Bilinçli istisna: bu metin ifadeyi OLUMSUZLAMAK için içerir. */
const ALLOWED_KEYS = new Set(['disclaimerLong']);

/**
 * SÖZCÜK SINIRI ŞART.
 *
 * Neden: "Unverified signals" metni "verified" ALT DİZESİNİ içerir. Naif
 * `includes()` bu yüzden projenin kendi doğru terimini ihlal sanır. Sınır
 * kontrolü ile "unverified"/"unconfirmed" gibi OLUMSUZ biçimler serbest
 * kalır; yalnızca gerçek iddia biçimleri yakalanır.
 */
function containsPhrase(haystack: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, 'u').test(haystack);
}

for (const locale of LOCALES) {
  const dict = DICTS[locale] as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(dict)) {
    if (typeof value !== 'string') continue;
    const haystack = value.toLocaleLowerCase(locale === 'tr' ? 'tr' : 'en');
    for (const phrase of FORBIDDEN_VERIFICATION_PHRASES) {
      if (!containsPhrase(haystack, phrase)) continue;
      check(`${locale}.${key} yasaklı ifade içermiyor`, ALLOWED_KEYS.has(key), phrase);
    }
  }
}

for (const locale of LOCALES) {
  for (const [label, value] of Object.entries(LABEL_TEXT_I18N)) {
    const text = ((value as Record<string, string>)[locale] ?? '').toLocaleLowerCase(
      locale === 'tr' ? 'tr' : 'en',
    );
    for (const phrase of FORBIDDEN_VERIFICATION_PHRASES) {
      if (containsPhrase(text, phrase)) {
        check(`etiket ${label} (${locale}) yasaklı ifade içermiyor`, false, phrase);
      }
    }
  }
}
check('etiket metinleri temiz', true);

const digestJson = JSON.stringify(buildDigest(multi)).toLocaleLowerCase('tr');
check(
  'özet çıktısı yasaklı ifade içermez',
  FORBIDDEN_VERIFICATION_PHRASES.every((p) => !containsPhrase(digestJson, p)),
);

console.log('\n── Sözcük sınırı: olumsuz biçimler serbest ──────────────────────');
check('"unverified" yasak sayılmaz', containsPhrase('unverified signals', 'verified') === false);
check('"unconfirmed" yasak sayılmaz', containsPhrase('unconfirmed report', 'confirmed') === false);
check('çıplak "verified" yakalanır', containsPhrase('this was verified today', 'verified') === true);

console.log(
  `\n${failures === 0 ? '✔ TÜM ÖZET/EDİTORYAL TESTLER GEÇTİ' : `✖ ${failures} TEST BAŞARISIZ`}\n`,
);
process.exit(failures === 0 ? 0 : 1);
