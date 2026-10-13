package at.hausallermenschen.app

import android.content.Context
import android.hardware.GeomagneticField
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.view.Surface
import android.view.WindowManager
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.MyLocation
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin

/** The phone's heading from true north, in degrees, or null without a compass. */
@Composable
private fun rememberHeading(lat: Double, lng: Double): Pair<Float?, Boolean> {
    val context = LocalContext.current
    var heading by remember { mutableStateOf<Float?>(null) }
    var unreliable by remember { mutableStateOf(false) }
    DisposableEffect(lat, lng) {
        val sensors = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        val vector = sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
            ?: sensors.getDefaultSensor(Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR)
        // True north = magnetic north + the declination where the reader is.
        val declination = GeomagneticField(lat.toFloat(), lng.toFloat(), 0f, System.currentTimeMillis()).declination
        val matrix = FloatArray(9)
        val remapped = FloatArray(9)
        val orientation = FloatArray(3)
        @Suppress("DEPRECATION")
        val display = (context.getSystemService(Context.WINDOW_SERVICE) as WindowManager).defaultDisplay
        val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                SensorManager.getRotationMatrixFromVector(matrix, event.values)
                // Keep "up" the top of the screen in landscape too.
                val (x, y) = when (display.rotation) {
                    Surface.ROTATION_90 -> SensorManager.AXIS_Y to SensorManager.AXIS_MINUS_X
                    Surface.ROTATION_180 -> SensorManager.AXIS_MINUS_X to SensorManager.AXIS_MINUS_Y
                    Surface.ROTATION_270 -> SensorManager.AXIS_MINUS_Y to SensorManager.AXIS_X
                    else -> SensorManager.AXIS_X to SensorManager.AXIS_Y
                }
                SensorManager.remapCoordinateSystem(matrix, x, y, remapped)
                SensorManager.getOrientation(remapped, orientation)
                val azimuth = Math.toDegrees(orientation[0].toDouble()).toFloat() + declination
                heading = (azimuth + 360f) % 360f
            }

            override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {
                unreliable = accuracy <= SensorManager.SENSOR_STATUS_ACCURACY_LOW
            }
        }
        if (vector != null) sensors.registerListener(listener, vector, SensorManager.SENSOR_DELAY_UI)
        onDispose { sensors.unregisterListener(listener) }
    }
    return heading to unreliable
}

@Composable
fun QiblaScreen() {
    val state = LocalState.current
    val place = currentPlace(state)
    val bearing = qiblaBearing(place.lat, place.lng).toFloat()
    val distance = kaabaDistanceKm(place.lat, place.lng)
    val (heading, unreliable) = rememberHeading(place.lat, place.lng)
    var picking by remember { mutableStateOf(false) }
    val haptic = LocalHapticFeedback.current

    // The needle's angle on screen: the qibla relative to where the phone points.
    val target = if (heading == null) bearing else bearing - heading
    var unwrapped by remember { mutableFloatStateOf(target) }
    LaunchedEffect(target) {
        // Turn the short way round rather than spinning through 360°.
        var delta = (target - unwrapped) % 360f
        if (delta > 180f) delta -= 360f
        if (delta < -180f) delta += 360f
        unwrapped += delta
    }
    val needle by animateFloatAsState(unwrapped, label = "needle")
    val dial by animateFloatAsState(-(heading ?: 0f), label = "dial")
    val off = abs(((target % 360f) + 540f) % 360f - 180f)
    val aligned = heading != null && off < 4f
    var wasAligned by remember { mutableStateOf(false) }
    LaunchedEffect(aligned) {
        if (aligned && !wasAligned) haptic.performHapticFeedback(HapticFeedbackType.LongPress)
        wasAligned = aligned
    }

    Screen(w.qibla) { padding ->
        Body(padding) {
            item {
                MenuRow(
                    if (place.id == "here") Icons.Outlined.MyLocation else Icons.Outlined.Place,
                    w.qiblaFrom.format(place.name),
                    w.choosePlace,
                ) { picking = true }
            }
            item {
                Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        Modifier
                            .widthIn(max = 420.dp)
                            .fillMaxWidth()
                            .aspectRatio(1f)
                            .padding(12.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Compass(dial, needle, aligned)
                    }
                    Text(
                        if (heading == null) w.qiblaNoSensor else if (aligned) w.qiblaAligned else w.qiblaTurn,
                        style = MaterialTheme.typography.titleMedium,
                        color = if (aligned) ham.green else ham.ink,
                        textAlign = TextAlign.Center,
                    )
                }
            }
            item {
                Row(Modifier.fillMaxWidth()) {
                    HamCard(Modifier.weight(1f)) {
                        Text(digits("%.0f".format(bearing), lang) + "°", style = MaterialTheme.typography.headlineSmall, color = ham.green)
                        Muted(w.qiblaDegrees.format(digits("%.1f".format(bearing), lang)))
                    }
                    Spacer(Modifier.width(12.dp))
                    HamCard(Modifier.weight(1f)) {
                        Text(digits("%,.0f".format(distance), lang), style = MaterialTheme.typography.headlineSmall, color = ham.green)
                        Muted(w.qiblaDistance.format(digits("%,.0f".format(distance), lang)))
                    }
                }
            }
            if (heading != null && unreliable) item { Muted(w.qiblaCalibrate) }
        }
    }
    if (picking) PlacePicker(onDone = { picking = false })
}

