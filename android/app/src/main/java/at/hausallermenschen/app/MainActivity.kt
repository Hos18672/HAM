package at.hausallermenschen.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.mutableStateOf
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

/**
 * The app: one activity, edge to edge, every screen drawn natively in
 * Compose. A link to the site (from a widget, a notification, a message or
 * the browser) opens here on the matching screen.
 */
class MainActivity : ComponentActivity() {
    private lateinit var state: AppState
    private val start = mutableStateOf("" to 0L)

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        state = AppState(applicationContext)
        if (savedInstanceState == null) handle(intent)
        Adhan.channel(this)
        Adhan.schedule(this)
        setContent { HamApp(state, start.value) }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handle(intent)
    }

    override fun onResume() {
        super.onResume()
        // The language may have been flipped on a widget meanwhile.
        state.reload()
    }

    private fun handle(intent: Intent?) {
        val (route, lang) = Navigator.fromUri(intent?.data) ?: return
        if (lang != null && lang != state.lang) state.updateLang(lang)
        start.value = route to System.nanoTime()
    }
}
