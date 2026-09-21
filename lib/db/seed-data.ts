/**
 * All of the association's content, in both languages.
 *
 * This file is the single source of the initial database. The admin area edits
 * these rows afterwards; nothing here is read at runtime. Structure mirrors the
 * schema: a base object plus a `fa` and a `de` translation, never one language
 * derived from the other.
 */

export interface Bi<T> {
  fa: T;
  de: T;
}

export const ASSOCIATION = {
  nameFa: 'خانهٔ همهٔ انسان‌ها — انصار المهدی (عج)',
  nameDe: 'Haus aller Menschen – Ansar al-Mahdi (a.j.)',
  street: 'Sautergasse 34–38',
  postcode: '1170',
  city: 'Wien',
  district: 'Hernals',
  country: 'Österreich',
  email: 'info@haus-aller-menschen.at',
  phone: '+43 1 000 00 00',
  zvr: '000000000',
  iban: 'AT00 0000 0000 0000 0000',
  mapUrl: 'https://www.openstreetmap.org/?mlat=48.2175&mlon=16.3260#map=17/48.2175/16.3260',
  latitude: 48.2175,
  longitude: 16.326,
} as const;

/* ─── Page headers ───────────────────────────────────────────────────────── */

export const PAGES: {
  key: string;
  sort: number;
  fa: { kicker: string; title: string; lead: string };
  de: { kicker: string; title: string; lead: string };
}[] = [
  {
    key: 'home',
    sort: 0,
    fa: {
      kicker: 'وین ۱۱۷۰ · هرنالس',
      title: 'خانه‌ای که در آن هیچ‌کس غریبه نیست',
      lead: 'انجمن فرهنگی، آموزشی، ورزشی و اجتماعی انصار المهدی (عج) در قلب هرنالس. جایی برای آموختن، ورزش کردن، دعا خواندن و در کنار هم بودن — برای فارسی‌زبانان وین و برای همهٔ همسایگان.',
    },
    de: {
      kicker: 'Wien 1170 · Hernals',
      title: 'Ein Haus, in dem niemand fremd ist',
      lead: 'Der Kultur-, Bildungs-, Sport- und Sozialverein Ansar al-Mahdi (a.j.) mitten in Hernals. Ein Ort zum Lernen, für Sport, für das Gebet und für das Miteinander — für die persischsprachige Gemeinschaft in Wien und für die ganze Nachbarschaft.',
    },
  },
  {
    key: 'about',
    sort: 1,
    fa: {
      kicker: 'دربارهٔ ما',
      title: 'ما که هستیم',
      lead: 'انجمنی که از دل یک همسایگی برخاسته است و می‌خواهد همان‌جا هم بماند.',
    },
    de: {
      kicker: 'Über uns',
      title: 'Wer wir sind',
      lead: 'Ein Verein, der aus einer Nachbarschaft entstanden ist — und genau dort bleiben will.',
    },
  },
  {
    key: 'activities',
    sort: 2,
    fa: {
      kicker: 'فعالیت‌ها',
      title: 'آنچه در این خانه می‌گذرد',
      lead: 'از کلاس زبان تا تمرین والیبال، از شب شعر تا کمک به همسایه — همهٔ زمینه‌های کار ما در یک نگاه.',
    },
    de: {
      kicker: 'Angebote',
      title: 'Was in diesem Haus passiert',
      lead: 'Vom Sprachkurs bis zum Volleyballtraining, vom Lyrikabend bis zur Nachbarschaftshilfe — alle unsere Bereiche auf einen Blick.',
    },
  },
  {
    key: 'courses',
    sort: 3,
    fa: {
      kicker: 'کلاس‌ها',
      title: 'یاد گرفتن، در هر سنی',
      lead: 'کلاس‌های ما برای کودکان، نوجوانان و بزرگسالان باز است. شرکت در بیشتر کلاس‌ها رایگان یا با هزینهٔ نمادین است.',
    },
    de: {
      kicker: 'Kurse',
      title: 'Lernen, in jedem Alter',
      lead: 'Unsere Kurse stehen Kindern, Jugendlichen und Erwachsenen offen. Die meisten sind kostenlos oder kosten einen symbolischen Beitrag.',
    },
  },
  {
    key: 'culture',
    sort: 4,
    fa: {
      kicker: 'فرهنگ',
      title: 'زبان، شعر، خاطره',
      lead: 'فرهنگ برای ما نمایشگاه نیست؛ شیوهٔ کنار هم نشستن است. شب شعر، موسیقی، نوروز، و گفت‌وگو دربارهٔ آنچه با خود آورده‌ایم.',
    },
    de: {
      kicker: 'Kultur',
      title: 'Sprache, Dichtung, Erinnerung',
      lead: 'Kultur ist für uns keine Ausstellung, sondern eine Art des Beisammensitzens. Lyrikabende, Musik, Nouruz — und das Gespräch über das, was wir mitgebracht haben.',
    },
  },
  {
    key: 'sport',
    sort: 5,
    fa: {
      kicker: 'ورزش',
      title: 'حرکت، برای همه',
      lead: 'ورزش ساده‌ترین راه آشنا شدن است. سالن ما برای گروه‌های زنان، مردان، کودکان و خانواده‌ها باز است.',
    },
    de: {
      kicker: 'Sport',
      title: 'Bewegung, für alle',
      lead: 'Sport ist der einfachste Weg, einander kennenzulernen. Unser Saal steht Frauen-, Männer-, Kinder- und Familiengruppen offen.',
    },
  },
  {
    key: 'events',
    sort: 6,
    fa: {
      kicker: 'برنامه‌ها',
      title: 'تقویم ما',
      lead: 'برنامه‌های پیش رو، مناسبت‌ها و نشست‌های ماهانه. برنامه‌های گذشته بایگانی می‌شوند و حذف نمی‌شوند.',
    },
    de: {
      kicker: 'Termine',
      title: 'Unser Kalender',
      lead: 'Kommende Veranstaltungen, Gedenktage und monatliche Treffen. Vergangene Termine werden archiviert, nicht gelöscht.',
    },
  },
  {
    key: 'community',
    sort: 7,
    fa: {
      kicker: 'همیاری',
      title: 'همسایگی یعنی کار',
      lead: 'ترجمهٔ یک نامهٔ اداری، همراهی در مراجعه به پزشک، درس کمکی برای یک نوجوان — بیشتر کار ما همین چیزهای کوچک است.',
    },
    de: {
      kicker: 'Gemeinschaft',
      title: 'Nachbarschaft ist Arbeit',
      lead: 'Ein Amtsbrief, der übersetzt werden muss, eine Begleitung zum Arzt, Nachhilfe für eine Jugendliche — das meiste unserer Arbeit sind solche kleinen Dinge.',
    },
  },
  {
    key: 'gallery',
    sort: 8,
    fa: {
      kicker: 'گالری',
      title: 'تصویرهایی از این خانه',
      lead: 'نگاهی به برنامه‌ها، کلاس‌ها و روزهای معمولی ما.',
    },
    de: {
      kicker: 'Galerie',
      title: 'Bilder aus diesem Haus',
      lead: 'Ein Blick auf Veranstaltungen, Kurse und ganz gewöhnliche Tage bei uns.',
    },
  },
  {
    key: 'qibla',
    sort: 9,
    fa: {
      kicker: 'قبله',
      title: 'جهت قبله از وین',
      lead: 'جهت قبله از ساختمان انجمن، و راهی برای یافتن آن از هر جایی که هستید.',
    },
    de: {
      kicker: 'Qibla',
      title: 'Die Gebetsrichtung ab Wien',
      lead: 'Die Qibla ab unserem Vereinshaus — und ein Weg, sie von überall aus zu finden.',
    },
  },
  {
    key: 'prayer',
    sort: 10,
    fa: {
      kicker: 'اوقات شرعی',
      title: 'اوقات شرعی وین',
      lead: 'اوقات شرعی بر پایهٔ روش جعفری، محاسبه‌شده برای وین. همراه با تقویم قمری و مناسبت‌های اهل بیت (ع).',
    },
    de: {
      kicker: 'Gebetszeiten',
      title: 'Gebetszeiten für Wien',
      lead: 'Gebetszeiten nach der dschaʿfaritischen Methode, berechnet für Wien. Mit Hidschri-Kalender und den Gedenktagen der Ahl al-Bait (a.).',
    },
  },
  {
    key: 'duas',
    sort: 11,
    fa: {
      kicker: 'ادعیه و زیارات',
      title: 'دعاها، زیارات و تعقیبات',
      lead: 'مجموعه‌ای از دعاها و زیاراتی که در این خانه خوانده می‌شود، با اشاره‌ای کوتاه به زمان خواندن و منبع هر یک.',
    },
    de: {
      kicker: 'Bittgebete',
      title: 'Duʿa, Ziyarat und Taʿqibat',
      lead: 'Eine Sammlung der Gebete, die in diesem Haus gelesen werden — mit einem kurzen Hinweis auf Anlass und Quelle.',
    },
  },
  {
    key: 'support',
    sort: 12,
    fa: {
      kicker: 'عضویت و پشتیبانی',
      title: 'این خانه را با هم نگه می‌داریم',
      lead: 'اجاره، گرمایش، وسایل کلاس و توپ‌های ورزشی از حق عضویت و کمک‌های شما تأمین می‌شود. هیچ‌کس در این انجمن حقوق نمی‌گیرد.',
    },
    de: {
      kicker: 'Mitgliedschaft & Unterstützung',
      title: 'Dieses Haus halten wir gemeinsam',
      lead: 'Miete, Heizung, Unterrichtsmaterial und Sportgeräte werden aus Mitgliedsbeiträgen und Spenden bezahlt. Niemand in diesem Verein bezieht ein Gehalt.',
    },
  },
  {
    key: 'contact',
    sort: 13,
    fa: {
      kicker: 'تماس',
      title: 'به ما سر بزنید',
      lead: 'در ساعات کار در به روی همه باز است. پیش از آمدن لازم نیست وقت بگیرید.',
    },
    de: {
      kicker: 'Kontakt',
      title: 'Besuchen Sie uns',
      lead: 'Während der Öffnungszeiten steht die Tür allen offen. Einen Termin brauchen Sie nicht.',
    },
  },
  {
    key: 'privacy',
    sort: 14,
    fa: { kicker: 'حقوقی', title: 'حریم خصوصی', lead: 'چه داده‌ای را نگه می‌داریم، چرا، و تا کی.' },
    de: {
      kicker: 'Rechtliches',
      title: 'Datenschutz',
      lead: 'Welche Daten wir speichern, warum — und wie lange.',
    },
  },
  {
    key: 'imprint',
    sort: 15,
    fa: { kicker: 'حقوقی', title: 'شناسنامهٔ حقوقی', lead: 'اطلاعات قانونی مطابق قوانین اتریش.' },
    de: {
      kicker: 'Rechtliches',
      title: 'Impressum',
      lead: 'Offenlegung nach österreichischem Recht.',
    },
  },
];

