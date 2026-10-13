package at.hausallermenschen.app

import android.Manifest
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Call
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.Gavel
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Palette
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material.icons.outlined.PrivacyTip
import androidx.compose.material.icons.outlined.School
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.SportsSoccer
import androidx.compose.material.icons.outlined.TheaterComedy
import androidx.compose.material.icons.outlined.VolunteerActivism
import androidx.compose.material.icons.outlined.Mail
import androidx.compose.material.icons.outlined.CameraAlt
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import java.time.ZonedDateTime

/* ─── More ───────────────────────────────────────────────────────────────── */

@Composable
fun MoreScreen() {
    val nav = LocalNav.current
    val context = LocalContext.current
    val words = w
    Screen(w.more, root = true) { padding ->
        Body(padding) {
            item { SectionTitle(w.prayer) }
            item { MenuRow(Icons.Outlined.Explore, w.qibla) { nav.go("qibla") } }
            item { MenuRow(Icons.Outlined.CalendarMonth, w.calendar) { nav.go("calendar") } }
            item { MenuRow(Icons.Outlined.VolunteerActivism, w.duas) { nav.go("duas") } }
            item { MenuRow(Icons.AutoMirrored.Outlined.MenuBook, w.quran) { nav.go("quran") } }
            item { SectionTitle(w.activities) }
            item { MenuRow(Icons.Outlined.School, w.courses) { nav.go("courses") } }
            item { MenuRow(Icons.Outlined.TheaterComedy, w.culture) { nav.go("culture") } }
            item { MenuRow(Icons.Outlined.SportsSoccer, w.sport) { nav.go("sport") } }
            item { MenuRow(Icons.Outlined.Groups, w.community) { nav.go("community") } }
            item { MenuRow(Icons.Outlined.PhotoLibrary, w.gallery) { nav.go("gallery") } }
            item { SectionTitle(w.appName) }
            item { MenuRow(Icons.Outlined.Info, w.about) { nav.go("about") } }
            item { MenuRow(Icons.Outlined.AccountBalance, w.support) { nav.go("support") } }
            item { MenuRow(Icons.Outlined.Mail, w.contact) { nav.go("contact") } }
            item { MenuRow(Icons.Outlined.Settings, w.settings) { nav.go("settings") } }
            item {
                MenuRow(Icons.Outlined.Share, w.shareApp) {
                    context.share("${words.shareAppText}\nhttps://play.google.com/store/apps/details?id=${context.packageName}")
                }
            }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                    TextButton(onClick = { nav.go("privacy") }) { Text(w.privacy) }
                    TextButton(onClick = { nav.go("imprint") }) { Text(w.imprint) }
                }
            }
        }
    }
}

/* ─── Activities ─────────────────────────────────────────────────────────── */

fun weekdaysText(days: List<Int>, lang: String): String =
    days.mapNotNull { words(lang).weekdays.getOrNull(it - 1) }.joinToString(lang.let { if (it == "fa") "، " else ", " })

fun timeRange(start: String, end: String, lang: String): String =
    digits(listOf(start, end).filter { it.isNotBlank() }.joinToString("–"), lang)

