import * as cheerio from 'cheerio';
import type { RawItem, SourceDef } from '@/types';
import { USER_AGENT } from '../registry';
import { cleanTitle, stripHtml, toIso } from '../text';

export const FETCH_TIMEOUT_MS = 20000;

/**
 * Basit HTML listesi okuyucu.
 *
 * Kırılganlığı yüksek olduğu için `itemsFound === 0` durumu pipeline'da
 * "kaynak bozuk" olarak raporlanır ve health panelinde görünür.
 * Her HTML kaynağının bir yedek yolu olmalıdır (kural: §7 PLAN.md).
 */
export async function fetchHtml(
  source: SourceDef,
  cfg: {
    url: string;
    itemSelector: string;
    titleSelector?: string;
    dateSelector?: string;
    linkAttr?: string;
    linkPattern?: string;
  },
): Promise<RawItem[]> {
  const res = await fetch(cfg.url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en,ru;q=0.8,tr;q=0.6',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${cfg.url}`);

  const $ = cheerio.load(await res.text());
  const pattern = cfg.linkPattern ? new RegExp(cfg.linkPattern) : null;
  const seen = new Set<string>();
  const items: RawItem[] = [];

  $(cfg.itemSelector).each((_, el) => {
    const $el = $(el);
    const href = cfg.linkAttr ? $el.attr(cfg.linkAttr) : $el.find('a').attr('href');
    if (!href) return;

    const absolute = href.startsWith('http') ? href : new URL(href, cfg.url).toString();
    if (pattern && !pattern.test(absolute)) return;
    if (seen.has(absolute)) return;
    seen.add(absolute);

    const title = cleanTitle(
      cfg.titleSelector ? $el.find(cfg.titleSelector).text() : $el.text(),
    );
    if (!title) return;

    const rawDate = cfg.dateSelector
      ? ($el.find(cfg.dateSelector).attr('datetime') ?? $el.find(cfg.dateSelector).text())
      : null;

    items.push({
      sourceSlug: source.slug,
      url: absolute,
      title,
      publishedAt: toIso(rawDate),
      excerpt: stripHtml($el.text()).slice(0, 400),
      lang: source.lang === 'multi' ? undefined : source.lang,
    });
  });

  return items;
}
