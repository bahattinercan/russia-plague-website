import { getDict, type Locale } from '@/lib/i18n';

/**
 * Makine çevirisi etiketi.
 *
 * Editoryal kural (docs/PLAN.md §10): çevrilmiş her metin "makine çevirisi"
 * olarak işaretlenir ve orijinali erişilebilir kalır. `compact` mod dar
 * alanlarda (akan şerit) "MT" kısaltmasını gösterir.
 */
export function MachineTranslatedBadge({
  locale,
  compact = false,
}: {
  locale: Locale;
  compact?: boolean;
}) {
  const t = getDict(locale);
  return (
    <span
      className="font-mono text-[9px] uppercase tracking-wider text-caution/80"
      title={t.machineTranslated}
    >
      {compact ? 'MT' : t.machineTranslated}
    </span>
  );
}
