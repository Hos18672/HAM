/**
 * The 114 surahs as the site knows them without asking the Quran API: the
 * Arabic name, the German transliteration and meaning, and the page of the
 * Madani mushaf each one starts on. The search uses these, so a surah can be
 * found even when the API is down and in the static preview, where there is
 * no server to ask.
 *
 * One row per surah: [Arabic, transliteration, German meaning, first page].
 */
export const SURAHS: readonly (readonly [string, string, string, number])[] = [
  ['الفاتحة', 'Al-Fatiha', 'Die Eröffnende', 1],
  ['البقرة', 'Al-Baqara', 'Die Kuh', 2],
  ['آل عمران', 'Al Imran', 'Die Sippe Imrans', 50],
  ['النساء', 'An-Nisa', 'Die Frauen', 77],
  ['المائدة', 'Al-Maida', 'Der Tisch', 106],
  ['الأنعام', "Al-An'am", 'Das Vieh', 128],
  ['الأعراف', "Al-A'raf", 'Die Höhen', 151],
  ['الأنفال', 'Al-Anfal', 'Die Beute', 177],
  ['التوبة', 'At-Tauba', 'Die Reue', 187],
  ['يونس', 'Yunus', 'Jona', 208],
  ['هود', 'Hud', 'Hud', 221],
  ['يوسف', 'Yusuf', 'Josef', 235],
  ['الرعد', "Ar-Ra'd", 'Der Donner', 249],
  ['إبراهيم', 'Ibrahim', 'Abraham', 255],
  ['الحجر', 'Al-Hidschr', 'Al-Hidschr', 262],
  ['النحل', 'An-Nahl', 'Die Bienen', 267],
  ['الإسراء', "Al-Isra'", 'Die Nachtreise', 282],
  ['الكهف', 'Al-Kahf', 'Die Höhle', 293],
  ['مريم', 'Maryam', 'Maria', 305],
  ['طه', 'Ta-Ha', 'Ta-Ha', 312],
  ['الأنبياء', "Al-Anbiya'", 'Die Propheten', 322],
  ['الحج', 'Al-Haddsch', 'Die Pilgerfahrt', 332],
  ['المؤمنون', "Al-Mu'minun", 'Die Gläubigen', 342],
  ['النور', 'An-Nur', 'Das Licht', 350],
  ['الفرقان', 'Al-Furqan', 'Die Unterscheidung', 359],
  ['الشعراء', "Asch-Schu'ara", 'Die Dichter', 367],
  ['النمل', 'An-Naml', 'Die Ameisen', 377],
  ['القصص', 'Al-Qasas', 'Die Erzählung', 385],
  ['العنكبوت', 'Al-Ankabut', 'Die Spinne', 396],
  ['الروم', 'Ar-Rum', 'Die Römer', 404],
  ['لقمان', 'Luqman', 'Luqman', 411],
  ['السجدة', 'As-Sadschda', 'Die Niederwerfung', 415],
  ['الأحزاب', 'Al-Ahzab', 'Die Verbündeten', 418],
  ['سبأ', "Saba'", 'Saba', 428],
  ['فاطر', 'Fatir', 'Der Schöpfer', 434],
  ['يس', 'Ya-Sin', 'Ya-Sin', 440],
  ['الصافات', 'As-Saffat', 'Die sich Reihenden', 446],
  ['ص', 'Sad', 'Sad', 453],
  ['الزمر', 'Az-Zumar', 'Die Scharen', 458],
  ['غافر', 'Ghafir', 'Der Vergebende', 467],
  ['فصلت', 'Fussilat', 'Ausführlich dargelegt', 477],
  ['الشورى', 'Asch-Schura', 'Die Beratung', 483],
  ['الزخرف', 'Az-Zukhruf', 'Der Prunk', 489],
  ['الدخان', 'Ad-Dukhan', 'Der Rauch', 496],
  ['الجاثية', 'Al-Dschathiya', 'Die Kniende', 499],
  ['الأحقاف', 'Al-Ahqaf', 'Die Sanddünen', 502],
  ['محمد', 'Muhammad', 'Muhammad', 507],
  ['الفتح', 'Al-Fath', 'Der Sieg', 511],
  ['الحجرات', 'Al-Hudschurat', 'Die Gemächer', 515],
  ['ق', 'Qaf', 'Qaf', 518],
  ['الذاريات', 'Adh-Dhariyat', 'Die Aufwirbelnden', 520],
  ['الطور', 'At-Tur', 'Der Berg', 523],
  ['النجم', 'An-Nadschm', 'Der Stern', 526],
  ['القمر', 'Al-Qamar', 'Der Mond', 528],
  ['الرحمن', 'Ar-Rahman', 'Der Allerbarmer', 531],
  ['الواقعة', "Al-Waqi'a", 'Das eintreffende Ereignis', 534],
  ['الحديد', 'Al-Hadid', 'Das Eisen', 537],
  ['المجادلة', 'Al-Mudschadila', 'Die Streitende', 542],
  ['الحشر', 'Al-Haschr', 'Die Versammlung', 545],
  ['الممتحنة', 'Al-Mumtahana', 'Die Geprüfte', 549],
  ['الصف', 'As-Saff', 'Die Reihe', 551],
  ['الجمعة', "Al-Dschumu'a", 'Der Freitag', 553],
  ['المنافقون', 'Al-Munafiqun', 'Die Heuchler', 554],
  ['التغابن', 'At-Taghabun', 'Die Übervorteilung', 556],
  ['الطلاق', 'At-Talaq', 'Die Scheidung', 558],
  ['التحريم', 'At-Tahrim', 'Das Verbot', 560],
  ['الملك', 'Al-Mulk', 'Die Herrschaft', 562],
  ['القلم', 'Al-Qalam', 'Das Schreibrohr', 564],
  ['الحاقة', 'Al-Haqqa', 'Die Unausweichliche', 566],
  ['المعارج', "Al-Ma'aridsch", 'Die Himmelsleitern', 568],
  ['نوح', 'Nuh', 'Noah', 570],
  ['الجن', 'Al-Dschinn', 'Die Dschinn', 572],
  ['المزمل', 'Al-Muzzammil', 'Der Verhüllte', 574],
  ['المدثر', 'Al-Muddaththir', 'Der Zugedeckte', 575],
  ['القيامة', 'Al-Qiyama', 'Die Auferstehung', 577],
  ['الإنسان', 'Al-Insan', 'Der Mensch', 578],
  ['المرسلات', 'Al-Mursalat', 'Die Gesandten', 580],
  ['النبأ', "An-Naba'", 'Die Kunde', 582],
  ['النازعات', "An-Nazi'at", 'Die Entreißenden', 583],
  ['عبس', 'Abasa', 'Er runzelte die Stirn', 585],
  ['التكوير', 'At-Takwir', 'Das Umschlingen', 586],
  ['الانفطار', 'Al-Infitar', 'Das Zerbrechen', 587],
  ['المطففين', 'Al-Mutaffifin', 'Die das Maß Verkürzenden', 587],
  ['الانشقاق', 'Al-Inschiqaq', 'Das Aufbrechen', 589],
  ['البروج', 'Al-Burudsch', 'Die Türme', 590],
  ['الطارق', 'At-Tariq', 'Der Nachtstern', 591],
  ['الأعلى', "Al-A'la", 'Der Höchste', 591],
  ['الغاشية', 'Al-Ghaschiya', 'Die Bedeckende', 592],
  ['الفجر', 'Al-Fadschr', 'Die Morgendämmerung', 593],
  ['البلد', 'Al-Balad', 'Die Stadt', 594],
  ['الشمس', 'Asch-Schams', 'Die Sonne', 595],
  ['الليل', 'Al-Lail', 'Die Nacht', 595],
  ['الضحى', 'Ad-Duha', 'Der Vormittag', 596],
  ['الشرح', 'Asch-Scharh', 'Die Weitung', 596],
  ['التين', 'At-Tin', 'Die Feige', 597],
  ['العلق', "Al-'Alaq", 'Das Anhängsel', 597],
  ['القدر', 'Al-Qadr', 'Die Bestimmung', 598],
  ['البينة', 'Al-Bayyina', 'Der klare Beweis', 598],
  ['الزلزلة', 'Az-Zalzala', 'Das Beben', 599],
  ['العاديات', "Al-'Adiyat", 'Die Rennenden', 599],
  ['القارعة', "Al-Qari'a", 'Das Pochende', 600],
  ['التكاثر', 'At-Takathur', 'Die Vermehrung', 600],
  ['العصر', "Al-'Asr", 'Die Zeit', 601],
  ['الهمزة', 'Al-Humaza', 'Der Stichler', 601],
  ['الفيل', 'Al-Fil', 'Der Elefant', 601],
  ['قريش', 'Quraisch', 'Quraisch', 602],
  ['الماعون', "Al-Ma'un", 'Die Hilfeleistung', 602],
  ['الكوثر', 'Al-Kauthar', 'Die Fülle', 602],
  ['الكافرون', 'Al-Kafirun', 'Die Ungläubigen', 603],
  ['النصر', 'An-Nasr', 'Die Hilfe', 603],
  ['المسد', 'Al-Masad', 'Die Palmfaser', 603],
  ['الإخلاص', 'Al-Ikhlas', 'Die Aufrichtigkeit', 604],
  ['الفلق', 'Al-Falaq', 'Das Morgengrauen', 604],
  ['الناس', 'An-Nas', 'Die Menschen', 604],
];

