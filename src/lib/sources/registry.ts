import type { SourceDef, SourceIdentity, Tier } from '@/types';

/**
 * Kaynak envanteri + yayıncı kimlikleri.
 *
 * İki ayrı liste vardır ve ayrım önemlidir:
 *
 *  1. `SOURCES`          → AKTİF TARANAN kaynaklar (adaptörü olan).
 *  2. `KNOWN_PUBLISHERS` → yalnızca KİMLİK ATAMASI için tanınan yayıncılar.
 *
 * Neden: Google News üzerinden gelen bir CNN haberi, CNN tanınmıyorsa
 * "kayıt dışı" sayılıp T5'e düşer ve ana akıştan kopar. Bu yanlıştı.
 * Artık her haber gerçek yayıncısına bağlanır ve doğru tier'ı alır.
 *
 * Kurallar:
 *  - `trustBase` ELLE belirlenir, otomatik öğrenilmez (metodoloji sayfasında gerekçeli).
 *  - `group` = sahiplik çatısı. Aynı çatıdaki kaynaklar TEK kaynak sayılır.
 *  - Her T1 kaynağının en az iki erişim yolu olmalı (birincil + yedek).
 */

export const USER_AGENT =
  'PlagueTrackerBot/0.1 (+https://github.com/bahattinercan/russia-plague-website; plague news monitor; contact via repo issues)';

/** Grup kimliği → insan-okur etiket. Metodoloji sayfası bundan üretilir. */
export const GROUP_LABELS: Record<string, string> = {
  'who-family': 'WHO ailesi',
  'us-cdc': 'US CDC',
  'eu-ecdc': 'ECDC',
  'un-agency': 'BM kuruluşları',
  cidrap: 'CIDRAP (Minnesota Üniv.)',
  promed: 'ProMED-mail (ISID)',
  reuters: 'Reuters',
  ap: 'Associated Press',
  bbc: 'BBC',
  nbc: 'NBC News',
  cbs: 'CBS News',
  abc: 'ABC News',
  cnn: 'CNN',
  cnbc: 'CNBC',
  bloomberg: 'Bloomberg',
  guardian: 'The Guardian',
  nytimes: 'The New York Times',
  wapo: 'The Washington Post',
  wsj: 'The Wall Street Journal',
  npr: 'NPR',
  pbs: 'PBS NewsHour',
  politico: 'Politico',
  axios: 'Axios',
  vox: 'Vox',
  atlantic: 'The Atlantic',
  nypost: 'New York Post',
  newsweek: 'Newsweek',
  usatoday: 'USA Today',
  latimes: 'Los Angeles Times',
  independent: 'The Independent',
  telegraph: 'The Telegraph',
  skynews: 'Sky News',
  dw: 'Deutsche Welle',
  spiegel: 'Der Spiegel',
  lemonde: 'Le Monde',
  straitstimes: 'The Straits Times',
  rnz: 'RNZ',
  globalnews: 'Global News',
  cbc: 'CBC News',
  statnews: 'STAT News',
  nature: 'Nature',
  science: 'Science',
  sciam: 'Scientific American',
  lancet: 'The Lancet',
  nejm: 'New England Journal of Medicine',
  bmj: 'The BMJ',
  aljazeera: 'Al Jazeera',
  euronews: 'Euronews',
  foxnews: 'Fox News',
  dailymail: 'Daily Mail',
  bellingcat: 'Bellingcat',
  thebell: 'The Bell',
  insider: 'The Insider',
  kommersant: 'Kommersant',
  rbc: 'RBC',
  kremlin: 'Kremlin yanlısı devlet medyası (TASS/RIA/RT/Sputnik)',
  'ru-gov': 'Rus resmi devlet kurumları',
  meduza: 'Meduza',
  rferl: 'RFE/RL',
  moscowtimes: 'The Moscow Times',
  novaya: 'Novaya Gazeta Europe',
  aggregator: 'Toplayıcı (Google News / GDELT)',
  'social-signal': 'Telegram sosyal sinyal',
  'unrecognized-publisher': 'Kayıt dışı yayıncı',
};

/** Google News yerelleştirme parametreleri. */
const GN = {
  en: { hl: 'en-US', gl: 'US', ceid: 'US:en' },
  tr: { hl: 'tr', gl: 'TR', ceid: 'TR:tr' },
  ru: { hl: 'ru', gl: 'RU', ceid: 'RU:ru' },
} as const;

