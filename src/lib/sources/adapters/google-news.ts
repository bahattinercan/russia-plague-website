import Parser from 'rss-parser';
import type { RawItem, SourceDef } from '@/types';
import { USER_AGENT } from '../registry';
import { cleanTitle, stripHtml, toIso } from '../text';

/**
 * Google News RSS adaptörü.
 *
 * Neden gerekli: WHO, ECDC, ProMED, CIDRAP gibi kaynakların kendi RSS'leri
 * yok veya ölü (Eki 2026 ölçümü). Google News, bu kaynakların yayınlarını
 * indeksler ve RSS olarak sunar.
 *
 * Önemli ayrıntı: Google News öğesindeki `<source>` alanı GERÇEK yayıncıyı
 * taşır. Pipeline bu adı registry'de arar ve varsa kaynağın gerçek tier'ını
 * uygular — böylece "Google News" diye bir tier yanılsaması oluşmaz.
 */
const parser = new Parser({
  timeout: 20000,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
  },
  customFields: { item: ['source'] },
});

interface GoogleNewsSource {
  _?: string;
  $?: { url?: string };
}

export function googleNewsUrl(cfg: {
  query: string;
  hl: string;
  gl: string;
  ceid: string;
}): string {
  const params = new URLSearchParams({
    q: cfg.query,
    hl: cfg.hl,
    gl: cfg.gl,
    ceid: cfg.ceid,
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

export async function fetchGoogleNews(
  source: SourceDef,
  cfg: { query: string; hl: string; gl: string; ceid: string },
): Promise<RawItem[]> {
  const feed = await parser.parseURL(googleNewsUrl(cfg));
  const items = (feed.items ?? []) as unknown as Array<Record<string, unknown>>;

  return items
    .map((item) => {
      const src = item.source as GoogleNewsSource | string | undefined;
      const publisher = typeof src === 'string' ? src : (src?._ ?? '');
      const publisherUrl = typeof src === 'object' ? src?.$?.url : undefined;

      let title = cleanTitle(String(item.title ?? ''));
      // Google News başlık biçimi: "Başlık - Yayıncı"
      const suffix = ` - ${publisher}`;
      if (publisher && title.endsWith(suffix)) {
        title = title.slice(0, -suffix.length).trim();
      }

      return {
        sourceSlug: source.slug,
        url: String(item.link ?? ''),
        title,
        publishedAt: toIso(item.isoDate ?? item.pubDate ?? null),
        excerpt: stripHtml(String(item.contentSnippet ?? item.content ?? '')).slice(0, 400),
        lang: source.lang === 'multi' ? undefined : source.lang,
        originalPublisher: publisher || undefined,
        originalPublisherUrl: publisherUrl,
        viaAggregator: 'google-news',
      } satisfies RawItem;
    })
    .filter((i) => i.url.length > 0 && i.title.length > 0);
}
