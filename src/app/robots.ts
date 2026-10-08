import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

/**
 * robots.txt — sitemap adresi mutlak olmak zorunda olduğu için istek
 * başlıklarından türetilir (gerekçe: sitemap.ts).
 *
 * Kural: site kamuya açık ve taranabilir olmalı (şeffaflık ilkesi). Yalnızca
 * Next.js iç yolları dışlanır; ayrıca `/_next/` altındaki derleme varlıkları.
 */
export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? `${proto}://${host}`;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
