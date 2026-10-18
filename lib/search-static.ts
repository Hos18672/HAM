import type { Locale } from './i18n/config';
import type { IndexEntry } from './search-local';
import type { SearchHit } from './search';
import { pageFromQuery, surahOnPage } from './quran-page-query';
import { JUZ_PAGES, SURAHS, surahKeywords, surahNameFa } from './surah-names';

/**
 * What the search finds that is not in the database: every page and tool of
 * the site under the words people look for it by, the 114 surahs and the
 * 30 juz. The header search adds these to the database's hits, on the live
 * site and in the static preview alike.
 */

interface PageWords {
  title: string;
  excerpt: string;
  keywords: string;
}

const PAGES: Record<string, Record<Locale, PageWords>> = {
  '': {
    de: {
      title: 'Start',
      excerpt: 'Die Startseite',
      keywords: 'Startseite Home Haus aller Menschen',
    },
    fa: { title: 'خانه', excerpt: 'صفحهٔ اصلی', keywords: 'صفحه اصلی خانه همه انسان‌ها' },
  },
  prayer: {
    de: {
      title: 'Gebetszeiten',
      excerpt: 'Die Gebetszeiten für heute und den ganzen Monat',
      keywords:
        'Gebet Salat Namaz Fadschr Fajr Sobh Morgengebet Sonnenaufgang Dhuhr Zuhr Mittagsgebet Asr Maghrib Abendgebet Isha Nachtgebet Mitternacht Imsak Adhan Azan Gebetsruf Monatstabelle Timetable',
    },
    fa: {
      title: 'اوقات شرعی',
      excerpt: 'اوقات نماز امروز و جدول ماه',
      keywords:
        'نماز اذان صبح طلوع آفتاب ظهر عصر مغرب عشا غروب نیمه شب امساک افطار جدول ماهانه Gebetszeiten',
    },
  },
  qibla: {
    de: {
      title: 'Qibla',
      excerpt: 'Die Gebetsrichtung, mit Kompass und Karte',
      keywords: 'Kibla Qibla Gebetsrichtung Kompass Karte Mekka Kaaba Richtung',
    },
    fa: {
      title: 'قبله',
      excerpt: 'جهت قبله با قطب‌نما و نقشه',
      keywords: 'قبله نما قطب نما قطب‌نما جهت کعبه مکه نقشه Qibla',
    },
  },
  quran: {
    de: {
      title: 'Quran',
      excerpt: 'Der Quran als Buch, mit Übersetzung und Rezitation',
      keywords:
        'Koran Kuran Quran Sure Suren Vers Ayat Juz Mushaf Lesezeichen Rezitation Übersetzung',
    },
    fa: {
      title: 'قرآن کریم',
      excerpt: 'قرآن به صورت مصحف، با ترجمه و تلاوت',
      keywords: 'قرآن سوره آیه جزء پاره مصحف تلاوت قاری ترجمه نشانک Quran',
    },
  },
  duas: {
    de: {
      title: 'Bittgebete',
      excerpt: "Du'as und Ziyarat zum Lesen, auf Arabisch mit Übersetzung",
      keywords: 'Dua Duas Bittgebet Gebete Ziyarat Ziyara Mafatih Munadschat',
    },
    fa: {
      title: 'ادعیه و زیارات',
      excerpt: 'دعاها و زیارت‌ها با متن عربی و ترجمه',
      keywords: 'دعا ادعیه زیارت زیارات مفاتیح مناجات',
    },
  },
  calendar: {
    de: {
      title: 'Kalender',
      excerpt: 'Der islamische Kalender mit den Gedenk- und Feiertagen',
      keywords:
        'Kalender islamischer Hidschri Hijri Mondkalender Feiertage Gedenktage Ramadan Muharram Iran Österreich Datum',
    },
    fa: {
      title: 'تقویم',
      excerpt: 'تقویم قمری و شمسی با مناسبت‌ها',
      keywords: 'تقویم قمری هجری شمسی مناسبت مناسبت‌ها تعطیلات رمضان محرم تاریخ',
    },
  },
  events: {
    de: {
      title: 'Termine',
      excerpt: 'Was im Haus ansteht',
      keywords: 'Termine Veranstaltungen Programm Events Feier Trauerfeier',
    },
    fa: {
      title: 'برنامه‌ها',
      excerpt: 'برنامه‌ها و مراسم پیش رو',
      keywords: 'برنامه مراسم رویداد جلسه مجلس جشن عزاداری',
    },
  },
  activities: {
    de: {
      title: 'Aktivitäten',
      excerpt: 'Kurse, Kultur und Sport im Haus',
      keywords: 'Aktivitäten Angebote Übersicht',
    },
    fa: {
      title: 'فعالیت‌ها',
      excerpt: 'کلاس‌ها، فرهنگ و ورزش',
      keywords: 'فعالیت فعالیت‌ها برنامه‌ها',
    },
  },
  courses: {
    de: {
      title: 'Kurse',
      excerpt: 'Unterricht für Kinder und Erwachsene',
      keywords: 'Kurs Kurse Unterricht Koranunterricht Deutschkurs Sprachkurs Lernen',
    },
    fa: {
      title: 'کلاس‌ها',
      excerpt: 'کلاس‌های آموزشی برای کودکان و بزرگسالان',
      keywords: 'کلاس آموزش درس قرآن آموزی زبان',
    },
  },
  culture: {
    de: { title: 'Kultur', excerpt: 'Kultur im Haus', keywords: 'Kultur Literatur Musik Lesung' },
    fa: { title: 'فرهنگ', excerpt: 'برنامه‌های فرهنگی', keywords: 'فرهنگ فرهنگی ادبیات شعر' },
  },
  sport: {
    de: { title: 'Sport', excerpt: 'Sport im Haus', keywords: 'Sport Training Fußball Fitness' },
    fa: { title: 'ورزش', excerpt: 'ورزش در خانه', keywords: 'ورزش تمرین فوتبال' },
  },
  community: {
    de: {
      title: 'Gemeinschaft',
      excerpt: 'Füreinander da sein',
      keywords: 'Gemeinschaft Hilfe Nachbarschaft',
    },
    fa: { title: 'همیاری', excerpt: 'در کنار هم', keywords: 'همیاری کمک جامعه' },
  },
  gallery: {
    de: { title: 'Galerie', excerpt: 'Bilder aus dem Haus', keywords: 'Galerie Fotos Bilder' },
    fa: { title: 'گالری', excerpt: 'عکس‌هایی از خانه', keywords: 'گالری عکس تصویر' },
  },
  about: {
    de: {
      title: 'Über uns',
      excerpt: 'Der Verein und das Haus',
      keywords: 'Über uns Verein Geschichte Team',
    },
    fa: { title: 'دربارهٔ ما', excerpt: 'انجمن و خانه', keywords: 'درباره ما انجمن تاریخچه' },
  },
  support: {
    de: {
      title: 'Mitglied werden',
      excerpt: 'Mitgliedschaft und Spenden',
      keywords: 'Mitglied Mitgliedschaft Spenden Spende Beitrag IBAN Bankverbindung Unterstützen',
    },
    fa: {
      title: 'عضویت',
      excerpt: 'عضویت و کمک مالی',
      keywords: 'عضویت عضو کمک مالی اهدا حق عضویت حساب بانکی',
    },
  },
  contact: {
    de: {
      title: 'Kontakt',
      excerpt: 'Adresse, Öffnungszeiten und Nachricht',
      keywords: 'Kontakt Adresse Öffnungszeiten Telefon E-Mail Anfahrt Karte WhatsApp Nachricht',
    },
    fa: {
      title: 'تماس',
      excerpt: 'نشانی، ساعات کاری و پیام',
      keywords: 'تماس نشانی آدرس ساعات کاری تلفن ایمیل پیام نقشه',
    },
  },
  settings: {
    de: {
      title: 'Einstellungen',
      excerpt: 'Design, Schriftgröße, Sprache, Stadt und Benachrichtigungen',
      keywords:
        'Einstellungen dunkler Modus Dark Mode Design Thema Schriftgröße Textgröße Sprache Stadt Standort Benachrichtigungen Adhan',
    },
    fa: {
      title: 'تنظیمات',
      excerpt: 'ظاهر، اندازهٔ متن، زبان، شهر و اعلان‌ها',
      keywords: 'تنظیمات حالت تاریک شب ظاهر اندازه متن زبان شهر موقعیت اعلان اذان',
    },
  },
  more: {
    de: { title: 'Mehr', excerpt: 'Alle Seiten', keywords: 'Mehr Menü' },
    fa: { title: 'بیشتر', excerpt: 'همهٔ صفحه‌ها', keywords: 'بیشتر منو' },
  },
  privacy: {
    de: { title: 'Datenschutz', excerpt: 'Datenschutzerklärung', keywords: 'Datenschutz DSGVO' },
    fa: { title: 'حریم خصوصی', excerpt: 'حفظ حریم خصوصی', keywords: 'حریم خصوصی' },
  },
  imprint: {
    de: { title: 'Impressum', excerpt: 'Impressum', keywords: 'Impressum' },
    fa: { title: 'اطلاعات حقوقی', excerpt: 'اطلاعات حقوقی', keywords: 'اطلاعات حقوقی' },
  },
};

