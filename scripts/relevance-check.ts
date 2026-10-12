/**
 * İlgililik filtresi regresyon testleri.
 *
 * Çalıştır:  npm run relevance-check
 *
 * Neden gerekli: akıştaki TÜM genel haber kaynakları (BBC World, Guardian,
 * Euronews, The Moscow Times, Meduza…) bu tek kapıdan geçer. Filtre ne kadar
 * gevşekse o kadar konu dışı haber olay/iddia üretir; ne kadar sıkıysa gerçek
 * veba haberleri kaybolur. İkisi de sitenin güvenilirliğini bozar.
 *
 * YENİ TERCÜME/TERİM EKLERKEN buraya test ekleyin.
 */
import { isRelevant } from '../src/lib/ingest/pipeline';

let failures = 0;

function check(name: string, ok: boolean, detail = ''): void {
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`${status}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

function relevant(title: string, excerpt = ''): boolean {
  return isRelevant(title, excerpt);
}

console.log('\n── Gerçek veba haberleri GEÇMELİ ────────────────────────────────');
check(
  'TR: veba şüphesi',
  relevant("Rusya'da veba şüphesi devam ediyor", "Bu kez anne konuştu"),
);
check(
  'TR: vebadan ölüm (ek alıyor)',
  relevant("Rusya'da vebadan ikinci ölüm iddiası", 'Rus istihbaratı ambulanslara eşlik ediyor'),
);
check(
  'TR: veba enstitüsü + İrkutsk',
  relevant("Rusya'da veba enstitüsü çalışanında zatürre tespit edildi", 'İrkutsk'),
);
check(
  'EN: suspected bubonic plague in Siberia',
  relevant('Siberia laboratory worker dies of suspected bubonic plague', 'Quarantine imposed'),
);
check(
  'EN: plague cases (çoğul)',
  relevant('WHO reports thousands of suspected plague cases worldwide each year', ''),
);
check(
  'EN: pneumonic plague',
  relevant('Trump asked about pneumonic plague in Russia', 'He promised help'),
);
check(
  'RU: вспышка чумы (Kiril kökü ek alır)',
  relevant('В России вспышка чумы', 'Введён карантин в Иркутске'),
);
check(
  'RU: çekim hali (чумы/чуму) yalnız başına yeterli',
  relevant('Посольство США призвало американцев покинуть Россию из-за распространения чумы', ''),
);
check(
  'RU: противочумный институт (anti-plague)',
  relevant('После гибели лаборантки противочумного института введён карантин', 'Иркутская область'),
);
check(
  'EN: plague isim / iyelik hali korunur',
  relevant("Plague's spread in Siberia alarms officials", 'New cases reported'),
);
check('DE/FR: Pest (veba)', relevant('Pest in Russia: Behörden melden Fälle', ''));

console.log('\n── Konu dışı haberler ELENMELİ ─────────────────────────────────');
check(
  'ÖLÇÜM: "sharpest" içindeki pest sayılmaz',
  !relevant(
    'Russian Attack on Ukrainian City Kills 20, a Day After Trump Eases Diesel Sanctions on Moscow',
    "The Ukrainian President offered some of his sharpest criticism of Donald Trump after this week's third mass-casualty Russian attack.",
  ),
);
check(
  'ÖLÇÜM: "Budapest" içindeki pest sayılmaz',
  !relevant('Russia expels Hungarian diplomats as Budapest breaks with Orbán era', ''),
);
check(
  '"column" içindeki olum (ölüm) bağlam sayılmaz',
  !relevant('column', 'Russia'),
);
check(
  'pest yalnızca kelime başında',
  !relevant('deepest', 'Russia') && relevant('pest in Russia', ''),
);
check(
  'hastalık terimi yoksa bağlam yeterli değil',
  !relevant('Russia launches missile strike on Kyiv', 'Deaths reported, hospitals overwhelmed'),
);
check(
  'ÖLÇÜM: ABC/Wuhan — "plagued by the coronavirus outbreak"',
  !relevant(
    'Chinese court sentenced former mayor of Wuhan city to 14 years in prison for bribery',
    'A former Chinese mayor of a central Chinese city plagued by the coronavirus outbreak more than six years ago has been sentenced',
  ),
);
check(
  'ÖLÇÜM: ABC/Ukrayna — "shortage has plagued Ukraine"',
  !relevant(
    'Ukraine grapples with a shortage of troops at the front after over 4 years of war',
    "A shortage of combat-ready troops has plagued Ukraine ever since Russia's full-scale invasion in 2022",
  ),
);
check('pesticide veba sayılmaz', !relevant('Russia ramps up pesticide exports', 'Farmers in Siberia'));
check(
  'yalın чум (tek çadır) veba sayılmaz',
  // NOT: 'чумы' biçimi belirsizdir (veba tamlayanı / çadır çoğulu). DB
  // ölçümünde 6 kullanım da veba tamlayanıydı, o yüzden biçim korunuyor;
  // yalnızca yalın 'чум' dışarıda.
  !relevant('Оленевод поставил новый чум в Сибири', ''),
);

console.log('\n── Tarih/arkeoloji gürültüsü ───────────────────────────────────');
check(
  'antik veba + güncel işaret yok → elenir',
  !relevant('Plague found in Siberia 5,500 years ago', 'Archaeologists found skeletons'),
);
check(
  "ÖLÇÜM: 'outbreak' tek başına tarih filtresini açmaz",
  !relevant('Plague outbreak in Siberia 5,500 years ago', 'Archaeologists found skeletons'),
);
check(
  'antik veba + güncel işaret var → tutulur',
  relevant('Ancient DNA from Siberia reveals plague', 'New cases reported this week'),
);

console.log(`\n${failures === 0 ? '✔' : '✖'} relevance-check: ${failures} hata\n`);
if (failures > 0) process.exitCode = 1;
