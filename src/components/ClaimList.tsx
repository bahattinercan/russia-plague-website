import type { PlagueEvent } from '@/types';
import { Time } from './Time';
import { getDict, type Locale } from '@/lib/i18n';
import { GROUP_LABELS } from '@/lib/sources/registry';
import { formatDate } from '@/lib/format';
import { claimRows } from '@/lib/event-detail';

/**
 * İddia listesi — modal ve `/event/<slug>` sayfası AYNI bileşeni kullanır.
 *
 * İstemci bağımlılığı yok (hook yok), bu yüzden hem sunucu sayfasında hem
 * istemci modalında çalışır.
 *
 * Her satırda: tier · kaynak · bağımsızlık grubu · yayın zamanı · kaynağın
 * başlığı · kaynağın KENDİ 1–2 cümlelik özeti · canlı bağlantı · arşiv.
 * Telif kuralı (≤2 cümle) `claimRows` içinde uygulanır.
 */
export function ClaimList({ event, locale }: { event: PlagueEvent; locale: Locale }) {
  const t = getDict(locale);
  const rows = claimRows(event, locale);

  return (
    <ul className="mt-4 space-y-4">
      {rows.map((row) => (
        <li key={row.key} className="border-l-2 border-edge pl-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-official">
              T{row.tier}
            </span>
            <span className="text-[13px] font-medium text-chalk">{row.sourceName}</span>
            <span className="font-mono text-[11px] text-mist-2">
              {GROUP_LABELS[row.group] ?? row.group}
            </span>
            <span className="font-mono text-[11px] text-mist-2">
              <Time iso={row.publishedAt} locale={locale} />
            </span>
          </div>

          <p className="mt-1 text-[12.5px] leading-snug text-mist">{row.title}</p>

          {row.sourceSummary && (
            <p className="mt-1.5 border-l-2 border-edge-soft pl-2.5 text-[12px] leading-relaxed text-mist">
              <span className="label">{t.sourceSummary}: </span>
              {row.sourceSummary}
            </p>
          )}

          {row.href && (
            <a
              href={row.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="link-underline mt-1 inline-block font-mono text-[11px] text-official"
            >
              {t.readAtSource} ↗
            </a>
          )}
          {row.archiveHref && (
            <a
              href={row.archiveHref}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="link-underline ml-2 mt-1 inline-block font-mono text-[11px] text-mist-2"
            >
              {t.archive} ↗
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
