import { getDict, type Locale } from '@/lib/i18n';

/** Sağlık krizi içeriğinde bağlam uyarısı — her sayfada erişilebilir olmalı. */
export function Disclaimer({ locale }: { locale: Locale }) {
  const t = getDict(locale);

  return (
    <aside className="reveal rounded-xl border border-caution/30 bg-caution/[0.06] p-4">
      <div className="flex gap-3">
        <span aria-hidden className="text-caution">
          ⚠
        </span>
        <div>
          <p className="text-[12.5px] font-semibold text-caution">
            {locale === 'tr' ? 'Bu site ne değildir' : 'What this site is not'}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-mist">{t.disclaimerLong}</p>
        </div>
      </div>
    </aside>
  );
}

export function Footer({ locale }: { locale: Locale }) {
  const t = getDict(locale);

  return (
    <footer className="mt-16 border-t border-edge bg-abyss/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[13px] font-semibold text-chalk">{t.siteName}</p>
          <p className="mt-0.5 text-[11.5px] text-mist-2">{t.tagline}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-mist-2">
          <a
            href={`/${locale}/methodology`}
            className="link-underline transition-colors hover:text-chalk"
          >
            {t.methodology}
          </a>
          <a
            href="https://github.com/bahattinercan/russia-plague-website"
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline transition-colors hover:text-chalk"
          >
            GitHub ↗
          </a>
          <span className="text-mist-2">
            {locale === 'tr' ? 'Kaynak kod açık, güven puanları şeffaf' : 'Open source, transparent trust scores'}
          </span>
        </div>
      </div>

      <div className="border-t border-edge-soft px-4 py-3 sm:px-6">
        <p className="mx-auto max-w-6xl text-[11px] leading-relaxed text-mist-2">
          {t.disclaimerShort}{' '}
          {locale === 'tr'
            ? 'Başlıklar ve kısa alıntılar ilgili yayıncıların telifine tabidir; tam metin kopyalanmaz.'
            : 'Headlines and short excerpts remain the copyright of their publishers; full text is never copied.'}
        </p>
      </div>
    </footer>
  );
}