/* ─── Free-form blocks, keyed by page ────────────────────────────────────── */

export const BLOCKS: {
  pageKey: string;
  blockKey: string;
  kind: 'text' | 'richtext' | 'list';
  sort: number;
  fa: { text?: string; items?: string[] };
  de: { text?: string; items?: string[] };
}[] = [
  /* home */
  {
    pageKey: 'home',
    blockKey: 'hero_badge',
    kind: 'text',
    sort: 0,
    fa: { text: 'تازه گشوده شده' },
    de: { text: 'Neu eröffnet' },
  },
  {
    pageKey: 'home',
    blockKey: 'hero_chips',
    kind: 'list',
    sort: 1,
    fa: { items: ['کلاس زبان', 'ورزش', 'شب شعر', 'مشاورهٔ اداری', 'برنامهٔ کودکان'] },
    de: { items: ['Sprachkurse', 'Sport', 'Lyrikabend', 'Amtswegehilfe', 'Kinderprogramm'] },
  },
  {
    pageKey: 'home',
    blockKey: 'intro_line',
    kind: 'text',
    sort: 2,
    fa: { text: 'خانه‌ای برای یاد گرفتن، ورزش کردن و در کنار هم بودن.' },
    de: { text: 'Ein Haus zum Lernen, für Bewegung und für das Miteinander.' },
  },
  {
    pageKey: 'home',
    blockKey: 'intro_body',
    kind: 'richtext',
    sort: 3,
    fa: {
      text: 'ما گروهی از خانواده‌های فارسی‌زبان وین هستیم که چند سال در خانه‌های یکدیگر جمع می‌شدیم تا اینکه جایی از آنِ خودمان پیدا کردیم. این خانه پیش از آنکه مرکز فرهنگی باشد، اتاق نشیمن است: کسی درس می‌خواند، کسی چای می‌ریزد، بچه‌ها در راهرو می‌دوند. هر کسی می‌تواند بیاید — مسلمان و غیرمسلمان، تازه‌وارد و وینیِ چند نسل.',
    },
    de: {
      text: 'Wir sind eine Gruppe persischsprachiger Familien aus Wien, die sich jahrelang in Privatwohnungen getroffen hat, bis wir einen eigenen Ort gefunden haben. Dieses Haus ist weniger ein Kulturzentrum als ein Wohnzimmer: jemand lernt, jemand macht Tee, die Kinder laufen durch den Gang. Kommen kann jede und jeder — muslimisch oder nicht, gerade angekommen oder in dritter Generation in Wien.',
    },
  },
  {
    pageKey: 'home',
    blockKey: 'vienna_title',
    kind: 'text',
    sort: 4,
    fa: { text: 'هرنالس، جایی که هستیم' },
    de: { text: 'Hernals, wo wir sind' },
  },
  {
    pageKey: 'home',
    blockKey: 'vienna_body',
    kind: 'richtext',
    sort: 5,
    fa: {
      text: 'زاوترگاسه در منطقهٔ هفدهم وین است، چند دقیقه پیاده تا ایستگاه هرنالس و خط ۴۳ تراموا. هرنالس محله‌ای است که در آن ده‌ها زبان شنیده می‌شود؛ ما یکی از آن‌ها را با خود آورده‌ایم و بقیه را در همین کوچه یاد می‌گیریم. در ورودی پله ندارد و سالن در طبقهٔ همکف است.',
    },
    de: {
      text: 'Die Sautergasse liegt im 17. Bezirk, ein paar Gehminuten von der Station Hernals und der Linie 43 entfernt. Hernals ist ein Grätzl, in dem Dutzende Sprachen zu hören sind; eine davon haben wir mitgebracht, die anderen lernen wir in derselben Gasse. Der Eingang ist stufenlos, der Saal liegt im Erdgeschoß.',
    },
  },
  {
    pageKey: 'home',
    blockKey: 'footer_mission',
    kind: 'text',
    sort: 6,
    fa: {
      text: 'انجمن انصار المهدی (عج) انجمنی غیرانتفاعی و ثبت‌شده در وین است. کار ما تماماً داوطلبانه است.',
    },
    de: {
      text: 'Der Verein Ansar al-Mahdi (a.j.) ist ein gemeinnütziger, in Wien eingetragener Verein. Unsere Arbeit ist vollständig ehrenamtlich.',
    },
  },
  /* about */
  {
    pageKey: 'about',
    blockKey: 'body_1',
    kind: 'richtext',
    sort: 0,
    fa: {
      text: 'انجمن ما در سال‌های اخیر از یک حلقهٔ کوچک خانوادگی به جایی رسیده است که هفته‌ای چند بار در آن برنامه برگزار می‌شود. آغاز کار ساده بود: چند خانواده که می‌خواستند بچه‌هایشان فارسی را از یاد نبرند و در عین حال در وین احساس غریبگی نکنند. نام «خانهٔ همهٔ انسان‌ها» را از همان روزها با خود داریم، چون از ابتدا روشن بود که این در فقط به روی گروه خودمان باز نیست.',
    },
    de: {
      text: 'Unser Verein ist in den letzten Jahren aus einem kleinen Familienkreis zu einem Ort geworden, an dem mehrmals wöchentlich etwas stattfindet. Der Anfang war einfach: ein paar Familien, die wollten, dass ihre Kinder Persisch nicht verlernen und sich in Wien trotzdem nicht fremd fühlen. Den Namen „Haus aller Menschen“ tragen wir seit damals, weil von Anfang an klar war, dass diese Tür nicht nur der eigenen Gruppe offensteht.',
    },
  },
  {
    pageKey: 'about',
    blockKey: 'body_2',
    kind: 'richtext',
    sort: 1,
    fa: {
      text: 'ما انجمنی شیعی هستیم و این را پنهان نمی‌کنیم: مناسبت‌های اهل بیت (ع) را گرامی می‌داریم و دعا و زیارت بخشی از هفتهٔ ماست. اما هیچ برنامه‌ای در این خانه شرط اعتقادی ندارد. همسایهٔ مسیحی‌مان در کلاس آلمانی می‌نشیند، دخترها با هم والیبال بازی می‌کنند و در شب شعر، حافظ و ریلکه پشت سر هم خوانده می‌شوند.',
    },
    de: {
      text: 'Wir sind ein schiitischer Verein und machen daraus kein Geheimnis: Wir begehen die Gedenktage der Ahl al-Bait (a.), und Gebet und Ziyarat gehören zu unserer Woche. Keine Veranstaltung in diesem Haus setzt aber ein Bekenntnis voraus. Unser christlicher Nachbar sitzt im Deutschkurs, die Mädchen spielen gemeinsam Volleyball, und am Lyrikabend werden Hafis und Rilke hintereinander gelesen.',
    },
  },
  {
    pageKey: 'about',
    blockKey: 'pull_quote',
    kind: 'text',
    sort: 2,
    fa: { text: 'در به روی کسی بسته نیست که نامش را نمی‌دانیم.' },
    de: { text: 'Keine Tür bleibt jemandem verschlossen, dessen Namen wir noch nicht kennen.' },
  },
  /* culture */
  {
    pageKey: 'culture',
    blockKey: 'poem_text',
    kind: 'text',
    sort: 0,
    fa: {
      text: 'بنی‌آدم اعضای یک پیکرند\nکه در آفرینش ز یک گوهرند\nچو عضوی به درد آورد روزگار\nدگر عضوها را نماند قرار',
    },
    de: {
      text: 'Die Menschenkinder sind ja alle Brüder,\naus einem Stoff wie eines Leibes Glieder.\nHat Krankheit nur ein einzig Glied erfaßt,\nso bleibt den andern weder Ruh noch Rast.',
    },
  },
  {
    pageKey: 'culture',
    blockKey: 'poem_attribution',
    kind: 'text',
    sort: 1,
    fa: { text: 'سعدی شیرازی، گلستان' },
    de: { text: 'Saadi von Schiras, Golestan' },
  },
  {
    pageKey: 'culture',
    blockKey: 'theme_chips',
    kind: 'list',
    sort: 2,
    fa: { items: ['شعر کلاسیک', 'شعر معاصر', 'موسیقی', 'نوروز', 'خوش‌نویسی', 'سینما'] },
    de: {
      items: [
        'Klassische Dichtung',
        'Moderne Lyrik',
        'Musik',
        'Nouruz',
        'Kalligrafie',
        'Film',
      ],
    },
  },
  /* contact */
  {
    pageKey: 'contact',
    blockKey: 'opening_hours',
    kind: 'list',
    sort: 0,
    fa: {
      items: [
        'دوشنبه تا پنجشنبه · ۱۶:۰۰ تا ۲۰:۰۰',
        'جمعه · ۱۴:۰۰ تا ۲۲:۰۰',
        'شنبه · ۱۰:۰۰ تا ۱۸:۰۰',
        'یکشنبه · بنا به برنامه',
      ],
    },
    de: {
      items: [
        'Montag bis Donnerstag · 16:00–20:00',
        'Freitag · 14:00–22:00',
        'Samstag · 10:00–18:00',
        'Sonntag · nach Programm',
      ],
    },
  },
  /* support */
  {
    pageKey: 'support',
    blockKey: 'donation_purposes',
    kind: 'list',
    sort: 0,
    fa: { items: ['هزینهٔ عمومی خانه', 'کلاس‌های کودکان', 'تجهیزات ورزشی', 'کمک به همسایگان'] },
    de: {
      items: ['Allgemeiner Hausbetrieb', 'Kinderkurse', 'Sportausrüstung', 'Nachbarschaftshilfe'],
    },
  },
  {
    pageKey: 'support',
    blockKey: 'account_holder',
    kind: 'text',
    sort: 1,
    fa: { text: 'انصار المهدی (عج) — خانهٔ همهٔ انسان‌ها' },
    de: { text: 'Ansar al-Mahdi (a.j.) – Haus aller Menschen' },
  },
  /* community */
  {
    pageKey: 'community',
    blockKey: 'cta_note',
    kind: 'text',
    sort: 0,
    fa: {
      text: 'برای همکاری داوطلبانه لازم نیست فارسی بدانید و لازم نیست عضو باشید. دو ساعت در هفته هم کمک بزرگی است.',
    },
    de: {
      text: 'Für die Mitarbeit brauchen Sie weder Persisch noch eine Mitgliedschaft. Auch zwei Stunden in der Woche sind eine große Hilfe.',
    },
  },
];

