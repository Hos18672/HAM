package at.hausallermenschen.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
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
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The month as on the site's prayer page — each day with its Hijri date
 * beneath, today ringed, the days with an occasion or an event marked and
 * Austria's public holidays in red — and under it what comes next: the
 * house's events and the occasions ahead. Arrows page through the months.
 *
 * The content is the site's calendar feed (`/widget-data/calendar.json`),
 * fetched in the background every few hours and kept, so the widget shows
 * the last copy when there is no connection; the app also ships a copy from
 * its build. The date itself rolls over at midnight without asking anyone.
 */
public class CalendarWidget extends AppWidgetProvider {
    static final String ACTION_TICK = "at.hausallermenschen.app.CALENDAR_TICK";
    private static final String ACTION_PREV = "at.hausallermenschen.app.CALENDAR_PREV";
    private static final String ACTION_NEXT = "at.hausallermenschen.app.CALENDAR_NEXT";
    private static final String ACTION_TODAY = "at.hausallermenschen.app.CALENDAR_TODAY";
    private static final String CACHE = "calendar.json";
    private static final int ROWS = 4;
    /** How far the arrows go: the feed starts a month back and runs a year ahead. */
    private static final int MONTHS_BACK = 1;
    private static final int MONTHS_AHEAD = 12;

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        render(context, manager, ids);
        refresh(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (ACTION_PREV.equals(action) || ACTION_NEXT.equals(action) || ACTION_TODAY.equals(action)) {
            int offset = ACTION_TODAY.equals(action) ? 0 : offset(context) + (ACTION_NEXT.equals(action) ? 1 : -1);
            setOffset(context, Math.max(-MONTHS_BACK, Math.min(MONTHS_AHEAD, offset)));
            renderAll(context);
            return;
        }
        if (ACTION_TICK.equals(action)) setOffset(context, 0); // a new day opens on this month
        if (ACTION_TICK.equals(action)
            || Intent.ACTION_TIME_CHANGED.equals(action)
            || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
            || Intent.ACTION_LOCALE_CHANGED.equals(action)) {
            renderAll(context);
        }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        render(context, manager, new int[] {id}); // resized: as many events as now fit
    }

    @Override
    public void onDisabled(Context context) {
        context.getSystemService(AlarmManager.class).cancel(tick(context));
    }

