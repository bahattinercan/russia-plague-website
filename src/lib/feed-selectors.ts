/**
 * Akış seçicileri — SAF fonksiyonlar.
 *
 * Neden ayrı modül: `data.ts` depo katmanını (pg) içine alır; filtre/arama
 * mantığının sunucuda kalması ve istemci paketine depo kodunun sızmaması gerekir
 * (mevcut kural: `format.ts` ile aynı desen).
 *
 * Neden sunucuda filtreleme: 74 olay + 121 sinyal bugün büyük değil ama feed
 * 450 KB JSON; korpusun tamamını tarayıcıya göndermek yerine filtre sunucuda
 * hesaplanır ve durum URL'de taşınır. Böylece paylaşılabilir bağlantı oluşur ve
 * JS kapalıyken de (GET formu) çalışır.
 *
 * Ayrıntı: docs/arayuz-plani.md §5.2
 */
import type { EventLabel, PlagueEvent } from '@/types';
import { fold } from '@/lib/sources/text';
import { GROUP_LABELS } from '@/lib/sources/registry';

export const TIMELINE_PAGE_SIZE = 20;

const LABELS: EventLabel[] = [
  'official',
  'corroborated',
  'single',
  'unverified',
  'contradicted',
];

export interface TimelineFilters {
  label: EventLabel | 'all';
  group: string;
  tier: number | 'all';
  from: string;
  to: string;
  q: string;
  page: number;
}

export const EMPTY_FILTERS: TimelineFilters = {
  label: 'all',
  group: 'all',
  tier: 'all',
  from: '',
  to: '',
  q: '',
  page: 1,
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? '') : (value ?? '');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Kullanıcı girdisi ASLA doğrudan kullanılmaz: bilinmeyen değerler sessizce
 * "filtresiz"e düşer (hata ekranı yerine tüm akış gösterilir).
 */
export function parseTimelineFilters(params: RawParams): TimelineFilters {
  const labelRaw = first(params.label);
  const tierRaw = first(params.tier);
  const pageRaw = Number.parseInt(first(params.page), 10);

  const from = first(params.from);
  const to = first(params.to);

  return {
    label: (LABELS as string[]).includes(labelRaw) ? (labelRaw as EventLabel) : 'all',
    group: first(params.group).slice(0, 60) || 'all',
    tier:
      Number.isInteger(Number.parseInt(tierRaw, 10)) && Number(tierRaw) >= 1 && Number(tierRaw) <= 5
        ? Number(tierRaw)
        : 'all',
    from: DATE_RE.test(from) ? from : '',
    to: DATE_RE.test(to) ? to : '',
    q: first(params.q).trim().slice(0, 120),
    page: Number.isInteger(pageRaw) && pageRaw >= 1 && pageRaw <= 500 ? pageRaw : 1,
  };
}

export function hasFilters(f: TimelineFilters): boolean {
  return (
    f.label !== 'all' || f.group !== 'all' || f.tier !== 'all' || f.from !== '' || f.to !== '' || f.q !== ''
  );
}

/** Bir olayın arama için taranacak metni (başlık + özet + iddia başlıkları). */
function searchText(event: PlagueEvent): string {
  const parts = [event.title, event.titleOriginal, event.titleTr ?? '', event.summary];
  for (const claim of event.claims) parts.push(claim.title, claim.titleTr ?? '');
  for (const group of event.groups) parts.push(GROUP_LABELS[group] ?? group);
  return fold(parts.filter(Boolean).join(' \n '));
}