/* ─── Offers (areas of work) ─────────────────────────────────────────────── */

export const OFFERS: {
  icon: string;
  sort: number;
  fa: { title: string; body: string };
  de: { title: string; body: string };
}[] = [
  {
    icon: 'BookOpen',
    sort: 0,
    fa: {
      title: 'آموزش',
      body: 'کلاس آلمانی برای بزرگسالان، فارسی برای کودکان، درس کمکی برای نوجوانان مدرسه‌ای و کارگاه آمادگی برای آزمون‌های زبان.',
    },
    de: {
      title: 'Bildung',
      body: 'Deutschkurse für Erwachsene, Persisch für Kinder, Nachhilfe für Schülerinnen und Schüler sowie Vorbereitung auf Sprachprüfungen.',
    },
  },
  {
    icon: 'HandsPraying',
    sort: 1,
    fa: {
      title: 'معارف و دعا',
      body: 'دعای کمیل شب‌های جمعه، زیارت عاشورا، جلسات ماهانهٔ قرآن و برنامه‌های مناسبتی اهل بیت (ع).',
    },
    de: {
      title: 'Religiöses Leben',
      body: 'Duʿa Kumail am Donnerstagabend, Ziyarat Aschura, monatliche Koranrunden und die Programme zu den Gedenktagen der Ahl al-Bait (a.).',
    },
  },
  {
    icon: 'Volleyball',
    sort: 2,
    fa: {
      title: 'ورزش',
      body: 'والیبال، فوتسال و ژیمناستیک سبک در سالن خودمان — با گروه‌های جداگانهٔ زنان و مردان و ساعت خانوادگی.',
    },
    de: {
      title: 'Sport',
      body: 'Volleyball, Futsal und leichte Gymnastik im eigenen Saal — mit getrennten Frauen- und Männergruppen und einer Familienstunde.',
    },
  },
  {
    icon: 'MaskHappy',
    sort: 3,
    fa: {
      title: 'فرهنگ',
      body: 'شب شعر، موسیقی زنده، جشن نوروز و یلدا، نمایش فیلم و کارگاه خوش‌نویسی.',
    },
    de: {
      title: 'Kultur',
      body: 'Lyrikabende, Livemusik, Nouruz- und Yalda-Feste, Filmabende und Kalligrafie-Workshops.',
    },
  },
  {
    icon: 'Handshake',
    sort: 4,
    fa: {
      title: 'مشاورهٔ اداری',
      body: 'کمک در پر کردن فرم‌ها، ترجمهٔ نامه‌های اداری و همراهی در مراجعه به اداره‌ها و پزشک.',
    },
    de: {
      title: 'Amtswegehilfe',
      body: 'Unterstützung beim Ausfüllen von Formularen, Übersetzung von Behördenbriefen und Begleitung zu Ämtern und Arztterminen.',
    },
  },
  {
    icon: 'UsersThree',
    sort: 5,
    fa: {
      title: 'کودکان و نوجوانان',
      body: 'برنامهٔ بعدازظهر شنبه‌ها، گروه نوجوانان، و اردوهای کوتاه در تعطیلات.',
    },
    de: {
      title: 'Kinder & Jugend',
      body: 'Samstagnachmittags-Programm, Jugendgruppe und kurze Ausflüge in den Ferien.',
    },
  },
];

