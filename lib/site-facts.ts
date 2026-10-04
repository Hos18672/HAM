/**
 * The association's fixed facts — one source for every page that prints them.
 *
 * Email, phone, address and IBAN are also editable in the admin area (the
 * `site_settings` row, seeded from here); everything else lives only here.
 * A value that is not known yet is an empty string, and every place that
 * prints a fact hides the row when it is empty — never a row of zeros.
 */

export const FACTS = {
  nameFa: 'خانهٔ همهٔ انسان‌ها — انصار المهدی (عج)',
  nameDe: 'Haus aller Menschen – Ansar al-Mahdi (a.j.)',
  street: 'Sautergasse 34–38',
  postcode: '1170',
  city: 'Wien',
  district: 'Hernals',
  country: 'Österreich',
  email: 'info@haus-aller-menschen.at',
  // TODO(content): the house's public phone number.
  phone: '',
  // TODO(content): ZVR number from the Vereinsregister.
  zvr: '',
  // TODO(content): the association's IBAN, BIC and account holder.
  iban: '',
  bic: '',
  instagram: 'ansarolmahdi_Wien',
  mapUrl: 'https://www.openstreetmap.org/?mlat=48.2175&mlon=16.3260#map=17/48.2175/16.3260',
  latitude: 48.2175,
  longitude: 16.326,
} as const;

/** One opening window. Days are ISO weekdays: 1 = Monday … 7 = Sunday. */
export interface OpeningWindow {
  days: readonly number[];
  /** "HH:MM", Vienna time; both null for "by programme". */
  open: string | null;
  close: string | null;
}

export const OPENING_HOURS: readonly OpeningWindow[] = [
  { days: [1, 2, 3, 4], open: '16:00', close: '20:00' },
  { days: [5], open: '14:00', close: '22:00' },
  { days: [6], open: '10:00', close: '18:00' },
  { days: [7], open: null, close: null },
];

/** How to get here. Each line is printed only when it is filled in. */
export const DIRECTIONS = {
  fa: {
    tram: 'تراموای ۴۳ (خیابان Hernalser Hauptstraße) — چند دقیقه پیاده',
    train: 'قطار شهری S45، ایستگاه Hernals',
    // From the association's own description of the house (home page).
    access: 'ورودی بدون پله؛ سالن در طبقهٔ همکف است',
  },
  de: {
    tram: 'Straßenbahn 43 (Hernalser Hauptstraße) — wenige Gehminuten',
    train: 'S45, Station Hernals',
    access: 'Stufenloser Eingang, der Saal liegt im Erdgeschoß',
  },
} as const;

/**
 * A value that is really a placeholder: all zeros after the country prefix
 * ("+43 1 000 00 00", "AT00 0000 …", "000000000"). Databases seeded before the
 * placeholders were removed still carry them, so they are scrubbed on read.
 */
export function isPlaceholder(value: string | null | undefined): boolean {
  if (!value) return true;
  const digitsOnly = value.replace(/^\+\d{1,3}|^[A-Z]{2}/i, '').replace(/\D/g, '');
  return /^1?0+$/.test(digitsOnly);
}

/** The value, or '' when it is a placeholder. */
export function known(value: string | null | undefined): string {
  return isPlaceholder(value) ? '' : (value ?? '');
}

/** Minutes after midnight for "HH:MM". */
const minutesOf = (clock: string) => {
  const [h, m] = clock.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Vienna weekday (1–7) and minutes after midnight for an instant. */
export function viennaNow(now: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Vienna',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')) + 1;
  return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

/** Is the house open at this instant? `null` when today runs by programme. */
export function isOpenAt(now: Date, hours: readonly OpeningWindow[] = OPENING_HOURS) {
  const { day, minutes } = viennaNow(now);
  const today = hours.find((w) => w.days.includes(day));
  if (!today) return false;
  if (!today.open || !today.close) return null;
  return minutes >= minutesOf(today.open) && minutes < minutesOf(today.close);
}

/** Open until a time, closed until the next opening, or running by programme. */
export type HouseStatus =
  | { state: 'open'; day: number; close: string }
  | { state: 'programme'; day: number }
  | { state: 'closed'; day: number; opensDay: number; opensAt: string; inDays: number };

/**
 * The house's state at an instant, in Vienna: what the contact page says
 * first. A closed house says when it next opens, skipping days that run by
 * programme, since those have no time to name.
 */
export function houseStatus(
  now: Date,
  hours: readonly OpeningWindow[] = OPENING_HOURS,
): HouseStatus {
  const { day, minutes } = viennaNow(now);
  const today = hours.find((w) => w.days.includes(day));
  if (today && (!today.open || !today.close)) return { state: 'programme', day };
  if (today?.open && today.close) {
    if (minutes >= minutesOf(today.open) && minutes < minutesOf(today.close)) {
      return { state: 'open', day, close: today.close };
    }
  }
  for (let inDays = 0; inDays < 8; inDays += 1) {
    const next = ((day - 1 + inDays) % 7) + 1;
    const window = hours.find((w) => w.days.includes(next));
    if (!window?.open) continue;
    if (inDays === 0 && minutes >= minutesOf(window.open)) continue;
    return { state: 'closed', day, opensDay: next, opensAt: window.open, inDays };
  }
  return { state: 'closed', day, opensDay: day, opensAt: '', inDays: 0 };
}

/**
 * The house's history, for the about page. A milestone without text is not
 * shown; a year left empty is simply not printed.
 */
export const HISTORY: readonly { year: string; fa: string; de: string }[] = [
  {
    // TODO(content): the year the families first met in each other's homes.
    year: '',
    fa: 'چند خانوادهٔ فارسی‌زبان وین سال‌ها در خانه‌های یکدیگر گرد هم می‌آیند — برای درس، دعا و دیدار.',
    de: 'Einige persischsprachige Familien in Wien treffen sich jahrelang reihum in ihren Wohnungen — zum Lernen, Beten und Beisammensein.',
  },
  {
    // TODO(content): the year the association was registered.
    year: '',
    fa: 'انجمن انصار المهدی (عج) به‌عنوان انجمنی غیرانتفاعی در وین به ثبت می‌رسد.',
    de: 'Der Verein Ansar al-Mahdi (a.j.) wird als gemeinnütziger Verein in Wien eingetragen.',
  },
  {
    // TODO(content): the year the rooms in the Sautergasse were found.
    year: '',
    fa: 'خانه‌ای از آنِ خودمان در Sautergasse در منطقهٔ Hernals پیدا می‌شود.',
    de: 'Ein eigenes Haus in der Sautergasse in Hernals ist gefunden.',
  },
  {
    // TODO(content): confirm the opening date.
    year: '2026',
    fa: 'گشایش رسمی خانهٔ همهٔ انسان‌ها — با درهای باز برای همهٔ همسایگان.',
    de: 'Offizielle Eröffnung des Hauses aller Menschen — mit offenen Türen für die ganze Nachbarschaft.',
  },
];

/**
 * The board. Empty until the association names who serves on it; the about
 * page shows the section only when there is someone to show.
 * TODO(content): names (or at least roles) of the board members.
 */
export const BOARD: readonly { name: string; fa: string; de: string }[] = [];

/** When the privacy policy and the imprint were last revised. */
export const LEGAL_UPDATED = '2026-10-04';
