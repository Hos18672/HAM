package at.hausallermenschen.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Translate
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.LocalDateTime

@Composable
fun DuasScreen() {
    val nav = LocalNav.current
    var kind by rememberSaveable { mutableStateOf("") }
    val all = Repo.duas(lang)
    val kinds = listOf("") + all.map { it.category }.distinct()
    val shown = if (kind.isEmpty()) all else all.filter { it.category == kind }
    val now = LocalDateTime.now()
    val today = DailyDua.slug(now.dayOfWeek, now.hour)
    Screen(w.duas) { padding ->
        Body(padding) {
            all.firstOrNull { it.slug == today }?.let { d ->
                item {
                    HamCard(color = ham.green, onClick = { nav.go("duas/${d.slug}") }) {
                        Text(words(lang).today, color = ham.onGreen.copy(alpha = 0.8f), style = MaterialTheme.typography.labelLarge)
                        Text(d.title, color = ham.onGreen, style = MaterialTheme.typography.titleLarge)
                        Text(d.arabicTitle, color = ham.onGreen, fontFamily = QuranFont, fontSize = 22.sp)
                        if (d.whenToRead.isNotBlank()) Text(d.whenToRead, color = ham.onGreen.copy(alpha = 0.85f), style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            if (kinds.size > 2) {
                item {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(kinds) { k ->
                            Chip(if (k.isEmpty()) w.all else w.duaKinds[k] ?: k, on = k == kind) { kind = k }
                        }
                    }
                }
            }
            items(shown, key = { it.slug }) { d ->
                val readable = Repo.duaTexts.containsKey(d.slug)
                HamCard(onClick = if (readable) ({ nav.go("duas/${d.slug}") }) else null) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(d.title, style = MaterialTheme.typography.titleSmall, color = ham.ink)
                            if (d.whenToRead.isNotBlank()) Muted(d.whenToRead, maxLines = 2)
                        }
                        Spacer(Modifier.width(10.dp))
                        Text(d.arabicTitle, fontFamily = QuranFont, fontSize = 20.sp, color = ham.green)
                    }
                    if (d.summary.isNotBlank()) {
                        Spacer(Modifier.height(6.dp))
                        Muted(d.summary, maxLines = 3)
                    }
                }
            }
        }
    }
}

@Composable
fun DuaReader(slug: String) {
    val nav = LocalNav.current
    val state = LocalState.current
    val info = Repo.duas(lang).firstOrNull { it.slug == slug }
    val text = Repo.duaTexts[slug]
    var translated by rememberSaveable { mutableStateOf(true) }
    Screen(info?.title ?: w.duas, actions = {
        IconButton(onClick = { translated = !translated }) {
            Icon(Icons.Outlined.Translate, w.translation, tint = if (translated) ham.green else ham.muted)
        }
    }) { padding ->
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
            LazyColumn(
                Modifier.widthIn(max = 760.dp).fillMaxSize(),
                contentPadding = PaddingValues(
                    start = 18.dp,
                    end = 18.dp,
                    top = padding.calculateTopPadding() + 4.dp,
                    bottom = padding.calculateBottomPadding() + 32.dp,
                ),
            ) {
                item {
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(20.dp))
                            .background(ham.chip)
                            .padding(18.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        info?.arabicTitle?.let { ArabicText(it, size = 28, color = ham.green, center = true) }
                        if (!info?.whenToRead.isNullOrBlank()) {
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "${w.whenToRead}: ${info!!.whenToRead}",
                                style = MaterialTheme.typography.bodySmall,
                                color = ham.muted,
                                textAlign = TextAlign.Center,
                            )
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                }
                if (text == null) {
                    item { Empty(w.noResults) }
                } else {
                    itemsIndexed(text.lines) { i, line ->
                        val meaning = if (state.fa) line.fa else line.de
                        Column(Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
                            if (line.arabic == null) {
                                // A rubric: what to do, not what to say.
                                Text(
                                    meaning,
                                    modifier = Modifier.fillMaxWidth(),
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontStyle = FontStyle.Italic,
                                    color = ham.gold,
                                    textAlign = TextAlign.Center,
                                )
                            } else {
                                ArabicText(line.arabic, size = 24)
                                if (translated && meaning.isNotBlank()) {
                                    Spacer(Modifier.height(6.dp))
                                    Text(
                                        meaning,
                                        style = MaterialTheme.typography.bodyLarge.copy(
                                            fontSize = (16 * state.textScale).sp,
                                            lineHeight = (16 * state.textScale * 1.7f).sp,
                                        ),
                                        color = ham.ink2,
                                    )
                                }
                            }
                        }
                        if (i < text.lines.lastIndex) HorizontalDivider(color = ham.line)
                    }
                    if (!info?.source.isNullOrBlank()) {
                        item {
                            Spacer(Modifier.height(16.dp))
                            Muted("${w.source}: ${info!!.source}")
                        }
                    }
                    // On to the next one, as the site's reader turns.
                    val list = Repo.duas(state.lang).filter { Repo.duaTexts.containsKey(it.slug) }
                    val at = list.indexOfFirst { it.slug == slug }
                    val next = list.getOrNull(at + 1)
                    if (next != null) {
                        item {
                            Spacer(Modifier.height(16.dp))
                            MenuRow(Icons.Outlined.Translate, next.title, next.arabicTitle) { nav.replace("duas/${next.slug}") }
                        }
                    }
                }
            }
        }
    }
}