/* ─── Courses ────────────────────────────────────────────────────────────── */

export const COURSES: {
  slug: string;
  category: string;
  level: string;
  sort: number;
  fa: { title: string; body: string; targetGroup: string; schedule: string; languages: string };
  de: { title: string; body: string; targetGroup: string; schedule: string; languages: string };
}[] = [
  {
    slug: 'deutsch-a1',
    category: 'language',
    level: 'A1',
    sort: 0,
    fa: {
      title: 'آلمانی از پایه (A1)',
      body: 'برای کسانی که تازه به وین آمده‌اند. از الفبا و جمله‌های روزمره شروع می‌کنیم؛ توضیح‌ها به فارسی داده می‌شود.',
      targetGroup: 'بزرگسالان، بدون پیش‌نیاز',
      schedule: 'دوشنبه و چهارشنبه، ۱۷:۰۰ تا ۱۸:۳۰',
      languages: 'آلمانی، فارسی',
    },
    de: {
      title: 'Deutsch von Anfang an (A1)',
      body: 'Für alle, die neu in Wien sind. Wir beginnen beim Alphabet und bei Alltagssätzen; erklärt wird auf Persisch.',
      targetGroup: 'Erwachsene, ohne Vorkenntnisse',
      schedule: 'Montag & Mittwoch, 17:00–18:30',
      languages: 'Deutsch, Persisch',
    },
  },
  {
    slug: 'deutsch-b1',
    category: 'language',
    level: 'B1',
    sort: 1,
    fa: {
      title: 'آلمانی پیشرفته (B1)',
      body: 'تمرین گفت‌وگو، نامه‌نگاری اداری و آمادگی برای آزمون ÖIF. هر جلسه با یک موقعیت واقعی شروع می‌شود.',
      targetGroup: 'بزرگسالان با سطح A2',
      schedule: 'سه‌شنبه، ۱۸:۰۰ تا ۲۰:۰۰',
      languages: 'آلمانی',
    },
    de: {
      title: 'Deutsch für Fortgeschrittene (B1)',
      body: 'Sprechübungen, Behördenkorrespondenz und Vorbereitung auf die ÖIF-Prüfung. Jede Einheit beginnt mit einer echten Alltagssituation.',
      targetGroup: 'Erwachsene mit Niveau A2',
      schedule: 'Dienstag, 18:00–20:00',
      languages: 'Deutsch',
    },
  },
  {
    slug: 'farsi-kinder',
    category: 'children',
    level: '',
    sort: 2,
    fa: {
      title: 'فارسی برای کودکان',
      body: 'خواندن و نوشتن فارسی برای بچه‌های شش تا دوازده سال، با قصه، بازی و کمی شعر.',
      targetGroup: 'کودکان ۶ تا ۱۲ سال',
      schedule: 'شنبه، ۱۰:۳۰ تا ۱۲:۰۰',
      languages: 'فارسی',
    },
    de: {
      title: 'Persisch für Kinder',
      body: 'Persisch lesen und schreiben für Kinder von sechs bis zwölf, mit Geschichten, Spielen und ein wenig Poesie.',
      targetGroup: 'Kinder von 6 bis 12',
      schedule: 'Samstag, 10:30–12:00',
      languages: 'Persisch',
    },
  },
  {
    slug: 'nachhilfe',
    category: 'children',
    level: '',
    sort: 3,
    fa: {
      title: 'درس کمکی',
      body: 'ریاضی، آلمانی و انگلیسی برای دانش‌آموزان دبستان و دورهٔ اول متوسطه. داوطلبانه و رایگان.',
      targetGroup: 'دانش‌آموزان کلاس ۱ تا ۸',
      schedule: 'پنجشنبه، ۱۶:۰۰ تا ۱۸:۰۰',
      languages: 'آلمانی، فارسی',
    },
    de: {
      title: 'Lernhilfe',
      body: 'Mathematik, Deutsch und Englisch für Volksschule und Unterstufe. Ehrenamtlich und kostenlos.',
      targetGroup: 'Schülerinnen und Schüler der 1.–8. Schulstufe',
      schedule: 'Donnerstag, 16:00–18:00',
      languages: 'Deutsch, Persisch',
    },
  },
  {
    slug: 'quran-tajwid',
    category: 'religion',
    level: '',
    sort: 4,
    fa: {
      title: 'قرآن و تجوید',
      body: 'روخوانی، تجوید و ترجمهٔ آیات، در حلقه‌ای کوچک و بدون آزمون.',
      targetGroup: 'نوجوانان و بزرگسالان',
      schedule: 'یکشنبه، ۱۱:۰۰ تا ۱۲:۳۰',
      languages: 'فارسی، عربی',
    },
    de: {
      title: 'Koran & Tadschwid',
      body: 'Rezitation, Tadschwid und Übersetzung der Verse — in kleiner Runde und ohne Prüfung.',
      targetGroup: 'Jugendliche und Erwachsene',
      schedule: 'Sonntag, 11:00–12:30',
      languages: 'Persisch, Arabisch',
    },
  },
  {
    slug: 'kalligrafie',
    category: 'art',
    level: '',
    sort: 5,
    fa: {
      title: 'کارگاه خوش‌نویسی',
      body: 'نستعلیق با قلم نی، از خط اول تا یک بیت کامل. وسایل در محل هست.',
      targetGroup: 'از ۱۴ سال به بالا',
      schedule: 'هر دو هفته یک‌بار، جمعه ۱۷:۰۰',
      languages: 'فارسی، آلمانی',
    },
    de: {
      title: 'Kalligrafie-Workshop',
      body: 'Nastaʿliq mit der Rohrfeder, von der ersten Linie bis zum ganzen Vers. Material ist vorhanden.',
      targetGroup: 'ab 14 Jahren',
      schedule: 'Vierzehntägig, Freitag 17:00',
      languages: 'Persisch, Deutsch',
    },
  },
  {
    slug: 'integration-werkstatt',
    category: 'integration',
    level: '',
    sort: 6,
    fa: {
      title: 'کارگاه امور اداری',
      body: 'اینکه AMS چه می‌خواهد، Meldezettel چیست و بیمهٔ درمانی چگونه کار می‌کند — قدم به قدم.',
      targetGroup: 'تازه‌واردان',
      schedule: 'اولین چهارشنبهٔ هر ماه، ۱۸:۰۰',
      languages: 'آلمانی، فارسی',
    },
    de: {
      title: 'Werkstatt Behördenwege',
      body: 'Was das AMS will, was ein Meldezettel ist und wie die Krankenversicherung funktioniert — Schritt für Schritt.',
      targetGroup: 'Neu Zugezogene',
      schedule: 'Jeden ersten Mittwoch im Monat, 18:00',
      languages: 'Deutsch, Persisch',
    },
  },
];

/* ─── Sport ──────────────────────────────────────────────────────────────── */

