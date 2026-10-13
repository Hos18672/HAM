package at.hausallermenschen.app

import android.content.Intent
import android.provider.CalendarContract
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.ChevronLeft
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.EventAvailable
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.time.format.TextStyle
import java.util.Locale

val HOUSE_ZONE: ZoneId = ZoneId.of("Europe/Vienna")

fun eventWhen(e: Event, lang: String): String {
    val start = e.start.atZone(HOUSE_ZONE)
    val locale = if (lang == "fa") Locale.forLanguageTag("fa") else Locale.GERMAN
    val day = start.dayOfWeek.getDisplayName(TextStyle.FULL, locale)
    val month = start.month.getDisplayName(TextStyle.FULL, locale)
    val time = "%02d:%02d".format(start.hour, start.minute)
    val end = e.end?.atZone(HOUSE_ZONE)?.let { if (it.toLocalDate() == start.toLocalDate()) "–%02d:%02d".format(it.hour, it.minute) else "" } ?: ""
    return if (lang == "fa") digits("$day ${start.dayOfMonth} $month · $time$end", lang)
    else "$day, ${start.dayOfMonth}. $month · $time$end"
}

/** An event in a list: its date as a small block, the title and place. */
@Composable
fun EventRow(e: Event) {
    val nav = LocalNav.current
    val start = e.start.atZone(HOUSE_ZONE)
    val locale = if (lang == "fa") Locale.forLanguageTag("fa") else Locale.GERMAN
    HamCard(onClick = { nav.go("events/${e.slug}") }, padding = 12.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(
                Modifier
                    .size(58.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(ham.chip),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text(digits(start.dayOfMonth, lang), style = MaterialTheme.typography.titleLarge, color = ham.green)
                Text(start.month.getDisplayName(TextStyle.SHORT, locale), style = MaterialTheme.typography.labelSmall, color = ham.muted, maxLines = 1)
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(e.title, style = MaterialTheme.typography.titleSmall, color = ham.ink, maxLines = 2)
                Muted(eventWhen(e, lang), maxLines = 1)
                if (e.location.isNotBlank()) Muted(e.location, maxLines = 1)
            }
        }
    }
}

@Composable
fun EventsScreen() {
    val content = Repo.content[lang]
    var tab by rememberSaveable { mutableIntStateOf(0) }
    val nav = LocalNav.current
    Screen(w.events, root = true, actions = {
        IconButton(onClick = { nav.go("calendar") }) { Icon(Icons.Outlined.CalendarMonth, w.calendar) }
    }) { padding ->
        Body(padding) {
            if (!Repo.fresh && content != null) item { Muted(w.offline) }
            item { Segmented(listOf(w.upcoming, w.past), tab, { tab = it }) }
            val list = if (tab == 0) content?.events.orEmpty() else content?.pastEvents.orEmpty()
            val featured = if (tab == 0) list.firstOrNull { it.featured } else null
            if (featured != null) {
                item {
                    HamCard(onClick = { nav.go("events/${featured.slug}") }, padding = 0.dp) {
                        if (featured.image != null) {
                            RemoteImage(featured.image, featured.imageAlt, Modifier.fillMaxWidth().aspectRatio(16f / 9f))
                        }
                        Column(Modifier.padding(16.dp)) {
                            Text(featured.title, style = MaterialTheme.typography.titleLarge, color = ham.ink)
                            Muted(eventWhen(featured, lang))
                        }
                    }
                }
            }
            items(list.filter { it !== featured }, key = { it.slug }) { EventRow(it) }
            if (list.isEmpty()) item { Empty(w.noEvents) }
        }
    }
}

