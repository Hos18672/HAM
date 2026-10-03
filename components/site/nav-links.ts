/**
 * The site map, in display order. `primary` rides in the header bar; the rest
 * live behind "More". One list so the header, the drawer, the footer and the
 * sitemap can never disagree about what pages exist.
 */
export interface NavEntry {
  href: string;
  /** Key into the `nav` message namespace. */
  key: string;
  primary: boolean;
}

export const NAV: NavEntry[] = [
  { href: '/', key: 'home', primary: true },
  { href: '/about', key: 'about', primary: true },
  { href: '/activities', key: 'activities', primary: true },
  { href: '/courses', key: 'courses', primary: false },
  { href: '/events', key: 'events', primary: false },
  { href: '/prayer', key: 'prayer', primary: false },
  { href: '/culture', key: 'culture', primary: false },
  { href: '/sport', key: 'sport', primary: false },
  { href: '/community', key: 'community', primary: false },
  { href: '/gallery', key: 'gallery', primary: false },
  { href: '/qibla', key: 'qibla', primary: false },
  { href: '/duas', key: 'duas', primary: false },
  { href: '/quran', key: 'quran', primary: false },
  { href: '/contact', key: 'contact', primary: false },
];

/**
 * The header's groups. Four to five top-level items instead of thirteen:
 * each group is a dropdown on wide screens and a collapsible section in the
 * phone menu; a group with `href` is a direct link. Every page in `NAV` but
 * home appears in exactly one group, so nothing is unreachable from the
 * header (home is the logo).
 */
export interface NavGroup {
  /** Key into the `nav` namespace for the group's label. */
  key: string;
  href?: string;
  items?: NavEntry[];
}

const entry = (key: string) => NAV.find((e) => e.key === key)!;

export const NAV_GROUPS: NavGroup[] = [
  { key: 'groupHouse', items: [entry('about'), entry('community'), entry('gallery')] },
  {
    key: 'groupOffers',
    items: [entry('courses'), entry('activities'), entry('culture'), entry('sport')],
  },
  { key: 'events', href: '/events' },
  {
    key: 'groupFaith',
    items: [entry('prayer'), entry('quran'), entry('duas'), entry('qibla')],
  },
  { key: 'contact', href: '/contact' },
];

export const LEGAL_NAV: NavEntry[] = [
  { href: '/privacy', key: 'privacy', primary: false },
  { href: '/imprint', key: 'imprint', primary: false },
];
