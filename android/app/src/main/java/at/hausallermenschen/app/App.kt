package at.hausallermenschen.app

import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.outlined.Event
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.NavigationRailItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.saveable.listSaver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp

/**
 * Where the reader is: a stack of routes named like the site's paths
 * ("prayer", "quran/page/2", "events/ashura"), so a link to the site and a
 * widget's tap land on the same screen the site would show.
 */
class Navigator(val stack: SnapshotStateList<String>) {
    val current: String get() = stack.last()

    fun go(route: String) {
        if (route != current) stack.add(route)
    }

    /** A bottom-bar destination: back to its root rather than piling up. */
    fun tab(route: String) {
        stack.clear()
        stack.add("")
        if (route.isNotEmpty()) stack.add(route)
    }

    /** Replace the screen on top, as turning a page in a reader does. */
    fun replace(route: String) {
        stack[stack.lastIndex] = route
    }

    fun back(): Boolean {
        if (stack.size <= 1) return false
        stack.removeAt(stack.lastIndex)
        return true
    }

    companion object {
        /** https://…/fa/quran/page/2#surah-2 → quran/page/2, and the language it was in. */
        fun fromUri(uri: Uri?): Pair<String, String?>? {
            if (uri == null) return null
            if (uri.scheme == "hamapp") return (uri.host ?: "") to null
            val base = Uri.parse(BuildConfig.SITE_URL).path.orEmpty().trimEnd('/')
            var path = uri.path.orEmpty()
            if (base.isNotEmpty() && path.startsWith(base)) path = path.removePrefix(base)
            val parts = path.trim('/').split('/').filter { it.isNotEmpty() }
            val lang = parts.firstOrNull()?.takeIf { it == "fa" || it == "de" }
            val rest = if (lang != null) parts.drop(1) else parts
            return rest.joinToString("/") to lang
        }
    }
}

val LocalNav = staticCompositionLocalOf<Navigator> { error("no navigator") }
val LocalState = staticCompositionLocalOf<AppState> { error("no state") }

private class Tab(val route: String, val label: (Words) -> String, val icon: ImageVector)

private val TABS = listOf(
    Tab("", { it.home }, Icons.Outlined.Home),
    Tab("prayer", { it.prayer }, Icons.Outlined.Schedule),
    Tab("quran", { it.quran }, Icons.AutoMirrored.Outlined.MenuBook),
    Tab("events", { it.events }, Icons.Outlined.Event),
    Tab("more", { it.more }, Icons.Outlined.Menu),
)

/** Which tab a route belongs under, for the bar's highlight. */
private fun tabOf(route: String): String {
    val head = route.substringBefore('/')
    return when (head) {
        "", "search" -> ""
        "prayer", "qibla", "calendar" -> "prayer"
        "quran", "duas" -> "quran"
        "events" -> "events"
        else -> "more"
    }
}

/** Readers take the whole screen: no navigation bar under the page. */
private fun immersive(route: String) =
    route.startsWith("quran/page/") || (route.startsWith("duas/") && route.length > 5)

fun navigatorSaver() = listSaver<Navigator, String>(
    save = { it.stack.toList() },
    restore = { Navigator(mutableStateListOf<String>().apply { addAll(it) }) },
)

@Composable
fun HamApp(state: AppState, link: Pair<String, Long>) {
    val start = link.first
    val nav = rememberSaveable(saver = navigatorSaver()) {
        Navigator(mutableStateListOf("").apply { if (start.isNotEmpty()) add(start) })
    }
    val context = LocalContext.current
    LaunchedEffect(state.lang) {
        Repo.load(context, state.lang)
        Repo.refresh(context, state.lang)
    }
    LaunchedEffect(link) {
        when {
            link.second == 0L -> Unit
            // A link to the home page: back to the start, not left where the reader was.
            start.isEmpty() -> nav.tab("")
            nav.current != start -> nav.go(start)
        }
    }

    HamTheme(state) {
        CompositionLocalProvider(
            LocalNav provides nav,
            LocalState provides state,
            LocalLayoutDirection provides if (state.fa) LayoutDirection.Rtl else LayoutDirection.Ltr,
        ) {
            BackHandler(enabled = nav.stack.size > 1) { nav.back() }
            Surface(Modifier.fillMaxSize(), color = ham.paper) {
                Shell(nav, words(state.lang))
            }
        }
    }
}

