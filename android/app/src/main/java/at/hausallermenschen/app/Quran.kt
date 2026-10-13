package at.hausallermenschen.app

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Bookmark
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.MoreVert
import androidx.compose.material.icons.outlined.Pause
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Stop
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import kotlinx.coroutines.launch

/** Arabic-Indic digits, for verse numbers inside the Arabic. */
fun arabicDigits(n: Int): String = n.toString().map { '٠' + (it - '0') }.joinToString("")

/** Folds the spellings people type for the same letters, and strips the marks. */
fun bare(text: String): String {
    val folded = StringBuilder()
    for (c in text.lowercase()) {
        when (c) {
            'ٱ', 'أ', 'إ', 'آ' -> folded.append('ا')
            'ي', 'ى', 'ئ' -> folded.append('ی')
            'ك' -> folded.append('ک')
            'ة' -> folded.append('ه')
            'ؤ' -> folded.append('و')
            in '۰'..'۹' -> folded.append('0' + (c - '۰'))
            in '٠'..'٩' -> folded.append('0' + (c - '٠'))
            '\'', '’', '`', '-', '.', '‌' -> folded.append(' ')
            'ä' -> folded.append('a')
            'ö' -> folded.append('o')
            'ü' -> folded.append('u')
            'ß' -> folded.append("ss")
            else -> if (c in 'ً'..'ٰ' || c == 'ـ' || c in 'ۖ'..'ۭ') Unit else folded.append(c)
        }
    }
    return folded.toString().replace(Regex("\\s+"), " ").trim()
}

/* ─── The index ──────────────────────────────────────────────────────────── */