function gn(query: string, lang: keyof typeof GN = 'en'): SourceDef['adapter'] {
  return { kind: 'google-news', query, ...GN[lang] };
}

// ─────────────────────────────── AKTİF TARANAN KAYNAKLAR ───────────────────────────────

export const SOURCES: SourceDef[] = [
  // TIER 1 — küresel otorite
  {
    slug: 'who-don',
    name: 'WHO · Disease Outbreak News',
    aliases: ['WHO', 'World Health Organization'],
    homepage: 'https://www.who.int/emergencies/disease-outbreak-news',
    tier: 1,
    group: 'who-family',
    trustBase: 100,
    lang: 'en',
    adapter: gn('site:who.int plague'),
    notes:
      'WHO RSS feed’i kaldırıldı (404, Eki 2026). Şimdilik Google News üzerinden; F1’de doğrudan HTML parse eklenecek.',
  },
  {
    slug: 'who-euro',
    name: 'WHO Avrupa Bölge Ofisi',
    aliases: ['WHO Europe'],
    homepage: 'https://www.who.int/europe',
    tier: 1,
    group: 'who-family',
    trustBase: 98,
    lang: 'en',
    adapter: gn('site:who.int/europe plague OR "pneumonic plague"'),
  },
  {
    slug: 'ecdc',
    name: 'ECDC · Avrupa Hastalık Önleme ve Kontrol Merkezi',
    aliases: ['European Centre for Disease Prevention and Control'],
    homepage: 'https://www.ecdc.europa.eu',
    tier: 1,
    group: 'eu-ecdc',
    trustBase: 95,
    lang: 'en',
    adapter: gn('site:ecdc.europa.eu plague'),
    notes: 'RSS yok (404). Google News + F1’de HTML parse.',
  },
  {
    slug: 'cdc-plague',
    name: 'US CDC · Plague',
    aliases: ['CDC', 'Centers for Disease Control and Prevention'],
    homepage: 'https://www.cdc.gov/plague',
    tier: 1,
    group: 'us-cdc',
    trustBase: 95,
    lang: 'en',
    adapter: gn('site:cdc.gov plague'),
  },
  {
    slug: 'cidrap',
    name: 'CIDRAP (University of Minnesota)',
    homepage: 'https://www.cidrap.umn.edu',
    tier: 1,
    group: 'cidrap',
    trustBase: 90,
    lang: 'en',
    adapter: gn('site:cidrap.umn.edu plague'),
    notes:
      'ÖLÇÜLDÜ: /rss.xml canlı görünüyor ama en yeni öğesi Kas 2022 → BAYAT. RSS kullanılmıyor. Bayat-feed tespitinin gerekliliğinin kanıtı.',
  },
  {
    slug: 'promed',
    name: 'ProMED-mail (ISID)',
    aliases: ['ProMED'],
    homepage: 'https://promedmail.org',
    tier: 1,
    group: 'promed',
    trustBase: 92,
    lang: 'en',
    adapter: gn('site:promedmail.org plague'),
    notes: 'RSS yok (404). Salgın erken uyarıda altın standart; F1’de arşiv HTML parse.',
  },
  {
    slug: 'reliefweb',
    name: 'ReliefWeb (UN OCHA)',
    homepage: 'https://reliefweb.int',
    tier: 1,
    group: 'un-agency',
    trustBase: 90,
    lang: 'en',
    adapter: { kind: 'rss', url: 'https://reliefweb.int/updates/rss.xml' },
    notes: 'RSS çalışıyor. Tüm dünya güncellemelerini verir → relevance filtresi zorunlu.',
  },

  // TIER 2 — bağımsız ajans / gazetecilik
  {
    slug: 'reuters',
    name: 'Reuters',
    homepage: 'https://www.reuters.com',
    tier: 2,
    group: 'reuters',
    trustBase: 88,
    lang: 'en',
    adapter: gn('site:reuters.com plague russia OR siberia'),
  },
  {
    slug: 'ap',
    name: 'Associated Press',
    aliases: ['AP News', 'AP'],
    homepage: 'https://apnews.com',
    tier: 2,
    group: 'ap',
    trustBase: 88,
    lang: 'en',
    adapter: gn('site:apnews.com plague russia OR siberia'),
  },
  {
    slug: 'bbc',
    name: 'BBC News',
    aliases: ['BBC'],
    homepage: 'https://www.bbc.com/news',
    tier: 2,
    group: 'bbc',
    trustBase: 85,
    lang: 'en',
    adapter: { kind: 'rss', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
    notes:
      'Google News yerine DOĞRUDAN RSS (08 Eki 2026): gerçek makale linki + kaynağın kendi özeti geliyor. Genel dünya akışı → relevance filtresi zorunlu.',
  },
  {
    slug: 'aljazeera',
    name: 'Al Jazeera',
    homepage: 'https://www.aljazeera.com',
    tier: 2,
    group: 'aljazeera',
    trustBase: 82,
    lang: 'en',
    adapter: { kind: 'rss', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
    notes:
      'Google News yerine DOĞRUDAN RSS (08 Eki 2026): gerçek makale linki + kaynağın kendi özeti. Genel akış → relevance filtresi zorunlu.',
  },
  {
    slug: 'euronews',
    name: 'Euronews',
    homepage: 'https://www.euronews.com',
    tier: 2,
    group: 'euronews',
    trustBase: 80,
    lang: 'en',
    adapter: { kind: 'rss', url: 'https://www.euronews.com/rss?level=theme&name=news' },
    notes:
      'Google News yerine DOĞRUDAN RSS (08 Eki 2026): gerçek makale linki + kaynak özeti. Genel akış → relevance filtresi zorunlu.',
  },
  {
    slug: 'guardian',
    name: 'The Guardian',
    aliases: ['Guardian'],
    homepage: 'https://www.theguardian.com/world',
    tier: 2,
    group: 'guardian',
    trustBase: 80,
    lang: 'en',
    adapter: { kind: 'rss', url: 'https://www.theguardian.com/world/rss' },
    notes:
      'Doğrudan RSS (08 Eki 2026). Önceden yalnızca keşif (discovery) ile geliyordu, kaynak olarak taranmıyordu. Genel dünya akışı → relevance filtresi zorunlu.',
  },
  {
    slug: 'nbc',
    name: 'NBC News',
    aliases: ['NBC'],
    homepage: 'https://www.nbcnews.com',
    tier: 2,
    group: 'nbc',
    trustBase: 82,
    lang: 'en',
    adapter: { kind: 'rss', url: 'https://feeds.nbcnews.com/nbcnews/public/news' },
    notes:
      'Doğrudan RSS (08 Eki 2026). Önceden yalnızca keşif ile geliyordu. Genel haber akışı → relevance filtresi zorunlu.',
  },
  {
    slug: 'axios',
    name: 'Axios',
    homepage: 'https://www.axios.com',
    tier: 2,
    group: 'axios',
    trustBase: 78,
    lang: 'en',
    adapter: { kind: 'rss', url: 'https://api.axios.com/feed/' },
    notes:
      'Doğrudan RSS (08 Eki 2026, 100 öğe). Genel akış → relevance filtresi zorunlu.',
  },

  // ── Doğrudan RSS'e geçen yayıncılar (08 Eki 2026) ────────────────────────
  //
  // Neden: Google News öğeleri ne kaynak özeti taşıyordu ne de makale adresini
  // sunucuya veriyordu (yönlenme tarayıcıda JS ile oluyor, curl ile ölçüldü:
  // 302 → kendisi). Yayıncının KENDİ RSS'i hem gerçek makale linkini hem de
  // kaynağın kendi 1-2 cümlelik özetini verir — telif kuralı zaten
  // "başlık + ≤2 cümle + link" diyor (PLAN.md §329).
  //
  // Bu feed'lerin hepsi GENEL akış (dünya haberi) → relevance filtresi zorunlu.
  // Ölçüm (267 öğe / 6 kaynak): 12 öğe ilgili çıktı, YANLIŞ POZİTİF YOK.
  //
  // Kimlik değerleri (tier/trustBase/aliases) KNOWN_PUBLISHERS'tan birebir
  // alındı ki keşif yoluyla gelen aynı yayıncı ile çelişmesin.
  // Tek satırlık biçim bilinçli: bu blok bir veri tablosu, kod değil.
  // Eklenmeyenler: CNN (feed'i yalnızca `http://` ile çalışıyor — şifresiz dış
  // kaynak alınmaz) ve WSJ (feed'i ölü: en yeni öğe 2025-01-27 → ölçüldü,
  // ingest'te BAYAT olarak işaretleniyordu, kaldırıldı). Independent ve
  // Telegraph bot koruması (403) nedeniyle zaten erişilemiyor.
  { slug: 'nytimes', name: 'The New York Times', aliases: ['New York Times', 'NYT'], homepage: 'https://www.nytimes.com', tier: 2, group: 'nytimes', trustBase: 85, lang: 'en', adapter: { kind: 'rss', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' } },
  { slug: 'wapo', name: 'The Washington Post', aliases: ['Washington Post'], homepage: 'https://www.washingtonpost.com', tier: 2, group: 'wapo', trustBase: 84, lang: 'en', adapter: { kind: 'rss', url: 'https://feeds.washingtonpost.com/rss/world' } },
  { slug: 'npr', name: 'NPR', homepage: 'https://www.npr.org', tier: 2, group: 'npr', trustBase: 82, lang: 'en', adapter: { kind: 'rss', url: 'https://feeds.npr.org/1004/rss.xml' } },
  { slug: 'pbs', name: 'PBS NewsHour', aliases: ['PBS'], homepage: 'https://www.pbs.org/newshour', tier: 2, group: 'pbs', trustBase: 82, lang: 'en', adapter: { kind: 'rss', url: 'https://www.pbs.org/newshour/feeds/rss/world' } },
  { slug: 'lemonde', name: 'Le Monde', homepage: 'https://www.lemonde.fr/en', tier: 2, group: 'lemonde', trustBase: 82, lang: 'en', adapter: { kind: 'rss', url: 'https://www.lemonde.fr/en/rss/une.xml' } },
  { slug: 'abc', name: 'ABC News', homepage: 'https://abcnews.go.com', tier: 2, group: 'abc', trustBase: 78, lang: 'en', adapter: { kind: 'rss', url: 'https://abcnews.go.com/abcnews/internationalheadlines' } },
  { slug: 'cnbc', name: 'CNBC', homepage: 'https://www.cnbc.com', tier: 2, group: 'cnbc', trustBase: 78, lang: 'en', adapter: { kind: 'rss', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114' } },
  { slug: 'atlantic', name: 'The Atlantic', aliases: ['Atlantic'], homepage: 'https://www.theatlantic.com', tier: 2, group: 'atlantic', trustBase: 78, lang: 'en', adapter: { kind: 'rss', url: 'https://www.theatlantic.com/feed/all/' } },
  { slug: 'skynews', name: 'Sky News', homepage: 'https://news.sky.com', tier: 2, group: 'skynews', trustBase: 75, lang: 'en', adapter: { kind: 'rss', url: 'https://feeds.skynews.com/feeds/rss/world.xml' } },
  { slug: 'globalnews', name: 'Global News', homepage: 'https://globalnews.ca', tier: 2, group: 'globalnews', trustBase: 75, lang: 'en', adapter: { kind: 'rss', url: 'https://globalnews.ca/world/feed/' } },
  { slug: 'thehill', name: 'The Hill', homepage: 'https://thehill.com', tier: 2, group: 'thehill', trustBase: 72, lang: 'en', adapter: { kind: 'rss', url: 'https://thehill.com/feed/' } },
  { slug: 'vox', name: 'Vox', homepage: 'https://www.vox.com', tier: 2, group: 'vox', trustBase: 72, lang: 'en', adapter: { kind: 'rss', url: 'https://www.vox.com/rss/index.xml' } },
  { slug: 'newsweek', name: 'Newsweek', homepage: 'https://www.newsweek.com', tier: 2, group: 'newsweek', trustBase: 65, lang: 'en', adapter: { kind: 'rss', url: 'https://www.newsweek.com/rss' } },
  { slug: 'nypost', name: 'New York Post', homepage: 'https://nypost.com', tier: 2, group: 'nypost', trustBase: 62, lang: 'en', adapter: { kind: 'rss', url: 'https://nypost.com/feed/' } },
  { slug: 'foxnews', name: 'Fox News', homepage: 'https://www.foxnews.com', tier: 2, group: 'foxnews', trustBase: 60, lang: 'en', adapter: { kind: 'rss', url: 'https://moxie.foxnews.com/google-publisher/world.xml' } },
  { slug: 'science', name: 'Science', homepage: 'https://www.science.org', tier: 2, group: 'science', trustBase: 90, lang: 'en', adapter: { kind: 'rss', url: 'https://www.science.org/rss/news_current.xml' } },

  {
    slug: 'bmj',
    name: 'The BMJ',
    homepage: 'https://www.bmj.com',
    tier: 2,
    group: 'bmj',
    trustBase: 90,
    lang: 'en',
    adapter: gn('site:bmj.com plague russia'),
    notes: 'Hakemli dergi; bilimsel yorum katmanı.',
  },

  // TIER 3 — resmi Rusya / devlet medyası
  {
    slug: 'rospotrebnadzor',
    name: 'Rospotrebnadzor',
    aliases: ['Rospotrebnadzor', 'Роспотребнадзор'],
    homepage: 'https://rospotrebnadzor.ru',
    tier: 3,
    group: 'ru-gov',
    trustBase: 70,
    lang: 'ru',
    stateControlPenalty: -5,
    adapter: gn('site:rospotrebnadzor.ru чума', 'ru'),
    notes:
      'ÖLÇÜLDÜ: doğrudan erişim Türkiye’den başarısız (HTTP 000). Google News önbelleği üzerinden; proxy yolu F1’de eklenecek.',
  },
  {
    slug: 'minzdrav',
    name: 'Rusya Sağlık Bakanlığı',
    aliases: ['Minzdrav'],
    homepage: 'https://minzdrav.gov.ru',
    tier: 3,
    group: 'ru-gov',
    trustBase: 68,
    lang: 'ru',
    stateControlPenalty: -5,
    adapter: gn('site:minzdrav.gov.ru чума', 'ru'),
  },
  {
    slug: 'tass',
    name: 'TASS',
    homepage: 'https://tass.com',
    tier: 3,
    group: 'kremlin',
    trustBase: 60,
    lang: 'en',
    stateControlPenalty: -8,
    adapter: { kind: 'rss', url: 'https://tass.com/rss/v2.xml' },
    notes: 'RSS çalışıyor (100 öğe) ama genel haber akışı → relevance filtresi zorunlu.',
  },
  {
    slug: 'ria',
    name: 'RIA Novosti',
    homepage: 'https://ria.ru',
    tier: 3,
    group: 'kremlin',
    trustBase: 58,
    lang: 'ru',
    stateControlPenalty: -8,
    adapter: { kind: 'rss', url: 'https://ria.ru/export/rss2/archive/index.xml' },
  },
  {
    slug: 'interfax',
    name: 'Interfax',
    homepage: 'https://www.interfax.ru',
    tier: 3,
    group: 'kremlin',
    trustBase: 65,
    lang: 'ru',
    stateControlPenalty: -6,
    adapter: { kind: 'rss', url: 'https://www.interfax.ru/rss.asp' },
    notes: 'Görece daha bağımsız ama muhafazakâr varsayımla aynı çatı grubunda sayılır.',
  },

  // TIER 4 — bağımsız Rus / sürgün medya
  {
    slug: 'meduza',
    name: 'Meduza',
    homepage: 'https://meduza.io',
    tier: 4,
    group: 'meduza',
    trustBase: 78,
    lang: 'en',
    adapter: { kind: 'rss', url: 'https://meduza.io/rss/en/all' },
    notes: 'RSS çalışıyor (30 öğe). Letonya merkezli.',
  },
  {
    slug: 'rferl',
    name: 'RFE/RL (Sibirya.Realities)',
    aliases: ['Radio Free Europe/Radio Liberty', 'RFE/RL'],
    homepage: 'https://www.rferl.org',
    tier: 4,
    group: 'rferl',
    trustBase: 76,
    lang: 'en',
    adapter: { kind: 'rss', url: 'https://www.rferl.org/api/' },
    notes:
      'ÖLÇÜLDÜ: /api/zrqiteuuir ve /api/zmgqimmitm 0 öğe döndürüyor; /api/ 20 öğe ile çalışıyor. Bölgesel muhabir ağı güçlü; Irkutsk olayını ilk bildiren kaynaklardan.',
  },
  {
    slug: 'moscowtimes',
    name: 'The Moscow Times',
    homepage: 'https://www.themoscowtimes.com',
    tier: 4,
    group: 'moscowtimes',
    trustBase: 72,
    lang: 'en',
    adapter: { kind: 'rss', url: 'https://www.themoscowtimes.com/rss/news' },
    notes: 'RSS çalışıyor (50 öğe). Amsterdam merkezli.',
  },
  {
    slug: 'novaya',
    name: 'Novaya Gazeta Europe',
    aliases: ['Новая газета Европа', 'Novaya Gazeta'],
    homepage: 'https://novayagazeta.eu',
    tier: 4,
    group: 'novaya',
    trustBase: 74,
    lang: 'ru',
    adapter: gn('site:novayagazeta.eu чума', 'ru'),
    notes:
      'ÖLÇÜLDÜ: /rss 404, /feed 521, /rss.xml 403 → RSS erişilemiyor. Google News üzerinden alınıyor.',
  },

  // TIER 5 — toplayıcı ve sosyal sinyal
  {
    slug: 'discovery',
    name: 'Genel keşif (çok dilli Google News)',
    homepage: 'https://news.google.com',
    tier: 5,
    group: 'aggregator',
    trustBase: 30,
    lang: 'multi',
    adapter: gn('russia plague outbreak OR veba OR чума'),
    notes:
      'Yeni yayıncı keşfi için. Orijinal yayıncı tanınıyorsa onun tier’ı uygulanır; tanınmıyorsa T5 kalır.',
  },
  {
    slug: 'discovery-tr',
    name: 'Keşif · Türkçe',
    homepage: 'https://news.google.com',
    tier: 5,
    group: 'aggregator',
    trustBase: 30,
    lang: 'tr',
    adapter: gn('rusya veba salgını OR sibirya veba', 'tr'),
  },
  {
    slug: 'tg-astrapress',
    name: 'Telegram · Astra',
    homepage: 'https://t.me/astrapress',
    tier: 5,
    group: 'social-signal',
    trustBase: 25,
    lang: 'ru',
    adapter: { kind: 'telegram', channel: 'astrapress' },
    notes: 'Yalnızca "doğrulanmamış iddia" katmanı. Ana akışta tek başına haber sayılmaz.',
  },
  {
    slug: 'tg-shot_shot',
    name: 'Telegram · Shot',
    homepage: 'https://t.me/shot_shot',
    tier: 5,
    group: 'social-signal',
    trustBase: 22,
    lang: 'ru',
    adapter: { kind: 'telegram', channel: 'shot_shot' },
  },
];

export const SOURCE_BY_SLUG: ReadonlyMap<string, SourceDef> = new Map(
  SOURCES.map((s) => [s.slug, s]),
);

// ─────────────────────────────── TANINAN YAYINCILAR ───────────────────────────────
//
// Buradakiler taranmaz; yalnızca Google News’ten gelen bir haberin gerçek
// yayıncısını tanımak ve doğru tier’ı atamak için vardır.

interface PublisherIdentity extends SourceIdentity {
  aliases?: string[];
  stateControlPenalty?: number;
}

function pub(
  slug: string,
  name: string,
  tier: Tier,
  trustBase: number,
  aliases: string[] = [],
  stateControlPenalty?: number,
): PublisherIdentity {
  return { slug, name, tier, group: slug, trustBase, aliases, stateControlPenalty };
}

export const KNOWN_PUBLISHERS: PublisherIdentity[] = [
  // Resmi / akademik
  pub('who-family', 'World Health Organization', 1, 100, ['WHO']),
  pub('un-agency', 'ReliefWeb', 1, 90, ['OCHA', 'UN OCHA']),
  pub('nature', 'Nature', 2, 90),
  pub('science', 'Science', 2, 90),
  pub('nejm', 'New England Journal of Medicine', 2, 92, ['NEJM']),
  pub('lancet', 'The Lancet', 2, 92),
  pub('statnews', 'STAT News', 2, 82, ['STAT']),
  pub('sciam', 'Scientific American', 2, 82),

  // Uluslararası ajans ve büyük basın
  pub('reuters', 'Reuters', 2, 88),
  pub('ap', 'Associated Press', 2, 88, ['AP News', 'AP']),
  pub('bloomberg', 'Bloomberg', 2, 85, ['Bloomberg News']),
  pub('nytimes', 'The New York Times', 2, 85, ['New York Times', 'NYT']),
  pub('wsj', 'The Wall Street Journal', 2, 85, ['Wall Street Journal']),
  pub('wapo', 'The Washington Post', 2, 84, ['Washington Post']),
  pub('bbc', 'BBC News', 2, 85, ['BBC']),
  pub('guardian', 'The Guardian', 2, 80, ['Guardian']),
  pub('nbc', 'NBC News', 2, 82, ['NBC']),
  pub('cbs', 'CBS News', 2, 80, ['CBS']),
  pub('abc', 'ABC News', 2, 78),
  pub('cnn', 'CNN', 2, 78),
  pub('cnbc', 'CNBC', 2, 78),
  pub('npr', 'NPR', 2, 82),
  pub('pbs', 'PBS NewsHour', 2, 82, ['PBS']),
  pub('cbc', 'CBC News', 2, 80, ['CBC']),
  pub('latimes', 'Los Angeles Times', 2, 80, ['LA Times']),
  pub('usatoday', 'USA Today', 2, 75),
  pub('politico', 'Politico', 2, 78),
  pub('axios', 'Axios', 2, 78),
  pub('atlantic', 'The Atlantic', 2, 78, ['Atlantic']),
  pub('vox', 'Vox', 2, 72),
  pub('newsweek', 'Newsweek', 2, 65),
  pub('nypost', 'New York Post', 2, 62),
  pub('independent', 'The Independent', 2, 72),
  pub('telegraph', 'The Telegraph', 2, 72),
  pub('skynews', 'Sky News', 2, 75),
  pub('dw', 'Deutsche Welle', 2, 78, ['DW']),
  pub('spiegel', 'Der Spiegel', 2, 80),
  pub('lemonde', 'Le Monde', 2, 82),
  pub('straitstimes', 'The Straits Times', 2, 78),
  pub('rnz', 'RNZ', 2, 80, ['Radio New Zealand']),
  pub('globalnews', 'Global News', 2, 75),
  pub('thehill', 'The Hill', 2, 72),
  pub('aljazeera', 'Al Jazeera', 2, 82),
  pub('euronews', 'Euronews', 2, 80),
  pub('bellingcat', 'Bellingcat', 2, 82),
  pub('foxnews', 'Fox News', 2, 60),
  pub('dailymail', 'Daily Mail', 2, 45),

  // Rus devlet medyası (tek çatı: kremlin)
  pub('kremlin', 'TASS', 3, 60, ['TASS'], -8),
  pub('kremlin', 'RIA Novosti', 3, 58, ['RIA'], -8),
  pub('kremlin', 'RT', 3, 40, ['Russia Today'], -10),
  pub('kremlin', 'Sputnik', 3, 42, [], -10),
  pub('kremlin', 'Kommersant', 3, 60, [], -6),
  pub('kremlin', 'RBC', 3, 62, [], -5),

  // Bağımsız Rus / sürgün medya
  pub('meduza', 'Meduza', 4, 78),
  pub('rferl', 'RFE/RL', 4, 76, ['Radio Free Europe/Radio Liberty']),
  pub('moscowtimes', 'The Moscow Times', 4, 72),
  pub('novaya', 'Novaya Gazeta Europe', 4, 74, ['Novaya Gazeta', 'Новая газета Европа']),
  pub('insider', 'The Insider', 4, 74),
  pub('thebell', 'The Bell', 4, 72),
];

// ─────────────────────────────── ÇÖZÜMLEME ───────────────────────────────

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

interface NameMatchable {
  slug: string;
  name: string;
  aliases?: string[];
}

function matchesPublisher(entity: NameMatchable, needle: string): boolean {
  const candidates = [normalizeName(entity.name), normalizeName(entity.slug)];
  for (const alias of entity.aliases ?? []) candidates.push(normalizeName(alias));

  return candidates.some((c) => {
    if (c.length < 3) return false;
    if (c === needle) return true;
    // Kısmi eşleşme yalnızca yeterince uzun adlarda — "ap" gibi kısa
    // slug'ların yanlış eşleşmesini engeller.
    return c.length >= 5 && (c.includes(needle) || needle.includes(c));
  });
}

/**
 * Yayıncı adından kaynak kimliği bulur.
 * Önce aktif taranan kaynaklar, sonra tanınan yayıncılar denenir.
 */
export function resolvePublisherIdentity(
  publisherName: string,
): SourceIdentity | undefined {
  const needle = normalizeName(publisherName);
  if (needle.length < 2) return undefined;

  const fromSources = SOURCES.find((s) => matchesPublisher(s, needle));
  if (fromSources) return fromSources;

  return KNOWN_PUBLISHERS.find((p) => matchesPublisher(p, needle));
}

export function getSource(slug: string): SourceDef {
  const s = SOURCE_BY_SLUG.get(slug);
  if (!s) throw new Error(`Bilinmeyen kaynak: ${slug}`);
  return s;
}
