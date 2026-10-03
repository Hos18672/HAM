/**
 * An iCalendar file for one event, as a `data:` URL a plain link can offer
 * for download — no route needed, so it works on the static preview too.
 */
const stamp = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

const escape = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;');

export function icsHref(event: {
  slug: string;
  title: string;
  body: string;
  location: string;
  startsAt: Date;
  endsAt: Date | null;
}): string {
  const end = event.endsAt ?? new Date(event.startsAt.getTime() + 2 * 3_600_000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Haus aller Menschen//Termine//DE',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.slug}@haus-aller-menschen.at`,
    `DTSTAMP:${stamp(event.startsAt)}`,
    `DTSTART:${stamp(event.startsAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(event.title)}`,
    ...(event.body ? [`DESCRIPTION:${escape(event.body)}`] : []),
    `LOCATION:${escape(event.location || 'Sautergasse 34–38, 1170 Wien')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
}