@Composable
fun QuranIndex() {
    val state = LocalState.current
    val nav = LocalNav.current
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var query by rememberSaveable { mutableStateOf("") }
    val quran = Repo.quran
    Screen(w.quran, root = true) { padding ->
        Body(padding) {
            if (state.lastPage > 0) {
                item {
                    HamCard(color = ham.green, onClick = { nav.go("quran/page/${state.lastPage}") }) {
                        Text(w.continueReading, color = ham.onGreen.copy(alpha = 0.8f), style = MaterialTheme.typography.labelLarge)
                        Text(
                            quran?.surahOfPage(state.lastPage)?.let { surahTitle(it.number, lang) } ?: "",
                            color = ham.onGreen,
                            style = MaterialTheme.typography.titleLarge,
                        )
                        Text(w.page.format(digits(state.lastPage, lang)), color = ham.onGreen.copy(alpha = 0.85f))
                    }
                }
            }
            item {
                Segmented(
                    listOf(w.surahs, w.juz, w.bookmarks + if (state.bookmarks.isNotEmpty()) " " + digits(state.bookmarks.size, lang) else ""),
                    tab,
                    { tab = it },
                )
            }
            when (tab) {
                0 -> {
                    item {
                        OutlinedTextField(
                            value = query,
                            onValueChange = { query = it },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text(w.filterSurahs) },
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
                    val q = bare(query)
                    val list = (1..114).filter { n ->
                        q.isEmpty() || n.toString() == q || bare(SURAH_KEYWORDS[n - 1]).contains(q) ||
                            (quran != null && bare(quran.surahs[n - 1].name).contains(q))
                    }
                    items(list, key = { it }) { n -> SurahRow(n) }
                    if (list.isEmpty()) item { Empty(w.noResults) }
                }
                1 -> items((1..30).toList(), key = { it }) { j ->
                    val page = JUZ_PAGES[j - 1]
                    HamCard(onClick = { nav.go("quran/page/$page") }, padding = 14.dp) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            NumberBadge(j)
                            Spacer(Modifier.width(14.dp))
                            Column(Modifier.weight(1f)) {
                                Text("${w.juz} ${digits(j, lang)}", style = MaterialTheme.typography.titleSmall, color = ham.ink)
                                Muted(
                                    (quran?.surahOfPage(page)?.let { surahTitle(it.number, lang) + " · " } ?: "") +
                                        w.page.format(digits(page, lang)),
                                )
                            }
                        }
                    }
                }
                else -> {
                    val marks = state.bookmarks.sorted()
                    if (marks.isEmpty()) item { Empty(w.noBookmarks) }
                    items(marks, key = { it }) { page ->
                        HamCard(onClick = { nav.go("quran/page/$page") }, padding = 14.dp) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Outlined.Bookmark, null, tint = ham.gold)
                                Spacer(Modifier.width(14.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(w.page.format(digits(page, lang)), style = MaterialTheme.typography.titleSmall, color = ham.ink)
                                    quran?.surahOfPage(page)?.let { Muted(surahTitle(it.number, lang)) }
                                }
                                IconButton(onClick = { state.toggleBookmark(page) }) { Icon(Icons.Outlined.Close, w.bookmark, tint = ham.muted) }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NumberBadge(n: Int) {
    Box(
        Modifier
            .size(40.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(ham.chip),
        contentAlignment = Alignment.Center,
    ) {
        Text(digits(n, lang), style = MaterialTheme.typography.labelLarge, color = ham.green, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun SurahRow(n: Int) {
    val nav = LocalNav.current
    val meta = Repo.quran?.surahs?.getOrNull(n - 1)
    val page = meta?.firstPage ?: SURAH_PAGES[n - 1]
    HamCard(onClick = { nav.go("quran/page/$page") }, padding = 12.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            NumberBadge(n)
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    if (lang == "fa") SURAH_FA[n - 1] else SURAH_DE[n - 1],
                    style = MaterialTheme.typography.titleSmall,
                    color = ham.ink,
                )
                val parts = listOfNotNull(
                    if (lang == "de") SURAH_MEANING_DE[n - 1] else null,
                    meta?.let { if (it.medinan) w.medinan else w.meccan },
                    meta?.let { w.verses.format(digits(it.count, lang)) },
                    w.page.format(digits(page, lang)),
                )
                Muted(parts.joinToString(" · "), maxLines = 1)
            }
            Text(
                meta?.name?.removePrefix("سُورَةُ ") ?: "",
                fontFamily = QuranFont,
                fontSize = 22.sp,
                color = ham.green,
            )
        }
    }
}

/* ─── The recitation ─────────────────────────────────────────────────────── */

/** One verse after another from the Islamic Network CDN, the same files the site plays. */
@androidx.annotation.OptIn(markerClass = [UnstableApi::class])
class QuranAudio(context: Context) {
    val player: ExoPlayer = ExoPlayer.Builder(context)
        .setAudioAttributes(
            AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_SPEECH).build(),
            true,
        )
        .setWakeMode(C.WAKE_MODE_NETWORK)
        .setHandleAudioBecomingNoisy(true)
        .build()

    var playing by mutableStateOf(false)
        private set
    var active by mutableStateOf(false)
        private set
    /** The verse being recited, by its index in the whole Quran. */
    var current by mutableStateOf<Int?>(null)
        private set
    var onPageEnd: (() -> Unit)? = null

    init {
        player.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                playing = isPlaying
            }

            override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                current = mediaItem?.mediaId?.toIntOrNull()
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_ENDED) onPageEnd?.invoke()
            }
        })
    }

    fun play(ayahs: List<Ayah>, reciter: String, from: Int = 0) {
        if (ayahs.isEmpty()) return
        val items = ayahs.map {
            MediaItem.Builder()
                .setUri("https://cdn.islamic.network/quran/audio/128/ar.$reciter/${it.index}.mp3")
                .setMediaId(it.index.toString())
                .build()
        }
        player.setMediaItems(items, from.coerceIn(0, items.lastIndex), 0L)
        player.prepare()
        player.play()
        active = true
    }

    fun toggle() {
        if (player.isPlaying) player.pause() else player.play()
    }

    fun stop() {
        player.stop()
        player.clearMediaItems()
        active = false
        current = null
    }

    fun release() = player.release()
}

/* ─── The reader ─────────────────────────────────────────────────────────── */

