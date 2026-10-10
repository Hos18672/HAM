package at.hausallermenschen.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import java.time.ZonedDateTime;

/**
 * Fires the adhan: posts the notification with "stop" and "qibla", then
 * sets the alarm for the next prayer. Also re-arms after a reboot, an
 * update, or a change of clock or time zone.
 */
public class AdhanReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (Adhan.ACTION_STOP.equals(action)) {
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) manager.cancel(Adhan.NOTIFICATION_ID);
            return;
        }
        if (Adhan.ACTION_FIRE.equals(action)) {
            String key = intent.getStringExtra(Adhan.EXTRA_PRAYER);
            if (key != null && Adhan.isOn(context, key)) notify(context, key);
        }
        Adhan.schedule(context);
    }

    private static void notify(Context context, String key) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;
        Adhan.channel(context);
        Context local = Site.localized(context);
        String name = Adhan.name(local, key);
        Integer minutes = PrayerTimes.vienna(
            ZonedDateTime.now(PrayerTimes.VIENNA_ZONE).toLocalDate()).get(key);
        String time = Site.digits(context, PrayerTimes.hhmm(minutes));

        PendingIntent stop = PendingIntent.getBroadcast(
            context, 3, new Intent(context, AdhanReceiver.class).setAction(Adhan.ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        Notification notification = new Notification.Builder(context, Adhan.CHANNEL)
            .setSmallIcon(R.drawable.ic_clock)
            .setContentTitle(local.getString(R.string.adhan_title, name, time))
            .setContentText(local.getString(R.string.adhan_text, name))
            .setCategory(Notification.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(Site.open(context, "/prayer"))
            .addAction(new Notification.Action.Builder(
                null, local.getString(R.string.adhan_stop), stop).build())
            .addAction(new Notification.Action.Builder(
                null, local.getString(R.string.btn_qibla), Site.open(context, "/qibla")).build())
            .build();
        try {
            manager.notify(Adhan.NOTIFICATION_ID, notification);
        } catch (SecurityException refused) {
            // Notifications switched off for the app: nothing to show, the next alarm still runs.
        }
    }
}