@Composable
fun ActivitiesScreen() {
    val nav = LocalNav.current
    val content = Repo.content[lang]
    Screen(w.activities) { padding ->
        Body(padding) {
            item { MenuRow(Icons.Outlined.School, w.courses, content?.courses?.size?.takeIf { it > 0 }?.let { digits(it, lang) }) { nav.go("courses") } }
            item { MenuRow(Icons.Outlined.TheaterComedy, w.culture) { nav.go("culture") } }
            item { MenuRow(Icons.Outlined.SportsSoccer, w.sport) { nav.go("sport") } }
            item { MenuRow(Icons.Outlined.Groups, w.community) { nav.go("community") } }
            val week = content?.week.orEmpty()
            if (week.isNotEmpty()) {
                item { SectionTitle(w.week) }
                item {
                    HamCard {
                        // The schedule counts 0 = Sunday; the words list starts on Monday.
                        week.sortedBy { (it.weekday + 6) % 7 }.forEachIndexed { i, row ->
                            if (i > 0) HorizontalDivider(Modifier.padding(vertical = 8.dp), color = ham.line)
                            Text(
                                words(lang).weekdays[(row.weekday + 6) % 7] + " · " + timeRange(row.start, row.end, lang),
                                style = MaterialTheme.typography.labelLarge,
                                color = ham.green,
                            )
                            Text(row.label, style = MaterialTheme.typography.titleSmall, color = ham.ink)
                            if (row.detail.isNotBlank()) Muted(row.detail)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PageLead(key: String) {
    val page = Repo.content[lang]?.page(key) ?: return
    if (page.lead.isNotBlank()) Text(page.lead, style = MaterialTheme.typography.bodyLarge, color = ham.ink2)
}

@Composable
fun CoursesScreen() {
    val content = Repo.content[lang]
    Screen(w.courses) { padding ->
        Body(padding) {
            item { PageLead("courses") }
            items(content?.courses.orEmpty(), key = { it.slug.ifBlank { it.title } }) { c ->
                HamCard {
                    Text(c.title, style = MaterialTheme.typography.titleMedium, color = ham.ink)
                    if (c.body.isNotBlank()) {
                        Spacer(Modifier.height(4.dp))
                        Text(c.body, style = MaterialTheme.typography.bodyMedium, color = ham.ink2)
                    }
                    Spacer(Modifier.height(8.dp))
                    val schedule = c.schedule.ifBlank {
                        listOf(weekdaysText(c.days, lang), timeRange(c.start, c.end, lang)).filter { it.isNotBlank() }.joinToString(" · ")
                    }
                    Facts(
                        w.schedule to schedule,
                        w.audience to c.targetGroup,
                        w.level to c.level,
                        w.languages to c.languages,
                        w.fee to c.fee,
                    )
                }
            }
            if (content?.courses.isNullOrEmpty()) item { Empty(w.noEvents) }
        }
    }
}

@Composable
private fun Facts(vararg pairs: Pair<String, String>) {
    pairs.filter { it.second.isNotBlank() }.forEach { (label, value) ->
        Row(Modifier.padding(vertical = 2.dp)) {
            Text("$label: ", style = MaterialTheme.typography.bodySmall, color = ham.muted)
            Text(value, style = MaterialTheme.typography.bodySmall, color = ham.ink, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
fun CardsScreen(key: String) {
    val content = Repo.content[lang]
    val cards = if (key == "culture") content?.culture.orEmpty() else content?.community.orEmpty()
    Screen(if (key == "culture") w.culture else w.community) { padding ->
        Body(padding) {
            item { PageLead(key) }
            items(cards) { c ->
                HamCard {
                    Text(c.title, style = MaterialTheme.typography.titleMedium, color = ham.ink)
                    Spacer(Modifier.height(4.dp))
                    Text(c.body, style = MaterialTheme.typography.bodyMedium, color = ham.ink2)
                }
            }
            if (cards.isEmpty()) item { Empty(w.noEvents) }
        }
    }
}

@Composable
fun SportScreen() {
    val content = Repo.content[lang]
    Screen(w.sport) { padding ->
        Body(padding) {
            item { PageLead("sport") }
            items(content?.sports.orEmpty()) { s ->
                HamCard {
                    Text(s.title, style = MaterialTheme.typography.titleMedium, color = ham.ink)
                    Spacer(Modifier.height(6.dp))
                    Facts(
                        w.schedule to s.schedule.ifBlank {
                            listOf(weekdaysText(s.days, lang), timeRange(s.start, s.end, lang)).filter { it.isNotBlank() }.joinToString(" · ")
                        },
                        w.audience to s.audience,
                    )
                }
            }
            if (content?.sports.isNullOrEmpty()) item { Empty(w.noEvents) }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun GalleryScreen() {
    val photos = Repo.content[lang]?.gallery.orEmpty()
    var open by remember { mutableStateOf<Photo?>(null) }
    Screen(w.gallery) { padding ->
        Body(padding) {
            if (photos.isEmpty()) item { Empty(w.noResults) }
            // Two pictures a row on a phone, more on a tablet's wider column.
            items(photos.chunked(2)) { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    row.forEach { p ->
                        Column(Modifier.weight(1f)) {
                            RemoteImage(
                                p.url,
                                p.alt,
                                Modifier
                                    .fillMaxWidth()
                                    .aspectRatio(1f)
                                    .clip(RoundedCornerShape(16.dp))
                                    .then(Modifier),
                                maxWidth = 700,
                            )
                            if (p.caption.isNotBlank()) Muted(p.caption, maxLines = 2)
                        }
                    }
                    if (row.size == 1) Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}

/* ─── About, support, contact ────────────────────────────────────────────── */

@Composable
fun AboutScreen() {
    val content = Repo.content[lang]
    val about = content?.page("about")
    Screen(w.about) { padding ->
        Body(padding) {
            item {
                Text(content?.house?.name ?: w.appName, style = MaterialTheme.typography.headlineSmall, color = ham.ink)
                if (!about?.lead.isNullOrBlank()) {
                    Spacer(Modifier.height(6.dp))
                    Text(about!!.lead, style = MaterialTheme.typography.bodyLarge, color = ham.ink2)
                }
            }
            about?.blocks?.values?.filterIsInstance<String>()?.filter { it.isNotBlank() }?.forEach { text ->
                item { Text(text, style = MaterialTheme.typography.bodyMedium, color = ham.ink2) }
            }
            val values = content?.values.orEmpty()
            items(values) { v ->
                HamCard {
                    Text(v.title, style = MaterialTheme.typography.titleSmall, color = ham.green)
                    Text(v.body, style = MaterialTheme.typography.bodyMedium, color = ham.ink2)
                }
            }
            val history = content?.house?.history.orEmpty()
            if (history.isNotEmpty()) {
                item { SectionTitle(w.history) }
                item {
                    HamCard {
                        history.forEachIndexed { i, (year, text) ->
                            if (i > 0) Spacer(Modifier.height(10.dp))
                            if (year.isNotBlank()) Text(digits(year, lang), style = MaterialTheme.typography.labelLarge, color = ham.gold)
                            Text(text, style = MaterialTheme.typography.bodyMedium, color = ham.ink)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SupportScreen() {
    val nav = LocalNav.current
    val content = Repo.content[lang]
    val context = LocalContext.current
    val words = w
    Screen(w.support) { padding ->
        Body(padding) {
            item { PageLead("support") }
            items(content?.tiers.orEmpty()) { t ->
                HamCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(t.title, Modifier.weight(1f), style = MaterialTheme.typography.titleMedium, color = ham.ink)
                        Text(digits(t.price, lang), style = MaterialTheme.typography.titleMedium, color = ham.green)
                    }
                    t.benefits.forEach { Text("• $it", style = MaterialTheme.typography.bodyMedium, color = ham.ink2) }
                }
            }
            val house = content?.house
            if (house != null && house.iban.isNotBlank()) {
                item { SectionTitle(w.donate) }
                item {
                    HamCard {
                        Muted(w.iban)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(house.iban, Modifier.weight(1f), style = MaterialTheme.typography.titleMedium, color = ham.ink)
                            IconButton(onClick = { context.copy(house.iban.replace(" ", ""), words.copied) }) {
                                Icon(Icons.Outlined.ContentCopy, w.copy, tint = ham.green)
                            }
                        }
                        if (house.bic.isNotBlank()) Muted("BIC: ${house.bic}")
                    }
                }
            }
            item { MenuRow(Icons.Outlined.Mail, w.contact) { nav.go("contact") } }
        }
    }
}

@Composable
fun ContactScreen() {
    val language = lang
    val content = Repo.content[lang]
    val house = content?.house
    val context = LocalContext.current
    val now = rememberNow()
    Screen(w.contact) { padding ->
        Body(padding) {
            if (house == null) {
                item { Empty(w.noResults) }
                return@Body
            }
            item { OpenStatus(house, now) }
            item {
                MenuRow(Icons.Outlined.LocationOn, w.address, house.address) {
                    context.openUri(house.mapUrl.ifBlank { "geo:${house.latitude},${house.longitude}?q=" + android.net.Uri.encode(house.address) })
                }
            }
            if (house.phone.isNotBlank()) {
                item { MenuRow(Icons.Outlined.Call, w.call, digits(house.phone, lang)) { context.openUri("tel:" + house.phone.replace(" ", "")) } }
            }
            if (house.email.isNotBlank()) {
                item { MenuRow(Icons.Outlined.Email, w.email, house.email) { context.openUri("mailto:" + house.email) } }
            }
            if (house.instagram.isNotBlank()) {
                item { MenuRow(Icons.Outlined.CameraAlt, w.instagram, "@" + house.instagram) { context.openUri("https://instagram.com/" + house.instagram) } }
            }
            item { MenuRow(Icons.Outlined.Language, w.website, BuildConfig.SITE_URL.removePrefix("https://")) { context.openUri("${BuildConfig.SITE_URL}/$language") } }
            item { SectionTitle(w.openingHours) }
            item {
                HamCard {
                    house.hours.forEachIndexed { i, o ->
                        if (i > 0) HorizontalDivider(Modifier.padding(vertical = 6.dp), color = ham.line)
                        Row {
                            Text(weekdaysText(o.days, lang), Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium, color = ham.ink)
                            Text(
                                if (o.closed || o.open == null || o.close == null) w.byProgramme else timeRange(o.open, o.close, lang),
                                style = MaterialTheme.typography.bodyMedium,
                                color = ham.ink,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OpenStatus(house: House, now: ZonedDateTime) {
    val local = now.withZoneSameInstant(HOUSE_ZONE)
    val minutes = local.hour * 60 + local.minute
    val day = local.dayOfWeek.value
    val open = house.hours.any { o ->
        !o.closed && day in o.days && o.open != null && o.close != null &&
            minutes >= toMinutes(o.open) && minutes < toMinutes(o.close)
    }
    HamCard(color = if (open) ham.green else ham.card) {
        Text(
            if (open) w.openNow else w.closedNow,
            style = MaterialTheme.typography.titleMedium,
            color = if (open) ham.onGreen else ham.ink,
        )
    }
}

private fun toMinutes(hhmm: String): Int {
    val (h, m) = hhmm.split(':').map { it.toIntOrNull() ?: 0 } + listOf(0, 0)
    return h * 60 + m
}

/* ─── Settings ───────────────────────────────────────────────────────────── */

@Composable
fun SettingsScreen() {
    val state = LocalState.current
    val context = LocalContext.current
    var adhanVersion by remember { mutableIntStateOf(0) }
    val askNotifications = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { adhanVersion++ }
    Screen(w.settings) { padding ->
        Body(padding) {
            item { SectionTitle(w.language) }
            item { Segmented(listOf("فارسی", "Deutsch"), if (state.fa) 0 else 1, { state.updateLang(if (it == 0) "fa" else "de") }) }
            item { SectionTitle(w.theme) }
            item {
                Segmented(
                    listOf(w.themeSystem, w.themeLight, w.themeDark),
                    state.theme.ordinal,
                    { state.updateTheme(ThemeChoice.entries[it]) },
                )
            }
            item { SectionTitle(w.textSize) }
            item {
                HamCard {
                    ArabicText(w.sample, size = 24, center = true)
                    Slider(
                        value = state.textScale,
                        onValueChange = { state.updateTextScale(it) },
                        valueRange = 0.85f..1.6f,
                        colors = SliderDefaults.colors(thumbColor = ham.green, activeTrackColor = ham.green),
                    )
                }
            }
            item { SectionTitle(w.adhan) }
            item {
                HamCard(padding = 8.dp) {
                    Muted(w.adhanNote, Modifier.padding(8.dp))
                    // Read again whenever a switch moves or a permission comes back.
                    key(adhanVersion) { Adhan.KEYS.forEach { key ->
                        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(w.prayerNames[key] ?: key, Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
                            Switch(
                                checked = Adhan.isOn(context, key),
                                onCheckedChange = { on ->
                                    Adhan.set(context, key, on)
                                    adhanVersion++
                                    if (on && Build.VERSION.SDK_INT >= 33) askNotifications.launch(Manifest.permission.POST_NOTIFICATIONS)
                                },
                                colors = SwitchDefaults.colors(checkedTrackColor = ham.green, checkedThumbColor = ham.onGreen),
                            )
                        }
                    } }
                    if (!Adhan.exact(context) && Build.VERSION.SDK_INT >= 31) {
                        TextButton(onClick = {
                            runCatching {
                                context.startActivity(
                                    Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, android.net.Uri.parse("package:" + context.packageName)),
                                )
                            }
                        }) { Text(context.getString(R.string.adhan_exact)) }
                    }
                }
            }
            item { Muted(w.dataNote) }
            item {
                val version = runCatching { context.packageManager.getPackageInfo(context.packageName, 0).versionName }.getOrNull() ?: ""
                Muted("${w.version} ${digits(version, state.lang)}")
            }
        }
    }
}

/* ─── Privacy and imprint ────────────────────────────────────────────────── */

@Composable
fun LegalScreen(which: String) {
    val language = lang
    val context = LocalContext.current
    val content = Repo.content[lang]
    Screen(if (which == "privacy") w.privacy else w.imprint) { padding ->
        Body(padding) {
            if (which == "privacy") {
                item { Text(w.dataNote, style = MaterialTheme.typography.bodyLarge, color = ham.ink) }
            } else {
                content?.house?.let { h ->
                    item {
                        HamCard {
                            Text(h.name, style = MaterialTheme.typography.titleMedium, color = ham.ink)
                            Text(h.address, style = MaterialTheme.typography.bodyMedium, color = ham.ink2)
                            if (h.email.isNotBlank()) Text(h.email, style = MaterialTheme.typography.bodyMedium, color = ham.ink2)
                        }
                    }
                }
            }
            item {
                MenuRow(if (which == "privacy") Icons.Outlined.PrivacyTip else Icons.Outlined.Gavel, w.legalOnline) {
                    context.openUri("${BuildConfig.SITE_URL}/$language/$which")
                }
            }
        }
    }
}

/* ─── Search ─────────────────────────────────────────────────────────────── */

class Hit(val kind: String, val title: String, val subtitle: String, val route: String, val words: String)

private fun index(lang: String): List<Hit> {
    val w = words(lang)
    val pages = listOf(
        Triple("prayer", w.prayer, "Gebet Salat Namaz Fajr Dhuhr Asr Maghrib Isha Adhan Azan نماز اذان اوقات شرعی صبح ظهر عصر مغرب عشا"),
        Triple("qibla", w.qibla, "Kibla Qibla Kompass Mekka Kaaba قبله قبله نما قطب نما کعبه"),
        Triple("quran", w.quran, "Koran Quran Sure Mushaf قرآن سوره مصحف"),
        Triple("duas", w.duas, "Dua Bittgebet Ziyarat دعا ادعیه زیارت"),
        Triple("calendar", w.calendar, "Kalender Hijri Feiertage تقویم قمری شمسی مناسبت"),
        Triple("events", w.events, "Termine Veranstaltungen برنامه مراسم"),
        Triple("activities", w.activities, "Aktivitäten فعالیت"),
        Triple("courses", w.courses, "Kurse Unterricht کلاس آموزش"),
        Triple("culture", w.culture, "Kultur فرهنگ"),
        Triple("sport", w.sport, "Sport ورزش"),
        Triple("community", w.community, "Gemeinschaft همیاری"),
        Triple("gallery", w.gallery, "Galerie Fotos گالری عکس"),
        Triple("about", w.about, "Über uns Verein درباره ما انجمن"),
        Triple("support", w.support, "Mitglied Spenden IBAN عضویت کمک مالی"),
        Triple("contact", w.contact, "Kontakt Adresse Öffnungszeiten Telefon تماس نشانی آدرس ساعات کاری"),
        Triple("settings", w.settings, "Einstellungen Dark Mode Sprache تنظیمات حالت تاریک زبان"),
    ).map { (route, title, keys) -> Hit("page", title, "", route, "$title $keys") }
    val surahs = (1..114).map { n ->
        val page = Repo.quran?.surahs?.getOrNull(n - 1)?.firstPage ?: SURAH_PAGES[n - 1]
        Hit(
            "surah",
            if (lang == "fa") "سورهٔ ${SURAH_FA[n - 1]}" else "$n. ${SURAH_DE[n - 1]}",
            if (lang == "fa") digits("سورهٔ $n · صفحهٔ $page", lang) else "${SURAH_MEANING_DE[n - 1]} · Seite $page",
            "quran/page/$page",
            "${SURAH_KEYWORDS[n - 1]} Sure $n سوره $n",
        )
    }
    val juz = (1..30).map { j ->
        Hit("juz", if (lang == "fa") digits("جزء $j", lang) else "Juz $j", w.page.format(digits(JUZ_PAGES[j - 1], lang)), "quran/page/${JUZ_PAGES[j - 1]}", "Juz $j جزء $j پاره $j")
    }
    val duas = Repo.duas(lang).map { d ->
        Hit("dua", d.title, d.arabicTitle, if (Repo.duaTexts.containsKey(d.slug)) "duas/${d.slug}" else "duas", "${d.title} ${d.arabicTitle} ${d.slug} ${d.summary} ${d.whenToRead}")
    }
    val content = Repo.content[lang]
    val events = content?.events.orEmpty().map { e -> Hit("event", e.title, eventWhen(e, lang), "events/${e.slug}", "${e.title} ${e.location} ${e.body}") }
    val courses = content?.courses.orEmpty().map { c -> Hit("course", c.title, c.targetGroup, "courses", "${c.title} ${c.body} ${c.category}") }
    return pages + surahs + juz + duas + events + courses
}

@Composable
fun SearchScreen() {
    val nav = LocalNav.current
    var query by rememberSaveable { mutableStateOf("") }
    val focus = remember { FocusRequester() }
    val language = lang
    val all = remember(language, Repo.quran, Repo.content[language], Repo.duaTexts) {
        index(language).map { it to bare(it.words + " " + it.title) }
    }
    val q = bare(query)
    val terms = q.split(' ').filter { it.isNotEmpty() }
    val hits = if (terms.isEmpty()) emptyList() else all
        .filter { (_, text) -> terms.all { text.contains(it) } }
        .sortedByDescending { (hit, _) ->
            val title = bare(hit.title)
            (if (title == q) 6 else 0) + (if (title.contains(q)) 3 else 0) + (if (title.startsWith(q)) 1 else 0)
        }
        .take(60)
        .map { it.first }
    LaunchedEffect(Unit) { runCatching { focus.requestFocus() } }
    Screen(w.search) { padding ->
        Body(padding) {
            item {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    modifier = Modifier.fillMaxWidth().focusRequester(focus),
                    placeholder = { Text(w.searchHint) },
                    leadingIcon = { Icon(Icons.Outlined.Search, null) },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = ham.card,
                        unfocusedContainerColor = ham.card,
                        focusedBorderColor = ham.green,
                        unfocusedBorderColor = ham.line,
                    ),
                )
            }
            if (terms.isNotEmpty() && hits.isEmpty()) item { Empty(w.noResults) }
            items(hits) { hit ->
                HamCard(onClick = { nav.go(hit.route) }, padding = 14.dp) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(hit.title, style = MaterialTheme.typography.titleSmall, color = ham.ink)
                            if (hit.subtitle.isNotBlank()) Muted(hit.subtitle, maxLines = 1)
                        }
                        Spacer(Modifier.width(8.dp))
                        Chip(w.searchKinds[hit.kind] ?: hit.kind)
                    }
                }
            }
        }
    }
}
