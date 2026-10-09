package at.hausallermenschen.app;

import java.time.DayOfWeek;

/**
 * Which du'a the widget offers at a given hour of a given day, following
 * when each is read (the catalogue's own "when to read"):
 *   Thursday evening and the night into Friday  Kumayl
 *   Friday morning                              Nudba
 *   Friday afternoon                            Simat
 *   Tuesday evening and the night into Wednesday Tawassul
 *   any other morning                           as-Sabah (after the dawn prayer)
 *   any other afternoon and evening             Ziyarat Ashura (daily)
 * "Evening" is from 15:00 and the night runs until 05:00, so the du'a of a
 * night stays on the screen until the morning.
 */
final class DailyDua {
    private DailyDua() {}

    static String slug(DayOfWeek day, int hour) {
        boolean evening = hour >= 15;
        boolean night = hour < 5;
        if ((day == DayOfWeek.THURSDAY && evening) || (day == DayOfWeek.FRIDAY && night)) return "kumail";
        if ((day == DayOfWeek.TUESDAY && evening) || (day == DayOfWeek.WEDNESDAY && night)) return "tawassul";
        if (day == DayOfWeek.FRIDAY) return hour < 12 ? "nudba" : "samat";
        return hour < 12 && !night ? "sabah" : "ziyarat-ashura";
    }
}
