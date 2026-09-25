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
  { href: '/contact', key: 'contact', primary: false },
];

export const LEGAL_NAV: NavEntry[] = [
  { href: '/privacy', key: 'privacy', primary: false },
  { href: '/imprint', key: 'imprint', primary: false },
];
