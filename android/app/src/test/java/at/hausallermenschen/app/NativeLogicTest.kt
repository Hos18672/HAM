package at.hausallermenschen.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeLogicTest {
    @Test
    fun foldsSpellingsForSearch() {
        assertEquals("بقره", bare("البقرة").removePrefix("ال"))
        assertEquals("سوره 2", bare("سوره ۲"))
        assertEquals("ya sin", bare("Ya-Sin"))
        assertEquals("die hohle", bare("Die Höhle"))
        assertTrue(bare(SURAH_KEYWORDS[35]).contains("یاسین"))
        assertTrue(bare(SURAH_KEYWORDS[1]).contains("baqarah"))
    }

    @Test
    fun qiblaFromViennaPointsSouthEast() {
        val bearing = qiblaBearing(PrayerTimes.VIENNA_LAT, PrayerTimes.VIENNA_LON)
        assertEquals(137.0, bearing, 1.5)
        assertEquals(3640.0, kaabaDistanceKm(PrayerTimes.VIENNA_LAT, PrayerTimes.VIENNA_LON), 20.0)
    }

    @Test
    fun surahTablesAreComplete() {
        assertEquals(114, SURAH_PAGES.size)
        assertEquals(114, SURAH_FA.size)
        assertEquals(30, JUZ_PAGES.size)
        assertEquals(440, SURAH_PAGES[35])
    }

    @Test
    fun arabicVerseNumbers() {
        assertEquals("١٢٣", arabicDigits(123))
        assertEquals("۱۲:۳۰", digits("12:30", "fa"))
        assertEquals("12:30", digits("12:30", "de"))
    }
}
