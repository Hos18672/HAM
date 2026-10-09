package at.hausallermenschen.app;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;

/**
 * Prayer times, computed on the phone: a port of the site's
 * {@code lib/prayer-times.ts} (Jaʿfari angles as used by the Leva Institute,
 * Qum — Fajr 16°, Isha 14°, Maghrib 4° after sunset, Asr shadow factor 1,
 * shar'i midnight between sunset and the next Fajr). The unit test holds it to
 * a fixture written by the TypeScript, so the widget and the page agree to
 * the minute.
 *
 * Every time is in minutes after local midnight; {@code null} where the event
 * does not occur at that latitude on that day.
 */
public final class PrayerTimes {
    public static final double VIENNA_LAT = 48.2175;
    public static final double VIENNA_LON = 16.326;
    public static final ZoneId VIENNA_ZONE = ZoneId.of("Europe/Vienna");

    public static final String[] KEYS = {"fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha", "midnight"};
    /** The ones that are prayers, in the order they come; the "next" is one of these. */
    public static final String[] PRAYERS = {"fajr", "dhuhr", "asr", "maghrib", "isha"};

    public Integer fajr, sunrise, dhuhr, asr, maghrib, isha, midnight;

    public Integer get(String key) {
        switch (key) {
            case "fajr": return fajr;
            case "sunrise": return sunrise;
            case "dhuhr": return dhuhr;
            case "asr": return asr;
            case "maghrib": return maghrib;
            case "isha": return isha;
            case "midnight": return midnight;
            default: throw new IllegalArgumentException(key);
        }
    }

    private static final double DEG = Math.PI / 180;
    private static double sin(double d) { return Math.sin(d * DEG); }
    private static double cos(double d) { return Math.cos(d * DEG); }
    private static double tan(double d) { return Math.tan(d * DEG); }
    private static double asin(double x) { return Math.asin(x) / DEG; }
    private static double acos(double x) { return Math.acos(x) / DEG; }
    private static double atan(double x) { return Math.atan(x) / DEG; }
    private static double atan2(double y, double x) { return Math.atan2(y, x) / DEG; }
    private static double fixAngle(double a) { double r = a - 360 * Math.floor(a / 360); return r < 0 ? r + 360 : r; }
    private static double fixHour(double h) { double r = h - 24 * Math.floor(h / 24); return r < 0 ? r + 24 : r; }

    static double julianDay(int year, int month, int day) {
        int y = year, m = month;
        if (m <= 2) { y -= 1; m += 12; }
        double a = Math.floor(y / 100.0);
        double b = 2 - a + Math.floor(a / 4);
        return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
    }

    private static Double hourAngle(double angle, double latitude, double declination) {
        double x = (-sin(angle) - sin(declination) * sin(latitude)) / (cos(declination) * cos(latitude));
        if (x > 1 || x < -1) return null;
        return acos(x) / 15;
    }

    /** Hours on the local clock: fajr, sunrise, dhuhr, asr, sunset, maghrib, isha. */
    private static Double[] dayHours(LocalDate date, double lat, double lon, double offset) {
        double jd = julianDay(date.getYear(), date.getMonthValue(), date.getDayOfMonth()) + (12 - lon / 15 - offset) / 24;
        double d = jd - 2451545.0;
        double g = fixAngle(357.529 + 0.98560028 * d);
        double q = fixAngle(280.459 + 0.98564736 * d);
        double L = fixAngle(q + 1.915 * sin(g) + 0.02 * sin(2 * g));
        double e = 23.439 - 0.00000036 * d;
        double decl = asin(sin(e) * sin(L));
        double ra = fixHour(atan2(cos(e) * sin(L), cos(L)) / 15);
        double eqt = fixHour(q / 15 - ra + 12) - 12;

        double dhuhr = fixHour(12 - lon / 15 - eqt + offset);
        Double tFajr = hourAngle(16, lat, decl);
        Double tHorizon = hourAngle(0.833, lat, decl);
        Double tMaghrib = hourAngle(4, lat, decl);
        Double tIsha = hourAngle(14, lat, decl);
        Double tAsr = hourAngle(-atan(1 / (1 + tan(Math.abs(lat - decl)))), lat, decl);
        return new Double[] {
            tFajr == null ? null : dhuhr - tFajr,
            tHorizon == null ? null : dhuhr - tHorizon,
            dhuhr,
            tAsr == null ? null : dhuhr + tAsr,
            tHorizon == null ? null : dhuhr + tHorizon,
            tMaghrib == null ? null : dhuhr + tMaghrib,
            tIsha == null ? null : dhuhr + tIsha,
        };
    }

