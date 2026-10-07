import Parser from 'rss-parser';
import type { RawItem, SourceDef } from '@/types';
import { USER_AGENT } from '../registry';
import { cleanTitle, stripHtml, toIso } from '../text';

/**
 * Ortak RSS/Atom okuyucu.
 * rss-parser hem RSS 2.0 hem Atom beslemelerini okur; bu yüzden RFE/RL gibi
 * Atom yayınlayan kaynaklar için ayrı adaptör gerekmez.
 */
const parser = new Parser({
  timeout: 20000,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8',
  },
  customFields: { item: ['source', 'summary'] },
});

export async function fetchRss(source: SourceDef, url: string): Promise<RawItem[]> {
  const feed = await parser.parseURL(url);
  const items = (feed.items ?? []) as unknown as Array<Record<string, unknown>>;

  return items
    .map((item) => {
      const title = cleanTitle(String(item.title ?? ''));
      const link = String(item.link ?? item.guid ?? '');
      const body = stripHtml(
        String(item.contentSnippet ?? item.summary ?? item.content ?? ''),
      ).slice(0, 400);

      return {
        sourceSlug: source.slug,
        url: link,
        title,
        publishedAt: toIso(item.isoDate ?? item.pubDate ?? null),
        excerpt: body,
        lang: source.lang === 'multi' ? undefined : source.lang,
      } satisfies RawItem;
    })
    .filter((i) => i.url.length > 0 && i.title.length > 0);
}
