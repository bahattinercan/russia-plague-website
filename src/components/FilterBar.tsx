import type { EventLabel } from '@/types';
import { LABEL_TEXT_I18N, getDict, type Locale } from '@/lib/i18n';
import {
  activeFilterChips,
  hasFilters,
  type GroupOption,
  type TimelineFilters,
} from '@/lib/feed-selectors';

const LABELS: EventLabel[] = [
  'official',
  'corroborated',
  'single',
  'unverified',
  'contradicted',
];

/**
 * Filtre çubuğu — JS'SİZ ÇALIŞIR.
 *
 * Neden `<form method="get">`: durum URL'de taşınır (paylaşılabilir bağlantı),
 * geri/ileri tuşları doğal çalışır ve JS kapalıyken de filtre uygulanır
 * (docs/arayuz-plani.md §3, §5.2). Sunucu tarafında filtreleme yapıldığı için
 * 450 KB'lık feed istemciye gönderilmez.
 *
 * Sunucu bileşeni: hiç istemci JS'i yok.
 */
export function FilterBar({
  locale,
  filters,
  groups,
  tiers,
}: {
  locale: Locale;
  filters: TimelineFilters;
  groups: GroupOption[];
  tiers: number[];
}) {
  const t = getDict(locale);
  const chips = activeFilterChips(filters, locale, (label) => LABEL_TEXT_I18N[label][locale]);

  return (
    <section aria-label={t.filters} className="surface reveal rounded-xl p-4 sm:p-5">
      <form
        method="get"
        action={`/${locale}/timeline`}
        className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end lg:gap-2.5"
      >
        <div className="lg:w-[9.5rem] lg:shrink-0">
          <label className="field-label" htmlFor="f-label">
            {t.filterLabel}
          </label>
          <select id="f-label" name="label" defaultValue={filters.label} className="field w-full">
            <option value="all">{t.all}</option>
            {LABELS.map((label) => (
              <option key={label} value={label}>
                {LABEL_TEXT_I18N[label][locale]}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:w-[11rem] lg:shrink-0">
          <label className="field-label" htmlFor="f-group">
            {t.filterGroup}
          </label>
          <select id="f-group" name="group" defaultValue={filters.group} className="field w-full">
            <option value="all">{t.all}</option>
            {groups.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.label} ({g.count})
              </option>
            ))}
          </select>
        </div>

        <div className="lg:w-[5.5rem] lg:shrink-0">
          <label className="field-label" htmlFor="f-tier">
            {t.filterTier}
          </label>
          <select id="f-tier" name="tier" defaultValue={String(filters.tier)} className="field w-full">
            <option value="all">{t.all}</option>
            {tiers.map((tier) => (
              <option key={tier} value={tier}>
                T{tier}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:w-[9rem] lg:shrink-0">
          <label className="field-label" htmlFor="f-from">
            {t.filterFrom}
          </label>
          <input
            id="f-from"
            type="date"
            name="from"
            defaultValue={filters.from}
            className="field w-full"
          />
        </div>

        <div className="lg:w-[9rem] lg:shrink-0">
          <label className="field-label" htmlFor="f-to">
            {t.filterTo}
          </label>
          <input id="f-to" type="date" name="to" defaultValue={filters.to} className="field w-full" />
        </div>

        <div className="sm:col-span-2 lg:min-w-[12rem] lg:flex-1">
          <label className="field-label" htmlFor="f-q">
            {t.search}
          </label>
          <input
            id="f-q"
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder={t.searchPlaceholder}
            className="field w-full"
          />
        </div>

        <div className="flex items-end gap-2 sm:col-span-2 lg:shrink-0">
          <button
            type="submit"
            title={t.apply}
            aria-label={t.apply}
            className="field flex h-[34px] w-[38px] cursor-pointer items-center justify-center border-official/40 px-0 text-official hover:border-official"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              className="h-[15px] w-[15px]"
            >
              <circle cx="6.75" cy="6.75" r="4.25" />
              <path d="M10 10l3.5 3.5" />
            </svg>
            <span className="sr-only">{t.apply}</span>
          </button>
          {hasFilters(filters) && (
            <a
              href={`/${locale}/timeline`}
              title={t.clear}
              aria-label={t.clear}
              className="field flex h-[34px] w-[34px] items-center justify-center px-0 text-mist-2 hover:text-chalk"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                className="h-[13px] w-[13px]"
              >
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
              <span className="sr-only">{t.clear}</span>
            </a>
          )}
        </div>
      </form>

      {chips.length > 0 && (
        <ul className="mt-3 flex flex-wrap items-center gap-1.5">
          <li className="font-mono text-[11px] uppercase tracking-wider text-mist-2">
            {t.activeFilters}:
          </li>
          {chips.map((chip) => (
            <li
              key={chip.key}
              className="rounded border border-edge-soft bg-panel-2 px-2 py-0.5 font-mono text-[11px] text-mist"
            >
              {chip.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
