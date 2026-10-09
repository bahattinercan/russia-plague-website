import { formatDate, formatDay } from '@/lib/format';
import type { Locale } from '@/lib/i18n';

/**
 * Zaman damgası — sunucuda UTC basar, `TimeZoneToggle` istemcide yerel saate
 * çevirebilir.
 *
 * NEDEN `<time datetime>`: yerel saat dönüşümü için tarihin makine okunur
 * hâli DOM'da durmalı. Böylece dönüşümü tek bir istemci bileşeni
 * (`TimeZoneToggle`) bütün sayfa için yapabilir; her zaman damgasına ayrı ayrı
 * istemci kodu eklemek gerekmez.
 *
 * VARSAYILAN UTC: izleme panosunda zaman dilimi belirsizliği bilgi kaybıdır;
 * bu yüzden sunucu çıktısı her zaman UTC ve "UTC" etiketi görünür kalır.
 */
export function Time({
  iso,
  locale,
  mode = 'datetime',
  className,
}: {
  iso: string | null;
  locale: Locale;
  /** `day` → yalnızca gün (tarih grubu başlıkları). */
  mode?: 'datetime' | 'day';
  className?: string;
}) {
  if (!iso) return <span className={className}>-</span>;

  return (
    <time dateTime={iso} data-time-mode={mode} className={className} title={iso}>
      {mode === 'day' ? formatDay(iso, locale) : `${formatDate(iso, locale)} UTC`}
    </time>
  );
}
