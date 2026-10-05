/**
 * The site's structure, once. The header's dropdowns, the menu sheet, the
 * footer's columns, the tab bar and the sitemap all read from here, so the
 * same page is always in the same group wherever it is offered.
 */
export interface NavEntry {
  href: string;
  /** Key into the `nav` message namespace. */
  key: string;
}

export const NAV: NavEntry[] = [
  { href: '/', key: 'home' },
  { href: '/about', key: 'about' },
  { href: '/activities', key: 'activities' },
  { href: '/courses', key: 'courses' },
  { href: '/events', key: 'events' },
  { href: '/prayer', key: 'prayer' },
  { href: '/culture', key: 'culture' },
  { href: '/sport', key: 'sport' },
  { href: '/community', key: 'community' },
  { href: '/gallery', key: 'gallery' },
  { href: '/qibla', key: 'qibla' },
  { href: '/duas', key: 'duas' },
  { href: '/quran', key: 'quran' },
  { href: '/contact', key: 'contact' },
];

const entry = (key: string) => NAV.find((e) => e.key === key)!;

/** A group of pages; a group with `href` and no items is a direct link. */
export interface NavGroup {
  /** Key into the `nav` namespace for the group's label. */
  key: string;
  href?: string;
  items?: NavEntry[];
}

const HOUSE: NavGroup = {
  key: 'groupHouse',
  items: [entry('about'), entry('community'), entry('gallery')],
};
const OFFERS: NavGroup = {
  key: 'groupOffers',
  items: [entry('courses'), entry('activities'), entry('culture'), entry('sport')],
};
const FAITH: NavGroup = {
  key: 'groupFaith',
  items: [entry('prayer'), entry('quran'), entry('duas'), entry('qibla')],
};

/** The header bar: three dropdowns and two direct links. Home is the logo. */
export const NAV_GROUPS: NavGroup[] = [
  HOUSE,
  OFFERS,
  { key: 'events', href: '/events' },
  FAITH,
  { key: 'contact', href: '/contact' },
];

/** The menu sheet: the same three groups, and the direct links as a fourth. */
export const MENU_GROUPS: NavGroup[] = [
  HOUSE,
  OFFERS,
  FAITH,
  { key: 'groupDirect', items: [entry('events'), entry('contact'), entry('home')] },
];

/** The footer's link columns (the brand and the visit column frame them). */
export const FOOTER_GROUPS: NavGroup[] = [
  { ...HOUSE, items: [...HOUSE.items!, entry('events')] },
  OFFERS,
  FAITH,
];

/** The tab bar on phones and tablets; the fifth tab opens the menu sheet. */
export const TABS: { href: string; key: string; icon: 'home' | 'prayer' | 'events' | 'contact' }[] =
  [
    { href: '/', key: 'home', icon: 'home' },
    { href: '/prayer', key: 'tabPrayer', icon: 'prayer' },
    { href: '/events', key: 'events', icon: 'events' },
    { href: '/contact', key: 'contact', icon: 'contact' },
  ];

export const LEGAL_NAV: NavEntry[] = [
  { href: '/privacy', key: 'privacy' },
  { href: '/imprint', key: 'imprint' },
];