export const SPORTS: {
  sort: number;
  fa: { activity: string; audience: string; schedule: string };
  de: { activity: string; audience: string; schedule: string };
}[] = [
  {
    sort: 0,
    fa: { activity: 'والیبال (زنان)', audience: 'از ۱۶ سال به بالا', schedule: 'دوشنبه، ۱۹:۰۰ تا ۲۱:۰۰' },
    de: { activity: 'Volleyball (Frauen)', audience: 'ab 16 Jahren', schedule: 'Montag, 19:00–21:00' },
  },
  {
    sort: 1,
    fa: { activity: 'والیبال (مردان)', audience: 'از ۱۶ سال به بالا', schedule: 'چهارشنبه، ۱۹:۰۰ تا ۲۱:۰۰' },
    de: { activity: 'Volleyball (Männer)', audience: 'ab 16 Jahren', schedule: 'Mittwoch, 19:00–21:00' },
  },
  {
    sort: 2,
    fa: { activity: 'فوتسال نوجوانان', audience: 'پسران و دختران ۱۰ تا ۱۵ سال', schedule: 'جمعه، ۱۶:۰۰ تا ۱۷:۳۰' },
    de: { activity: 'Futsal Jugend', audience: 'Burschen und Mädchen von 10 bis 15', schedule: 'Freitag, 16:00–17:30' },
  },
  {
    sort: 3,
    fa: { activity: 'ژیمناستیک سبک', audience: 'برای همه، به‌ویژه سالمندان', schedule: 'سه‌شنبه، ۱۰:۰۰ تا ۱۱:۰۰' },
    de: { activity: 'Leichte Gymnastik', audience: 'Für alle, besonders für Ältere', schedule: 'Dienstag, 10:00–11:00' },
  },
  {
    sort: 4,
    fa: { activity: 'ساعت ورزش خانوادگی', audience: 'خانواده‌ها با کودکان', schedule: 'یکشنبه، ۱۵:۰۰ تا ۱۷:۰۰' },
    de: { activity: 'Familiensportstunde', audience: 'Familien mit Kindern', schedule: 'Sonntag, 15:00–17:00' },
  },
];

/* ─── Culture cards ──────────────────────────────────────────────────────── */

export const CULTURE: { sort: number; fa: { title: string; body: string }; de: { title: string; body: string } }[] = [
  {
    sort: 0,
    fa: { title: 'شب شعر', body: 'یک شب در ماه، هر کس شعری می‌آورد — فارسی، آلمانی یا هر زبان دیگر. بدون داور و بدون میکروفن.' },
    de: { title: 'Lyrikabend', body: 'Einen Abend im Monat bringt jede und jeder ein Gedicht mit — auf Persisch, Deutsch oder in einer anderen Sprache. Ohne Jury und ohne Mikrofon.' },
  },
  {
    sort: 1,
    fa: { title: 'نوروز و یلدا', body: 'دو جشن بزرگ سال با سفرهٔ هفت‌سین، موسیقی زنده و آشپزی مشترک. همسایه‌ها هم دعوت‌اند.' },
    de: { title: 'Nouruz und Yalda', body: 'Die beiden großen Feste des Jahres, mit Haft-Sin-Tisch, Livemusik und gemeinsamem Kochen. Die Nachbarschaft ist eingeladen.' },
  },
  {
    sort: 2,
    fa: { title: 'موسیقی', body: 'تار، سه‌تار و دف — گاهی کنسرت کوچک، گاهی فقط تمرین که در آن هر که بخواهد می‌نشیند و گوش می‌دهد.' },
    de: { title: 'Musik', body: 'Tar, Setar und Daf — manchmal ein kleines Konzert, manchmal nur eine Probe, bei der zuhören darf, wer mag.' },
  },
  {
    sort: 3,
    fa: { title: 'سینما', body: 'نمایش فیلم ایرانی با زیرنویس آلمانی و گفت‌وگو پس از آن. ورود آزاد است.' },
    de: { title: 'Filmabend', body: 'Iranischer Film mit deutschen Untertiteln und Gespräch danach. Der Eintritt ist frei.' },
  },
];

/* ─── Community cards ────────────────────────────────────────────────────── */

export const COMMUNITY: { sort: number; fa: { title: string; body: string }; de: { title: string; body: string } }[] = [
  {
    sort: 0,
    fa: { title: 'کمک به همسایه', body: 'خرید برای کسی که بیمار است، همراهی یک سالمند تا داروخانه، یا فقط زنگ زدن و پرسیدن حال. فهرست کوتاهی داریم و هر کس به اندازهٔ وقتش برمی‌دارد.' },
    de: { title: 'Nachbarschaftshilfe', body: 'Einkaufen für jemanden, der krank ist, eine ältere Person zur Apotheke begleiten oder einfach anrufen und nachfragen. Wir führen eine kurze Liste, und jede nimmt so viel, wie ihre Zeit erlaubt.' },
  },
  {
    sort: 1,
    fa: { title: 'ترجمه و همراهی', body: 'برای مراجعه به اداره، مدرسه یا پزشک کسی همراهتان می‌آید و ترجمه می‌کند. رایگان، و بدون اینکه چیزی از شما پرسیده شود.' },
    de: { title: 'Übersetzen & Begleiten', body: 'Zu Amt, Schule oder Arzt kommt jemand mit und übersetzt. Kostenlos — und ohne dass Sie etwas über sich erzählen müssen.' },
  },
  {
    sort: 2,
    fa: { title: 'همکاری داوطلبانه', body: 'مربی کلاس، کمک در آشپزخانه، مسئول سالن یا تعمیر چیزهایی که خراب می‌شوند. دو ساعت در هفته هم کمک است.' },
    de: { title: 'Ehrenamt', body: 'Kursleitung, Hilfe in der Küche, Saaldienst oder das Reparieren dessen, was kaputtgeht. Auch zwei Stunden in der Woche helfen.' },
  },
];

/* ─── Values ─────────────────────────────────────────────────────────────── */

export const VALUES: { sort: number; fa: { title: string; body: string }; de: { title: string; body: string } }[] = [
  {
    sort: 0,
    fa: { title: 'در باز', body: 'هیچ برنامه‌ای در این خانه شرط اعتقادی، ملیتی یا زبانی ندارد.' },
    de: { title: 'Offene Tür', body: 'Keine Veranstaltung in diesem Haus setzt ein Bekenntnis, eine Staatsbürgerschaft oder eine Sprache voraus.' },
  },
  {
    sort: 1,
    fa: { title: 'کار داوطلبانه', body: 'هیچ‌کس در انجمن حقوق نمی‌گیرد. هر یورویی که می‌رسد صرف خود خانه می‌شود.' },
    de: { title: 'Ehrenamtlich', body: 'Niemand im Verein bezieht ein Gehalt. Jeder Euro, der hereinkommt, bleibt im Haus.' },
  },
  {
    sort: 2,
    fa: { title: 'زبان مادری و زبان کشور', body: 'فارسی را نگه می‌داریم و آلمانی را جدی می‌گیریم. هیچ‌کدام جای دیگری را نمی‌گیرد.' },
    de: { title: 'Muttersprache und Landessprache', body: 'Wir halten das Persische und nehmen das Deutsche ernst. Keines ersetzt das andere.' },
  },
  {
    sort: 3,
    fa: { title: 'احترام میان نسل‌ها', body: 'در این خانه کودک شش‌ساله و پدربزرگ هشتادساله در یک اتاق می‌نشینند و این را یک دستاورد می‌دانیم.' },
    de: { title: 'Respekt zwischen den Generationen', body: 'Hier sitzen ein sechsjähriges Kind und ein achtzigjähriger Großvater im selben Raum — das halten wir für eine Leistung.' },
  },
  {
    sort: 4,
    fa: { title: 'شفافیت', body: 'ترازنامهٔ سالانه در مجمع عمومی خوانده می‌شود و هر عضوی می‌تواند آن را ببیند.' },
    de: { title: 'Transparenz', body: 'Die Jahresrechnung wird in der Generalversammlung verlesen, und jedes Mitglied kann sie einsehen.' },
  },
];

/* ─── Weekly schedule ────────────────────────────────────────────────────── */