const faDigits = (n: number) => n.toLocaleString('fa-IR', { useGrouping: false });

export function staticEntries(locale: Locale): IndexEntry[] {
  const base = `/${locale}`;
  const pages: IndexEntry[] = Object.entries(PAGES).map(([path, words]) => ({
    id: `page-static-${path || 'home'}`,
    kind: 'page',
    title: words[locale].title,
    excerpt: words[locale].excerpt,
    keywords: words[locale].keywords,
    href: path ? `${base}/${path}` : base,
  }));

  const surahs: IndexEntry[] = SURAHS.map(([arabic, translit, meaning, page], i) => {
    const n = i + 1;
    return {
      id: `surah-${n}`,
      kind: 'surah',
      title: locale === 'de' ? `${n}. ${translit}` : `سورهٔ ${surahNameFa(n)}`,
      excerpt:
        locale === 'de'
          ? `${meaning} · ${arabic} · Seite ${page}`
          : `${arabic} · سورهٔ ${faDigits(n)} · صفحهٔ ${faDigits(page)}`,
      keywords: `${surahKeywords(n)} Sure ${n} سوره ${n}`,
      href: `${base}/quran/page/${page}#surah-${n}`,
    };
  });

  const juz: IndexEntry[] = JUZ_PAGES.map((page, i) => {
    const n = i + 1;
    return {
      id: `juz-${n}`,
      kind: 'juz',
      title: locale === 'de' ? `Juz ${n}` : `جزء ${faDigits(n)}`,
      excerpt: locale === 'de' ? `Seite ${page}` : `صفحهٔ ${faDigits(page)}`,
      keywords: `Juz ${n} Dschuz ${n} جزء ${n} پاره ${n}`,
      href: `${base}/quran/page/${page}`,
    };
  });

  return [...pages, ...surahs, ...juz];
}

