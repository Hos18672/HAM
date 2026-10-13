package at.hausallermenschen.app

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.ChevronLeft
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.MyLocation
import androidx.compose.material.icons.outlined.NotificationsActive
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Event
import androidx.compose.material.icons.outlined.VolunteerActivism
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale
import kotlinx.coroutines.delay

/** The time now, ticking every twenty seconds: enough for a minutes countdown. */
@Composable
fun rememberNow(): ZonedDateTime {
    val now by produceState(ZonedDateTime.now()) {
        while (true) {
            delay(20_000)
            value = ZonedDateTime.now()
        }
    }
    return now
}

fun gregorianText(date: LocalDate, lang: String): String {
    val locale = if (lang == "fa") Locale.forLanguageTag("fa") else Locale.GERMAN
    val month = date.month.getDisplayName(TextStyle.FULL, locale)
    val weekday = date.dayOfWeek.getDisplayName(TextStyle.FULL, locale)
    return if (lang == "fa") digits("$weekday ${date.dayOfMonth} $month ${date.year}", lang)
    else "$weekday, ${date.dayOfMonth}. $month ${date.year}"
}

/* ─── Home ───────────────────────────────────────────────────────────────── */

private class Quick(val route: String, val label: (Words) -> String, val icon: ImageVector)

private val QUICK = listOf(
    Quick("quran", { it.quran }, Icons.AutoMirrored.Outlined.MenuBook),
    Quick("qibla", { it.qibla }, Icons.Outlined.Explore),
    Quick("duas", { it.duas }, Icons.Outlined.VolunteerActivism),
    Quick("calendar", { it.calendar }, Icons.Outlined.CalendarMonth),
    Quick("events", { it.events }, Icons.Outlined.Event),
    Quick("activities", { it.activities }, Icons.Outlined.Groups),
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun HomeScreen() {
    val state = LocalState.current
    val nav = LocalNav.current
    val now = rememberNow()
    val place = currentPlace(state)
    val content = Repo.content[state.lang]
    Screen(w.appName, root = true) { padding ->
        Body(padding) {
            item { PrayerHero(place, now) }
            item { TodayStrip(place, now) }
            item { SectionTitle(w.quickLinks) }
            item {
                FlowRow(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    maxItemsInEachRow = 3,
                ) {
                    QUICK.forEach { q ->
                        HamCard(Modifier.weight(1f), onClick = { nav.go(q.route) }, padding = 12.dp) {
                            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                                IconDisc(q.icon)
                                Spacer(Modifier.height(8.dp))
                                Text(q.label(w), style = MaterialTheme.typography.labelLarge, color = ham.ink, textAlign = TextAlign.Center, maxLines = 2)
                            }
                        }
                    }
                }
            }
            if (state.lastPage > 0) {
                item {
                    val quran = Repo.quran
                    val surah = quran?.surahOfPage(state.lastPage)
                    MenuRow(
                        Icons.AutoMirrored.Outlined.MenuBook,
                        w.continueReading,
                        listOfNotNull(surah?.let { surahTitle(it.number, lang) }, w.page.format(digits(state.lastPage, lang))).joinToString(" · "),
                    ) { nav.go("quran/page/${state.lastPage}") }
                }
            }
            item { VerseOfDay() }
            val occasions = Repo.calendar?.on(now.toLocalDate()).orEmpty()
            if (occasions.isNotEmpty()) {
                item { SectionTitle(w.occasions) }
                items(occasions) { o ->
                    HamCard(onClick = { nav.go("calendar") }) {
                        Text(o.name(lang), style = MaterialTheme.typography.titleSmall, color = ham.ink)
                        if (o.off) Muted(w.holidayAt)
                    }
                }
            }
            val events = content?.events.orEmpty().take(3)
            if (events.isNotEmpty()) {
                item { SectionTitle(w.upcoming) }
                items(events, key = { it.slug }) { EventRow(it) }
            }
        }
    }
}

