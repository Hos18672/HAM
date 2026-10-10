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
  { href: '/calendar', key: 'calendar' },
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

/** The footer's link columns (the brand and the visit column frame them). */
export const FOOTER_GROUPS: NavGroup[] = [
  { ...HOUSE, items: [...HOUSE.items!, entry('events')] },
  OFFERS,
  FAITH,
];

/**
 * The bottom navigation on phones and tablets: four destinations and "More",
 * a page with everything else. Any page that is not one of the four marks
 * "More", since that is where it is reached from.
 */
export type TabIcon = 'home' | 'prayer' | 'quran' | 'events' | 'more';
export const TABS: { href: string; key: string; icon: TabIcon }[] = [
  { href: '/', key: 'home', icon: 'home' },
  { href: '/prayer', key: 'tabPrayer', icon: 'prayer' },
  { href: '/quran', key: 'tabQuran', icon: 'quran' },
  { href: '/events', key: 'events', icon: 'events' },
  { href: '/more', key: 'more', icon: 'more' },
];

/** Pages that show the back button and no bottom navigation: details and tools. */
export const FOCUS_PAGES = ['/qibla', '/support', '/settings', '/events/'];

export const LEGAL_NAV: NavEntry[] = [
  { href: '/privacy', key: 'privacy' },
  { href: '/imprint', key: 'imprint' },
];