@Composable
fun EventScreen(slug: String) {
    val content = Repo.content[lang]
    val e = content?.events?.firstOrNull { it.slug == slug } ?: content?.pastEvents?.firstOrNull { it.slug == slug }
    val context = LocalContext.current
    val words = w
    val language = lang
    Screen(e?.title ?: w.events, actions = {
        if (e != null) {
            IconButton(onClick = {
                context.share("${e.title}\n${eventWhen(e, language)}\n${BuildConfig.SITE_URL}/$language/events/${e.slug}")
            }) { Icon(Icons.Outlined.Share, w.share) }
        }
    }) { padding ->
        Body(padding) {
            if (e == null) {
                item { Empty(w.noEvents) }
                return@Body
            }
            if (e.image != null) {
                item {
                    RemoteImage(
                        e.image,
                        e.imageAlt,
                        Modifier.fillMaxWidth().aspectRatio(16f / 9f).clip(RoundedCornerShape(20.dp)),
                    )
                }
            }
            item {
                Text(e.title, style = MaterialTheme.typography.headlineSmall, color = ham.ink)
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.CalendarMonth, null, tint = ham.green, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(eventWhen(e, lang), style = MaterialTheme.typography.bodyMedium, color = ham.ink2)
                }
                if (e.location.isNotBlank()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.LocationOn, null, tint = ham.green, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(e.location, style = MaterialTheme.typography.bodyMedium, color = ham.ink2)
                    }
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(
                        onClick = {
                            val intent = Intent(Intent.ACTION_INSERT)
                                .setData(CalendarContract.Events.CONTENT_URI)
                                .putExtra(CalendarContract.Events.TITLE, e.title)
                                .putExtra(CalendarContract.Events.EVENT_LOCATION, e.location)
                                .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, e.start.toEpochMilli())
                                .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, (e.end ?: e.start.plusSeconds(7200)).toEpochMilli())
                            runCatching { context.startActivity(intent) }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = ham.green, contentColor = ham.onGreen),
                    ) {
                        Icon(Icons.Outlined.EventAvailable, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(words.addToCalendar)
                    }
                    if (e.location.isNotBlank()) {
                        OutlinedButton(onClick = {
                            context.openUri("geo:0,0?q=" + android.net.Uri.encode(e.location))
                        }) { Text(words.directions) }
                    }
                }
            }
            if (e.body.isNotBlank()) item { Text(e.body, style = MaterialTheme.typography.bodyLarge, color = ham.ink) }
            if (e.programme.isNotEmpty()) {
                item { SectionTitle(w.programme) }
                item {
                    HamCard {
                        e.programme.forEach { (time, title) ->
                            Row(Modifier.padding(vertical = 6.dp)) {
                                Text(digits(time, lang), Modifier.width(72.dp), color = ham.green, fontWeight = FontWeight.Bold)
                                Text(title, color = ham.ink)
                            }
                        }
                    }
                }
            }
        }
    }
}

/* ─── The calendar ───────────────────────────────────────────────────────── */

