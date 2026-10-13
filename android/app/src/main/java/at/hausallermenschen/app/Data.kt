package at.hausallermenschen.app

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import java.time.LocalDate
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

/* ─── The Quran ──────────────────────────────────────────────────────────── */

class Ayah(
    /** 1 … 6236, the verse's place in the whole Quran (the audio files are named by it). */
    val index: Int,
    val surah: Int,
    val number: Int,
    val page: Int,
    val juz: Int,
    val quarter: Int,
    val sajda: Boolean,
    val text: String,
)

class SurahMeta(
    val number: Int,
    val name: String,
    val translit: String,
    val medinan: Boolean,
    val count: Int,
    val firstPage: Int,
    val firstIndex: Int,
)

class QuranText(val basmala: String, val surahs: List<SurahMeta>, val ayahs: List<Ayah>) {
    private val byPage: Map<Int, List<Ayah>> = ayahs.groupBy { it.page }

    fun page(n: Int): List<Ayah> = byPage[n].orEmpty()

    /** The surah that is being read at the top of a page. */
    fun surahOfPage(n: Int): SurahMeta = surahs[(page(n).firstOrNull()?.surah ?: 1) - 1]

    fun juzOfPage(n: Int): Int = page(n).firstOrNull()?.juz ?: 1

    companion object {
        const val PAGES = 604
    }
}

/* ─── The house's content ────────────────────────────────────────────────── */

class Event(
    val slug: String,
    val start: Instant,
    val end: Instant?,
    val category: String,
    val featured: Boolean,
    val title: String,
    val body: String,
    val location: String,
    val image: String?,
    val imageAlt: String,
    val programme: List<Pair<String, String>>,
)

class Course(
    val slug: String,
    val category: String,
    val title: String,
    val body: String,
    val level: String,
    val fee: String,
    val targetGroup: String,
    val languages: String,
    val schedule: String,
    val days: List<Int>,
    val start: String,
    val end: String,
)

class Sport(val title: String, val audience: String, val schedule: String, val days: List<Int>, val start: String, val end: String)

class Card(val title: String, val body: String)

class WeekRow(val weekday: Int, val start: String, val end: String, val label: String, val detail: String)

class DuaInfo(
    val slug: String,
    val category: String,
    val arabicTitle: String,
    val title: String,
    val summary: String,
    val whenToRead: String,
    val source: String,
)

class Photo(val url: String, val width: Int, val height: Int, val category: String, val alt: String, val caption: String)

class Tier(val title: String, val price: String, val benefits: List<String>)

class Opening(val days: List<Int>, val open: String?, val close: String?, val closed: Boolean)

class House(
    val name: String,
    val address: String,
    val email: String,
    val phone: String,
    val iban: String,
    val bic: String,
    val instagram: String,
    val mapUrl: String,
    val latitude: Double,
    val longitude: Double,
    val hours: List<Opening>,
    val history: List<Pair<String, String>>,
)

class PageText(val title: String, val lead: String, val blocks: Map<String, Any>) {
    fun text(key: String): String = blocks[key] as? String ?: ""

    @Suppress("UNCHECKED_CAST")
    fun list(key: String): List<String> = blocks[key] as? List<String> ?: emptyList()
}

class HouseContent(
    val generated: Instant?,
    val house: House,
    val pages: Map<String, PageText>,
    val events: List<Event>,
    val pastEvents: List<Event>,
    val courses: List<Course>,
    val sports: List<Sport>,
    val culture: List<Card>,
    val community: List<Card>,
    val values: List<Card>,
    val week: List<WeekRow>,
    val duas: List<DuaInfo>,
    val gallery: List<Photo>,
    val tiers: List<Tier>,
) {
    fun page(key: String) = pages[key] ?: PageText("", "", emptyMap())
}

class City(val id: String, val lat: Double, val lng: Double, val zone: String, val group: String, val de: String, val fa: String) {
    fun name(lang: String) = if (lang == "fa") fa else de
}