/** Tarih filtresi: gün sınırları UTC'de kapsayıcıdır. */
function withinRange(event: PlagueEvent, from: string, to: string): boolean {
  const day = (event.lastUpdateAt || event.firstSeenAt || '').slice(0, 10);
  if (!day) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

/** Kronolojik sıra: en yeni güncelleme üstte (eşitlikte ilk görülme). */
export function sortByRecency(events: PlagueEvent[]): PlagueEvent[] {
  return [...events].sort((a, b) => {
    const byUpdate = (b.lastUpdateAt ?? '').localeCompare(a.lastUpdateAt ?? '');
    if (byUpdate !== 0) return byUpdate;
    return (b.firstSeenAt ?? '').localeCompare(a.firstSeenAt ?? '');
  });
}

export function filterEvents(events: PlagueEvent[], f: TimelineFilters): PlagueEvent[] {
  const needle = f.q ? fold(f.q) : '';
  return sortByRecency(
    events.filter((event) => {
      if (f.label !== 'all' && event.label !== f.label) return false;
      if (f.group !== 'all' && !event.groups.includes(f.group)) return false;
      if (f.tier !== 'all' && !event.claims.some((c) => c.tier === f.tier)) return false;
      if ((f.from || f.to) && !withinRange(event, f.from, f.to)) return false;
      if (needle && !searchText(event).includes(needle)) return false;
      return true;
    }),
  );
}

export interface DayGroup {
  /** ISO gün (YYYY-MM-DD, UTC) — başlık biçimlendirmesi UI'da yapılır. */
  day: string;
  events: PlagueEvent[];
}

export function groupByDay(events: PlagueEvent[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const event of events) {
    const day = (event.lastUpdateAt || event.firstSeenAt || '').slice(0, 10) || '-';
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.events.push(event);
    else groups.push({ day, events: [event] });
  }
  return groups;
}

export function paginate<T>(items: T[], page: number): { visible: T[]; total: number; hasMore: boolean } {
  const total = items.length;
  const visible = items.slice(0, page * TIMELINE_PAGE_SIZE);
  return { visible, total, hasMore: total > visible.length };
}

export interface GroupOption {
  slug: string;
  label: string;
  count: number;
}

/** Filtre menüsü: feed'de GERÇEKTEN geçen gruplar (boş seçenek gösterilmez). */
export function availableGroups(events: PlagueEvent[]): GroupOption[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    for (const group of event.groups) counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([slug, count]) => ({ slug, label: GROUP_LABELS[slug] ?? slug, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function availableTiers(events: PlagueEvent[]): number[] {
  const tiers = new Set<number>();
  for (const event of events) for (const claim of event.claims) tiers.add(claim.tier);
  return [...tiers].sort((a, b) => a - b);
}

/** Filtre durumunu (sayfa hariç) URL sorgu dizesine çevirir. */
export function filterQuery(f: TimelineFilters, extra: Record<string, string | number> = {}): string {
  const params = new URLSearchParams();
  if (f.label !== 'all') params.set('label', f.label);
  if (f.group !== 'all') params.set('group', f.group);
  if (f.tier !== 'all') params.set('tier', String(f.tier));
  if (f.from) params.set('from', f.from);
  if (f.to) params.set('to', f.to);
  if (f.q) params.set('q', f.q);
  for (const [k, v] of Object.entries(extra)) params.set(k, String(v));
  const s = params.toString();
  return s ? `?${s}` : '';
}

/** Etkin filtrelerin insan okunur listesi (çip gösterimi için). */
export function activeFilterChips(
  f: TimelineFilters,
  locale: 'tr' | 'en',
  labelText: (label: EventLabel) => string,
): { key: string; text: string }[] {
  const chips: { key: string; text: string }[] = [];
  if (f.label !== 'all') chips.push({ key: 'label', text: labelText(f.label) });
  if (f.group !== 'all') chips.push({ key: 'group', text: GROUP_LABELS[f.group] ?? f.group });
  if (f.tier !== 'all') chips.push({ key: 'tier', text: `T${f.tier}` });
  if (f.from) chips.push({ key: 'from', text: `${locale === 'tr' ? '≥' : 'from'} ${f.from}` });
  if (f.to) chips.push({ key: 'to', text: `${locale === 'tr' ? '≤' : 'to'} ${f.to}` });
  if (f.q) chips.push({ key: 'q', text: `“${f.q}”` });
  return chips;
}