@Composable
fun PrayerHero(place: Place, now: ZonedDateTime) {
    val nav = LocalNav.current
    val next = nextPrayer(place, now)
    val local = now.withZoneSameInstant(place.zone).toLocalDate()
    val feed = Repo.calendar
    Box(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(if (ham.dark) ham.card else ham.band)
            .clickable { nav.go("prayer") }
            .padding(20.dp),
    ) {
        val onBand = if (ham.dark) ham.ink else Color(0xFFF7F3E8)
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.LocationOn, null, tint = ham.gold, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text(place.name, color = onBand.copy(alpha = 0.85f), style = MaterialTheme.typography.labelLarge)
            }
            Spacer(Modifier.height(12.dp))
            Text(w.nextPrayer, color = onBand.copy(alpha = 0.7f), style = MaterialTheme.typography.labelLarge)
            if (next != null) {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        w.prayerNames[next.key] ?: next.key,
                        color = onBand,
                        style = MaterialTheme.typography.headlineMedium,
                    )
                    Spacer(Modifier.width(12.dp))
                    Text(
                        digits(next.at.format(DateTimeFormatter.ofPattern("HH:mm")), lang),
                        color = ham.gold,
                        style = MaterialTheme.typography.headlineMedium,
                    )
                }
                Text(
                    w.inTime.format(untilText(now, next.at, lang)) +
                        if (next.at.toLocalDate() != local) " · ${w.tomorrow}" else "",
                    color = onBand.copy(alpha = 0.85f),
                    style = MaterialTheme.typography.titleSmall,
                )
            }
            Spacer(Modifier.height(14.dp))
            Text(gregorianText(local, lang), color = onBand.copy(alpha = 0.75f), style = MaterialTheme.typography.bodySmall)
            val hijri = feed?.hijriText(local, lang)
            val persian = feed?.persianText(local, lang)
            val others = listOfNotNull(hijri, persian).joinToString(" · ")
            if (others.isNotEmpty()) {
                Text(others, color = onBand.copy(alpha = 0.75f), style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

/** The day's six times in a row of small cells, the next one marked. */
@Composable
fun TodayStrip(place: Place, now: ZonedDateTime) {
    val date = now.withZoneSameInstant(place.zone).toLocalDate()
    val times = timesFor(place, date)
    val next = nextPrayer(place, now)
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        listOf("fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha").forEach { key ->
            val on = next?.key == key && next.at.toLocalDate() == date
            Column(
                Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(9.dp))
                    .background(if (on) ham.green else ham.card)
                    .padding(vertical = 10.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    w.prayerNames[key] ?: key,
                    style = MaterialTheme.typography.labelSmall,
                    color = if (on) ham.onGreen else ham.muted,
                    maxLines = 1,
                )
                Text(
                    hhmm(times.get(key), lang),
                    style = MaterialTheme.typography.labelLarge,
                    color = if (on) ham.onGreen else ham.ink,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }
}

@Composable
private fun VerseOfDay() {
    val context = LocalContext.current
    val nav = LocalNav.current
    val verse = remember {
        val verses = Content.verses(context)
        if (verses.length() == 0) null
        else verses.optJSONObject(Math.floorMod(LocalDate.now().toEpochDay(), verses.length().toLong()).toInt())
    } ?: return
    val s = verse.optInt("s")
    HamCard(onClick = {
        val page = Repo.quran?.ayahs?.firstOrNull { it.surah == s && it.number == verse.optInt("n") }?.page
        nav.go(if (page != null) "quran/page/$page" else "quran")
    }) {
        Text(w.verseOfDay, style = MaterialTheme.typography.labelLarge, color = ham.green)
        Spacer(Modifier.height(10.dp))
        ArabicText(verse.optString("ar"), size = 24)
        Spacer(Modifier.height(8.dp))
        Text(verse.optString(lang), style = MaterialTheme.typography.bodyMedium, color = ham.ink2)
        Spacer(Modifier.height(6.dp))
        Muted(digits("${surahTitle(s, lang)} · $s:${verse.optInt("n")}", lang))
    }
}

/** Arabic, right to left whatever the screen's direction, in the Quran's face. */
@Composable
fun ArabicText(text: String, size: Int = 26, color: Color = ham.ink, modifier: Modifier = Modifier, center: Boolean = false) {
    val scale = LocalState.current.textScale
    Text(
        text,
        modifier = modifier.fillMaxWidth(),
        fontFamily = QuranFont,
        fontSize = (size * scale).sp,
        lineHeight = (size * scale * 1.9f).sp,
        color = color,
        style = MaterialTheme.typography.bodyLarge.copy(textDirection = TextDirection.Rtl),
        textAlign = if (center) TextAlign.Center else TextAlign.Start,
    )
}

/** A surah's name the reader's way: Persian for Persian, transliterated for German. */
fun surahTitle(n: Int, lang: String): String =
    if (lang == "fa") "سورهٔ ${SURAH_FA.getOrElse(n - 1) { "" }}" else "${SURAH_DE.getOrElse(n - 1) { "" }}"

/* ─── Prayer times ───────────────────────────────────────────────────────── */

@Composable
fun PrayerScreen() {
    val state = LocalState.current
    val nav = LocalNav.current
    val now = rememberNow()
    val place = currentPlace(state)
    var tab by remember { mutableIntStateOf(0) }
    var picking by remember { mutableStateOf(false) }
    Screen(w.prayer, root = true, actions = {
        androidx.compose.material3.IconButton(onClick = { nav.go("qibla") }) {
            Icon(Icons.Outlined.Explore, contentDescription = w.qibla)
        }
    }) { padding ->
        Body(padding) {
            item { PrayerHero(place, now) }
            item {
                HamCard(onClick = { picking = true }, padding = 14.dp) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconDisc(if (place.id == "here") Icons.Outlined.MyLocation else Icons.Outlined.Place, size = 40.dp)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Muted(w.place)
                            Text(place.name, style = MaterialTheme.typography.titleSmall, color = ham.ink)
                        }
                        Text(w.choosePlace, color = ham.green, style = MaterialTheme.typography.labelLarge)
                    }
                }
            }
            item { Segmented(listOf(w.today, w.monthTable), tab, { tab = it }) }
            if (tab == 0) {
                item { DayList(place, now) }
            } else {
                item { MonthTable(place, now) }
            }
            item {
                MenuRow(Icons.Outlined.NotificationsActive, w.adhan, w.adhanNote) { nav.go("settings") }
            }
            item { Muted(w.method) }
        }
    }
    if (picking) PlacePicker(onDone = { picking = false })
}

