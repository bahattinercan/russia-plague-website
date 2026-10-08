/**
 * Metin benzerliği — olay kümeleme ve kalıcı bağlantı çözümlemesi ORTAK kullanır.
 *
 * Neden ayrı modül: `data.ts` (depo katmanı) ve `/event/<slug>` sayfası aynı
 * benzerlik ölçüsünü kullanmalı. İki kopya, "aynı olay" tanımının zamanla
 * ayrışması demekti.
 */

/** Başlığı anlamlı kelime kümesine indirger (≥4 harf, noktalama atılır). */
export function normTitle(input: string): Set<string> {
  return new Set(
    input
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4),
  );
}

/** Jaccard benzerliği (0–1). */
export function titleSimilarity(a: string, b: string): number {
  const A = normTitle(a);
  const B = normTitle(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

/**
 * Slug'ı aranabilir metne çevirir.
 * Slug başlıktan türetilir ve sonunda kısa bir hash taşır (`…-pjl1tl`) → atılır.
 */
export function slugToQuery(slug: string): string {
  return slug
    .replace(/-[a-z0-9]{6}$/i, '')
    .replace(/-/g, ' ')
    .trim();
}
