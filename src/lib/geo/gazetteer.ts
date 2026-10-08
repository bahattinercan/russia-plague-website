/**
 * Rusya coğrafi gazetteer'ı — iki katmanlı.
 *
 * Neden iki katman: olay metinleri çoğu zaman federal subject değil
 * MAKRO-BÖLGE adı verir ("Sibirya'da laboratuvar çalışanı öldü"). Sibirya
 * bir federal subject değildir; bu yüzden makro-bölgeler ayrı tutulur ve
 * ikisi birlikte raporlanır.
 *
 * YANLIŞ POZİTİF KURALI (kritik): eşleşme tam TOKEN üzerinden yapılır
 * (`location.ts`), yani "Perm" ≠ "permanent". Buna rağmen günlük dilde
 * geçen kelimeler tek başına alias OLARAK YAZILMAZ:
 *   - Yahudi Özerk Oblastı → 'jewish' YASAK (genel kelime), 'birobidzhan' kullan
 *   - tek token alias'lar en az 4 harf olmalı
 */

export interface MacroRegionDef {
  slug: string;
  nameTr: string;
  nameEn: string;
  aliases: string[];
}

export interface RegionDef {
  slug: string;
  nameTr: string;
  nameEn: string;
  /** Birincil federal bölge (okrug) */
  macro: string;
  aliases: string[];
}

const MACRO_ALIASES: Record<string, string[]> = {
  central: ['central federal district', 'merkez federal bölgesi', 'центральный федеральный округ'],
  northwestern: [
    'northwestern federal district',
    'northwest federal district',
    'kuzeybatı federal bölgesi',
    'северо-западный федеральный округ',
  ],
  southern: ['southern federal district', 'güney federal bölgesi', 'южный федеральный округ'],
  'north-caucasus': [
    'north caucasian federal district',
    'north caucasus',
    'kuzey kafkasya',
    'северо-кавказский федеральный округ',
  ],
  volga: [
    'volga federal district',
    'volga region',
    'povolzhye',
    'idil federal bölgesi',
    'приволжский федеральный округ',
  ],
  ural: ['ural federal district', 'urals', 'ural region', 'ural bölgesi', 'уральский федеральный округ'],
  siberian: [
    'siberian federal district',
    'siberia',
    'siberian',
    'sibirya',
    'сибирь',
    'сибирский федеральный округ',
  ],
  'far-east': [
    'far eastern federal district',
    'far east',
    'russian far east',
    'uzak doğu',
    'дальневосточный федеральный округ',
  ],
};

export const MACRO_REGIONS: MacroRegionDef[] = [
  { slug: 'central', nameTr: 'Merkez Federal Bölgesi', nameEn: 'Central Federal District', aliases: MACRO_ALIASES.central },
  { slug: 'northwestern', nameTr: 'Kuzeybatı Federal Bölgesi', nameEn: 'Northwestern Federal District', aliases: MACRO_ALIASES.northwestern },
  { slug: 'southern', nameTr: 'Güney Federal Bölgesi', nameEn: 'Southern Federal District', aliases: MACRO_ALIASES.southern },
  { slug: 'north-caucasus', nameTr: 'Kuzey Kafkasya Federal Bölgesi', nameEn: 'North Caucasian Federal District', aliases: MACRO_ALIASES['north-caucasus'] },
  { slug: 'volga', nameTr: 'Volga Federal Bölgesi', nameEn: 'Volga Federal District', aliases: MACRO_ALIASES.volga },
  { slug: 'ural', nameTr: 'Ural Federal Bölgesi', nameEn: 'Ural Federal District', aliases: MACRO_ALIASES.ural },
  { slug: 'siberian', nameTr: 'Sibirya Federal Bölgesi', nameEn: 'Siberian Federal District', aliases: MACRO_ALIASES.siberian },
  { slug: 'far-east', nameTr: 'Uzak Doğu Federal Bölgesi', nameEn: 'Far Eastern Federal District', aliases: MACRO_ALIASES['far-east'] },
];

