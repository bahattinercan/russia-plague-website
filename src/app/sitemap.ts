import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getFeedSnapshot } from '@/lib/data';
import { aggregateLocations } from '@/lib/geo/location';

/**
 * Site haritası.
 *
 * NEDEN `headers()`: mutlak URL gerekir ama projede sabit alan adı tanımlı değil
 * (`NEXT_PUBLIC_SITE_URL` yok). İstek başlıklarından türetmek, preview
 * deployment'larda da doğru adresi üretir ve yanlış alan adını koda gömmeyi
 * önler. `headers()` kullanımı rotayı **dinamik** yapar — istenen davranış:
 * derleme anında `data/feed.json` anlık görüntüsüne donmaz
 * (docs/arayuz-plani.md §9.3).
 *
 * Kapsam kararları:
 *   - `/signals` dâhil edilir ama düşük öncelikle: sayfa doğrulanmamış iddiaları
 *     taşır, etiketi görünür durur. Gizlemek yerine düşük öncelik veriyoruz.
 *   - Olay sayfaları: `label` ne olursa olsun dâhil edilir (etiket sayfada
 *     en üstte görünür; gizlemek "sansür" gibi okunurdu).
 */
export const dynamic = 'force-dynamic';

const LOCALES = ['tr', 'en'] as const;

async function baseUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await baseUrl();
  const { feed } = await getFeedSnapshot();
  const coverage = aggregateLocations(feed.events);

  const staticRoutes: { path: string; priority: number; changeFrequency: 'hourly' | 'daily' | 'weekly' }[] = [
    { path: '', priority: 1, changeFrequency: 'hourly' },
    { path: '/timeline', priority: 0.9, changeFrequency: 'hourly' },
    { path: '/figures', priority: 0.8, changeFrequency: 'daily' },
    { path: '/locations', priority: 0.7, changeFrequency: 'daily' },
    { path: '/sources', priority: 0.6, changeFrequency: 'hourly' },
    { path: '/signals', priority: 0.3, changeFrequency: 'daily' },
    { path: '/methodology', priority: 0.5, changeFrequency: 'weekly' },
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const route of staticRoutes) {
      entries.push({
        url: `${base}/${locale}${route.path}`,
        lastModified: feed.generatedAt,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      });
    }

    for (const event of feed.events) {
      entries.push({
        url: `${base}/${locale}/event/${encodeURIComponent(event.slug)}`,
        lastModified: event.lastUpdateAt,
        changeFrequency: 'daily',
        priority: event.label === 'corroborated' ? 0.7 : 0.5,
      });
    }

    for (const region of coverage.aggregates) {
      entries.push({
        url: `${base}/${locale}/locations/${encodeURIComponent(region.slug)}`,
        lastModified: feed.generatedAt,
        changeFrequency: 'daily',
        priority: 0.4,
      });
    }
  }

  return entries;
}
