package at.hausallermenschen.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Typeface;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.StyleSpan;
import android.view.View;
import android.widget.RemoteViews;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Today in three calendars — Gregorian, Hijri, Persian — and what comes next:
 * the house's events and the occasions and Austrian public holidays ahead.
 *
 * The content is the site's calendar feed (`/widget-data/calendar.json`),
 * fetched in the background every few hours and kept, so the widget shows
 * the last copy when there is no connection; the app also ships a copy from
 * its build. The date itself rolls over at midnight without asking anyone.
 */
public class CalendarWidget extends AppWidgetProvider {
    static final String ACTION_TICK = "at.hausallermenschen.app.CALENDAR_TICK";
    private static final String CACHE = "calendar.json";
    private static final int ROWS = 4;

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        render(context, manager, ids);
        refresh(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (ACTION_TICK.equals(action)
            || Intent.ACTION_TIME_CHANGED.equals(action)
            || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
            || Intent.ACTION_LOCALE_CHANGED.equals(action)) {
            renderAll(context);
        }
    }

    @Override
    public void onDisabled(Context context) {
        context.getSystemService(AlarmManager.class).cancel(tick(context));
    }

    static void renderAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        render(context, manager, manager.getAppWidgetIds(new ComponentName(context, CalendarWidget.class)));
    }

    private static PendingIntent tick(Context context) {
        Intent intent = new Intent(context, CalendarWidget.class).setAction(ACTION_TICK);
        return PendingIntent.getBroadcast(
            context, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** Fetches the feed off the main thread, keeps it, and redraws with it. */
    private void refresh(Context context) {
        PendingResult pending = goAsync();
        Context app = context.getApplicationContext();
        new Thread(() -> {
            try {
                String body = download(BuildConfig.SITE_URL + "/widget-data/calendar.json");
                new JSONObject(body); // only keep what parses
                File tmp = new File(app.getFilesDir(), CACHE + ".tmp");
                try (FileOutputStream out = new FileOutputStream(tmp)) {
                    out.write(body.getBytes(StandardCharsets.UTF_8));
                }
                if (tmp.renameTo(new File(app.getFilesDir(), CACHE))) {
                    synchronized (CalendarWidget.class) { feed = null; }
                    renderAll(app);
                }
            } catch (Exception ignored) {
                // Offline, or the site said no: the copy already shown stays.
            } finally {
                pending.finish();
            }
        }).start();
    }

    private static String download(String address) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        connection.setConnectTimeout(8000);
        connection.setReadTimeout(8000);
        try {
            if (connection.getResponseCode() != 200) throw new Exception("HTTP " + connection.getResponseCode());
            try (InputStream in = connection.getInputStream()) {
                return Content.readAll(in);
            }
        } finally {
            connection.disconnect();
        }
    }

    private static JSONObject feed;

    /** The fetched copy if there is one, else the one the app was built with. */
    private static synchronized JSONObject feed(Context context) {
        if (feed != null) return feed;
        try {
            File cached = new File(context.getFilesDir(), CACHE);
            if (cached.exists()) {
                try (InputStream in = new FileInputStream(cached)) {
                    feed = new JSONObject(Content.readAll(in));
                    return feed;
                }
            }
        } catch (Exception ignored) {
            // fall through to the bundled copy
        }
        feed = Content.calendar(context);
        return feed;
    }

    /** One line of the list: an event or a named day. */
    private static final class Item {
        LocalDate day;
        String what;
        String sub;
        String path;
        boolean event;
    }

    static void render(Context context, AppWidgetManager manager, int[] ids) {
        if (ids.length == 0) return;
        String lang = Site.lang(context);
        Locale locale = new Locale(lang);
        Context text = Site.localized(context);
        JSONObject data = feed(context);
        ZonedDateTime now = ZonedDateTime.now(PrayerTimes.VIENNA_ZONE);
        LocalDate today = now.toLocalDate();

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calendar);
        Site.decorate(context, views);
        views.setTextViewText(R.id.title, text.getString(R.string.cal_title));
        views.setTextViewText(R.id.upcoming, text.getString(R.string.cal_upcoming));
        views.setTextViewText(R.id.empty, text.getString(R.string.cal_empty));

        views.setTextViewText(R.id.today_day, Site.digits(context, String.valueOf(today.getDayOfMonth())));
        views.setTextViewText(R.id.today_date, Site.digits(context,
            DateTimeFormatter.ofPattern("EEEE · MMMM yyyy", locale).format(today)));
        views.setTextViewText(R.id.today_other, Site.digits(context, otherCalendars(data, today, lang, true)));

        List<Item> items = upcoming(context, data, now, lang, locale, text);
        for (int i = 0; i < ROWS; i++) {
            int row = id(context, "row", i);
            if (i >= items.size()) {
                views.setViewVisibility(row, View.GONE);
                continue;
            }
            Item item = items.get(i);
            views.setViewVisibility(row, View.VISIBLE);
            boolean isToday = item.day.equals(today);
            views.setTextViewText(id(context, "day", i), Site.digits(context, String.valueOf(item.day.getDayOfMonth())));
            views.setTextViewText(id(context, "mon", i), isToday
                ? text.getString(R.string.cal_today)
                : DateTimeFormatter.ofPattern("LLL", locale).format(item.day).replace(".", ""));
            views.setTextColor(id(context, "day", i),
                context.getColor(item.event ? R.color.widget_accent : R.color.widget_ink));
            CharSequence what = item.what;
            if (item.event) {
                SpannableString bold = new SpannableString(item.what);
                bold.setSpan(new StyleSpan(Typeface.BOLD), 0, item.what.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                what = bold;
            }
            views.setTextViewText(id(context, "what", i), what);
            views.setTextViewText(id(context, "sub", i), Site.digits(context, item.sub));
            views.setOnClickPendingIntent(row, Site.open(context, item.path));
        }
        views.setViewVisibility(R.id.empty, items.isEmpty() ? View.VISIBLE : View.GONE);

        views.setOnClickPendingIntent(R.id.root, Site.open(context, "/events"));
        views.setOnClickPendingIntent(R.id.today, Site.open(context, "/prayer"));
        manager.updateAppWidget(ids, views);

        // A new day: a new date and a shorter list.
        long midnight = today.plusDays(1).atStartOfDay(PrayerTimes.VIENNA_ZONE).toInstant().toEpochMilli() + 15_000;
        context.getSystemService(AlarmManager.class).setAndAllowWhileIdle(AlarmManager.RTC, midnight, tick(context));
    }

    private static int id(Context context, String prefix, int i) {
        return context.getResources().getIdentifier(prefix + i, "id", context.getPackageName());
    }

    /**
     * "27 Rabi ath-thani 1448 · 17 Mehr 1405" for a day the feed covers, or
     * "" past its end. Years left out for the list, where the day is enough.
     */
    private static String otherCalendars(JSONObject data, LocalDate day, String lang, boolean years) {
        if (data == null) return "";
        try {
            LocalDate from = LocalDate.parse(data.getString("from"));
            JSONArray days = data.getJSONArray("days");
            long index = ChronoUnit.DAYS.between(from, day);
            if (index < 0 || index >= days.length()) return "";
            JSONArray d = days.getJSONArray((int) index);
            String hijri = d.getInt(0) + " " + data.getJSONObject("hijriMonths").getJSONArray(lang).getString(d.getInt(1) - 1);
            String persian = d.getInt(3) + " " + data.getJSONObject("persianMonths").getJSONArray(lang).getString(d.getInt(4) - 1);
            if (years) {
                hijri += " " + d.getInt(2);
                persian += " " + d.getInt(5);
            }
            return hijri + " · " + persian;
        } catch (Exception e) {
            return "";
        }
    }

    /** Events not yet over and named days from today on, soonest first. */
    private static List<Item> upcoming(
        Context context, JSONObject data, ZonedDateTime now, String lang, Locale locale, Context text) {
        List<Item> items = new ArrayList<>();
        if (data == null) return items;
        LocalDate today = now.toLocalDate();
        DateTimeFormatter clock = DateTimeFormatter.ofPattern("HH:mm", Locale.ROOT);

        JSONArray events = data.optJSONArray("events");
        for (int i = 0; events != null && i < events.length(); i++) {
            JSONObject event = events.optJSONObject(i);
            try {
                ZonedDateTime start = Instant.parse(event.getString("start")).atZone(PrayerTimes.VIENNA_ZONE);
                ZonedDateTime end = event.isNull("end")
                    ? start.plusHours(2) : Instant.parse(event.getString("end")).atZone(PrayerTimes.VIENNA_ZONE);
                if (end.isBefore(now)) continue;
                JSONObject local = event.getJSONObject(lang);
                Item item = new Item();
                item.day = start.toLocalDate();
                item.what = local.optString("title");
                String location = local.optString("location");
                item.sub = clock.format(start) + (location.isEmpty() ? "" : " · " + location);
                item.path = "/events#event-" + event.optString("slug");
                item.event = true;
                items.add(item);
            } catch (Exception ignored) {
                // a malformed entry is left out, not the whole list
            }
        }

        JSONArray occasions = data.optJSONArray("occasions");
        for (int i = 0; occasions != null && i < occasions.length(); i++) {
            JSONObject occasion = occasions.optJSONObject(i);
            try {
                LocalDate day = LocalDate.parse(occasion.getString("date"));
                if (day.isBefore(today)) continue;
                Item item = new Item();
                item.day = day;
                item.what = occasion.optString(lang);
                item.sub = occasion.optBoolean("off")
                    ? text.getString(R.string.cal_off)
                    : otherCalendars(data, day, lang, false);
                item.path = "/prayer";
                items.add(item);
            } catch (Exception ignored) {
                // as above
            }
        }

        // Soonest first; on the same day the house's own events lead.
        items.sort((a, b) -> {
            int byDay = a.day.compareTo(b.day);
            return byDay != 0 ? byDay : Boolean.compare(b.event, a.event);
        });
        return items.size() > ROWS ? new ArrayList<>(items.subList(0, ROWS)) : items;
    }
}
