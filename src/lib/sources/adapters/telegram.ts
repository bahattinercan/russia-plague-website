import * as cheerio from 'cheerio';
import type { RawItem, SourceDef } from '@/types';
import { USER_AGENT } from '../registry';
import { stripHtml, toIso } from '../text';
import { FETCH_TIMEOUT_MS } from './html';

/**
 * Telegram genel kanal görünümü (t.me/s/<kanal>) okuyucu.
 *
 * KURAL: Buradan gelen her şey Tier 5 / `social-signal`'dır ve sitede
 * yalnızca "doğrulanmamış iddia" katmanında gösterilir. Ana akışta
 * tek başına haber olarak sayılmaz.
 *
 * Ölçüm (6 Eki 2026): t.me/s/astrapress erişilebilir, mesaj metinleri ve
 * ISO zaman damgaları HTML içinde mevcut.
 */
export async function fetchTelegram(source: SourceDef, channel: string): Promise<RawItem[]> {
  const url = `https://t.me/s/${channel}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html',
      'Accept-Language': 'ru,en;q=0.7',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);

  const $ = cheerio.load(await res.text());
  const items: RawItem[] = [];

  $('.tgme_widget_message').each((_, el) => {
    const $el = $(el);
    const post = $el.attr('data-post');
    const text = stripHtml($el.find('.tgme_widget_message_text').first().text()).trim();
    const datetime = $el.find('time').attr('datetime');
    if (!post || text.length < 20) return;

    const firstLine = text.split('\n')[0].trim();
    items.push({
      sourceSlug: source.slug,
      url: `https://t.me/${post}`,
      title: firstLine.length > 12 ? firstLine.slice(0, 180) : text.slice(0, 180),
      publishedAt: toIso(datetime ?? null),
      excerpt: text.slice(0, 400),
      lang: 'ru',
    });
  });

  return items;
}