export const WEEK: {
  weekday: number;
  sort: number;
  fa: { label: string; detail: string };
  de: { label: string; detail: string };
}[] = [
  { weekday: 1, sort: 0, fa: { label: 'دوشنبه', detail: 'آلمانی A1 · والیبال زنان' }, de: { label: 'Montag', detail: 'Deutsch A1 · Volleyball Frauen' } },
  { weekday: 2, sort: 1, fa: { label: 'سه‌شنبه', detail: 'ژیمناستیک سبک · آلمانی B1' }, de: { label: 'Dienstag', detail: 'Leichte Gymnastik · Deutsch B1' } },
  { weekday: 3, sort: 2, fa: { label: 'چهارشنبه', detail: 'آلمانی A1 · والیبال مردان' }, de: { label: 'Mittwoch', detail: 'Deutsch A1 · Volleyball Männer' } },
  { weekday: 4, sort: 3, fa: { label: 'پنجشنبه', detail: 'درس کمکی · دعای کمیل، ۲۰:۳۰' }, de: { label: 'Donnerstag', detail: 'Lernhilfe · Duʿa Kumail, 20:30' } },
  { weekday: 5, sort: 4, fa: { label: 'جمعه', detail: 'فوتسال نوجوانان · خوش‌نویسی · نماز جمعه' }, de: { label: 'Freitag', detail: 'Futsal Jugend · Kalligrafie · Freitagsgebet' } },
  { weekday: 6, sort: 5, fa: { label: 'شنبه', detail: 'فارسی کودکان · برنامهٔ بعدازظهر' }, de: { label: 'Samstag', detail: 'Persisch für Kinder · Nachmittagsprogramm' } },
  { weekday: 0, sort: 6, fa: { label: 'یکشنبه', detail: 'قرآن و تجوید · ورزش خانوادگی' }, de: { label: 'Sonntag', detail: 'Koran & Tadschwid · Familiensport' } },
];

/* ─── Membership tiers ───────────────────────────────────────────────────── */

export const MEMBERSHIPS: {
  tierKey: string;
  sort: number;
  fa: { title: string; priceLabel: string; benefits: string[] };
  de: { title: string; priceLabel: string; benefits: string[] };
}[] = [
  {
    tierKey: 'foerdernd',
    sort: 0,
    fa: {
      title: 'عضویت حمایتی',
      priceLabel: '۵ یورو در ماه',
      benefits: ['دعوت به همهٔ برنامه‌ها', 'خبرنامهٔ ماهانه', 'بدون حق رأی در مجمع'],
    },
    de: {
      title: 'Fördernde Mitgliedschaft',
      priceLabel: '5 € im Monat',
      benefits: ['Einladung zu allen Veranstaltungen', 'Monatlicher Newsletter', 'Ohne Stimmrecht in der Generalversammlung'],
    },
  },
  {
    tierKey: 'ordentlich',
    sort: 1,
    fa: {
      title: 'عضویت عادی',
      priceLabel: '۱۲ یورو در ماه',
      benefits: ['حق رأی در مجمع عمومی', 'شرکت رایگان در همهٔ کلاس‌ها', 'استفاده از سالن برای تمرین گروهی'],
    },
    de: {
      title: 'Ordentliche Mitgliedschaft',
      priceLabel: '12 € im Monat',
      benefits: ['Stimmrecht in der Generalversammlung', 'Kostenlose Teilnahme an allen Kursen', 'Nutzung des Saals für Gruppentrainings'],
    },
  },
  {
    tierKey: 'familie',
    sort: 2,
    fa: {
      title: 'عضویت خانوادگی',
      priceLabel: '۲۰ یورو در ماه',
      benefits: ['برای همهٔ اعضای یک خانوار', 'کلاس‌های کودکان رایگان', 'دو حق رأی در مجمع'],
    },
    de: {
      title: 'Familienmitgliedschaft',
      priceLabel: '20 € im Monat',
      benefits: ['Für alle Mitglieder eines Haushalts', 'Kinderkurse kostenfrei', 'Zwei Stimmen in der Generalversammlung'],
    },
  },
  {
    tierKey: 'ermaessigt',
    sort: 3,
    fa: {
      title: 'عضویت با تخفیف',
      priceLabel: '۴ یورو در ماه',
      benefits: ['برای دانشجویان، بازنشستگان و پناه‌جویان', 'همان حقوق عضویت عادی', 'بدون نیاز به ارائهٔ مدرک'],
    },
    de: {
      title: 'Ermäßigte Mitgliedschaft',
      priceLabel: '4 € im Monat',
      benefits: ['Für Studierende, Pensionistinnen und Asylwerbende', 'Dieselben Rechte wie ordentliche Mitglieder', 'Ohne Nachweispflicht'],
    },
  },
];

/* ─── Du'as, ziyarat and taqibat ─────────────────────────────────────────── */