/** Index 1–114: the page each surah begins on. */
const SURAH_START = [0, ...SURAHS.map((surah) => surah[3])];

/**
 * A page of the mushaf, when the query names one ("Seite 50", "صفحه ۵۰", or
 * a bare "50"), added to the hits: first when the query said "page", after
 * the best hit when it was only a number — that may as well be a surah's.
 * Not in the index itself: 604 entries that only a number would ever find.
 */
export function withQuranPage(hits: SearchHit[], query: string, locale: Locale): SearchHit[] {
  const asked = pageFromQuery(query);
  if (!asked) return hits;
  const { page } = asked;
  const s = surahOnPage(page, SURAH_START);
  const hit: SearchHit = {
    id: `quran-page-${page}`,
    kind: 'quranPage',
    title: locale === 'de' ? `Seite ${page}` : `صفحهٔ ${faDigits(page)}`,
    excerpt:
      locale === 'de'
        ? `Koran · ${s}. ${SURAHS[s - 1]?.[1] ?? ''}`
        : `قرآن · سورهٔ ${surahNameFa(s)}`,
    href: `/${locale}/quran/page/${page}`,
    rank: 0,
  };
  const rest = hits.filter((other) => other.href !== hit.href);
  const at = asked.named ? 0 : Math.min(1, rest.length);
  return [...rest.slice(0, at), hit, ...rest.slice(at)];
}
