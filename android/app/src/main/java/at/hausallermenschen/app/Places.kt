package at.hausallermenschen.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.CancellationSignal
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.concurrent.Executors

/** Where the prayer times and the qibla are for. */
class Place(val id: String, val name: String, val lat: Double, val lng: Double, val zone: ZoneId)

val VIENNA_PLACE = Place("vienna", "", PrayerTimes.VIENNA_LAT, PrayerTimes.VIENNA_LON, PrayerTimes.VIENNA_ZONE)

/** The reader's chosen place: a city, their own position, or Vienna. */
fun currentPlace(state: AppState): Place {
    val w = words(state.lang)
    if (state.placeId == "here" && !state.hereLat.isNaN() && !state.hereLng.isNaN()) {
        val zone = runCatching { ZoneId.of(state.hereZone ?: "") }.getOrDefault(ZoneId.systemDefault())
        return Place("here", w.myLocation, state.hereLat, state.hereLng, zone)
    }
    val city = Repo.cities.firstOrNull { it.id == state.placeId }
    if (city != null) {
        return Place(city.id, city.name(state.lang), city.lat, city.lng, runCatching { ZoneId.of(city.zone) }.getOrDefault(PrayerTimes.VIENNA_ZONE))
    }
    return Place("vienna", w.vienna, PrayerTimes.VIENNA_LAT, PrayerTimes.VIENNA_LON, PrayerTimes.VIENNA_ZONE)
}

fun timesFor(place: Place, date: LocalDate): PrayerTimes = PrayerTimes.forDate(date, place.lat, place.lng, place.zone)

class NextPrayer(val key: String, val at: ZonedDateTime)

/** The next of the five prayers after [now] at [place]; after Isha, tomorrow's Fajr. */
fun nextPrayer(place: Place, now: ZonedDateTime): NextPrayer? {
    val local = now.withZoneSameInstant(place.zone)
    for (day in 0..1) {
        val date = local.toLocalDate().plusDays(day.toLong())
        val times = timesFor(place, date)
        for (key in PrayerTimes.PRAYERS) {
            val m = times.get(key) ?: continue
            val at = date.atStartOfDay(place.zone).plusMinutes(m.toLong())
            if (at.isAfter(local)) return NextPrayer(key, at)
        }
    }
    return null
}

/** "1:05" or "۱:۰۵" — hours and minutes until a time. */
fun untilText(from: ZonedDateTime, to: ZonedDateTime, lang: String): String {
    val minutes = java.time.Duration.between(from, to).toMinutes().coerceAtLeast(0)
    val h = minutes / 60
    val m = minutes % 60
    return digits(if (h > 0) "%d:%02d".format(h, m) else "%d′".format(m), lang)
}

fun hhmm(minutes: Int?, lang: String): String = digits(PrayerTimes.hhmm(minutes) ?: "—", lang)

fun hasLocationPermission(context: Context) =
    context.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
        context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

/**
 * The phone's position, once: the freshest the system has, or a new fix.
 * Without Google's services, so it works on every Android phone.
 */
@SuppressLint("MissingPermission")
fun locate(context: Context, done: (Location?) -> Unit) {
    if (!hasLocationPermission(context)) return done(null)
    val manager = context.getSystemService(LocationManager::class.java) ?: return done(null)
    val providers = listOf(LocationManager.NETWORK_PROVIDER, LocationManager.GPS_PROVIDER, LocationManager.PASSIVE_PROVIDER)
        .filter { runCatching { manager.isProviderEnabled(it) }.getOrDefault(false) }
    val known = providers.mapNotNull { runCatching { manager.getLastKnownLocation(it) }.getOrNull() }
        .maxByOrNull { it.time }
    // A fix from the last half hour is good enough: prayer times move by
    // seconds per kilometre.
    if (known != null && System.currentTimeMillis() - known.time < 30 * 60_000) return done(known)
    val provider = providers.firstOrNull { it != LocationManager.PASSIVE_PROVIDER } ?: return done(known)
    if (Build.VERSION.SDK_INT >= 30) {
        val main = context.mainExecutor
        manager.getCurrentLocation(provider, CancellationSignal(), Executors.newSingleThreadExecutor()) { location ->
            main.execute { done(location ?: known) }
        }
    } else {
        @Suppress("DEPRECATION")
        manager.requestSingleUpdate(
            provider,
            object : android.location.LocationListener {
                override fun onLocationChanged(location: Location) = done(location)
                @Deprecated("Deprecated in Java")
                override fun onStatusChanged(p: String?, s: Int, e: android.os.Bundle?) {}
                override fun onProviderEnabled(p: String) {}
                override fun onProviderDisabled(p: String) = done(known)
            },
            context.mainLooper,
        )
    }
}

/* ─── The qibla ──────────────────────────────────────────────────────────── */

const val KAABA_LAT = 21.4225
const val KAABA_LNG = 39.8262

/** Initial great-circle bearing from a place to the Kaaba, degrees from true north. */
fun qiblaBearing(lat: Double, lng: Double): Double {
    val p1 = Math.toRadians(lat)
    val p2 = Math.toRadians(KAABA_LAT)
    val dl = Math.toRadians(KAABA_LNG - lng)
    val y = Math.sin(dl) * Math.cos(p2)
    val x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)
    return (Math.toDegrees(Math.atan2(y, x)) + 360) % 360
}

fun kaabaDistanceKm(lat: Double, lng: Double): Double {
    val p1 = Math.toRadians(lat)
    val p2 = Math.toRadians(KAABA_LAT)
    val dp = p2 - p1
    val dl = Math.toRadians(KAABA_LNG - lng)
    val a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2)
    return 6371.0 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
