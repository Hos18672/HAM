package at.hausallermenschen.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import java.time.LocalDate;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * A verse of the Quran for the day, in Arabic with the translation in the
 * app's language. A new one every day; the arrow shows another straight away.
 * Tapping the verse opens it in the site's Quran reader.
 */
public class QuranWidget extends AppWidgetProvider {
    static final String ACTION_NEXT = "at.hausallermenschen.app.VERSE_NEXT";
    private static final String PREFS = "quran-widget";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        render(context, manager, ids);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (ACTION_NEXT.equals(action) || Intent.ACTION_LOCALE_CHANGED.equals(action)) {
            if (ACTION_NEXT.equals(action)) {
                SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
                prefs.edit().putInt("offset", prefs.getInt("offset", 0) + 1).apply();
            }
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            render(context, manager, manager.getAppWidgetIds(new ComponentName(context, QuranWidget.class)));
        }
    }

    static void render(Context context, AppWidgetManager manager, int[] ids) {
        if (ids.length == 0) return;
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quran);
        JSONArray verses = Content.verses(context);
        String path = "/quran";

        if (verses.length() > 0) {
            int offset = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getInt("offset", 0);
            int index = (int) Math.floorMod(LocalDate.now().toEpochDay() + offset, (long) verses.length());
            JSONObject verse = verses.optJSONObject(index);
            String lang = Site.lang(context);
            int s = verse.optInt("s"), n = verse.optInt("n");
            views.setTextViewText(R.id.verse_ar, verse.optString("ar"));
            views.setTextViewText(R.id.verse_tr, verse.optString(lang));
            String surah = "fa".equals(lang) ? verse.optString("surahAr") : verse.optString("surahName");
            views.setTextViewText(R.id.verse_ref, Site.digits(context, surah + " · " + s + ":" + n));
            path = "/quran#" + s + ":" + n;
        }

        views.setOnClickPendingIntent(R.id.root, Site.open(context, path));
        Intent next = new Intent(context, QuranWidget.class).setAction(ACTION_NEXT);
        views.setOnClickPendingIntent(R.id.verse_next, PendingIntent.getBroadcast(
            context, 1, next, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        manager.updateAppWidget(ids, views);
    }
}
