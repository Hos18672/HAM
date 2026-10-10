package at.hausallermenschen.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import java.time.LocalDate;
import java.time.ZonedDateTime;

/**
 * The adhan: which prayers to call, and the one alarm that waits for the
 * next of them. Times are Vienna's, from the same calculation as the
 * widgets and the site.
 *
 * One alarm at a time: when it fires, {@link AdhanReceiver} posts the
 * notification and sets the next. A reboot, a new clock or time zone, an
 * update, or a change here all set it again from scratch.
 */
final class Adhan {
    private Adhan() {}

    static final String PREFS = "adhan";
    static final String CHANNEL = "adhan";
    static final String ACTION_FIRE = "at.hausallermenschen.app.ADHAN";
    static final String ACTION_STOP = "at.hausallermenschen.app.ADHAN_STOP";
    static final String EXTRA_PRAYER = "prayer";
    static final int NOTIFICATION_ID = 7;

    /** The prayers that can be called, sunrise among them (off unless chosen). */
    static final String[] KEYS = {"fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"};

    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static boolean isOn(Context context, String key) {
        return prefs(context).getBoolean(key, !"sunrise".equals(key));
    }

    static void set(Context context, String key, boolean on) {
        prefs(context).edit().putBoolean(key, on).apply();
        schedule(context);
    }

    /** The next enabled prayer after {@code now}, within the coming week; null if none is on. */
    static PrayerTimes.Next next(Context context, ZonedDateTime now) {
        ZonedDateTime local = now.withZoneSameInstant(PrayerTimes.VIENNA_ZONE);
        LocalDate date = local.toLocalDate();
        for (int day = 0; day < 8; day++) {
            LocalDate d = date.plusDays(day);
            PrayerTimes times = PrayerTimes.vienna(d);
            for (String key : KEYS) {
                Integer m = times.get(key);
                if (m == null || !isOn(context, key)) continue;
                ZonedDateTime at = PrayerTimes.clock(d, m);
                if (at.isAfter(local)) return new PrayerTimes.Next(key, at, day > 0);
            }
        }
        return null;
    }

    private static PendingIntent alarmIntent(Context context, String key) {
        Intent intent = new Intent(context, AdhanReceiver.class).setAction(ACTION_FIRE);
        if (key != null) intent.putExtra(EXTRA_PRAYER, key);
        return PendingIntent.getBroadcast(
            context, 1, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** Whether the system lets this app wake at the exact minute (Android 12+ asks the reader). */
    static boolean exact(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        return alarms != null && alarms.canScheduleExactAlarms();
    }

    /** Replaces the pending alarm with one for the next enabled prayer, or none. */
    static void schedule(Context context) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        if (alarms == null) return;
        alarms.cancel(alarmIntent(context, null));
        PrayerTimes.Next next = next(context, ZonedDateTime.now());
        if (next == null) return;
        long at = next.at.toInstant().toEpochMilli();
        PendingIntent intent = alarmIntent(context, next.key);
        // Without the exact-alarm permission the system may deliver it a few
        // minutes late; the settings screen says so and offers the switch.
        if (exact(context)) alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent);
        else alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent);
    }

    /** The notification channel, with the alarm sound so it is heard like a call, not a ping. */
    static void channel(Context context) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL) != null) return;
        Context local = Site.localized(context);
        NotificationChannel channel = new NotificationChannel(
            CHANNEL, local.getString(R.string.adhan_channel), NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription(local.getString(R.string.adhan_channel_desc));
        channel.setSound(
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
            new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
        manager.createNotificationChannel(channel);
    }

    static String name(Context local, String key) {
        switch (key) {
            case "fajr": return local.getString(R.string.p_fajr);
            case "sunrise": return local.getString(R.string.p_sunrise);
            case "dhuhr": return local.getString(R.string.p_dhuhr);
            case "asr": return local.getString(R.string.p_asr);
            case "maghrib": return local.getString(R.string.p_maghrib);
            default: return local.getString(R.string.p_isha);
        }
    }
}
