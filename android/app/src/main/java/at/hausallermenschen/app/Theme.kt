package at.hausallermenschen.app

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/** The house's colours, beyond what Material's scheme names. */
@Immutable
data class HamColors(
    val paper: Color,
    val card: Color,
    val chip: Color,
    val ink: Color,
    val ink2: Color,
    val muted: Color,
    val line: Color,
    val green: Color,
    val onGreen: Color,
    val band: Color,
    val gold: Color,
    val holiday: Color,
    val dark: Boolean,
)

private val LightHam = HamColors(
    paper = Color(0xFFF7F3E8),
    card = Color(0xFFFFFFFF),
    chip = Color(0xFFECE6D6),
    ink = Color(0xFF14261D),
    ink2 = Color(0xFF2E3B33),
    muted = Color(0xFF5C5548),
    line = Color(0x1F14261D),
    green = Color(0xFF0B5D3B),
    onGreen = Color(0xFFFFFFFF),
    band = Color(0xFF073B29),
    gold = Color(0xFFC8A45D),
    holiday = Color(0xFFB3412F),
    dark = false,
)

private val DarkHam = HamColors(
    paper = Color(0xFF06211A),
    card = Color(0xFF0B3125),
    chip = Color(0xFF143A2D),
    ink = Color(0xFFEFE8D8),
    ink2 = Color(0xFFD9D2C1),
    muted = Color(0xFF9FB6A8),
    line = Color(0x26F7F3E8),
    green = Color(0xFFDCBB7B),
    onGreen = Color(0xFF06211A),
    band = Color(0xFF04180F),
    gold = Color(0xFFDCBB7B),
    holiday = Color(0xFFEE8F80),
    dark = true,
)

val LocalHam = staticCompositionLocalOf { LightHam }

@OptIn(ExperimentalTextApi::class)
private fun variable(id: Int, weight: Int) = Font(
    id,
    weight = FontWeight(weight),
    variationSettings = FontVariation.Settings(FontVariation.weight(weight)),
)

private val Vazirmatn = FontFamily(
    variable(R.font.vazirmatn, 400),
    variable(R.font.vazirmatn, 500),
    variable(R.font.vazirmatn, 600),
    variable(R.font.vazirmatn, 700),
    variable(R.font.vazirmatn, 800),
)

private val Manrope = FontFamily(
    variable(R.font.manrope, 400),
    variable(R.font.manrope, 500),
    variable(R.font.manrope, 600),
    variable(R.font.manrope, 700),
    variable(R.font.manrope, 800),
)

/** The Quran's and the du'as' Arabic. */
val QuranFont = FontFamily(Font(R.font.scheherazade))

/** Persian text inside German screens (and the other way round) still wants its own face. */
val PersianFont = Vazirmatn

private fun typography(family: FontFamily): Typography {
    val base = Typography()
    fun TextStyle.f() = copy(fontFamily = family)
    return Typography(
        displayLarge = base.displayLarge.f(),
        displayMedium = base.displayMedium.f(),
        displaySmall = base.displaySmall.f().copy(fontWeight = FontWeight.Bold),
        headlineLarge = base.headlineLarge.f().copy(fontWeight = FontWeight.Bold),
        headlineMedium = base.headlineMedium.f().copy(fontWeight = FontWeight.Bold),
        headlineSmall = base.headlineSmall.f().copy(fontWeight = FontWeight.Bold),
        titleLarge = base.titleLarge.f().copy(fontWeight = FontWeight.Bold),
        titleMedium = base.titleMedium.f().copy(fontWeight = FontWeight.SemiBold),
        titleSmall = base.titleSmall.f().copy(fontWeight = FontWeight.SemiBold),
        bodyLarge = base.bodyLarge.f().copy(lineHeight = 26.sp),
        bodyMedium = base.bodyMedium.f().copy(lineHeight = 22.sp),
        bodySmall = base.bodySmall.f(),
        labelLarge = base.labelLarge.f().copy(fontWeight = FontWeight.SemiBold),
        labelMedium = base.labelMedium.f(),
        labelSmall = base.labelSmall.f(),
    )
}

private fun scheme(c: HamColors): ColorScheme =
    if (c.dark) {
        darkColorScheme(
            primary = c.green, onPrimary = c.onGreen,
            primaryContainer = c.chip, onPrimaryContainer = c.ink,
            secondary = c.gold, onSecondary = c.onGreen,
            secondaryContainer = c.chip, onSecondaryContainer = c.ink,
            background = c.paper, onBackground = c.ink,
            surface = c.paper, onSurface = c.ink,
            surfaceVariant = c.chip, onSurfaceVariant = c.muted,
            surfaceContainer = c.card, surfaceContainerLow = c.card, surfaceContainerHigh = c.chip,
            surfaceContainerHighest = c.chip, surfaceContainerLowest = c.paper,
            outline = c.muted, outlineVariant = c.line, error = c.holiday,
        )
    } else {
        lightColorScheme(
            primary = c.green, onPrimary = c.onGreen,
            primaryContainer = Color(0xFFDCEBDF), onPrimaryContainer = c.band,
            secondary = c.gold, onSecondary = Color(0xFF231A06),
            secondaryContainer = c.chip, onSecondaryContainer = c.ink,
            background = c.paper, onBackground = c.ink,
            surface = c.paper, onSurface = c.ink,
            surfaceVariant = c.chip, onSurfaceVariant = c.muted,
            surfaceContainer = c.card, surfaceContainerLow = c.card, surfaceContainerHigh = c.chip,
            surfaceContainerHighest = c.chip, surfaceContainerLowest = Color.White,
            outline = c.muted, outlineVariant = c.line, error = c.holiday,
        )
    }

@Composable
fun HamTheme(state: AppState, content: @Composable () -> Unit) {
    val dark = when (state.theme) {
        ThemeChoice.SYSTEM -> isSystemInDarkTheme()
        ThemeChoice.LIGHT -> false
        ThemeChoice.DARK -> true
    }
    val colors = if (dark) DarkHam else LightHam
    MaterialTheme(
        colorScheme = scheme(colors),
        typography = typography(if (state.fa) Vazirmatn else Manrope),
    ) {
        CompositionLocalProvider(LocalHam provides colors, content = content)
    }
}

val ham: HamColors
    @Composable get() = LocalHam.current
