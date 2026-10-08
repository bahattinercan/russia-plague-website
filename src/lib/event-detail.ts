/**
 * Olay detayının ORTAK hazırlığı — modal ve kalıcı sayfa aynı veriyi kullanır.
 *
 * Neden ayrı modül: iddia satırlarının hazırlanması (kaynağın kendi özeti,
 * başlık kopyası ayıklama, arşiv bağlantısı, dış bağlantı doğrulaması) hem
 * `/event/<slug>` sayfasında hem modalda gerekir. İki kopya, iki farklı telif
 * davranışı demek olurdu.
 *
 * Telif kuralı: kaynak özeti en fazla 2 cümle (`firstSentences`, PLAN.md §10).
 */
import type { Article, PlagueEvent } from '@/types';
import { archiveUrlFor, fold, safeExternalUrl } from '@/lib/sources/text';
import { firstSentences } from '@/lib/format';
import { localizedText, localizedTitle } from '@/lib/translate/display';
import type { Locale } from '@/lib/i18n';

export interface ClaimRow {
  key: string;
  tier: number;
  sourceName: string;
  sourceSlug: string;
  group: string;
  publishedAt: string | null;
  title: string;
  /** Kaynağın KENDİ 1–2 cümlelik özeti (başlığın kopyasıysa boş). */
  sourceSummary: string;
  href: string | null;
  archiveHref: string | null;
}

function articleIndex(event: PlagueEvent): Map<string, Article> {
  const map = new Map<string, Article>();
  for (const article of event.articles) {
    map.set(article.url, article);
    if (article.canonicalUrl) map.set(article.canonicalUrl, article);
  }
  return map;
}

export function claimRows(event: PlagueEvent, locale: Locale): ClaimRow[] {
  const articleByUrl = articleIndex(event);

  return event.claims.map((claim) => {
    const cTitle = localizedTitle(locale, claim);
    const linked = articleByUrl.get(claim.url);
    const rawSummary = linked
      ? localizedText(locale, linked.excerpt, linked.excerptTr).text
      : '';
    // Özet Google News kalıntısı olabilir ("başlık + yayıncı adı"). Hem çevrilmiş
    // hem orijinal başlıkla karşılaştırılır: TR görünümde özet İngilizce kalırken
    // başlık çevrildiği için tek karşılaştırma yetmiyor.
    const isTitleCopy =
      rawSummary.length > 0 &&
      [cTitle.text, claim.title].some((t) => fold(rawSummary).startsWith(fold(t).slice(0, 30)));

    return {
      key: `${claim.sourceSlug}-${claim.url}`,
      tier: claim.tier,
      sourceName: claim.sourceName,
      sourceSlug: claim.sourceSlug,
      group: claim.independenceGroup,
      publishedAt: claim.publishedAt,
      title: cTitle.text,
      sourceSummary: isTitleCopy ? '' : firstSentences(rawSummary),
      href: safeExternalUrl(claim.url),
      // §13.2: her kayıtta arşiv bağlantısı erişilebilir olmalı.
      archiveHref: safeExternalUrl(linked?.archiveUrl ?? archiveUrlFor(claim.url)),
    };
  });
}

/**
 * Olayın kendi özeti başlığın kopyasıysa gösterilmez (Google News kalıntısı).
 */
export function shouldShowSummary(event: PlagueEvent, summaryText: string): boolean {
  if (!summaryText) return false;
  return !fold(summaryText).startsWith(fold(event.title));
}