/** One line of a du'a: the Arabic (null for a rubric), the Persian and the German. */
class DuaLine(val arabic: String?, val fa: String, val de: String)

class DuaText(val origin: String, val lines: List<DuaLine>)

/**
 * Where every screen gets its data. The Quran, the du'as and the cities ship
 * inside the app; the house's content and the calendar are fetched from the
 * site, kept on the phone, and fall back to the copy the app was built with.
 */
object Repo {
    var quran by mutableStateOf<QuranText?>(null)
        private set
    val translations = mutableStateMapOf<String, List<String>>()
    var duaTexts by mutableStateOf<Map<String, DuaText>>(emptyMap())
        private set
    var cities by mutableStateOf<List<City>>(emptyList())
        private set
    val content = mutableStateMapOf<String, HouseContent>()
    /** Whether the content shown is the fetched one (false: offline, the saved copy). */
    var fresh by mutableStateOf(false)
        private set
    var calendar by mutableStateOf<CalendarFeed?>(null)
        private set

    /** The du'a catalogue as the app was built with it, for before the feed is read. */
    private var duaCatalogue: JSONObject? = null

    suspend fun load(context: Context, lang: String) = withContext(Dispatchers.IO) {
        if (cities.isEmpty()) cities = readCities(context)
        if (content[lang] == null) readContent(context, lang, fetched = false)?.let { content[lang] = it }
        if (calendar == null) calendar = readCalendar(context)
        if (quran == null) quran = readQuran(context)
        if (translations[lang] == null) readTranslation(context, lang)?.let { translations[lang] = it }
        if (duaTexts.isEmpty()) duaTexts = readDuaTexts(context)
        Unit
    }

    /** The newest content and calendar from the site; quietly keeps the saved copy when offline. */
    suspend fun refresh(context: Context, lang: String) = withContext(Dispatchers.IO) {
        try {
            val body = download("${BuildConfig.SITE_URL}/app-data/$lang.json")
            val parsed = parseContent(JSONObject(body))
            save(context, "app-data-$lang.json", body)
            content[lang] = parsed
            fresh = true
        } catch (_: Exception) {
            fresh = false
        }
        try {
            val body = download("${BuildConfig.SITE_URL}/widget-data/calendar.json")
            val feed = CalendarFeed(JSONObject(body))
            // The very file the calendar widget keeps, so both show the same.
            save(context, "calendar.json", body)
            calendar = feed
        } catch (_: Exception) {
        }
        Unit
    }

    suspend fun ensureTranslation(context: Context, lang: String) = withContext(Dispatchers.IO) {
        if (translations[lang] == null) readTranslation(context, lang)?.let { translations[lang] = it }
        Unit
    }

    fun duas(lang: String): List<DuaInfo> {
        content[lang]?.duas?.takeIf { it.isNotEmpty() }?.let { return it }
        val catalogue = duaCatalogue ?: return emptyList()
        return catalogue.keys().asSequence().map { slug ->
            val d = catalogue.getJSONObject(slug)
            val own = d.optJSONObject(lang) ?: JSONObject()
            DuaInfo(
                slug = slug,
                category = if (slug.startsWith("ziyarat")) "ziyara" else "dua",
                arabicTitle = d.optString("ar"),
                title = own.optString("title"),
                summary = "",
                whenToRead = own.optString("when"),
                source = "",
            )
        }.toList()
    }

    /* ── reading ─────────────────────────────────────────────────────────── */

    private fun asset(context: Context, name: String): String? =
        try {
            context.assets.open(name).bufferedReader().use { it.readText() }
        } catch (_: Exception) {
            null
        }

    private fun saved(context: Context, name: String): String? {
        val file = File(context.filesDir, name)
        return if (file.exists()) runCatching { file.readText() }.getOrNull() else null
    }