export const FEDERAL_SUBJECTS: RegionDef[] = [
  // ── Merkez ─────────────────────────────────────────────────────────────
  { slug: 'belgorod', nameTr: 'Belgorod Oblastı', nameEn: 'Belgorod Oblast', macro: 'central', aliases: ['belgorod', 'белгород'] },
  { slug: 'bryansk', nameTr: 'Bryansk Oblastı', nameEn: 'Bryansk Oblast', macro: 'central', aliases: ['bryansk', 'брянск'] },
  { slug: 'vladimir', nameTr: 'Vladimir Oblastı', nameEn: 'Vladimir Oblast', macro: 'central', aliases: ['vladimir oblast', 'владимирская область'] },
  { slug: 'voronezh', nameTr: 'Voronej Oblastı', nameEn: 'Voronezh Oblast', macro: 'central', aliases: ['voronezh', 'воронеж'] },
  { slug: 'ivanovo', nameTr: 'İvanovo Oblastı', nameEn: 'Ivanovo Oblast', macro: 'central', aliases: ['ivanovo', 'иваново'] },
  { slug: 'kaluga', nameTr: 'Kaluga Oblastı', nameEn: 'Kaluga Oblast', macro: 'central', aliases: ['kaluga', 'калуга'] },
  { slug: 'kostroma', nameTr: 'Kostroma Oblastı', nameEn: 'Kostroma Oblast', macro: 'central', aliases: ['kostroma', 'кострома'] },
  { slug: 'kursk', nameTr: 'Kursk Oblastı', nameEn: 'Kursk Oblast', macro: 'central', aliases: ['kursk', 'курск'] },
  { slug: 'lipetsk', nameTr: 'Lipetsk Oblastı', nameEn: 'Lipetsk Oblast', macro: 'central', aliases: ['lipetsk', 'липецк'] },
  { slug: 'moscow-oblast', nameTr: 'Moskova Oblastı', nameEn: 'Moscow Oblast', macro: 'central', aliases: ['moscow oblast', 'moskovskaya oblast', 'московская область', 'подмосковье'] },
  { slug: 'oryol', nameTr: 'Oryol Oblastı', nameEn: 'Oryol Oblast', macro: 'central', aliases: ['oryol', 'orel oblast', 'орёл', 'орловская'] },
  { slug: 'ryazan', nameTr: 'Ryazan Oblastı', nameEn: 'Ryazan Oblast', macro: 'central', aliases: ['ryazan', 'рязань'] },
  { slug: 'smolensk', nameTr: 'Smolensk Oblastı', nameEn: 'Smolensk Oblast', macro: 'central', aliases: ['smolensk', 'смоленск'] },
  { slug: 'tambov', nameTr: 'Tambov Oblastı', nameEn: 'Tambov Oblast', macro: 'central', aliases: ['tambov', 'тамбов'] },
  { slug: 'tver', nameTr: 'Tver Oblastı', nameEn: 'Tver Oblast', macro: 'central', aliases: ['tver', 'тверь'] },
  { slug: 'tula', nameTr: 'Tula Oblastı', nameEn: 'Tula Oblast', macro: 'central', aliases: ['tula oblast', 'тула', 'тульская'] },
  { slug: 'yaroslavl', nameTr: 'Yaroslavl Oblastı', nameEn: 'Yaroslavl Oblast', macro: 'central', aliases: ['yaroslavl', 'ярославль'] },
  { slug: 'moscow', nameTr: 'Moskova', nameEn: 'Moscow', macro: 'central', aliases: ['moscow', 'moskova', 'москва', 'kremlin', 'кремль'] },

  // ── Kuzeybatı ──────────────────────────────────────────────────────────
  { slug: 'arkhangelsk', nameTr: 'Arhangelsk Oblastı', nameEn: 'Arkhangelsk Oblast', macro: 'northwestern', aliases: ['arkhangelsk', 'arhangelsk', 'архангельск'] },
  { slug: 'vologda', nameTr: 'Vologda Oblastı', nameEn: 'Vologda Oblast', macro: 'northwestern', aliases: ['vologda', 'вологда'] },
  { slug: 'kaliningrad', nameTr: 'Kaliningrad Oblastı', nameEn: 'Kaliningrad Oblast', macro: 'northwestern', aliases: ['kaliningrad', 'калининград'] },
  { slug: 'karelia', nameTr: 'Karelya Cumhuriyeti', nameEn: 'Republic of Karelia', macro: 'northwestern', aliases: ['karelia', 'karelya', 'карелия', 'petrozavodsk', 'петрозаводск'] },
  { slug: 'komi', nameTr: 'Komi Cumhuriyeti', nameEn: 'Komi Republic', macro: 'northwestern', aliases: ['komi republic', 'komi', 'сыктывкар'] },
  { slug: 'leningrad-oblast', nameTr: 'Leningrad Oblastı', nameEn: 'Leningrad Oblast', macro: 'northwestern', aliases: ['leningrad oblast', 'ленинградская область'] },
  { slug: 'murmansk', nameTr: 'Murmansk Oblastı', nameEn: 'Murmansk Oblast', macro: 'northwestern', aliases: ['murmansk', 'мурманск'] },
  { slug: 'nenets', nameTr: 'Nenets Özerk Bölgesi', nameEn: 'Nenets Autonomous Okrug', macro: 'northwestern', aliases: ['nenets', 'naryan-mar', 'ненцы', 'нарьян-мар'] },
  { slug: 'novgorod', nameTr: 'Novgorod Oblastı', nameEn: 'Novgorod Oblast', macro: 'northwestern', aliases: ['novgorod oblast', 'veliky novgorod', 'новгород'] },
  { slug: 'pskov', nameTr: 'Pskov Oblastı', nameEn: 'Pskov Oblast', macro: 'northwestern', aliases: ['pskov', 'псков'] },
  { slug: 'saint-petersburg', nameTr: 'Sankt Peterburg', nameEn: 'Saint Petersburg', macro: 'northwestern', aliases: ['saint petersburg', 'st petersburg', 'st. petersburg', 'sankt peterburg', 'petersburg', 'санкт-петербург', 'петербург'] },

  // ── Güney ──────────────────────────────────────────────────────────────
  { slug: 'adygea', nameTr: 'Adıge Cumhuriyeti', nameEn: 'Republic of Adygea', macro: 'southern', aliases: ['adygea', 'adıge', 'адыгея', 'maykop', 'майкоп'] },
  { slug: 'astrakhan', nameTr: 'Astrahan Oblastı', nameEn: 'Astrakhan Oblast', macro: 'southern', aliases: ['astrakhan', 'astrahan', 'астрахань'] },
  { slug: 'volgograd', nameTr: 'Volgograd Oblastı', nameEn: 'Volgograd Oblast', macro: 'southern', aliases: ['volgograd', 'волгоград'] },
  { slug: 'kalmykia', nameTr: 'Kalmukya Cumhuriyeti', nameEn: 'Republic of Kalmykia', macro: 'southern', aliases: ['kalmykia', 'kalmukya', 'калмыкия', 'elista', 'элиста'] },
  { slug: 'krasnodar', nameTr: 'Krasnodar Krayı', nameEn: 'Krasnodar Krai', macro: 'southern', aliases: ['krasnodar', 'краснодар', 'sochi', 'сочи'] },
  { slug: 'rostov', nameTr: 'Rostov Oblastı', nameEn: 'Rostov Oblast', macro: 'southern', aliases: ['rostov', 'ростов'] },
  { slug: 'crimea', nameTr: 'Kırım', nameEn: 'Crimea', macro: 'southern', aliases: ['crimea', 'kırım', 'крым', 'simferopol', 'симферополь'] },
  { slug: 'sevastopol', nameTr: 'Sivastopol', nameEn: 'Sevastopol', macro: 'southern', aliases: ['sevastopol', 'sivastopol', 'севастополь'] },

  // ── Kuzey Kafkasya ─────────────────────────────────────────────────────
  { slug: 'dagestan', nameTr: 'Dağıstan Cumhuriyeti', nameEn: 'Republic of Dagestan', macro: 'north-caucasus', aliases: ['dagestan', 'dağıstan', 'дагестан', 'makhachkala', 'махачкала'] },
  { slug: 'ingushetia', nameTr: 'İnguşetya Cumhuriyeti', nameEn: 'Republic of Ingushetia', macro: 'north-caucasus', aliases: ['ingushetia', 'inguşetya', 'ингушетия', 'magas'] },
  { slug: 'kabardino-balkaria', nameTr: 'Kabardey-Balkar Cumhuriyeti', nameEn: 'Kabardino-Balkarian Republic', macro: 'north-caucasus', aliases: ['kabardino-balkaria', 'kabardey', 'кабардино-балкария', 'nalchik', 'нальчик'] },
  { slug: 'karachay-cherkessia', nameTr: 'Karaçay-Çerkes Cumhuriyeti', nameEn: 'Karachay-Cherkess Republic', macro: 'north-caucasus', aliases: ['karachay-cherkessia', 'karaçay', 'карачаево-черкесия', 'cherkessk', 'черкесск'] },
  { slug: 'north-ossetia', nameTr: 'Kuzey Osetya-Alanya', nameEn: 'North Ossetia-Alania', macro: 'north-caucasus', aliases: ['north ossetia', 'ossetia', 'alania', 'осетия', 'алания', 'vladikavkaz', 'владикавказ'] },
  { slug: 'chechnya', nameTr: 'Çeçenistan Cumhuriyeti', nameEn: 'Chechen Republic', macro: 'north-caucasus', aliases: ['chechnya', 'chechen', 'çeçenistan', 'чечня', 'grozny', 'грозный'] },
  { slug: 'stavropol', nameTr: 'Stavropol Krayı', nameEn: 'Stavropol Krai', macro: 'north-caucasus', aliases: ['stavropol', 'ставрополь', 'pyatigorsk', 'пятигорск'] },

  // ── Volga ──────────────────────────────────────────────────────────────
  { slug: 'bashkortostan', nameTr: 'Başkurdistan Cumhuriyeti', nameEn: 'Republic of Bashkortostan', macro: 'volga', aliases: ['bashkortostan', 'başkurdistan', 'bashkir', 'башкортостан', 'ufa', 'уфа'] },
  { slug: 'chuvashia', nameTr: 'Çuvaşistan Cumhuriyeti', nameEn: 'Chuvash Republic', macro: 'volga', aliases: ['chuvashia', 'chuvash', 'çuvaşistan', 'чувашия', 'cheboksary', 'чебоксары'] },
  { slug: 'mari-el', nameTr: 'Mari El Cumhuriyeti', nameEn: 'Mari El Republic', macro: 'volga', aliases: ['mari el', 'марий эл', 'yoshkar-ola', 'йошкар-ола'] },
  { slug: 'mordovia', nameTr: 'Mordovya Cumhuriyeti', nameEn: 'Republic of Mordovia', macro: 'volga', aliases: ['mordovia', 'mordovya', 'мордовия', 'saransk', 'саранск'] },
  { slug: 'tatarstan', nameTr: 'Tataristan Cumhuriyeti', nameEn: 'Republic of Tatarstan', macro: 'volga', aliases: ['tatarstan', 'tatar', 'татарстан', 'kazan', 'казань'] },
  { slug: 'udmurtia', nameTr: 'Udmurt Cumhuriyeti', nameEn: 'Udmurt Republic', macro: 'volga', aliases: ['udmurtia', 'udmurt', 'удмуртия', 'izhevsk', 'ижевск'] },
  { slug: 'perm', nameTr: 'Perm Krayı', nameEn: 'Perm Krai', macro: 'volga', aliases: ['perm krai', 'perm region', 'пермский край', 'пермь'] },
  { slug: 'kirov', nameTr: 'Kirov Oblastı', nameEn: 'Kirov Oblast', macro: 'volga', aliases: ['kirov oblast', 'киров'] },
  { slug: 'nizhny-novgorod', nameTr: 'Nijni Novgorod Oblastı', nameEn: 'Nizhny Novgorod Oblast', macro: 'volga', aliases: ['nizhny novgorod', 'nijni novgorod', 'нижний новгород'] },
  { slug: 'orenburg', nameTr: 'Orenburg Oblastı', nameEn: 'Orenburg Oblast', macro: 'volga', aliases: ['orenburg', 'оренбург'] },
  { slug: 'penza', nameTr: 'Penza Oblastı', nameEn: 'Penza Oblast', macro: 'volga', aliases: ['penza', 'пенза'] },
  { slug: 'samara', nameTr: 'Samara Oblastı', nameEn: 'Samara Oblast', macro: 'volga', aliases: ['samara', 'самара', 'tolyatti', 'тольятти'] },
  { slug: 'saratov', nameTr: 'Saratov Oblastı', nameEn: 'Saratov Oblast', macro: 'volga', aliases: ['saratov', 'саратов'] },
  { slug: 'ulyanovsk', nameTr: 'Ulyanovsk Oblastı', nameEn: 'Ulyanovsk Oblast', macro: 'volga', aliases: ['ulyanovsk', 'ульяновск'] },

  // ── Ural ───────────────────────────────────────────────────────────────
  { slug: 'kurgan', nameTr: 'Kurgan Oblastı', nameEn: 'Kurgan Oblast', macro: 'ural', aliases: ['kurgan', 'курган'] },
  { slug: 'sverdlovsk', nameTr: 'Sverdlovsk Oblastı', nameEn: 'Sverdlovsk Oblast', macro: 'ural', aliases: ['sverdlovsk', 'свердловск', 'yekaterinburg', 'ekaterinburg', 'екатеринбург'] },
  { slug: 'tyumen', nameTr: 'Tümen Oblastı', nameEn: 'Tyumen Oblast', macro: 'ural', aliases: ['tyumen', 'tümen', 'тюмень'] },
  { slug: 'chelyabinsk', nameTr: 'Çelyabinsk Oblastı', nameEn: 'Chelyabinsk Oblast', macro: 'ural', aliases: ['chelyabinsk', 'çelyabinsk', 'челябинск', 'magnitogorsk', 'магнитогорск'] },
  { slug: 'khanty-mansi', nameTr: 'Hantı-Mansi Özerk Bölgesi', nameEn: 'Khanty-Mansi Autonomous Okrug', macro: 'ural', aliases: ['khanty-mansi', 'khanty', 'yugra', 'ханты-мансийск', 'surgut', 'сургут'] },
  { slug: 'yamalo-nenets', nameTr: 'Yamalo-Nenets Özerk Bölgesi', nameEn: 'Yamalo-Nenets Autonomous Okrug', macro: 'ural', aliases: ['yamalo-nenets', 'yamal', 'ямало-ненецкий', 'ямал', 'novy urengoy', 'новый уренгой'] },

  // ── Sibirya ────────────────────────────────────────────────────────────
  { slug: 'altai-krai', nameTr: 'Altay Krayı', nameEn: 'Altai Krai', macro: 'siberian', aliases: ['altai krai', 'altay krayı', 'алтайский край', 'barnaul', 'барнаул', 'biysk', 'бийск', 'altai', 'altay'] },
  { slug: 'altai-republic', nameTr: 'Altay Cumhuriyeti', nameEn: 'Altai Republic', macro: 'siberian', aliases: ['altai republic', 'altay cumhuriyeti', 'республика алтай', 'gorno-altaysk', 'горно-алтайск', 'altai', 'altay'] },
  { slug: 'irkutsk', nameTr: 'İrkutsk Oblastı', nameEn: 'Irkutsk Oblast', macro: 'siberian', aliases: ['irkutsk', 'иркутск', 'irkutskaya', 'bratsk', 'братск'] },
  { slug: 'kemerovo', nameTr: 'Kemerovo Oblastı', nameEn: 'Kemerovo Oblast', macro: 'siberian', aliases: ['kemerovo', 'кемерово', 'kuzbass', 'кузбасс', 'novokuznetsk', 'новокузнецк'] },
  { slug: 'krasnoyarsk', nameTr: 'Krasnoyarsk Krayı', nameEn: 'Krasnoyarsk Krai', macro: 'siberian', aliases: ['krasnoyarsk', 'красноярск', 'norilsk', 'норильск'] },
  { slug: 'novosibirsk', nameTr: 'Novosibirsk Oblastı', nameEn: 'Novosibirsk Oblast', macro: 'siberian', aliases: ['novosibirsk', 'новосибирск', 'akademgorodok', 'академгородок'] },
  { slug: 'omsk', nameTr: 'Omsk Oblastı', nameEn: 'Omsk Oblast', macro: 'siberian', aliases: ['omsk', 'омск'] },
  { slug: 'tomsk', nameTr: 'Tomsk Oblastı', nameEn: 'Tomsk Oblast', macro: 'siberian', aliases: ['tomsk', 'томск'] },
  { slug: 'tuva', nameTr: 'Tuva Cumhuriyeti', nameEn: 'Tuva Republic', macro: 'siberian', aliases: ['tuva', 'tyva', 'tıva', 'тыва', 'туве', 'тувы', 'туву', 'кызыл', 'kyzyl'] },
  { slug: 'khakassia', nameTr: 'Hakasya Cumhuriyeti', nameEn: 'Republic of Khakassia', macro: 'siberian', aliases: ['khakassia', 'hakasya', 'хакасия', 'abakan', 'абакан'] },

  // ── Uzak Doğu ──────────────────────────────────────────────────────────
  { slug: 'amur', nameTr: 'Amur Oblastı', nameEn: 'Amur Oblast', macro: 'far-east', aliases: ['amur oblast', 'амурская область', 'blagoveshchensk', 'благовещенск'] },
  { slug: 'buryatia', nameTr: 'Buryatya Cumhuriyeti', nameEn: 'Republic of Buryatia', macro: 'far-east', aliases: ['buryatia', 'buriat', 'buryat', 'buryatya', 'бурятия', 'ulan-ude', 'улан-удэ'] },
  { slug: 'jewish-ao', nameTr: 'Yahudi Özerk Oblastı', nameEn: 'Jewish Autonomous Oblast', macro: 'far-east', aliases: ['jewish autonomous oblast', 'birobidzhan', 'биробиджан', 'еврейская автономная область'] },
  { slug: 'zabaykalsky', nameTr: 'Zabaykalsky Krayı', nameEn: 'Zabaykalsky Krai', macro: 'far-east', aliases: ['zabaykalsky', 'zabaikalsky', 'забайкальский', 'chita', 'чита'] },
  { slug: 'kamchatka', nameTr: 'Kamçatka Krayı', nameEn: 'Kamchatka Krai', macro: 'far-east', aliases: ['kamchatka', 'kamçatka', 'камчатка', 'petropavlovsk-kamchatsky'] },
  { slug: 'magadan', nameTr: 'Magadan Oblastı', nameEn: 'Magadan Oblast', macro: 'far-east', aliases: ['magadan', 'магадан'] },
  { slug: 'primorsky', nameTr: 'Primorsky Krayı', nameEn: 'Primorsky Krai', macro: 'far-east', aliases: ['primorsky', 'приморский', 'vladivostok', 'владивосток'] },
  { slug: 'sakha', nameTr: 'Saha (Yakutistan) Cumhuriyeti', nameEn: 'Sakha Republic (Yakutia)', macro: 'far-east', aliases: ['sakha', 'yakutia', 'yakut', 'саха', 'якутия', 'yakutsk', 'якутск'] },
  { slug: 'sakhalin', nameTr: 'Sahalin Oblastı', nameEn: 'Sakhalin Oblast', macro: 'far-east', aliases: ['sakhalin', 'sahalin', 'сахалин'] },
  { slug: 'khabarovsk', nameTr: 'Habarovsk Krayı', nameEn: 'Khabarovsk Krai', macro: 'far-east', aliases: ['khabarovsk', 'habarovsk', 'хабаровск'] },
  { slug: 'chukotka', nameTr: 'Çukotka Özerk Bölgesi', nameEn: 'Chukotka Autonomous Okrug', macro: 'far-east', aliases: ['chukotka', 'çukotka', 'чукотка', 'anadyr', 'анадырь'] },
];

export const REGION_BY_SLUG: ReadonlyMap<string, RegionDef> = new Map(
  FEDERAL_SUBJECTS.map((r) => [r.slug, r]),
);

export const MACRO_BY_SLUG: ReadonlyMap<string, MacroRegionDef> = new Map(
  MACRO_REGIONS.map((m) => [m.slug, m]),
);

/** Bölge adı — locale'e göre. */
export function regionName(slug: string, locale: 'tr' | 'en'): string {
  const subject = REGION_BY_SLUG.get(slug);
  if (subject) return locale === 'tr' ? subject.nameTr : subject.nameEn;
  const macro = MACRO_BY_SLUG.get(slug);
  if (macro) return locale === 'tr' ? macro.nameTr : macro.nameEn;
  return slug;
}