@Composable
private fun Compass(dial: Float, needle: Float, aligned: Boolean) {
    val ring = ham.line
    val ink = ham.ink
    val muted = ham.muted
    val green = ham.green
    val gold = ham.gold
    val card = ham.card
    Canvas(Modifier.fillMaxWidth().aspectRatio(1f)) {
        val r = size.minDimension / 2
        val c = center
        drawCircle(card, r)
        drawCircle(if (aligned) green else ring, r, style = Stroke(width = if (aligned) 6f else 3f))
        // The dial turns with the phone, so north stays north.
        rotate(dial, c) {
            for (i in 0 until 72) {
                val a = Math.toRadians(i * 5.0)
                val long = i % 18 == 0
                val inner = r * (if (long) 0.84f else if (i % 2 == 0) 0.9f else 0.93f)
                drawLine(
                    if (long) ink else muted,
                    Offset(c.x + (r * 0.97f) * sin(a).toFloat(), c.y - (r * 0.97f) * cos(a).toFloat()),
                    Offset(c.x + inner * sin(a).toFloat(), c.y - inner * cos(a).toFloat()),
                    strokeWidth = if (long) 5f else 2f,
                    cap = StrokeCap.Round,
                )
            }
            // North, marked in the house's red-gold.
            val north = Path().apply {
                moveTo(c.x, c.y - r * 0.8f)
                lineTo(c.x - r * 0.06f, c.y - r * 0.66f)
                lineTo(c.x + r * 0.06f, c.y - r * 0.66f)
                close()
            }
            drawPath(north, gold)
        }
        // The needle points at the Kaaba.
        rotate(needle, c) {
            val arrow = Path().apply {
                moveTo(c.x, c.y - r * 0.72f)
                lineTo(c.x - r * 0.11f, c.y - r * 0.42f)
                lineTo(c.x - r * 0.035f, c.y - r * 0.42f)
                lineTo(c.x - r * 0.035f, c.y + r * 0.2f)
                lineTo(c.x + r * 0.035f, c.y + r * 0.2f)
                lineTo(c.x + r * 0.035f, c.y - r * 0.42f)
                lineTo(c.x + r * 0.11f, c.y - r * 0.42f)
                close()
            }
            drawPath(arrow, green)
            // The Kaaba at the tip.
            val k = r * 0.09f
            drawRect(ink, topLeft = Offset(c.x - k / 2, c.y - r * 0.86f), size = androidx.compose.ui.geometry.Size(k, k))
            drawRect(gold, topLeft = Offset(c.x - k / 2, c.y - r * 0.86f + k * 0.25f), size = androidx.compose.ui.geometry.Size(k, k * 0.14f))
        }
        drawCircle(green, r * 0.05f, c)
    }
}