    static void renderAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        render(context, manager, manager.getAppWidgetIds(new ComponentName(context, CalendarWidget.class)));
    }

    /** Months away from this one that the widget is showing. */
    private static int offset(Context context) {
        return context.getSharedPreferences(Site.PREFS, Context.MODE_PRIVATE).getInt("cal_offset", 0);
    }

    private static void setOffset(Context context, int offset) {
        context.getSharedPreferences(Site.PREFS, Context.MODE_PRIVATE).edit().putInt("cal_offset", offset).apply();
    }

    private static PendingIntent action(Context context, String action, int code) {
        Intent intent = new Intent(context, CalendarWidget.class).setAction(action);
        return PendingIntent.getBroadcast(
            context, code, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
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
        for (int id : ids) {
            manager.updateAppWidget(id, views(context, rowsFor(manager.getAppWidgetOptions(id))));
        }
        // A new day: a new date and a shorter list.
        LocalDate today = LocalDate.now(PrayerTimes.VIENNA_ZONE);
        long midnight = today.plusDays(1).atStartOfDay(PrayerTimes.VIENNA_ZONE).toInstant().toEpochMilli() + 15_000;
        context.getSystemService(AlarmManager.class).setAndAllowWhileIdle(AlarmManager.RTC, midnight, tick(context));
    }

    /**
     * Events that fit under the month at the widget's height: the month takes
     * about 330dp, each event 44dp. Three when the launcher does not say.
     */
    private static int rowsFor(Bundle options) {
        int height = options == null ? 0 : options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT);
        if (height <= 0) return 3;
        return Math.max(0, Math.min(ROWS, (height - 330) / 44));
    }

    private static RemoteViews views(Context context, int rows) {
        String lang = Site.lang(context);
        boolean fa = "fa".equals(lang);
        Locale locale = new Locale(lang);
        Context text = Site.localized(context);
        JSONObject data = feed(context);
        ZonedDateTime now = ZonedDateTime.now(PrayerTimes.VIENNA_ZONE);
        LocalDate today = now.toLocalDate();
        LocalDate first = today.withDayOfMonth(1).plusMonths(offset(context));

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calendar);
        Site.decorate(context, views);

        // The month's name, and the Hijri and Persian months it spans.
        views.setTextViewText(R.id.month, Site.digits(context,
            DateTimeFormatter.ofPattern("LLLL yyyy", locale).format(first)));
        views.setTextViewText(R.id.month_other, Site.digits(context,
            spans(data, first, first.plusMonths(1).minusDays(1), lang)));
        // Back points to where the month before lies: right in Persian, left in German.
        views.setTextViewText(R.id.prev, fa ? "›" : "‹");
        views.setTextViewText(R.id.next, fa ? "‹" : "›");
        views.setTextViewText(R.id.go_today, text.getString(R.string.cal_go_today));
        views.setContentDescription(R.id.prev, text.getString(R.string.cal_prev));
        views.setContentDescription(R.id.next, text.getString(R.string.cal_next));
        views.setOnClickPendingIntent(R.id.prev, action(context, ACTION_PREV, 10));
        views.setOnClickPendingIntent(R.id.next, action(context, ACTION_NEXT, 11));
        views.setOnClickPendingIntent(R.id.go_today, action(context, ACTION_TODAY, 12));

        String[] weekdays = text.getResources().getStringArray(R.array.cal_weekdays);
        for (int i = 0; i < 7; i++) views.setTextViewText(id(context, "w", i), weekdays[i]);

        Set<LocalDate> marked = new HashSet<>();
        Set<LocalDate> off = new HashSet<>();
        markDays(data, marked, off);

        int lead = first.getDayOfWeek().getValue() - 1; // Monday first
        int length = first.lengthOfMonth();
        int weeks = (lead + length + 6) / 7;
        for (int w = 0; w < 6; w++) views.setViewVisibility(id(context, "wk", w), w < weeks ? View.VISIBLE : View.GONE);
        for (int i = 0; i < 42; i++) {
            int cell = id(context, "c", i);
            int n = i - lead + 1;
            if (n < 1 || n > length) {
                views.setViewVisibility(cell, View.INVISIBLE);
                continue;
            }
            LocalDate day = first.withDayOfMonth(n);
            boolean isToday = day.equals(today);
            boolean mark = marked.contains(day);
            views.setViewVisibility(cell, View.VISIBLE);
            views.setInt(cell, "setBackgroundResource",
                isToday ? R.drawable.cell_today : mark ? R.drawable.cell_mark : R.drawable.cell_bg);
            views.setTextViewText(id(context, "g", i), Site.digits(context, String.valueOf(n)));
            JSONArray other = entry(data, day);
            views.setTextViewText(id(context, "h", i),
                other == null ? "" : Site.digits(context, String.valueOf(other.optInt(0))));
            views.setTextColor(id(context, "g", i), context.getColor(
                isToday ? R.color.widget_on_accent : off.contains(day) ? R.color.widget_holiday : R.color.widget_ink));
            views.setTextColor(id(context, "h", i), context.getColor(
                isToday ? R.color.widget_on_accent : R.color.widget_subtle));
            views.setViewVisibility(id(context, "d", i), mark ? View.VISIBLE : View.INVISIBLE);
        }

        views.setTextViewText(R.id.upcoming, text.getString(R.string.cal_upcoming));
        views.setTextViewText(R.id.empty, text.getString(R.string.cal_empty));
        List<Item> items = upcoming(data, now, lang, text);
        for (int i = 0; i < ROWS; i++) {
            int row = id(context, "row", i);
            if (i >= items.size() || i >= rows) {
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
        views.setViewVisibility(R.id.upcoming, rows == 0 ? View.GONE : View.VISIBLE);
        views.setViewVisibility(R.id.empty, items.isEmpty() && rows > 0 ? View.VISIBLE : View.GONE);

        views.setOnClickPendingIntent(R.id.root, Site.open(context, "/events"));
        views.setOnClickPendingIntent(R.id.grid, Site.open(context, "/prayer"));
        views.setOnClickPendingIntent(R.id.head, Site.open(context, "/prayer"));
        return views;
    }

    /** The days with an occasion or one of the house's events, and the days off among them. */
    private static void markDays(JSONObject data, Set<LocalDate> marked, Set<LocalDate> off) {
        if (data == null) return;
        JSONArray occasions = data.optJSONArray("occasions");
        for (int i = 0; occasions != null && i < occasions.length(); i++) {
            JSONObject occasion = occasions.optJSONObject(i);
            try {
                LocalDate day = LocalDate.parse(occasion.getString("date"));
                marked.add(day);
                if (occasion.optBoolean("off")) off.add(day);
            } catch (Exception ignored) {
                // a malformed entry marks nothing
            }
        }
        JSONArray events = data.optJSONArray("events");
        for (int i = 0; events != null && i < events.length(); i++) {
            JSONObject event = events.optJSONObject(i);
            try {
                marked.add(Instant.parse(event.getString("start")).atZone(PrayerTimes.VIENNA_ZONE).toLocalDate());
            } catch (Exception ignored) {
                // as above
            }
        }
    }

    private static int id(Context context, String prefix, int i) {
        return context.getResources().getIdentifier(prefix + i, "id", context.getPackageName());
    }

    /** [Hijri d, m, y, Persian d, m, y] for a day the feed covers, else null. */
    private static JSONArray entry(JSONObject data, LocalDate day) {
        if (data == null) return null;
        try {
            LocalDate from = LocalDate.parse(data.getString("from"));
            JSONArray days = data.getJSONArray("days");
            long index = ChronoUnit.DAYS.between(from, day);
            return index < 0 || index >= days.length() ? null : days.getJSONArray((int) index);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * The Hijri and Persian months a stretch of days falls in:
     * "Rabi ath-thani – Dschumada l-ula 1448 · Mehr – Aban 1405".
     */
    private static String spans(JSONObject data, LocalDate from, LocalDate to, String lang) {
        JSONArray a = entry(data, from);
        JSONArray b = entry(data, to);
        if (a == null || b == null) return "";
        try {
            JSONArray hijri = data.getJSONObject("hijriMonths").getJSONArray(lang);
            JSONArray persian = data.getJSONObject("persianMonths").getJSONArray(lang);
            return span(hijri, a.getInt(1), a.getInt(2), b.getInt(1), b.getInt(2))
                + " · " + span(persian, a.getInt(4), a.getInt(5), b.getInt(4), b.getInt(5));
        } catch (Exception e) {
            return "";
        }
    }

    private static String span(JSONArray names, int m1, int y1, int m2, int y2) throws Exception {
        String first = names.getString(m1 - 1);
        String last = names.getString(m2 - 1);
        if (m1 == m2 && y1 == y2) return first + " " + y1;
        if (y1 == y2) return first + " – " + last + " " + y1;
        return first + " " + y1 + " – " + last + " " + y2;
    }

    /** "27 Rabi ath-thani · 17 Mehr" for a day the feed covers, or "" past its end. */
    private static String otherCalendars(JSONObject data, LocalDate day, String lang) {
        JSONArray d = entry(data, day);
        if (d == null) return "";
        try {
            return d.getInt(0) + " " + data.getJSONObject("hijriMonths").getJSONArray(lang).getString(d.getInt(1) - 1)
                + " · " + d.getInt(3) + " " + data.getJSONObject("persianMonths").getJSONArray(lang).getString(d.getInt(4) - 1);
        } catch (Exception e) {
            return "";
        }
    }

    /** Events not yet over and named days from today on, soonest first. */
    private static List<Item> upcoming(JSONObject data, ZonedDateTime now, String lang, Context text) {
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
                    : otherCalendars(data, day, lang);
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
