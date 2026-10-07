import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Bağımlılıksız .env okuyucu (dotenv yok).
 *
 * İki format desteklenir:
 *   1) DATABASE_URL=postgresql://...
 *   2) postgresql://...  (tek satır, ham connection string)
 *
 * Next.js `.env.local`'ı otomatik yükler; ama ham connection string
 * satırı anahtarlı olmadığı için burada da normalize ediyoruz.
 * Amaç: `npm run ingest` (CLI) ve Next.js server'ı aynı ortamı görsün.
 */

const ENV_FILES = ['.env.local', '.env'];

export function loadLocalEnv(): void {
  for (const file of ENV_FILES) {
    const p = path.join(process.cwd(), file);
    if (!existsSync(p)) continue;

    let raw: string;
    try {
      raw = readFileSync(p, 'utf8');
    } catch {
      continue;
    }

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (/^(postgres|postgresql):\/\//.test(trimmed)) {
        // Ham connection string — DATABASE_URL yoksa doldur.
        if (!process.env.DATABASE_URL) process.env.DATABASE_URL = trimmed;
        continue;
      }

      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

/** Postgres deposu kullanılacak mı? */
export function hasDatabase(): boolean {
  loadLocalEnv();
  const url = process.env.DATABASE_URL;
  return typeof url === 'string' && /^(postgres|postgresql):\/\//.test(url);
}

/** Loglarda şifre görünmemesi için maskelenmiş connection string. */
export function maskedDbUrl(): string {
  const url = process.env.DATABASE_URL ?? '';
  return url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
}