export const DUAS: {
  slug: string;
  category: 'dua' | 'ziyara' | 'taqib';
  arabicTitle: string;
  sort: number;
  fa: { title: string; summary: string; whenToRead: string; source: string };
  de: { title: string; summary: string; whenToRead: string; source: string };
}[] = [
  {
    slug: 'kumail',
    category: 'dua',
    arabicTitle: 'دُعاء كُمَيل',
    sort: 0,
    fa: {
      title: 'دعای کمیل',
      summary: 'دعایی که امیرالمؤمنین (ع) به کمیل بن زیاد آموخت؛ دعای آمرزش‌خواهی و اعتراف، با زبانی بی‌پرده.',
      whenToRead: 'شب‌های جمعه، و شب نیمهٔ شعبان',
      source: 'مصباح المتهجد، شیخ طوسی',
    },
    de: {
      title: 'Duʿa Kumail',
      summary: 'Das Bittgebet, das Imam Ali (a.) seinem Gefährten Kumail ibn Ziyad lehrte — ein Gebet der Vergebung und des offenen Eingeständnisses.',
      whenToRead: 'In der Nacht auf Freitag und in der Nacht des 15. Schaban',
      source: 'Misbah al-Mutahaddschid, Schaich at-Tusi',
    },
  },
  {
    slug: 'tawassul',
    category: 'dua',
    arabicTitle: 'دُعاء التَوَسُّل',
    sort: 1,
    fa: {
      title: 'دعای توسل',
      summary: 'توسل به چهارده معصوم (ع)، یک به یک، برای برآورده شدن حاجت.',
      whenToRead: 'هر زمان، به‌ویژه شب‌های چهارشنبه',
      source: 'مفاتیح الجنان، به نقل از سید بن طاووس',
    },
    de: {
      title: 'Duʿa Tawassul',
      summary: 'Die Anrufung der vierzehn Unfehlbaren (a.), eine nach der anderen, um Fürsprache in einem Anliegen.',
      whenToRead: 'Jederzeit, besonders in der Nacht auf Mittwoch',
      source: 'Mafatih al-Dschinan, nach Sayyid ibn Tawus',
    },
  },
  {
    slug: 'nudba',
    category: 'dua',
    arabicTitle: 'دُعاء النُدبَة',
    sort: 2,
    fa: {
      title: 'دعای ندبه',
      summary: 'ندبه‌ای در انتظار امام زمان (عج)؛ مرور تاریخ انبیا و اهل بیت و شوق دیدار.',
      whenToRead: 'صبح جمعه، و در اعیاد فطر، قربان و غدیر',
      source: 'مزار قدیم، به نقل از مفاتیح الجنان',
    },
    de: {
      title: 'Duʿa Nudba',
      summary: 'Eine Klage in der Erwartung des Imam al-Mahdi (a.j.): der Gang durch die Geschichte der Propheten und der Ahl al-Bait und die Sehnsucht nach der Begegnung.',
      whenToRead: 'Am Freitagmorgen sowie an den Festen Fitr, Adha und Ghadir',
      source: 'Al-Mazar al-qadim, überliefert in Mafatih al-Dschinan',
    },
  },
  {
    slug: 'ahd',
    category: 'dua',
    arabicTitle: 'دُعاء العَهد',
    sort: 3,
    fa: {
      title: 'دعای عهد',
      summary: 'تجدید پیمان با امام زمان (عج)؛ کوتاه است و هر روز خوانده می‌شود.',
      whenToRead: 'چهل صبح پیاپی، پس از نماز صبح',
      source: 'مصباح المتهجد',
    },
    de: {
      title: 'Duʿa al-Ahd',
      summary: 'Die Erneuerung des Bundes mit dem Imam al-Mahdi (a.j.) — kurz, und für jeden Morgen gedacht.',
      whenToRead: 'An vierzig aufeinanderfolgenden Morgen, nach dem Fadschr-Gebet',
      source: 'Misbah al-Mutahaddschid',
    },
  },
  {
    slug: 'faraj',
    category: 'dua',
    arabicTitle: 'دُعاء الفَرَج',
    sort: 4,
    fa: {
      title: 'دعای فرج',
      summary: 'دعایی کوتاه برای گشایش؛ چند سطر که در سختی بر زبان می‌آید.',
      whenToRead: 'هر زمان، به‌ویژه در تنگنا',
      source: 'مفاتیح الجنان',
    },
    de: {
      title: 'Duʿa al-Faradsch',
      summary: 'Ein kurzes Gebet um Erleichterung — wenige Zeilen, die in der Bedrängnis über die Lippen kommen.',
      whenToRead: 'Jederzeit, besonders in Notlagen',
      source: 'Mafatih al-Dschinan',
    },
  },
  {
    slug: 'jawshan-kabir',
    category: 'dua',
    arabicTitle: 'الجَوشَن الكَبير',
    sort: 5,
    fa: {
      title: 'جوشن کبیر',
      summary: 'هزار نام و صفت خداوند در صد بند؛ دعایی که پیامبر (ص) در جنگ آموخت.',
      whenToRead: 'شب‌های قدر، و آغاز ماه رمضان',
      source: 'البلد الامین، کفعمی',
    },
    de: {
      title: 'Dschauschan Kabir',
      summary: 'Tausend Namen und Eigenschaften Gottes in hundert Abschnitten — das Gebet, das der Prophet (s.) in der Schlacht empfing.',
      whenToRead: 'In den Nächten der Bestimmung (Qadr) und zu Beginn des Ramadan',
      source: 'Al-Balad al-amin, al-Kafami',
    },
  },
  {
    slug: 'samat',
    category: 'dua',
    arabicTitle: 'دُعاء السِمات',
    sort: 6,
    fa: {
      title: 'دعای سمات',
      summary: 'دعای «شبور»؛ سوگند دادن خداوند به نشانه‌هایی که بر پیامبران آشکار کرد.',
      whenToRead: 'آخرین ساعت روز جمعه، پیش از غروب',
      source: 'مصباح المتهجد',
    },
    de: {
      title: 'Duʿa as-Simat',
      summary: 'Das „Schabur“-Gebet: die Anrufung Gottes bei den Zeichen, die er seinen Propheten offenbarte.',
      whenToRead: 'In der letzten Stunde des Freitags, vor Sonnenuntergang',
      source: 'Misbah al-Mutahaddschid',
    },
  },
  {
    slug: 'ziyarat-ashura',
    category: 'ziyara',
    arabicTitle: 'زِيارَة عاشُوراء',
    sort: 7,
    fa: {
      title: 'زیارت عاشورا',
      summary: 'سلام بر امام حسین (ع) و یارانش؛ با صد سلام و صد لعن و دعای علقمه در پایان.',
      whenToRead: 'هر روز، و به‌ویژه روز عاشورا',
      source: 'کامل الزیارات، ابن قولویه',
    },
    de: {
      title: 'Ziyarat Aschura',
      summary: 'Der Gruß an Imam Husain (a.) und seine Gefährten — mit hundert Grüßen, hundert Verwünschungen und dem Duʿa Alqama am Schluss.',
      whenToRead: 'Täglich, insbesondere am Tag von Aschura',
      source: 'Kamil az-Ziyarat, Ibn Quluwaih',
    },
  },
  {
    slug: 'ziyarat-jamia-kabira',
    category: 'ziyara',
    arabicTitle: 'الزِيارَة الجامِعَة الكَبيرَة',
    sort: 8,
    fa: {
      title: 'زیارت جامعهٔ کبیره',
      summary: 'زیارتی که برای همهٔ ائمه (ع) خوانده می‌شود؛ از امام هادی (ع) نقل شده است.',
      whenToRead: 'در زیارت هر یک از ائمه (ع)، از نزدیک یا از راه دور',
      source: 'من لا یحضره الفقیه، شیخ صدوق',
    },
    de: {
      title: 'Ziyarat Dschamiʿa Kabira',
      summary: 'Die Ziyarat, die für alle Imame (a.) gelesen werden kann — überliefert von Imam al-Hadi (a.).',
      whenToRead: 'Bei der Ziyarat eines jeden Imams, vor Ort oder aus der Ferne',
      source: 'Man la yahduruhu l-faqih, Schaich as-Saduq',
    },
  },
  {
    slug: 'ziyarat-warith',
    category: 'ziyara',
    arabicTitle: 'زِيارَة وارِث',
    sort: 9,
    fa: {
      title: 'زیارت وارث',
      summary: 'سلامی که امام حسین (ع) را وارث آدم، نوح، ابراهیم، موسی و عیسی (ع) می‌خواند.',
      whenToRead: 'در زیارت کربلا، و در هر روز',
      source: 'کامل الزیارات',
    },
    de: {
      title: 'Ziyarat Warith',
      summary: 'Der Gruß, der Imam Husain (a.) den Erben Adams, Noahs, Abrahams, Moses’ und Jesu (a.) nennt.',
      whenToRead: 'Bei der Ziyarat in Kerbala und an jedem Tag',
      source: 'Kamil az-Ziyarat',
    },
  },
  {
    slug: 'ziyarat-al-yasin',
    category: 'ziyara',
    arabicTitle: 'زِيارَة آل ياسين',
    sort: 10,
    fa: {
      title: 'زیارت آل یاسین',
      summary: 'سلام بر امام زمان (عج) در قالب شهادت‌نامه‌ای بند به بند.',
      whenToRead: 'روزهای جمعه و شب نیمهٔ شعبان',
      source: 'الاحتجاج، طبرسی',
    },
    de: {
      title: 'Ziyarat Al Yasin',
      summary: 'Der Gruß an den Imam al-Mahdi (a.j.), Abschnitt für Abschnitt als Bekenntnis geformt.',
      whenToRead: 'An Freitagen und in der Nacht des 15. Schaban',
      source: 'Al-Ihtidschadsch, at-Tabarsi',
    },
  },
  {
    slug: 'tasbih-al-zahra',
    category: 'taqib',
    arabicTitle: 'تَسبيح الزَهراء (س)',
    sort: 11,
    fa: {
      title: 'تسبیح حضرت زهرا (س)',
      summary: 'سی‌وچهار بار الله اکبر، سی‌وسه بار الحمد لله و سی‌وسه بار سبحان الله — هدیهٔ پیامبر (ص) به دخترش.',
      whenToRead: 'پس از هر نماز واجب، و پیش از خواب',
      source: 'وسائل الشیعه',
    },
    de: {
      title: 'Tasbih az-Zahra (s.)',
      summary: 'Vierunddreißigmal Allahu akbar, dreiunddreißigmal al-hamdu li-llah, dreiunddreißigmal subhana llah — das Geschenk des Propheten (s.) an seine Tochter.',
      whenToRead: 'Nach jedem Pflichtgebet und vor dem Schlafengehen',
      source: 'Wasaʾil asch-Schiʿa',
    },
  },
];

/* ─── Islamic occasions ──────────────────────────────────────────────────── */