@Composable
private fun DayList(place: Place, now: ZonedDateTime) {
    val date = now.withZoneSameInstant(place.zone).toLocalDate()
    val times = timesFor(place, date)
    val next = nextPrayer(place, now)
    HamCard(padding = 6.dp) {
        val rows = listOf("imsak") + PrayerTimes.KEYS.toList()
        rows.forEachIndexed { i, key ->
            val minutes = if (key == "imsak") times.fajr?.let { it - 10 } else times.get(key)
            val on = next?.key == key && next.at.toLocalDate() == date
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (on) ham.green else Color.Transparent)
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                val name = w.prayerNames[key] ?: w.extraNames[key] ?: key
                val minor = key == "imsak" || key == "sunrise" || key == "midnight"
                Text(
                    name,
                    modifier = Modifier.weight(1f),
                    color = if (on) ham.onGreen else if (minor) ham.muted else ham.ink,
                    style = if (minor) MaterialTheme.typography.bodyMedium else MaterialTheme.typography.titleSmall,
                )
                Text(
                    hhmm(minutes, lang),
                    color = if (on) ham.onGreen else if (minor) ham.muted else ham.ink,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = if (minor) FontWeight.Normal else FontWeight.Bold,
                )
            }
            if (i < rows.lastIndex && !on) HorizontalDivider(Modifier.padding(horizontal = 14.dp), color = ham.line)
        }
    }
}