@Composable
fun QuranReader(startPage: Int) {
    val state = LocalState.current
    val nav = LocalNav.current
    val context = LocalContext.current
    val quran = Repo.quran
    val scope = rememberCoroutineScope()
    val pager = rememberPagerState(initialPage = (startPage - 1).coerceIn(0, QuranText.PAGES - 1)) { QuranText.PAGES }
    val page = pager.currentPage + 1
    val audio = remember { QuranAudio(context.applicationContext) }
    var menu by remember { mutableStateOf(false) }
    var goTo by remember { mutableStateOf(false) }
    var reciters by remember { mutableStateOf(false) }

    LaunchedEffect(state.lang, state.quranTranslation) {
        if (state.quranTranslation) Repo.ensureTranslation(context, state.lang)
    }
    LaunchedEffect(pager) {
        snapshotFlow { pager.currentPage }.collect { state.updateLastPage(it + 1) }
    }
    DisposableEffect(Unit) { onDispose { audio.release() } }
    // When a page has been recited, turn it and go on with the next.
    audio.onPageEnd = {
        val next = pager.currentPage + 1
        if (quran != null && next < QuranText.PAGES) {
            scope.launch {
                pager.animateScrollToPage(next)
                audio.play(quran.page(next + 1), state.reciter)
            }
        } else {
            audio.stop()
        }
    }
    // Follow the recitation onto the page of the verse being read.
    LaunchedEffect(audio.current) {
        val verse = audio.current ?: return@LaunchedEffect
        val p = quran?.ayahs?.getOrNull(verse - 1)?.page ?: return@LaunchedEffect
        if (p != pager.currentPage + 1) pager.animateScrollToPage(p - 1)
    }

    Column(Modifier.fillMaxSize().background(ham.paper)) {
        // The reader's own bar: the surah, juz and page, and the tools.
        Row(
            Modifier
                .fillMaxWidth()
                .windowInsetsPadding(WindowInsets.statusBars)
                .padding(horizontal = 4.dp, vertical = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = { nav.back() }) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, w.back) }
            Column(Modifier.weight(1f)) {
                Text(
                    quran?.surahOfPage(page)?.let { surahTitle(it.number, lang) } ?: w.quran,
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 1,
                )
                Muted("${w.juz} ${digits(quran?.juzOfPage(page) ?: 1, lang)} · ${w.page.format(digits(page, lang))}", maxLines = 1)
            }
            IconButton(onClick = { state.toggleBookmark(page) }) {
                Icon(
                    if (page in state.bookmarks) Icons.Outlined.Bookmark else Icons.Outlined.BookmarkBorder,
                    w.bookmark,
                    tint = if (page in state.bookmarks) ham.gold else ham.ink,
                )
            }
            IconButton(onClick = {
                if (audio.active) audio.toggle() else quran?.let { audio.play(it.page(page), state.reciter) }
            }) {
                Icon(if (audio.playing) Icons.Outlined.Pause else Icons.Outlined.PlayArrow, if (audio.playing) w.pause else w.play)
            }
            Box {
                IconButton(onClick = { menu = true }) { Icon(Icons.Outlined.MoreVert, w.settings) }
                DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                    DropdownMenuItem(
                        text = { Text(if (state.quranTranslation) w.mushaf else w.translation) },
                        onClick = {
                            state.updateQuranTranslation(!state.quranTranslation)
                            menu = false
                        },
                    )
                    DropdownMenuItem(text = { Text(w.goToPage) }, onClick = { goTo = true; menu = false })
                    DropdownMenuItem(text = { Text(w.reciter) }, onClick = { reciters = true; menu = false })
                    DropdownMenuItem(text = { Text(w.settings) }, onClick = { nav.go("settings"); menu = false })
                }
            }
        }

        if (quran == null) {
            Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) { Muted("…") }
        } else {
            // A mushaf turns right to left in either language.
            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                HorizontalPager(
                    state = pager,
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    beyondViewportPageCount = 1,
                    key = { it },
                ) { index ->
                    val ayahs = quran.page(index + 1)
                    CompositionLocalProvider(LocalLayoutDirection provides if (state.fa) LayoutDirection.Rtl else LayoutDirection.Ltr) {
                        if (state.quranTranslation) {
                            TranslationPage(quran, ayahs, audio.current) { i -> audio.play(ayahs, state.reciter, i) }
                        } else {
                            MushafPage(quran, ayahs, index + 1, audio.current)
                        }
                    }
                }
            }
        }

        if (audio.active) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .background(ham.card)
                    .windowInsetsPadding(WindowInsets.navigationBars)
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = { audio.toggle() }) {
                    Icon(if (audio.playing) Icons.Outlined.Pause else Icons.Outlined.PlayArrow, if (audio.playing) w.pause else w.play, tint = ham.green)
                }
                val verse = audio.current?.let { quran?.ayahs?.getOrNull(it - 1) }
                Column(Modifier.weight(1f)) {
                    Text(
                        verse?.let { digits("${surahTitle(it.surah, lang)} · ${it.surah}:${it.number}", lang) } ?: "",
                        style = MaterialTheme.typography.titleSmall,
                        maxLines = 1,
                    )
                    Muted(RECITERS.firstOrNull { it.id == state.reciter }?.let { if (state.fa) it.fa else it.de } ?: "", maxLines = 1)
                }
                IconButton(onClick = { audio.stop() }) { Icon(Icons.Outlined.Stop, w.stop) }
            }
        } else {
            Spacer(Modifier.windowInsetsPadding(WindowInsets.navigationBars))
        }
    }

    if (goTo) {
        var text by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { goTo = false },
            title = { Text(w.goToPage) },
            text = {
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it.filter { c -> c.isDigit() }.take(3) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    placeholder = { Text("1 – 604") },
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    val n = bare(text).toIntOrNull()
                    if (n != null && n in 1..QuranText.PAGES) scope.launch { pager.scrollToPage(n - 1) }
                    goTo = false
                }) { Text(w.goToPage) }
            },
            dismissButton = { TextButton(onClick = { goTo = false }) { Text(w.back) } },
            containerColor = ham.paper,
        )
    }
    if (reciters) {
        AlertDialog(
            onDismissRequest = { reciters = false },
            title = { Text(w.reciter) },
            text = {
                Column {
                    RECITERS.forEach { r ->
                        Text(
                            if (state.fa) r.fa else r.de,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (r.id == state.reciter) ham.chip else Color.Transparent)
                                .clickable {
                                    state.updateReciter(r.id)
                                    if (audio.active) audio.stop()
                                    reciters = false
                                }
                                .padding(12.dp),
                            style = MaterialTheme.typography.bodyLarge,
                        )
                    }
                }
            },
            confirmButton = { TextButton(onClick = { reciters = false }) { Text(w.back) } },
            containerColor = ham.paper,
        )
    }
}