export const OCCASIONS: {
  hijriMonth: number;
  hijriDay: number;
  sort: number;
  fa: { name: string; note: string };
  de: { name: string; note: string };
}[] = [
  { hijriMonth: 1, hijriDay: 9, sort: 0, fa: { name: 'تاسوعا', note: 'روز نهم محرم' }, de: { name: 'Tasuʿa', note: 'Der neunte Tag des Muharram' } },
  { hijriMonth: 1, hijriDay: 10, sort: 1, fa: { name: 'عاشورا', note: 'شهادت امام حسین (ع) و یارانش در کربلا' }, de: { name: 'Aschura', note: 'Das Martyrium Imam Husains (a.) und seiner Gefährten in Kerbala' } },
  { hijriMonth: 2, hijriDay: 20, sort: 2, fa: { name: 'اربعین', note: 'چهلمین روز پس از عاشورا' }, de: { name: 'Arbaʿin', note: 'Der vierzigste Tag nach Aschura' } },
  { hijriMonth: 2, hijriDay: 28, sort: 3, fa: { name: 'رحلت پیامبر اکرم (ص)', note: 'و شهادت امام حسن مجتبی (ع)' }, de: { name: 'Hinscheiden des Propheten (s.)', note: 'Und das Martyrium Imam Hasans (a.)' } },
  { hijriMonth: 3, hijriDay: 17, sort: 4, fa: { name: 'میلاد پیامبر اکرم (ص)', note: 'و میلاد امام صادق (ع)' }, de: { name: 'Geburtstag des Propheten (s.)', note: 'Und Geburtstag Imam Dschaʿfar as-Sadiqs (a.)' } },
  { hijriMonth: 6, hijriDay: 3, sort: 5, fa: { name: 'شهادت حضرت فاطمه (س)', note: 'ایام فاطمیه' }, de: { name: 'Martyrium Fatimas (a.)', note: 'Die Fatimiyya-Tage' } },
  { hijriMonth: 7, hijriDay: 13, sort: 6, fa: { name: 'میلاد امام علی (ع)', note: 'ولادت در کعبه' }, de: { name: 'Geburtstag Imam Alis (a.)', note: 'Geboren in der Kaaba' } },
  { hijriMonth: 7, hijriDay: 27, sort: 7, fa: { name: 'مبعث', note: 'آغاز رسالت پیامبر اکرم (ص)' }, de: { name: 'Mabʿath', note: 'Der Beginn der Sendung des Propheten (s.)' } },
  { hijriMonth: 8, hijriDay: 15, sort: 8, fa: { name: 'نیمهٔ شعبان', note: 'میلاد امام زمان (عج)' }, de: { name: 'Mitte Schaban', note: 'Geburtstag des Imam al-Mahdi (a.j.)' } },
  { hijriMonth: 9, hijriDay: 19, sort: 9, fa: { name: 'ضربت خوردن امام علی (ع)', note: 'در محراب مسجد کوفه' }, de: { name: 'Attentat auf Imam Ali (a.)', note: 'Im Gebetsnische der Moschee von Kufa' } },
  { hijriMonth: 9, hijriDay: 21, sort: 10, fa: { name: 'شهادت امام علی (ع)', note: '' }, de: { name: 'Martyrium Imam Alis (a.)', note: '' } },
  { hijriMonth: 9, hijriDay: 23, sort: 11, fa: { name: 'شب قدر', note: 'شب بیست‌وسوم رمضان' }, de: { name: 'Lailat al-Qadr', note: 'Die dreiundzwanzigste Nacht des Ramadan' } },
  { hijriMonth: 10, hijriDay: 1, sort: 12, fa: { name: 'عید فطر', note: 'پایان ماه رمضان' }, de: { name: 'Eid al-Fitr', note: 'Das Ende des Ramadan' } },
  { hijriMonth: 12, hijriDay: 10, sort: 13, fa: { name: 'عید قربان', note: '' }, de: { name: 'Eid al-Adha', note: '' } },
  { hijriMonth: 12, hijriDay: 18, sort: 14, fa: { name: 'عید غدیر', note: 'روز غدیر خم' }, de: { name: 'Eid al-Ghadir', note: 'Der Tag von Ghadir Chumm' } },
];

/* ─── Events ─────────────────────────────────────────────────────────────── */

/** Seeded relative to the install date so a fresh clone always has a populated
 *  calendar rather than an archive of dates that have already passed. */
export function eventSeed(now = new Date()) {
  const at = (days: number, hour: number, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  return [
    {
      slug: 'eroeffnungsfest',
      startsAt: at(14, 16),
      endsAt: at(14, 21),
      category: 'opening',
      featured: true,
      sort: 0,
      fa: {
        title: 'جشن گشایش خانهٔ همهٔ انسان‌ها',
        body: 'در را رسماً باز می‌کنیم. بعدازظهری با موسیقی، غذا، بازی برای بچه‌ها و گشت در ساختمان. همهٔ همسایگان دعوت‌اند؛ ورود آزاد است.',
        location: 'زاوترگاسه ۳۴–۳۸، ۱۱۷۰ وین — سالن طبقهٔ همکف',
      },
      de: {
        title: 'Eröffnungsfest im Haus aller Menschen',
        body: 'Wir öffnen die Tür offiziell. Ein Nachmittag mit Musik, Essen, Spielen für Kinder und einer Führung durch das Haus. Die ganze Nachbarschaft ist eingeladen, der Eintritt ist frei.',
        location: 'Sautergasse 34–38, 1170 Wien — Saal im Erdgeschoß',
      },
      programme: [
        { fa: { timeLabel: '۱۶:۰۰', title: 'خوش‌آمدگویی و افتتاح' }, de: { timeLabel: '16:00', title: 'Begrüßung und Eröffnung' } },
        { fa: { timeLabel: '۱۶:۳۰', title: 'گشت در ساختمان' }, de: { timeLabel: '16:30', title: 'Führung durch das Haus' } },
        { fa: { timeLabel: '۱۷:۳۰', title: 'موسیقی زنده — تار و دف' }, de: { timeLabel: '17:30', title: 'Livemusik — Tar und Daf' } },
        { fa: { timeLabel: '۱۸:۳۰', title: 'شام مشترک' }, de: { timeLabel: '18:30', title: 'Gemeinsames Abendessen' } },
        { fa: { timeLabel: '۱۹:۳۰', title: 'شب شعر — حافظ و ریلکه' }, de: { timeLabel: '19:30', title: 'Lyrikabend — Hafis und Rilke' } },
        { fa: { timeLabel: '۲۰:۳۰', title: 'گفت‌وگوی آزاد و چای' }, de: { timeLabel: '20:30', title: 'Offenes Gespräch bei Tee' } },
      ],
    },
    {
      slug: 'lyrikabend',
      startsAt: at(21, 19),
      endsAt: at(21, 22),
      category: 'culture',
      featured: false,
      sort: 1,
      fa: {
        title: 'شب شعر ماهانه',
        body: 'هر کس یک شعر می‌آورد و می‌خواند — به هر زبانی. اگر ترجمه‌ای دارید بیاورید، اگر ندارید هم اشکالی ندارد.',
        location: 'اتاق بالا',
      },
      de: {
        title: 'Lyrikabend im Monat',
        body: 'Jede und jeder bringt ein Gedicht mit und liest es vor — in welcher Sprache auch immer. Wer eine Übersetzung hat, bringt sie mit; wer keine hat, auch.',
        location: 'Oberer Raum',
      },
      programme: [],
    },
    {
      slug: 'nachbarschaftsfruehstueck',
      startsAt: at(31, 10),
      endsAt: at(31, 13),
      category: 'community',
      featured: false,
      sort: 2,
      fa: {
        title: 'صبحانهٔ همسایگی',
        body: 'صبحانهٔ باز برای کل کوچه. هر کس چیزی می‌آورد، ما چای و نان می‌گذاریم.',
        location: 'سالن طبقهٔ همکف',
      },
      de: {
        title: 'Nachbarschaftsfrühstück',
        body: 'Offenes Frühstück für die ganze Gasse. Jede bringt etwas mit, Tee und Brot stellen wir.',
        location: 'Saal im Erdgeschoß',
      },
      programme: [],
    },
    {
      slug: 'infoabend-kurse',
      startsAt: at(45, 18),
      endsAt: at(45, 20),
      category: 'courses',
      featured: false,
      sort: 3,
      fa: {
        title: 'نشست معرفی کلاس‌ها',
        body: 'معرفی کلاس‌های ترم آینده، ثبت‌نام در محل و پاسخ به پرسش‌ها.',
        location: 'سالن طبقهٔ همکف',
      },
      de: {
        title: 'Infoabend zu den Kursen',
        body: 'Vorstellung der Kurse des kommenden Semesters, Anmeldung vor Ort und Antworten auf Ihre Fragen.',
        location: 'Saal im Erdgeschoß',
      },
      programme: [],
    },
    {
      slug: 'filmabend-iranisches-kino',
      startsAt: at(-18, 19),
      endsAt: at(-18, 22),
      category: 'culture',
      featured: false,
      sort: 4,
      fa: {
        title: 'شب فیلم — سینمای ایران',
        body: 'نمایش فیلم با زیرنویس آلمانی و گفت‌وگو پس از آن.',
        location: 'سالن طبقهٔ همکف',
      },
      de: {
        title: 'Filmabend — Iranisches Kino',
        body: 'Filmvorführung mit deutschen Untertiteln und Gespräch im Anschluss.',
        location: 'Saal im Erdgeschoß',
      },
      programme: [],
    },
  ];
}
