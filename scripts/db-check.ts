/**
 * Postgres bağlantısını ve şemasını doğrular.
 *
 *   npm run db:check
 *
 * Çıktı: bağlantı durumu, tablo satır sayıları, son ingest zamanı.
 * DATABASE_URL yoksa JSON deposunun durumunu raporlar (fail-safe yolu).
 */
import { hasDatabase, maskedDbUrl } from '@/lib/env';
import { readFeed } from '@/lib/storage/json';
import { lastIngestAt, pingDatabase } from '@/lib/storage/postgres';

async function main(): Promise<void> {
  if (!hasDatabase()) {
    console.log('DATABASE_URL tanımlı değil → JSON deposu kullanılıyor.');
    const feed = await readFeed();
    console.log(
      feed
        ? `data/feed.json ok: ${feed.events.length} olay, son tarama ${feed.generatedAt}`
        : 'data/feed.json yok veya okunamadı.',
    );
    return;
  }

  console.log(`Bağlantı: ${maskedDbUrl()}`);
  const ping = await pingDatabase();
  if (!ping.ok) {
    console.error(`✖ Postgres bağlantısı başarısız: ${ping.detail}`);
    process.exitCode = 1;
    return;
  }

  console.log(`✔ Postgres erişilebilir — ${ping.detail}`);
  const last = await lastIngestAt();
  console.log(`Son ingest: ${last ?? 'henüz kayıt yok'}`);
}

main().catch((err) => {
  console.error('✖ db:check başarısız:', err);
  process.exit(1);
});