/** A surah's opening: its name in a framed band, and the Basmala. */
@Composable
private fun SurahHeader(quran: QuranText, surah: Int) {
    val meta = quran.surahs[surah - 1]
    Column(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .border(1.5.dp, ham.gold, RoundedCornerShape(14.dp))
                .background(ham.chip)
                .padding(vertical = 8.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(meta.name, fontFamily = QuranFont, fontSize = 24.sp, color = ham.green, textAlign = TextAlign.Center)
        }
        if (surah != 1 && surah != 9) {
            Spacer(Modifier.height(6.dp))
            ArabicText(quran.basmala, size = 24, center = true)
        }
    }
}

@Composable
private fun MushafPage(quran: QuranText, ayahs: List<Ayah>, page: Int, playing: Int?) {
    val highlight = ham.gold.copy(alpha = 0.28f)
    val scale = LocalState.current.textScale
    val mark = ham.green
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        Column(
            Modifier
                .widthIn(max = 720.dp)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 18.dp, vertical = 8.dp),
        ) {
            // Runs of verses between surah openings.
            val runs = mutableListOf<MutableList<Ayah>>()
            for (a in ayahs) {
                if (a.number == 1 || runs.isEmpty()) runs += mutableListOf<Ayah>()
                runs.last() += a
            }
            runs.forEach { run ->
                if (run.first().number == 1) SurahHeader(quran, run.first().surah)
                val text = buildAnnotatedString {
                    run.forEach { a ->
                        if (a.index == playing) withStyle(SpanStyle(background = highlight)) { append(a.text) } else append(a.text)
                        withStyle(SpanStyle(color = mark)) { append(" ﴿${arabicDigits(a.number)}﴾ ") }
                    }
                }
                Text(
                    text,
                    modifier = Modifier.fillMaxWidth(),
                    fontFamily = QuranFont,
                    fontSize = (25 * scale).sp,
                    lineHeight = (25 * scale * 2.0f).sp,
                    color = ham.ink,
                    textAlign = TextAlign.Justify,
                    style = MaterialTheme.typography.bodyLarge.copy(textDirection = TextDirection.Rtl),
                )
            }
            Spacer(Modifier.height(12.dp))
            Text(
                digits(page, LocalState.current.lang),
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center,
                style = MaterialTheme.typography.labelMedium,
                color = ham.muted,
            )
            Spacer(Modifier.height(12.dp))
        }
    }
}

@Composable
private fun TranslationPage(quran: QuranText, ayahs: List<Ayah>, playing: Int?, onPlay: (Int) -> Unit) {
    val state = LocalState.current
    val translation = Repo.translations[state.lang]
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        LazyColumn(
            Modifier.widthIn(max = 760.dp).fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(ayahs.size, key = { ayahs[it].index }) { i ->
                val a = ayahs[i]
                if (a.number == 1) SurahHeader(quran, a.surah)
                HamCard(
                    color = if (a.index == playing) ham.chip else ham.card,
                    onClick = { onPlay(i) },
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier.size(30.dp).clip(CircleShape).background(ham.chip),
                            contentAlignment = Alignment.Center,
                        ) { Text(digits(a.number, state.lang), style = MaterialTheme.typography.labelMedium, color = ham.green) }
                        Spacer(Modifier.weight(1f))
                        Muted(digits("${a.surah}:${a.number}", state.lang))
                    }
                    Spacer(Modifier.height(8.dp))
                    ArabicText(a.text, size = 24)
                    val t = translation?.getOrNull(a.index - 1)
                    if (!t.isNullOrBlank()) {
                        Spacer(Modifier.height(8.dp))
                        Text(t, style = MaterialTheme.typography.bodyLarge.copy(fontSize = (16 * state.textScale).sp, lineHeight = (16 * state.textScale * 1.7f).sp), color = ham.ink2)
                    }
                }
            }
            item {
                Muted(words(state.lang).translator, Modifier.padding(vertical = 8.dp))
            }
        }
    }
}
