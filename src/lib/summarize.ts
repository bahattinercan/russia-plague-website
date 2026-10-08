/**
 * Olay özeti — DETERMİNİSTİK, üretken değil.
 *
 * `docs/PLAN.md` §12: "Üretken özet yok". LLM ile özet, kaynakta olmayan bir
 * kesinlik ima edebilir; bu projenin editoryal kuralını (sistem "doğrulandı"
 * demez) doğrudan ihlal eder. Bu yüzden özet, elde ZATEN OLAN alanların
 * ölçülebilir bir dökümüdür: kaç grup, hangi tier'lar, resmî açıklama var mı,
 * çelişki var mı, ne zamandır görülüyor.
 *
 * Boşluk bilgisi birinci sınıf çıktıdır: bu korpusta olayların neredeyse
 * tamamında resmî açıklama YOKTUR ve bu, kullanıcının bilmesi gereken şeydir.
 *
 * Metin üretmez — yalnızca yapı döndürür. Dile çevirme işi UI'da `Dict`
 * üzerinden yapılır; böylece yasaklı ifade denetimi tek yerde kalır.
 */
import type { PlagueEvent } from '@/types';
import { isOfficialGroup } from '@/lib/trust';

export interface TierBucket {
  tier: number;
  count: number;
}

export type DigestSignal =
  | 'official-present'
  | 'official-absent'
  | 'contradiction'
  | 'single-group'
  | 'multi-group';

export interface EventDigest {
  groupCount: number;
  claimCount: number;
  articleCount: number;
  tiers: TierBucket[];
  /** En güvenilir (en küçük) tier; iddia yoksa null. */
  bestTier: number | null;
  /** En zayıf (en büyük) tier; iddia yoksa null. */
  worstTier: number | null;
  /** Gerçek resmî kurum (WHO/CDC/ECDC/ru-gov) iddiası var mı. */
  officialPresent: boolean;
  hasContradiction: boolean;
  firstSeenAt: string;
  lastUpdateAt: string;
  spanHours: number;
  singleGroup: boolean;
  signals: DigestSignal[];
}

/** Fonksiyon saf ve test edilebilir: girdi yalnızca olay nesnesidir. */
export function buildDigest(event: PlagueEvent): EventDigest {
  const counts = new Map<number, number>();
  let officialPresent = false;

  // İddialar varsa onlar kullanılır (kaynak başına bir iddia); yoksa makaleler.
  const rows: { tier: number; group: string }[] =
    event.claims.length > 0
      ? event.claims.map((c) => ({ tier: c.tier, group: c.independenceGroup }))
      : event.articles.map((a) => ({ tier: a.tier, group: a.independenceGroup }));

  for (const row of rows) {
    counts.set(row.tier, (counts.get(row.tier) ?? 0) + 1);
    if (isOfficialGroup(row.group)) officialPresent = true;
  }

  const tiers: TierBucket[] = [...counts.entries()]
    .map(([tier, count]) => ({ tier, count }))
    .sort((a, b) => a.tier - b.tier);

  const tierNums = tiers.map((t) => t.tier);
  const singleGroup = event.independentGroupCount <= 1;

  const first = new Date(event.firstSeenAt).getTime();
  const last = new Date(event.lastUpdateAt).getTime();
  const spanHours =
    Number.isFinite(first) && Number.isFinite(last) ? Math.max(0, (last - first) / 3_600_000) : 0;

  const signals: DigestSignal[] = [officialPresent ? 'official-present' : 'official-absent'];
  if (event.contradiction.hasContradiction) signals.push('contradiction');
  signals.push(singleGroup ? 'single-group' : 'multi-group');

  return {
    groupCount: event.independentGroupCount,
    claimCount: event.claims.length,
    articleCount: event.articles.length,
    tiers,
    bestTier: tierNums.length > 0 ? Math.min(...tierNums) : null,
    worstTier: tierNums.length > 0 ? Math.max(...tierNums) : null,
    officialPresent,
    hasContradiction: event.contradiction.hasContradiction,
    firstSeenAt: event.firstSeenAt,
    lastUpdateAt: event.lastUpdateAt,
    spanHours,
    singleGroup,
    signals,
  };
}
