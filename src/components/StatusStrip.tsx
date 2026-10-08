import type { PlagueEvent, SourceHealth } from '@/types';
import { getDict, type Locale } from '@/lib/i18n';
import { healthSummary } from '@/lib/health';
import { TimeAgo } from './TimeAgo';
import { NewSinceLastVisit, type FreshEvent } from './NewSinceLastVisit';

const DAY_MS = 86_400_000;

/**
 * Durum şeridi — panonun "10 saniyelik" cevabının ilk satırı.
 *
 * NEDEN AYRI: durum kartları TOPLAMLARI gösterir (74 olay, 41 kaynak).
 * Bu şerit DEĞİŞİMİ gösterir: son 24 saatte kaç yeni olay, en son gelişme ne
 * zaman, veri ne kadar taze ve son ziyaretten beri ne değişti.
 *
 * Referans zaman `feed.generatedAt`'tır (Date.now() değil): şerit, verinin
 * kendi anlık görüntüsüyle tutarlı olur; sunucu/istemci saati kayması sayıları
 * oynatmaz.
 */
export function StatusStrip({
  events,
  generatedAt,
  sources,
  locale,
}: {
  events: PlagueEvent[];
  generatedAt: string;
  sources: SourceHealth[];
  locale: Locale;
}) {
  const t = getDict(locale);
  const tr = locale === 'tr';

  const reference = new Date(generatedAt).getTime();
  const newIn24h = events.filter((event) => {
    const seen = new Date(event.firstSeenAt).getTime();
    return Number.isFinite(seen) && seen > reference - DAY_MS;
  }).length;

  const lastEventAt =
    events
      .map((event) => event.lastUpdateAt)
      .filter(Boolean)
      .sort()
      .slice(-1)[0] ?? null;

  const official = events.filter((event) => event.label === 'official').length;
  const health = healthSummary(sources);

  const fresh: FreshEvent[] = events.map((event) => ({
    id: event.id,
    firstSeenAt: event.firstSeenAt,
    lastUpdateAt: event.lastUpdateAt,
  }));

  return (
    <div className="surface reveal rounded-xl px-4 py-3.5">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-mist">
        <span>
          {tr ? 'son 24 saatte' : 'in the last 24h'}{' '}
          <span className="tnum text-chalk">{newIn24h}</span> {tr ? 'yeni olay' : 'new events'}
        </span>
        <span aria-hidden className="text-mist-2">
          ·
        </span>
        <span>
          {tr ? 'en son gelişme' : 'latest development'}{' '}
          <TimeAgo iso={lastEventAt} locale={locale} className="text-chalk" />
        </span>
        <span aria-hidden className="text-mist-2">
          ·
        </span>
        <span>
          {tr ? 'veri' : 'data'}{' '}
          <TimeAgo iso={generatedAt} locale={locale} className="text-chalk" />{' '}
          {tr ? 'güncellendi' : 'updated'}
        </span>
        {official > 0 && (
          <>
            <span aria-hidden className="text-mist-2">
              ·
            </span>
            <span className="text-official">
              {official} {tr ? 'resmî açıklama' : 'official statements'}
            </span>
          </>
        )}
        {health.stale + health.failed > 0 && (
          <>
            <span aria-hidden className="text-mist-2">
              ·
            </span>
            <span className="text-caution">
              {health.stale + health.failed} {tr ? 'kaynakta sorun' : 'sources with issues'}
            </span>
          </>
        )}
      </p>

      <NewSinceLastVisit events={fresh} locale={locale} className="mt-2 text-mist" />
    </div>
  );
}