/** The page each juz starts on, index 0 for juz 1. */
export const JUZ_PAGES: readonly number[] = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402,
  422, 442, 462, 482, 502, 522, 542, 562, 582,
];

/**
 * Other spellings people type for a surah: the English ones the Quran API
 * and most apps use, and the Persian names that differ from the Arabic by
 * more than the article.
 */
const ALIASES: Record<number, string> = {
  1: 'Fatihah Faatiha Hamd حمد',
  2: 'Baqarah',
  3: 'Imran Aal-Imran',
  9: "Tawbah Taubah Bara'a برائت",
  15: 'Hijr',
  17: "Bani Isra'il Isra بنی اسرائیل",
  22: 'Hajj Hadsch',
  32: 'Sajdah Sajda',
  36: 'Yasin Yaseen Yasien یاسین',
  38: 'Saad صاد',
  40: "Mu'min Ghafir مؤمن",
  41: 'Fussilat Ha-Mim Sajda',
  45: 'Jathiya',
  47: 'Qital',
  49: 'Hujurat',
  50: 'Qaaf قاف',
  53: 'Najm',
  55: 'Rahman',
  58: 'Mujadila',
  62: "Jumu'ah Jumua Jumah",
  70: "Ma'arij",
  72: 'Jinn',
  76: 'Dahr Insan دهر',
  83: 'Tatfif تطفیف',
  85: 'Buruj',
  88: 'Ghashiya',
  89: 'Fajr',
  91: 'Shams',
  94: 'Sharh Inshirah انشراح',
  98: 'Bayyinah',
  99: 'Zalzalah Zilzal',
  106: 'Quraysh Quraish',
  108: 'Kawthar Kausar',
  111: 'Lahab Tabbat لهب تبت',
  112: 'Tauhid Tawhid توحید',
};

/** A surah's name the Persian way: no article, and the Persian letters. */
export function surahNameFa(number: number): string {
  const arabic = SURAHS[number - 1]?.[0] ?? '';
  return arabic
    .replace(/^ال(?=..)/, '')
    .replace(/ة/g, 'ه')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[أإ]/g, 'ا');
}

/** Everything a surah answers to, for search: names in every script and the aliases. */
export function surahKeywords(number: number): string {
  const row = SURAHS[number - 1];
  if (!row) return '';
  return [row[0], surahNameFa(number), row[1], row[2], ALIASES[number] ?? ''].join(' ');
}