    private fun save(context: Context, name: String, body: String) {
        val tmp = File(context.filesDir, "$name.tmp")
        tmp.writeText(body)
        tmp.renameTo(File(context.filesDir, name))
    }

    private fun download(address: String): String {
        val connection = URL(address).openConnection() as HttpURLConnection
        connection.connectTimeout = 10_000
        connection.readTimeout = 20_000
        connection.setRequestProperty("Accept", "application/json")
        try {
            if (connection.responseCode != 200) error("HTTP ${connection.responseCode}")
            return connection.inputStream.bufferedReader().use { it.readText() }
        } finally {
            connection.disconnect()
        }
    }

    private fun readCities(context: Context): List<City> {
        val array = JSONArray(asset(context, "cities.json") ?: return emptyList())
        return (0 until array.length()).map {
            val c = array.getJSONObject(it)
            City(c.getString("id"), c.getDouble("lat"), c.getDouble("lng"), c.getString("tz"), c.getString("group"), c.getString("de"), c.getString("fa"))
        }
    }

    private fun readContent(context: Context, lang: String, fetched: Boolean): HouseContent? {
        if (duaCatalogue == null) duaCatalogue = asset(context, "duas.json")?.let { runCatching { JSONObject(it) }.getOrNull() }
        val body = saved(context, "app-data-$lang.json") ?: asset(context, "app-data-$lang.json") ?: return null
        fresh = fetched
        return runCatching { parseContent(JSONObject(body)) }.getOrNull()
    }

    private fun readCalendar(context: Context): CalendarFeed? {
        val body = saved(context, "calendar.json") ?: asset(context, "calendar.json") ?: return null
        return runCatching { CalendarFeed(JSONObject(body)) }.getOrNull()
    }

    private fun readQuran(context: Context): QuranText? {
        val body = asset(context, "quran-ar.json") ?: return null
        val root = JSONObject(body)
        val rows = root.getJSONArray("ayahs")
        val ayahs = ArrayList<Ayah>(rows.length())
        for (i in 0 until rows.length()) {
            val r = rows.getJSONArray(i)
            ayahs += Ayah(i + 1, r.getInt(0), r.getInt(1), r.getInt(2), r.getInt(3), r.getInt(4), r.getInt(5) == 1, r.getString(6))
        }
        val firsts = HashMap<Int, Ayah>()
        for (a in ayahs) if (a.number == 1) firsts[a.surah] = a
        val meta = root.getJSONArray("surahs")
        val surahs = (0 until meta.length()).map {
            val m = meta.getJSONArray(it)
            val first = firsts[it + 1]
            SurahMeta(it + 1, m.getString(0), m.getString(1), m.getInt(2) == 1, m.getInt(3), first?.page ?: 1, first?.index ?: 1)
        }
        return QuranText(root.optString("basmala"), surahs, ayahs)
    }

    private fun readTranslation(context: Context, lang: String): List<String>? {
        val array = JSONArray(asset(context, "quran-$lang.json") ?: return null)
        return (0 until array.length()).map { array.getString(it) }
    }

    private fun readDuaTexts(context: Context): Map<String, DuaText> {
        val root = JSONObject(asset(context, "dua-texts.json") ?: return emptyMap())
        return root.keys().asSequence().associateWith { slug ->
            val d = root.getJSONObject(slug)
            val lines = d.getJSONArray("lines")
            DuaText(
                d.optString("origin"),
                (0 until lines.length()).map {
                    val l = lines.getJSONArray(it)
                    DuaLine(if (l.isNull(0)) null else l.getString(0), l.optString(1), l.optString(2))
                },
            )
        }
    }

    /* ── the feed ────────────────────────────────────────────────────────── */

    private fun JSONObject.str(key: String) = if (isNull(key)) "" else optString(key)

    private fun <T> JSONArray?.mapObjects(block: (JSONObject) -> T): List<T> {
        if (this == null) return emptyList()
        return (0 until length()).mapNotNull { runCatching { block(getJSONObject(it)) }.getOrNull() }
    }

