package at.hausallermenschen.app

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/** Light, dark, or whatever the phone is set to. */
enum class ThemeChoice { SYSTEM, LIGHT, DARK }

/**
 * The reader's choices, kept on the phone and read by Compose as state, so
 * changing one redraws every screen that shows it.
 *
 * The language is the very preference the widgets read ([Site.lang]), so a
 * widget and the app are always in the same language.
 */
class AppState(private val context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("app", Context.MODE_PRIVATE)

    var lang by mutableStateOf(Site.lang(context))
        private set

    var theme by mutableStateOf(
        runCatching { ThemeChoice.valueOf(prefs.getString("theme", "SYSTEM")!!) }.getOrDefault(ThemeChoice.SYSTEM),
    )
        private set

    /** 0.85 … 1.4: the size of the Quran and du'a text. */
    var textScale by mutableStateOf(prefs.getFloat("textScale", 1f))
        private set

    /** A city's id, or "here" for the phone's own position. */
    var placeId by mutableStateOf(prefs.getString("place", "vienna")!!)
        private set

    var hereLat by mutableStateOf(prefs.getFloat("hereLat", Float.NaN).toDouble())
        private set
    var hereLng by mutableStateOf(prefs.getFloat("hereLng", Float.NaN).toDouble())
        private set
    var hereZone by mutableStateOf(prefs.getString("hereZone", null))
        private set

    var reciter by mutableStateOf(prefs.getString("reciter", RECITERS.first().id)!!)
        private set

    /** The mushaf as a page of Arabic, or verse by verse with the translation under each. */
    var quranTranslation by mutableStateOf(prefs.getBoolean("quranTranslation", false))
        private set

    var lastPage by mutableStateOf(prefs.getInt("lastPage", 0))
        private set

    var bookmarks by mutableStateOf(
        prefs.getString("bookmarks", "")!!.split(',').mapNotNull { it.toIntOrNull() }.toSet(),
    )
        private set

    val fa get() = lang == "fa"

    /** Re-read what may have changed outside the app (the widgets' language switch). */
    fun reload() {
        lang = Site.lang(context)
    }

    fun updateLang(value: String) {
        lang = value
        Site.setLang(context, value)
        // The widgets redraw in the new language too.
        context.sendBroadcast(
            android.content.Intent(context, LanguageSwitch::class.java).setAction(LanguageSwitch.REFRESH),
        )
    }

    fun updateTheme(value: ThemeChoice) {
        theme = value
        prefs.edit().putString("theme", value.name).apply()
    }

    fun updateTextScale(value: Float) {
        textScale = value.coerceIn(0.85f, 1.6f)
        prefs.edit().putFloat("textScale", textScale).apply()
    }

    fun updatePlace(id: String) {
        placeId = id
        prefs.edit().putString("place", id).apply()
    }

    fun updateHere(lat: Double, lng: Double, zone: String) {
        hereLat = lat
        hereLng = lng
        hereZone = zone
        placeId = "here"
        prefs.edit()
            .putFloat("hereLat", lat.toFloat())
            .putFloat("hereLng", lng.toFloat())
            .putString("hereZone", zone)
            .putString("place", "here")
            .apply()
    }

    fun updateReciter(id: String) {
        reciter = id
        prefs.edit().putString("reciter", id).apply()
    }

    fun updateQuranTranslation(on: Boolean) {
        quranTranslation = on
        prefs.edit().putBoolean("quranTranslation", on).apply()
    }

    fun updateLastPage(page: Int) {
        if (page == lastPage) return
        lastPage = page
        prefs.edit().putInt("lastPage", page).apply()
    }

    fun toggleBookmark(page: Int) {
        bookmarks = if (page in bookmarks) bookmarks - page else bookmarks + page
        prefs.edit().putString("bookmarks", bookmarks.sorted().joinToString(",")).apply()
    }
}

class Reciter(val id: String, val fa: String, val de: String)

/** The voices the site's reader offers, from the Islamic Network CDN. */
val RECITERS = listOf(
    Reciter("alafasy", "مشاری العفاسی", "Mishary Alafasy"),
    Reciter("abdulbasitmurattal", "عبدالباسط عبدالصمد", "Abdul Basit (Murattal)"),
    Reciter("husary", "محمود خلیل الحصری", "Mahmoud Khalil Al-Husary"),
    Reciter("minshawi", "محمد صدیق المنشاوی", "Muhammad Siddiq Al-Minshawi"),
)
