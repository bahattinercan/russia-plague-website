'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';

function absolute(iso: string | null, locale: Locale): string {
  if (!iso) return '-';
  return new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

function relative(iso: string | null, locale: Locale): string {
  if (!iso) return locale === 'tr' ? 'tarih yok' : 'no date';
  const diff = Date.now() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat(locale === 'tr' ? 'tr' : 'en', {
    numeric: 'auto',
  });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ];
  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms) return rtf.format(-Math.round(diff / ms), unit);
  }
  return rtf.format(0, 'minute');
}

/**
 * İlk render'da mutlak tarih (sunucuyla aynı), bağlandıktan sonra göreli
 * zaman. Böylece hydration uyuşmazlığı olmaz ama kullanıcı "12 dk önce" görür.
 */
export function TimeAgo({
  iso,
  locale,
  className,
}: {
  iso: string | null;
  locale: Locale;
  className?: string;
}) {
  const [text, setText] = useState(() => absolute(iso, locale));

  useEffect(() => {
    const update = () => setText(relative(iso, locale));
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, [iso, locale]);

  return (
    <span className={className} title={absolute(iso, locale)}>
      {text}
    </span>
  );
}