    private fun JSONArray?.ints(): List<Int> = if (this == null) emptyList() else (0 until length()).map { getInt(it) }

    private fun JSONArray?.strings(): List<String> = if (this == null) emptyList() else (0 until length()).map { getString(it) }

    private fun event(e: JSONObject) = Event(
        slug = e.getString("slug"),
        start = Instant.parse(e.getString("start")),
        end = if (e.isNull("end")) null else Instant.parse(e.getString("end")),
        category = e.str("category"),
        featured = e.optBoolean("featured"),
        title = e.str("title"),
        body = e.str("body"),
        location = e.str("location"),
        image = if (e.isNull("image")) null else e.optString("image").ifBlank { null },
        imageAlt = e.str("imageAlt"),
        programme = e.optJSONArray("programme").mapObjects { it.str("time") to it.str("title") },
    )

    fun parseContent(root: JSONObject): HouseContent {
        val h = root.getJSONObject("house")
        val house = House(
            name = h.str("name"),
            address = h.str("address"),
            email = h.str("email"),
            phone = h.str("phone"),
            iban = h.str("iban"),
            bic = h.str("bic"),
            instagram = h.str("instagram"),
            mapUrl = h.str("mapUrl"),
            latitude = h.optDouble("latitude", 48.2193),
            longitude = h.optDouble("longitude", 16.3244),
            hours = h.optJSONArray("openingHours").mapObjects {
                Opening(
                    it.optJSONArray("days").ints(),
                    if (it.isNull("open")) null else it.optString("open"),
                    if (it.isNull("close")) null else it.optString("close"),
                    it.optBoolean("closed"),
                )
            },
            history = h.optJSONArray("history").mapObjects { it.str("year") to it.str("text") },
        )
        val pagesJson = root.optJSONObject("pages") ?: JSONObject()
        val pages = pagesJson.keys().asSequence().associateWith { key ->
            val p = pagesJson.getJSONObject(key)
            val b = p.optJSONObject("blocks") ?: JSONObject()
            PageText(
                p.str("title"),
                p.str("lead"),
                b.keys().asSequence().associateWith { k ->
                    val v = b.get(k)
                    if (v is JSONArray) v.strings() else v.toString()
                },
            )
        }
        return HouseContent(
            generated = runCatching { Instant.parse(root.getString("generated")) }.getOrNull(),
            house = house,
            pages = pages,
            events = root.optJSONArray("events").mapObjects(::event),
            pastEvents = root.optJSONArray("pastEvents").mapObjects(::event),
            courses = root.optJSONArray("courses").mapObjects {
                Course(
                    it.str("slug"), it.str("category"), it.str("title"), it.str("body"), it.str("level"),
                    it.str("fee"), it.str("targetGroup"), it.str("languages"), it.str("schedule"),
                    it.optJSONArray("days").ints(), it.str("start"), it.str("end"),
                )
            },
            sports = root.optJSONArray("sports").mapObjects {
                Sport(it.str("title"), it.str("audience"), it.str("schedule"), it.optJSONArray("days").ints(), it.str("start"), it.str("end"))
            },
            culture = root.optJSONArray("culture").mapObjects { Card(it.str("title"), it.str("body")) },
            community = root.optJSONArray("community").mapObjects { Card(it.str("title"), it.str("body")) },
            values = root.optJSONArray("values").mapObjects { Card(it.str("title"), it.str("body")) },
            week = root.optJSONArray("week").mapObjects {
                WeekRow(it.optInt("weekday"), it.str("start"), it.str("end"), it.str("label"), it.str("detail"))
            },
            duas = root.optJSONArray("duas").mapObjects {
                DuaInfo(it.str("slug"), it.str("category"), it.str("arabicTitle"), it.str("title"), it.str("summary"), it.str("whenToRead"), it.str("source"))
            },
            gallery = root.optJSONArray("gallery").mapObjects {
                Photo(it.str("url"), it.optInt("width"), it.optInt("height"), it.str("category"), it.str("alt"), it.str("caption"))
            },
            tiers = root.optJSONArray("memberships").mapObjects {
                Tier(it.str("title"), it.str("price"), it.optJSONArray("benefits").strings())
            },
        )
    }

