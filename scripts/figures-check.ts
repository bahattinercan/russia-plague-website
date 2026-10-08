/**
 * Sayısal durum kapıları.
 *
 * Çalıştır:  npm run figures-check
 *
 * İki sınıf kontrol var, önem farkı bilinçli:
 *
 *  A) DOSYA BÜTÜNLÜĞÜ (her zaman HATA): şema, tekillik, yasaklı ifade.
 *     Bunlar veriden bağımsızdır, her ortamda geçmek zorundadır.
 *
 *  B) KAYNAĞA BAĞLILIK (duruma göre): her rakam `phrase` + `sourceName` ile
 *     GERÇEK bir feed kaydına çözülmelidir. Bu kontrol, "var olmayan bir
 *     kaynağa atıf yapılmış" hatasını yakalar — projenin en tehlikeli hata
 *     sınıfı, çünkü ekranda kaynaksız bir sayı olurdu.
 *
 *     Bağ anahtarı `phrase` (kaynağın kendi cümlesi): kendi kendini doğrular ve
 *     olay kimlikleri gibi bayatlamaz. `eventId` yalnızca ipucudur, zorunlu değildir.
 *
 *     Ancak: CI'da veritabanı yoktur ve `backend === 'json'` olduğunda elimizde
 *     BAYAT bir snapshot olur. Bu durumda çözülemeyen kayıt HATA değil UYARI
 *     olarak raporlanır (aksi hâlde CI her seferinde yanlış alarm verirdi).
 *     Postgres'ten okurken çözülemeyen kayıt gerçek bir hatadır.
 */
import { loadFigureDefs, buildFigures, type FigureMetric, type FigureQualifier } from '../src/lib/figures';
import { getFeedSnapshot } from '../src/lib/data';
import { FORBIDDEN_VERIFICATION_PHRASES } from '../src/lib/trust';

let failures = 0;
let warnings = 0;

function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

function warn(name: string, detail = ''): void {
  console.log(`WARN  ${name}${detail ? `  (${detail})` : ''}`);
  warnings++;
}

function containsPhrase(haystack: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, 'u').test(haystack);
}

const METRICS: FigureMetric[] = ['cases', 'deaths', 'restricted'];
const QUALIFIERS: FigureQualifier[] = ['exact', 'about', 'nearly', 'at-least', 'more-than'];

const file = await loadFigureDefs();

console.log('\n── A) Dosya bütünlüğü ───────────────────────────────────────────');
check('figures.json okunabildi', file.figures.length > 0, `${file.figures.length} kayıt`);

const ids = new Set<string>();
for (const figure of file.figures) {
  const id = figure.id;
  check(`[${id}] id tekil`, !ids.has(id));
  ids.add(id);

  check(`[${id}] metrik geçerli`, METRICS.includes(figure.metric), figure.metric);
  check(`[${id}] belirsizlik katsayısı geçerli`, QUALIFIERS.includes(figure.qualifier), figure.qualifier);
  /*
   * `cases` için 0 GEÇERLİ — gerekçe `data/figures.json` _readme ve
   * docs/harita-plani.md §4: salgın raporlamasında “vaka tespit edilmedi”
   * gerçek bir BULGUDUR (08 Eki 2026: Reuters + TASS). 0'ı yasaklamak resmî
   * reddi ya gizlemeyi ya da olmayan bir sayıyı varmış gibi göstermeyi
   * zorlardı. Ölüm ve kısıtlama için eşik `> 0` KALIR: orada 0 kayıt,
   * bağlanmamış/boş bir satır anlamına gelirdi.
   */
  const minValue = figure.metric === 'cases' ? 0 : 1;
  check(
    `[${id}] değer tam sayı ve ${minValue === 0 ? 'negatif değil' : 'pozitif'}`,
    Number.isInteger(figure.value) && figure.value >= minValue,
    String(figure.value),
  );
  check(`[${id}] kaynak adı dolu`, figure.sourceName.trim().length > 0);
  check(
    `[${id}] olay kimliği ipucu (varsa) dolu`,
    figure.eventId === undefined || figure.eventId.trim().length > 0,
    figure.eventId ? 'ipucu var' : 'ipucu yok',
  );
  check(`[${id}] atıf cümlesi dolu`, figure.phrase.trim().length > 4);
  check(
    `[${id}] atıf cümlesi bağ anahtarı olacak uzunlukta`,
    figure.phrase.trim().length >= 16,
    `${figure.phrase.trim().length} karakter`,
  );
  check(
    `[${id}] atıf cümlesi bir başlık/alıntı boyutunda`,
    figure.phrase.length <= 300,
    `${figure.phrase.length} karakter`,
  );

  // §13.5 mutlak kural: atıf cümlesi de yasaklı ifade içeremez.
  const haystack = figure.phrase.toLocaleLowerCase('tr');
  for (const forbidden of FORBIDDEN_VERIFICATION_PHRASES) {
    if (containsPhrase(haystack, forbidden)) {
      check(`[${id}] atıf cümlesi yasaklı ifade içermiyor`, false, forbidden);
    }
  }

  if (figure.metric === 'restricted') {
    check(
      `[${id}] kısıtlama ölçüsü etiketli`,
      Boolean(figure.measureTr?.trim()) && Boolean(figure.measureEn?.trim()),
    );
  }
}

console.log('\n── B) Kaynağa bağlılık (feed) ───────────────────────────────────');
const { feed, backend } = await getFeedSnapshot();
console.log(`BİLGİ  feed: ${feed.events.length} olay · backend: ${backend}`);

const snapshot = await buildFigures(feed.events);

if (snapshot.unresolved.length === 0) {
  check('tüm rakamlar gerçek bir kaynak kaydına çözüldü', true, `${file.figures.length} kayıt`);
} else if (backend === 'postgres') {
  check(
    'tüm rakamlar gerçek bir kaynak kaydına çözüldü',
    false,
    `çözülemeyen: ${snapshot.unresolved.map((f) => `${f.id}(${f.sourceName})`).join(', ')}`,
  );
} else {
  warn(
    'bazı rakamlar bu feed icinde bulunamadı — JSON yedeği bayat olabilir, HATA sayılmadı',
    `çözülemeyen: ${snapshot.unresolved.map((f) => f.id).join(', ')}`,
  );
}

console.log('\n── Özet ─────────────────────────────────────────────────────────');
for (const group of snapshot.groups) {
  const values = group.distinctValues.length > 0 ? group.distinctValues.join('/') : '—';
  console.log(
    `BİLGİ  ${group.metric.padEnd(11)} değer: ${values.padEnd(8)} kaynak: ${String(group.figures.length).padEnd(2)} bağımsız grup: ${group.independentGroups}${group.disagreement ? '  ⚑ farklı ifade' : ''}`,
  );
}
if (snapshot.groups.some((g) => g.figures.length === 0)) {
  console.log(
    'BİLGİ  bir ölçüt için rakam yok → panel bunu "bildirilen rakam yok" olarak gösterir (boş bırakmaz)',
  );
}

console.log(
  `\n${failures === 0 ? '✔ SAYISAL DURUM KAPILARI GEÇTİ' : `✖ ${failures} TEST BAŞARISIZ`}${warnings > 0 ? ` · ${warnings} uyarı` : ''}\n`,
);
process.exit(failures === 0 ? 0 : 1);
