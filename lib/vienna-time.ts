/**
 * Wall-clock time in Vienna, for the admin's date fields.
 *
 * A `datetime-local` input has no time zone, and neither the editor's browser
 * nor the server (UTC on Netlify) is guaranteed to sit in Vienna. Every date
 * the house announces is Vienna time, so the field shows and accepts exactly
 * that, whatever machine it is opened on.
 */

const ZONE = 'Europe/Vienna';

const parts = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** The instant as Vienna wall time, as milliseconds of a fake UTC clock. */
function wallMillis(instant: Date): number {
  const get = (type: string) =>
    Number(parts.formatToParts(instant).find((p) => p.type === type)?.value ?? 0);
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
}

/** An instant → "YYYY-MM-DDTHH:MM" in Vienna, for a `datetime-local` value. */
export function toViennaInput(instant: Date | string | null | undefined): string {
  if (!instant) return '';
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(wallMillis(date)).toISOString().slice(0, 16);
}

/** "YYYY-MM-DDTHH:MM" read as Vienna wall time → an ISO instant, or null. */
export function fromViennaInput(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number) as number[];
  const wall = Date.UTC(y!, mo! - 1, d!, h!, mi!);
  // Guess with the offset at the wall time itself, then correct once with the
  // offset at the guess — that settles it on either side of a DST change.
  let instant = wall - (wallMillis(new Date(wall)) - wall);
  instant = wall - (wallMillis(new Date(instant)) - instant);
  return new Date(instant).toISOString();
}

/** Tomorrow at a given Vienna hour, as an ISO instant. */
export function viennaTomorrowAt(hour: number, now = new Date()): string {
  const today = toViennaInput(now).slice(0, 10);
  const next = new Date(`${today}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const day = next.toISOString().slice(0, 10);
  return fromViennaInput(`${day}T${String(hour).padStart(2, '0')}:00`)!;
}
