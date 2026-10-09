package at.hausallermenschen.app;

import static org.junit.Assert.assertEquals;

import java.time.DayOfWeek;
import org.junit.Test;

public class DailyDuaTest {
    @Test
    public void followsTheWeek() {
        assertEquals("kumail", DailyDua.slug(DayOfWeek.THURSDAY, 20));
        assertEquals("kumail", DailyDua.slug(DayOfWeek.FRIDAY, 2));
        assertEquals("nudba", DailyDua.slug(DayOfWeek.FRIDAY, 8));
        assertEquals("samat", DailyDua.slug(DayOfWeek.FRIDAY, 17));
        assertEquals("tawassul", DailyDua.slug(DayOfWeek.TUESDAY, 21));
        assertEquals("tawassul", DailyDua.slug(DayOfWeek.WEDNESDAY, 1));
        assertEquals("sabah", DailyDua.slug(DayOfWeek.MONDAY, 7));
        assertEquals("ziyarat-ashura", DailyDua.slug(DayOfWeek.MONDAY, 16));
        assertEquals("ziyarat-ashura", DailyDua.slug(DayOfWeek.SUNDAY, 3));
    }
}