    /** An address on the site, absolute: the feed's images may be site-relative. */
    fun absolute(url: String): String =
        if (url.startsWith("http://") || url.startsWith("https://")) url
        else BuildConfig.SITE_URL + (if (url.startsWith("/")) url else "/$url")
}

/* ─── The calendar feed ──────────────────────────────────────────────────── */

class Occasion(val date: LocalDate, val off: Boolean, val fa: String, val de: String) {
    fun name(lang: String) = if (lang == "fa") fa else de
}

/** The site's `/widget-data/calendar.json`: each day's Hijri and Persian date, the occasions and holidays. */
class CalendarFeed(root: JSONObject) {
    private val from: LocalDate = LocalDate.parse(root.getString("from"))
    private val days: JSONArray = root.getJSONArray("days")
    private val hijriMonths: Map<String, List<String>>
    private val persianMonths: Map<String, List<String>>
    val occasions: List<Occasion>

    init {
        fun names(o: JSONObject?): Map<String, List<String>> = listOf("fa", "de").associateWith { lang ->
            val a = o?.optJSONArray(lang)
            if (a == null) emptyList() else (0 until a.length()).map { a.getString(it) }
        }
        hijriMonths = names(root.optJSONObject("hijriMonths"))
        persianMonths = names(root.optJSONObject("persianMonths"))
        val list = root.optJSONArray("occasions") ?: JSONArray()
        occasions = (0 until list.length()).mapNotNull {
            val o = list.getJSONObject(it)
            runCatching { Occasion(LocalDate.parse(o.getString("date")), o.optBoolean("off"), o.optString("fa"), o.optString("de")) }.getOrNull()
        }
    }

    val first: LocalDate get() = from
    val last: LocalDate get() = from.plusDays(days.length() - 1L)

    private fun row(date: LocalDate): JSONArray? {
        val i = java.time.temporal.ChronoUnit.DAYS.between(from, date)
        return if (i < 0 || i >= days.length()) null else days.optJSONArray(i.toInt())
    }

    /** [day, month, year] of the Hijri date, or null outside the feed. */
    fun hijri(date: LocalDate): IntArray? = row(date)?.let { intArrayOf(it.getInt(0), it.getInt(1), it.getInt(2)) }

    fun persian(date: LocalDate): IntArray? = row(date)?.let { intArrayOf(it.getInt(3), it.getInt(4), it.getInt(5)) }

    /** The persianMonths list may carry an empty first entry (the site's are indexed from 1). */
    private fun monthName(list: List<String>?, month: Int): String {
        if (list.isNullOrEmpty()) return month.toString()
        val offset = if (list.size == 13) 0 else -1
        return list.getOrNull(month + offset) ?: month.toString()
    }

    fun hijriText(date: LocalDate, lang: String): String? = hijri(date)?.let {
        val name = monthName(hijriMonths[lang], it[1])
        if (lang == "fa") digits("${it[0]} $name ${it[2]}", lang) else "${it[0]}. $name ${it[2]}"
    }

    fun persianText(date: LocalDate, lang: String): String? = persian(date)?.let {
        val name = monthName(persianMonths[lang], it[1])
        if (lang == "fa") digits("${it[0]} $name ${it[2]}", lang) else "${it[0]}. $name ${it[2]}"
    }

    fun hijriMonthName(month: Int, lang: String) = monthName(hijriMonths[lang], month)

    fun on(date: LocalDate): List<Occasion> = occasions.filter { it.date == date }
}