@Composable
private fun Shell(nav: Navigator, w: Words) {
    val route = nav.current
    BoxWithConstraints(Modifier.fillMaxSize()) {
        // Phones (and folded foldables) get the bar at the bottom; tablets,
        // unfolded foldables, landscape and Chromebooks a rail at the side.
        val wide = maxWidth >= 600.dp
        val hideBar = immersive(route)
        if (wide) {
            Row(Modifier.fillMaxSize()) {
                if (!hideBar) Rail(nav, w)
                Box(
                    Modifier
                        .weight(1f)
                        .then(
                            if (hideBar) Modifier
                            else Modifier.consumeWindowInsets(WindowInsets.safeDrawing.only(WindowInsetsSides.Start)),
                        ),
                ) { Screens(route) }
            }
        } else {
            Scaffold(
                containerColor = ham.paper,
                contentWindowInsets = WindowInsets(0),
                bottomBar = { if (!hideBar) BottomBar(nav, w) },
            ) { padding ->
                Box(
                    Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .consumeWindowInsets(padding),
                ) { Screens(route) }
            }
        }
    }
}

@Composable
private fun BottomBar(nav: Navigator, w: Words) {
    val active = tabOf(nav.current)
    NavigationBar(containerColor = ham.card, tonalElevation = 0.dp) {
        TABS.forEach { tab ->
            NavigationBarItem(
                selected = active == tab.route,
                onClick = { nav.tab(tab.route) },
                icon = { Icon(tab.icon, contentDescription = null) },
                label = { Text(tab.label(w), maxLines = 1, overflow = TextOverflow.Ellipsis) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = ham.onGreen,
                    indicatorColor = ham.green,
                    selectedTextColor = ham.green,
                    unselectedIconColor = ham.muted,
                    unselectedTextColor = ham.muted,
                ),
            )
        }
    }
}

@Composable
private fun Rail(nav: Navigator, w: Words) {
    val active = tabOf(nav.current)
    NavigationRail(
        containerColor = ham.card,
        header = {
            IconButton(onClick = { nav.go("search") }) {
                Icon(Icons.Outlined.Search, contentDescription = w.search)
            }
        },
    ) {
        Spacer(Modifier.height(8.dp))
        TABS.forEach { tab ->
            NavigationRailItem(
                selected = active == tab.route,
                onClick = { nav.tab(tab.route) },
                icon = { Icon(tab.icon, contentDescription = null) },
                label = { Text(tab.label(w), maxLines = 1, style = MaterialTheme.typography.labelMedium) },
                colors = NavigationRailItemDefaults.colors(
                    selectedIconColor = ham.onGreen,
                    indicatorColor = ham.green,
                    selectedTextColor = ham.green,
                    unselectedIconColor = ham.muted,
                    unselectedTextColor = ham.muted,
                ),
            )
        }
    }
}

@Composable
private fun Screens(route: String) {
    AnimatedContent(
        targetState = route,
        transitionSpec = { fadeIn() togetherWith fadeOut() },
        contentKey = { r ->
            // Turning pages inside one reader is the reader's own animation.
            when {
                r.startsWith("quran/page/") -> "quran/page"
                else -> r
            }
        },
        label = "screens",
    ) { r ->
        val parts = r.split('/')
        when (parts[0]) {
            "" -> HomeScreen()
            "prayer" -> PrayerScreen()
            "qibla" -> QiblaScreen()
            "quran" -> when {
                parts.getOrNull(1) == "page" -> QuranReader(parts.getOrNull(2)?.toIntOrNull() ?: 1)
                // /quran/2 → the surah's first page.
                parts.getOrNull(1)?.toIntOrNull() != null -> QuranReader(surahFirstPage(parts[1].toInt()))
                else -> QuranIndex()
            }
            "duas" -> if (parts.size > 1) DuaReader(parts[1]) else DuasScreen()
            "calendar" -> CalendarScreen()
            "events" -> if (parts.size > 1) EventScreen(parts[1]) else EventsScreen()
            "activities" -> ActivitiesScreen()
            "courses" -> CoursesScreen()
            "culture" -> CardsScreen("culture")
            "community" -> CardsScreen("community")
            "sport" -> SportScreen()
            "gallery" -> GalleryScreen()
            "about" -> AboutScreen()
            "support" -> SupportScreen()
            "contact" -> ContactScreen()
            "settings" -> SettingsScreen()
            "search" -> SearchScreen()
            "privacy", "imprint" -> LegalScreen(parts[0])
            "adhan" -> SettingsScreen()
            else -> MoreScreen()
        }
    }
}

private fun surahFirstPage(n: Int): Int =
    Repo.quran?.surahs?.getOrNull(n - 1)?.firstPage ?: SURAH_PAGES.getOrElse(n - 1) { 1 }
