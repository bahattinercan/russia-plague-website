import type { SourceHealth } from '@/types';

/**
 * Kaynak sağlığı özeti — SAF fonksiyon (fs/DB/ağ yok).
 *
 * Neden ayrı modül: bu özeti UI bileşenleri kullanıyor. `data.ts` depo
 * katmanını (`storage/store` → Neon/pg) içerdiği için, bir bileşen oradan
 * import ederse pg istemci paketine sızabilir. Proje kuralı: bileşenler
 * `@/lib/format` gibi SAF modülleri kullanır.
 *
 * `data.ts` bunu geriye dönük olarak yeniden dışa aktarır (sunucu sayfaları
 * tek yerden import etmeye devam edebilsin diye).
 */
export function healthSummary(sources: SourceHealth[]) {
  return {
    total: sources.length,
    healthy: sources.filter((s) => s.ok && !s.stale).length,
    stale: sources.filter((s) => s.ok && s.stale).length,
    failed: sources.filter((s) => !s.ok).length,
  };
}
