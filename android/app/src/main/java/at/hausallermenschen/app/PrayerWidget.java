package at.hausallermenschen.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.StyleSpan;
import android.graphics.Typeface;
import android.widget.RemoteViews;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Today's prayer times at the house in Vienna, the next one picked out.
 * Computed on the phone, so it needs no connection; it redraws itself the
 * moment a prayer time passes (an alarm set for exactly then), at midnight,
 * and when the clock, the time zone or the language changes.
 */
public class PrayerWidget extends AppWidgetProvider {
    static final String ACTION_TICK = "at.hausallermenschen.app.PRAYER_TICK";

    private static final String[] SHOWN = {"fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"};

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        render(context, manager, ids);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (ACTION_TICK.equals(action)
            || Intent.ACTION_TIME_CHANGED.equals(action)
            || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
            || Intent.ACTION_LOCALE_CHANGED.equals(action)) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            render(context, manager, manager.getAppWidgetIds(new ComponentName(context, PrayerWidget.class)));
        }
    }

    @Override
    public void onDisabled(Context context) {
        context.getSystemService(AlarmManager.class).cancel(tick(context));
    }

    private static PendingIntent tick(Context context) {
        Intent intent = new Intent(context, PrayerWidget.class).setAction(ACTION_TICK);
        return PendingIntent.getBroadcast(
            context, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static int id(Context context, String prefix, String key) {
        return context.getResources().getIdentifier(prefix + key, "id", context.getPackageName());
    }

    static void render(Context context, AppWidgetManager manager, int[] ids) {
        if (ids.length == 0) return;
        ZonedDateTime now = ZonedDateTime.now(PrayerTimes.VIENNA_ZONE);
        LocalDate today = now.toLocalDate();
        PrayerTimes times = PrayerTimes.vienna(today);
        PrayerTimes.Next next = PrayerTimes.next(now);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_prayer);
        String date = DateTimeFormatter.ofPattern("EEEE d MMMM", new Locale(Site.lang(context))).format(today);
        views.setTextViewText(R.id.date, Site.digits(context, context.getString(R.string.place_vienna) + " · " + date));

        for (String key : SHOWN) {
            boolean isNext = next != null && !next.tomorrow && next.key.equals(key);
            String time = Site.digits(context, PrayerTimes.hhmm(times.get(key)));
            CharSequence text = time;
            if (isNext) {
                SpannableString bold = new SpannableString(time);
                bold.setSpan(new StyleSpan(Typeface.BOLD), 0, time.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                text = bold;
            }
            int accent = context.getColor(isNext ? R.color.widget_accent : R.color.widget_ink);
            views.setTextViewText(id(context, "t_", key), text);
            views.setTextColor(id(context, "t_", key), accent);
            views.setTextColor(id(context, "n_", key), context.getColor(isNext ? R.color.widget_accent : R.color.widget_subtle));
        }

        if (next != null) {
            String name = context.getString(context.getResources().getIdentifier("p_" + next.key, "string", context.getPackageName()));
            if (next.tomorrow) name += " · " + context.getString(R.string.tomorrow);
            views.setTextViewText(R.id.next_name, name);
            views.setTextViewText(R.id.next_time, Site.digits(context,
                String.format(Locale.ROOT, "%02d:%02d", next.at.getHour(), next.at.getMinute())));
        }

        views.setOnClickPendingIntent(R.id.root, Site.open(context, "/prayer"));
        manager.updateAppWidget(ids, views);

        // Redraw when the next prayer arrives, or at midnight if that is sooner.
        ZonedDateTime midnight = today.plusDays(1).atStartOfDay(PrayerTimes.VIENNA_ZONE);
        ZonedDateTime at = next != null && next.at.isBefore(midnight) ? next.at : midnight;
        long when = at.toInstant().toEpochMilli() + 15_000;
        context.getSystemService(AlarmManager.class).setAndAllowWhileIdle(AlarmManager.RTC, when, tick(context));
    }
}