    /** The zone's UTC offset in hours, read at 12:00 UTC on that civil date (as the site does). */
    static double offsetHours(ZoneId zone, LocalDate date) {
        Instant probe = date.atTime(12, 0).toInstant(ZoneOffset.UTC);
        return zone.getRules().getOffset(probe).getTotalSeconds() / 3600.0;
    }

    private static Integer minutes(Double h) {
        if (h == null || h.isNaN() || h.isInfinite()) return null;
        // Math.round in JS rounds .5 towards +∞, as Java's does.
        return (int) Math.round(h * 60);
    }

    public static PrayerTimes forDate(LocalDate date, double lat, double lon, ZoneId zone) {
        double offset = offsetHours(zone, date);
        Double[] today = dayHours(date, lat, lon, offset);
        LocalDate next = date.plusDays(1);
        double nextOffset = offsetHours(zone, next);
        Double[] tomorrow = dayHours(next, lat, lon, nextOffset);

        PrayerTimes t = new PrayerTimes();
        t.fajr = minutes(today[0]);
        t.sunrise = minutes(today[1]);
        t.dhuhr = minutes(today[2]);
        t.asr = minutes(today[3]);
        t.maghrib = minutes(today[5]);
        t.isha = minutes(today[6]);
        if (today[4] != null && tomorrow[0] != null) {
            double nextFajr = tomorrow[0] + 24 - (nextOffset - offset);
            t.midnight = minutes(today[4] + (nextFajr - today[4]) / 2);
        }
        return t;
    }

    public static PrayerTimes vienna(LocalDate date) {
        return forDate(date, VIENNA_LAT, VIENNA_LON, VIENNA_ZONE);
    }

    /** The next prayer after {@code now}: its key, and its instant. */
    public static final class Next {
        public final String key;
        public final ZonedDateTime at;
        public final boolean tomorrow;

        Next(String key, ZonedDateTime at, boolean tomorrow) {
            this.key = key;
            this.at = at;
            this.tomorrow = tomorrow;
        }
    }

    public static Next next(ZonedDateTime now) {
        ZonedDateTime local = now.withZoneSameInstant(VIENNA_ZONE);
        LocalDate date = local.toLocalDate();
        PrayerTimes today = vienna(date);
        for (String key : PRAYERS) {
            Integer m = today.get(key);
            if (m == null) continue;
            ZonedDateTime at = clock(date, m);
            if (at.isAfter(local)) return new Next(key, at, false);
        }
        LocalDate tomorrow = date.plusDays(1);
        Integer fajr = vienna(tomorrow).fajr;
        if (fajr == null) return null;
        return new Next("fajr", clock(tomorrow, fajr), true);
    }

    /** Minutes after midnight are a reading of the clock, not time elapsed: on the days the clocks change the two differ by an hour. */
    static ZonedDateTime clock(LocalDate date, int minutes) {
        return date.atStartOfDay().plusMinutes(minutes).atZone(VIENNA_ZONE);
    }

    public static String hhmm(Integer minutes) {
        if (minutes == null) return "—";
        int m = ((minutes % 1440) + 1440) % 1440;
        return String.format(java.util.Locale.ROOT, "%02d:%02d", m / 60, m % 60);
    }
}
