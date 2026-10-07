import type { Metadata } from 'next';
import { getFeedSnapshot, healthSummary, formatDate } from '@/lib/data';
import {
  DEFAULT_LOCALE,
  LABEL_TEXT_I18N,
  getDict,
  isLocale,
  type Locale,
} from '@/lib/i18n';
import { GROUP_LABELS, SOURCES } from '@/lib/sources/registry';
import { StatusBar } from '@/components/StatusBar';
import { Disclaimer, Footer } from '@/components/Disclaimer';
import { LabelBadge } from '@/components/LabelBadge';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = getDict(locale);
  return { title: t.methodology, description: t.methodologyHint };
}

const LABELS = ['official', 'corroborated', 'single', 'unverified', 'contradicted'] as const;

export default async function MethodologyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const t = getDict(locale);
  const { feed, backend } = await getFeedSnapshot();
  const health = healthSummary(feed.report.sources);

  const tr = locale === 'tr';
  const groups = [...new Set(SOURCES.map((s) => s.group))];

  return (
    <>
      <StatusBar
        locale={locale}
        generatedAt={feed.generatedAt}
        sources={feed.report.sources}
        events={feed.events}
        signals={feed.signals.length}
        backend={backend}
      />

      <main className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
        <a
          href={`/${locale}`}
          className="link-underline font-mono text-[10.5px] uppercase tracking-wider text-mist/70"
        >
          ← {tr ? 'Panoya dön' : 'Back to board'}
        </a>

        <h1 className="reveal mt-5 text-[30px] font-semibold tracking-tight text-chalk">
          {t.methodology}
        </h1>
        <p className="reveal mt-3 text-[14.5px] leading-relaxed text-mist">
          {tr
            ? 'Bu sayfa, sitenin ne yaptığını ve daha önemlisi ne YAPMADIĞINI açıklar. Güven, iddiadan değil şeffaflıktan gelir.'
            : 'This page explains what the site does — and more importantly, what it does NOT do. Trust comes from transparency, not claims.'}
        </p>

        {/* ── 1. Temel kural ─────────────────────────────────────────── */}
        <section className="reveal mt-10">
          <h2 className="text-[19px] font-semibold tracking-tight text-chalk">
            1. {tr ? 'Sistem “doğrulandı” demez' : 'The system never says “confirmed”'}
          </h2>
          <p className="mt-3 text-[13.5px] leading-relaxed text-mist">
            {tr
              ? 'Tam otomatik bir sistem doğrulama iddia edemez. Bu site yalnızca hangi kaynağın ne bildirdiğini raporlar. En yüksek etiket “çoklu bağımsız kaynak bildiriyor”dur. Sitede “doğrulandı”, “teyit edildi”, “confirmed” veya “verified” ifadeleri hiçbir dilde geçmez.'
              : 'A fully automated system cannot claim verification. This site only reports which source said what. The highest label is “reported by multiple independent sources”. The words “confirmed” or “verified” never appear on this site in any language.'}
          </p>
        </section>

        {/* ── 2. Etiketler ───────────────────────────────────────────── */}
        <section className="reveal mt-10">
          <h2 className="text-[19px] font-semibold tracking-tight text-chalk">
            2. {tr ? 'Etiketler ve anlamları' : 'Labels and their meanings'}
          </h2>
          <ul className="mt-4 space-y-3">
            {LABELS.map((label) => (
              <li key={label} className="surface-soft rounded-lg p-3.5">
                <LabelBadge label={label} locale={locale} />
                <p className="mt-2 text-[12.5px] leading-relaxed text-mist">
                  {tr ? LABEL_DESC_TR[label] : LABEL_DESC_EN[label]}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 3. Bağımsızlık grupları ────────────────────────────────── */}
        <section className="reveal mt-10">
          <h2 className="text-[19px] font-semibold tracking-tight text-chalk">
            3. {tr ? 'Bağımsızlık grupları — en kritik kural' : 'Independence groups — the most important rule'}
          </h2>
          <p className="mt-3 text-[13.5px] leading-relaxed text-mist">
            {tr
              ? 'Aynı sahiplik çatısındaki kaynaklar TEK kaynak sayılır. TASS, RIA, RT ve Sputnik aynı haberi yazsa bile bağımsız kaynak sayısı 1’dir. Bu, “tek kaynağı çok kaynak gibi gösterme” riskine karşı temel korumadır.'
              : 'Sources under the same ownership umbrella count as ONE source. If TASS, RIA, RT and Sputnik all publish the same story, the independent source count is 1. This is the core protection against “showing one source as many”.'}
          </p>
          <div className="surface mt-4 rounded-lg p-4">
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-mist/70">
              {tr ? 'Kullanılan gruplar' : 'Groups in use'}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {groups.map((g) => (
                <span
                  key={g}
                  className="rounded border border-edge-soft bg-abyss/60 px-2 py-0.5 font-mono text-[10px] text-mist/85"
                >
                  {GROUP_LABELS[g] ?? g}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. Güven puanı ─────────────────────────────────────────── */}
        <section className="reveal mt-10">
          <h2 className="text-[19px] font-semibold tracking-tight text-chalk">
            4. {tr ? 'Güven puanı nasıl hesaplanır?' : 'How is the trust score computed?'}
          </h2>
          <pre className="surface mt-3 overflow-x-auto rounded-lg p-4 font-mono text-[11.5px] leading-relaxed text-mist">
{`trust = tier_base
      + min(independent_group_count - 1, 4) * 6
      + state_control_penalty     // kremlin: -8, ru-gov: -5`}
          </pre>
          <p className="mt-3 text-[13px] leading-relaxed text-mist">
            {tr
              ? 'Puanlar ELLE belirlenir ve sürümlenir; otomatik öğrenilmez. Puan UI’da rakam olarak gösterilmez (yanlış kesinlik hissi vermemek için) — katman (T1–T5) ve kaynak adı gösterilir.'
              : 'Scores are set MANUALLY and versioned; nothing is learned automatically. Scores are not shown as numbers in the UI (to avoid a false sense of precision) — tier (T1–T5) and source name are shown instead.'}
          </p>
        </section>

        {/* ── 5. Sınırlar ────────────────────────────────────────────── */}
        <section className="reveal mt-10">
          <h2 className="text-[19px] font-semibold tracking-tight text-chalk">
            5. {tr ? 'Sınırlar ve bilinen zayıflıklar' : 'Limits and known weaknesses'}
          </h2>
          <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-mist">
            {(tr ? LIMITS_TR : LIMITS_EN).map((line) => (
              <li key={line} className="flex gap-2.5">
                <span aria-hidden className="text-mist/50">
                  —
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 6. Kaynaklar ───────────────────────────────────────────── */}
        <section className="reveal mt-10">
          <h2 className="text-[19px] font-semibold tracking-tight text-chalk">
            6. {tr ? 'Taranan kaynaklar' : 'Sources being monitored'}
          </h2>
          <p className="mt-3 text-[13px] text-mist">
            {health.total} {t.sources} · {health.healthy} {t.ok}
            {health.stale > 0 && ` · ${health.stale} ${t.stale}`}
            {health.failed > 0 && ` · ${health.failed} ${t.failed}`}
          </p>
          <div className="surface mt-4 overflow-hidden rounded-lg">
            <ul className="divide-y divide-edge-soft">
              {SOURCES.map((s) => (
                <li key={s.slug} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5">
                  <span className="font-mono text-[10.5px] text-official/80">T{s.tier}</span>
                  <span className="text-[12.5px] text-chalk/95">{s.name}</span>
                  <span className="font-mono text-[10px] text-mist/70">
                    {GROUP_LABELS[s.group] ?? s.group}
                  </span>
                  {s.notes && (
                    <span className="w-full text-[11px] leading-relaxed text-mist/65">
                      {s.notes}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── 7. Tazelik ─────────────────────────────────────────────── */}
        <section className="reveal mt-10">
          <h2 className="text-[19px] font-semibold tracking-tight text-chalk">
            7. {t.dataFreshness}
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-mist">
            {tr
              ? 'Veri 5–10 dakikalık aralıklarla yenilenir. Bayat feed’ler tespit edilir: bir kaynak yanıt veriyor ama içeriği eskiyse “BAYAT” olarak işaretlenir ve panelde görünür.'
              : 'Data refreshes every 5–10 minutes. Stale feeds are detected: if a source responds but its content is old, it is flagged as “STALE” and shown in the panel.'}
          </p>
          <p className="mt-2 font-mono text-[10.5px] uppercase tracking-wider text-mist/60">
            {t.lastScan}: {formatDate(feed.generatedAt, locale)} UTC
          </p>
        </section>

        <div className="mt-12">
          <Disclaimer locale={locale} />
        </div>
      </main>

      <Footer locale={locale} />
    </>
  );
}

const LABEL_DESC_TR: Record<string, string> = {
  official:
    'WHO, CDC, ECDC veya bir devlet kurumu tarafından yapılan resmî açıklama. Araştırma merkezleri (CIDRAP, ProMED) bu kategoriye girmez — onlar bağımsız kuruluşlardır.',
  corroborated:
    'Aynı olayı 2 veya daha fazla BAĞIMSIZ kaynak grubu bildirdi. “Doğrulandı” demek değildir; “birçok bağımsız kaynak aynı şeyi bildiriyor” demektir.',
  single: 'Yalnızca tek bir bağımsızlık grubu bildirdi. Doğru olabilir ama henüz bağımsız teyit yok.',
  unverified:
    'Telegram kanalları veya kayıt dışı yayıncılardan gelen iddia. Ana akışta haber olarak sayılmaz.',
  contradicted:
    'Aynı olay için karşıt iddialar var (örn. resmî makam “yok” derken bağımsız kaynaklar “şüpheli vaka” bildiriyor). Bu karşılaştırma deneyseldir.',
};

const LABEL_DESC_EN: Record<string, string> = {
  official:
    'A formal statement by WHO, CDC, ECDC or a government body. Research centres (CIDRAP, ProMED) do not qualify — they are independent organisations.',
  corroborated:
    'Two or more INDEPENDENT source groups reported the same event. This does not mean “confirmed”; it means “many independent sources report the same thing”.',
  single: 'Only one independence group reported it. It may be true, but there is no independent corroboration yet.',
  unverified:
    'A claim from Telegram channels or unregistered publishers. Not counted as news in the main feed.',
  contradicted:
    'Conflicting claims about the same event (e.g. officials say “none” while independent sources report a “suspected case”). This comparison is experimental.',
};

const LIMITS_TR = [
  'Olay kümeleme başlık ve özet benzerliğine dayanır; farklı dillerdeki aynı olay bazen ayrı kümelenebilir.',
  'Çelişki tespiti deneyseldir ve iddia düzeyinde kalibre edilmektedir; şu an muhafazakâr davranır ve yanlış pozitif üretmemek için çoğu durumda susar.',
  'Çeviri yapılırsa makine çevirisidir; orijinal başlık her zaman gösterilir.',
  'Bazı kaynaklar (Rospotrebnadzor, Novaya Gazeta Europe) doğrudan erişilemediği için toplayıcı üzerinden alınır.',
  'Kaynak güven puanları editoryal kararlardır; sürüm değişiklikleri şeffaf biçimde kaydedilir.',
  'Sistem yalnızca İngilizce, Türkçe ve Rusça metinlerde anahtar kelime taraması yapar; diğer dillerdeki içerik kaçabilir.',
];

const LIMITS_EN = [
  'Event clustering relies on headline and summary similarity; the same event in different languages may sometimes cluster separately.',
  'Contradiction detection is experimental and being calibrated at the claim level; it is currently conservative and stays silent rather than risk false positives.',
  'Any translation is machine translation; the original headline is always shown.',
  'Some sources (Rospotrebnadzor, Novaya Gazeta Europe) are unreachable directly and are fetched via an aggregator.',
  'Source trust scores are editorial decisions; version changes are recorded transparently.',
  'Keyword scanning covers English, Turkish and Russian only; content in other languages may be missed.',
];