@Composable
fun CalendarScreen() {
    val feed = Repo.calendar
    val content = Repo.content[lang]
    val today = LocalDate.now(HOUSE_ZONE)
    var month by rememberSaveable { mutableStateOf(YearMonth.from(today).toString()) }
    val ym = YearMonth.parse(month)
    var picked by rememberSaveable { mutableStateOf(today.toString()) }
    val day = LocalDate.parse(picked)
    val locale = if (lang == "fa") Locale.forLanguageTag("fa") else Locale.GERMAN
    val events = content?.events.orEmpty()
    Screen(w.calendar) { padding ->
        Body(padding) {
            item {
                HamCard(padding = 10.dp) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl
                        IconButton(onClick = { month = ym.minusMonths(1).toString() }) {
                            Icon(if (rtl) Icons.Outlined.ChevronRight else Icons.Outlined.ChevronLeft, null)
                        }
                        Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                digits("${ym.month.getDisplayName(TextStyle.FULL_STANDALONE, locale)} ${ym.year}", lang),
                                style = MaterialTheme.typography.titleMedium,
                            )
                            val h1 = feed?.hijri(ym.atDay(1))
                            val h2 = feed?.hijri(ym.atEndOfMonth())
                            if (feed != null && h1 != null && h2 != null) {
                                val a = feed.hijriMonthName(h1[1], lang)
                                val b = feed.hijriMonthName(h2[1], lang)
                                Muted(digits(if (a == b) "$a ${h1[2]}" else "$a – $b ${h2[2]}", lang))
                            }
                        }
                        IconButton(onClick = { month = ym.plusMonths(1).toString() }) {
                            Icon(if (rtl) Icons.Outlined.ChevronLeft else Icons.Outlined.ChevronRight, null)
                        }
                    }
                    // Monday first, as on the site.
                    Row(Modifier.fillMaxWidth()) {
                        DayOfWeek.values().forEach {
                            Text(
                                it.getDisplayName(TextStyle.SHORT, locale),
                                Modifier.weight(1f),
                                textAlign = TextAlign.Center,
                                style = MaterialTheme.typography.labelSmall,
                                color = ham.muted,
                                maxLines = 1,
                            )
                        }
                    }
                    val lead = ym.atDay(1).dayOfWeek.value - 1
                    val cells = lead + ym.lengthOfMonth()
                    for (week in 0 until (cells + 6) / 7) {
                        Row(Modifier.fillMaxWidth()) {
                            for (col in 0 until 7) {
                                val n = week * 7 + col - lead + 1
                                Box(Modifier.weight(1f).aspectRatio(0.9f).padding(2.dp), contentAlignment = Alignment.Center) {
                                    if (n in 1..ym.lengthOfMonth()) {
                                        val date = ym.atDay(n)
                                        val off = feed?.on(date)?.any { it.off } == true
                                        val marked = feed?.on(date)?.isNotEmpty() == true ||
                                            events.any { it.start.atZone(HOUSE_ZONE).toLocalDate() == date }
                                        val selected = date == day
                                        Column(
                                            Modifier
                                                .fillMaxWidth()
                                                .clip(RoundedCornerShape(10.dp))
                                                .background(
                                                    when {
                                                        selected -> ham.green
                                                        date == today -> ham.chip
                                                        else -> Color.Transparent
                                                    },
                                                )
                                                .clickable { picked = date.toString() }
                                                .padding(vertical = 4.dp),
                                            horizontalAlignment = Alignment.CenterHorizontally,
                                        ) {
                                            Text(
                                                digits(n, lang),
                                                style = MaterialTheme.typography.labelLarge,
                                                color = when {
                                                    selected -> ham.onGreen
                                                    off -> ham.holiday
                                                    else -> ham.ink
                                                },
                                            )
                                            feed?.hijri(date)?.let {
                                                Text(
                                                    digits(it[0], lang),
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = if (selected) ham.onGreen.copy(alpha = 0.8f) else ham.muted,
                                                )
                                            }
                                            Box(
                                                Modifier
                                                    .size(5.dp)
                                                    .clip(CircleShape)
                                                    .background(if (marked) (if (selected) ham.onGreen else ham.gold) else Color.Transparent),
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            item {
                HamCard {
                    Text(gregorianText(day, lang), style = MaterialTheme.typography.titleMedium, color = ham.ink)
                    feed?.hijriText(day, lang)?.let { Muted("${w.hijri}: $it") }
                    feed?.persianText(day, lang)?.let { Muted("${w.persian}: $it") }
                    feed?.on(day)?.forEach { o ->
                        Spacer(Modifier.height(8.dp))
                        Text(o.name(lang), style = MaterialTheme.typography.titleSmall, color = if (o.off) ham.holiday else ham.green)
                        if (o.off) Muted(w.holidayAt)
                    }
                }
            }
            val todays = events.filter { it.start.atZone(HOUSE_ZONE).toLocalDate() == day }
            items(todays, key = { it.slug }) { EventRow(it) }
            // The month's occasions, at a glance.
            val monthOccasions = feed?.occasions.orEmpty().filter { YearMonth.from(it.date) == ym }
            if (monthOccasions.isNotEmpty()) {
                item { SectionTitle(w.occasions) }
                items(monthOccasions) { o ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .clickable { picked = o.date.toString() }
                            .padding(vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            digits(o.date.dayOfMonth, lang),
                            Modifier.width(36.dp),
                            style = MaterialTheme.typography.titleSmall,
                            color = if (o.off) ham.holiday else ham.green,
                            textAlign = TextAlign.Center,
                        )
                        Text(o.name(lang), style = MaterialTheme.typography.bodyMedium, color = ham.ink)
                    }
                }
            }
        }
    }
}