@Composable
private fun MonthTable(place: Place, now: ZonedDateTime) {
    val today = now.withZoneSameInstant(place.zone).toLocalDate()
    var month by remember { mutableStateOf(YearMonth.from(today)) }
    val locale = if (lang == "fa") Locale.forLanguageTag("fa") else Locale.GERMAN
    HamCard(padding = 10.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl
            androidx.compose.material3.IconButton(onClick = { month = month.minusMonths(1) }) {
                Icon(if (rtl) Icons.Outlined.ChevronRight else Icons.Outlined.ChevronLeft, null)
            }
            Text(
                digits("${month.month.getDisplayName(TextStyle.FULL_STANDALONE, locale)} ${month.year}", lang),
                modifier = Modifier.weight(1f),
                textAlign = TextAlign.Center,
                style = MaterialTheme.typography.titleSmall,
            )
            androidx.compose.material3.IconButton(onClick = { month = month.plusMonths(1) }) {
                Icon(if (rtl) Icons.Outlined.ChevronLeft else Icons.Outlined.ChevronRight, null)
            }
        }
        val keys = listOf("fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha")
        Row(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
            Text("", Modifier.weight(0.8f))
            keys.forEach {
                Text(w.prayerNames[it] ?: it, Modifier.weight(1f), style = MaterialTheme.typography.labelSmall, color = ham.muted, textAlign = TextAlign.Center, maxLines = 1)
            }
        }
        // A whole month is short enough to lay out at once inside the scrolling page.
        for (day in 1..month.lengthOfMonth()) {
            val date = month.atDay(day)
            val times = timesFor(place, date)
            val on = date == today
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (on) ham.green else Color.Transparent)
                    .padding(vertical = 6.dp),
            ) {
                Text(digits(day, lang), Modifier.weight(0.8f), textAlign = TextAlign.Center, style = MaterialTheme.typography.labelMedium, color = if (on) ham.onGreen else ham.muted)
                keys.forEach {
                    Text(hhmm(times.get(it), lang), Modifier.weight(1f), textAlign = TextAlign.Center, style = MaterialTheme.typography.labelMedium, color = if (on) ham.onGreen else ham.ink)
                }
            }
        }
    }
}

/** The cities, and the phone's own position. */
@Composable
fun PlacePicker(onDone: () -> Unit) {
    val state = LocalState.current
    val context = LocalContext.current
    var status by remember { mutableStateOf<String?>(null) }
    val words = w
    fun useHere() {
        status = words.locating
        locate(context) { location ->
            if (location == null) {
                status = words.locationDenied
            } else {
                state.updateHere(location.latitude, location.longitude, java.time.ZoneId.systemDefault().id)
                onDone()
            }
        }
    }
    val ask = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
        if (granted.values.any { it }) useHere() else status = words.locationDenied
    }
    AlertDialog(
        onDismissRequest = onDone,
        confirmButton = { TextButton(onClick = onDone) { Text(w.back) } },
        title = { Text(w.choosePlace) },
        text = {
            LazyColumn(Modifier.height(420.dp)) {
                item {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .clickable {
                                if (hasLocationPermission(context)) useHere()
                                else ask.launch(arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION))
                            }
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Outlined.MyLocation, null, tint = ham.green)
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text(w.myLocation, style = MaterialTheme.typography.titleSmall)
                            status?.let { Muted(it) }
                        }
                    }
                }
                items(Repo.cities, key = { it.id }) { city ->
                    val on = state.placeId == city.id
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (on) ham.chip else Color.Transparent)
                            .clickable {
                                state.updatePlace(city.id)
                                onDone()
                            }
                            .padding(12.dp),
                    ) {
                        Text(city.name(lang), style = MaterialTheme.typography.bodyLarge, color = ham.ink)
                    }
                }
            }
        },
        containerColor = ham.paper,
    )
}
