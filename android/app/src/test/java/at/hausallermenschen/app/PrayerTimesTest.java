package at.hausallermenschen.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

/**
 * The widget's prayer times against the site's own: `prayer-fixture.json` is
 * written by the site's TypeScript (`lib/prayer-times.ts`) for every day of
 * 2026 in three places, and the port has to give the same minute for each.
 */
public class PrayerTimesTest {
    @Test
    public void matchesTheSiteForAYearInThreePlaces() throws Exception {
        InputStream in = getClass().getClassLoader().getResourceAsStream("prayer-fixture.json");
        JSONArray days = new JSONArray(new String(in.readAllBytes(), StandardCharsets.UTF_8));
        assertTrue(days.length() > 1000);
        for (int i = 0; i < days.length(); i++) {
            JSONObject day = days.getJSONObject(i);
            JSONObject place = day.getJSONObject("place");
            PrayerTimes t = PrayerTimes.forDate(
                LocalDate.parse(day.getString("date")),
                place.getDouble("latitude"),
                place.getDouble("longitude"),
                ZoneId.of(place.getString("timeZone")));
            JSONObject expected = day.getJSONObject("times");
            for (String key : PrayerTimes.KEYS) {
                Integer want = expected.isNull(key) ? null : expected.getInt(key);
                assertEquals(place.getString("name") + " " + day.getString("date") + " " + key, want, t.get(key));
            }
        }
    }

    @Test
    public void picksTheNextPrayerAndRollsOverAfterIsha() {
        ZoneId vienna = PrayerTimes.VIENNA_ZONE;
        PrayerTimes.Next afternoon = PrayerTimes.next(ZonedDateTime.of(2026, 10, 9, 14, 0, 0, 0, vienna));
        assertEquals("asr", afternoon.key);
        PrayerTimes.Next late = PrayerTimes.next(ZonedDateTime.of(2026, 10, 9, 23, 30, 0, 0, vienna));
        assertEquals("fajr", late.key);
        assertTrue(late.tomorrow);
        assertEquals(LocalDate.of(2026, 10, 10), late.at.toLocalDate());
    }

    @Test
    public void readsMinutesAsTheClockOnTheDayTheClocksGoForward() {
        // 29 March 2026: Fajr is a clock reading, not minutes elapsed since midnight.
        PrayerTimes t = PrayerTimes.vienna(LocalDate.of(2026, 3, 29));
        ZonedDateTime fajr = PrayerTimes.clock(LocalDate.of(2026, 3, 29), t.fajr);
        assertEquals(t.fajr / 60, fajr.getHour());
        assertEquals(t.fajr % 60, fajr.getMinute());
    }
}
