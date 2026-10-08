'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getDict, type Locale } from '@/lib/i18n';

/**
 * UTC ↔ yerel saat anahtarı.
 *
 * NASIL ÇALIŞIR: sunucu tüm zaman damgalarını `<time datetime="…">` olarak UTC
 * basar (bkz. `Time.tsx`). Bu bileşen, tercih "yerel" ise sayfadaki TÜM
 * `time[datetime]` metinlerini ziyaretçinin saat dilimine çevirir ve kısa saat
 * dilimi adını ekler (ör. `GMT+3`).
 *
 * NEDEN İSTEMCİDE: yerel saat dilimi sunucu tarafından bilinemez (başlıkta
 * gönderilmez). Sunucuda çevirmek için her zaman damgasının props olarak
 * taşınması gerekirdi; tek noktadan DOM dönüşümü daha az kod ve daha az
 * hata yüzeyi demek.
 *
 * GİZLİLİK: tercih yalnızca `localStorage`'da tutulur; sunucuya gönderilmez.
 */
const KEY = 'pt.timezone';

function zoneLabel(timeZone: string, locale: Locale): string {
  try {
    const parts = new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-GB', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

function apply(mode: 'utc' | 'local', locale: Locale): void {
  const timeZone = mode === 'local' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
  const suffix = mode === 'local' ? zoneLabel(timeZone, locale) : 'UTC';

  for (const el of document.querySelectorAll<HTMLTimeElement>('time[datetime]')) {
    const iso = el.getAttribute('datetime');
    if (!iso) continue;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) continue;

    const base = locale === 'tr' ? 'tr-TR' : 'en-GB';
    const text =
      el.dataset.timeMode === 'day'
        ? new Intl.DateTimeFormat(base, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone,
          }).format(date)
        : `${new Intl.DateTimeFormat(base, {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            timeZone,
          }).format(date)} ${suffix}`;

    el.textContent = text;
  }
}

export function TimeZoneToggle({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const [mode, setMode] = useState<'utc' | 'local'>('utc');
  const pathname = usePathname();

  useEffect(() => {
    let stored: 'utc' | 'local' = 'utc';
    try {
      stored = window.localStorage.getItem(KEY) === 'local' ? 'local' : 'utc';
    } catch {
      /* depo kapalı → UTC kalır */
    }
    setMode(stored);
    apply(stored, locale);
    // `pathname`: istemci tarafı gezinmede yeni sunucu HTML'i geldiğinde
    // damgalar yeniden UTC'ye döner; tercih tekrar uygulanmalı.
  }, [pathname, locale]);

  function toggle(): void {
    const next = mode === 'utc' ? 'local' : 'utc';
    setMode(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* yok sayılır */
    }
    apply(next, locale);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={mode === 'local'}
      title={t.timeZoneHint}
      className="rounded border border-edge bg-abyss/60 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-mist transition-colors hover:border-official/40 hover:text-chalk"
    >
      {mode === 'local' ? t.localTime : t.utc}
    </button>
  );
}
