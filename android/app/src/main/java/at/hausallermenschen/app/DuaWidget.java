package at.hausallermenschen.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import java.time.ZonedDateTime;
import org.json.JSONObject;

/**
 * The du'a for this time of the week (see {@link DailyDua}), and four
 * buttons into the app: prayer times, Quran, du'as, qibla.
 */
public class DuaWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        render(context, manager, ids);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (Intent.ACTION_LOCALE_CHANGED.equals(action)
            || Intent.ACTION_TIME_CHANGED.equals(action)
            || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            render(context, manager, manager.getAppWidgetIds(new ComponentName(context, DuaWidget.class)));
        }
    }

    static void render(Context context, AppWidgetManager manager, int[] ids) {
        if (ids.length == 0) return;
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_dua);
        Context text = Site.localized(context);
        Site.decorate(context, views);
        views.setTextViewText(R.id.title, text.getString(R.string.dua_title));
        views.setTextViewText(R.id.l_prayer, text.getString(R.string.btn_prayer));
        views.setTextViewText(R.id.l_quran, text.getString(R.string.btn_quran));
        views.setTextViewText(R.id.l_duas, text.getString(R.string.btn_duas));
        views.setTextViewText(R.id.l_qibla, text.getString(R.string.btn_qibla));
        ZonedDateTime now = ZonedDateTime.now();
        String slug = DailyDua.slug(now.getDayOfWeek(), now.getHour());
        JSONObject dua = Content.duas(context).optJSONObject(slug);
        String lang = Site.lang(context);

        if (dua != null) {
            JSONObject local = dua.optJSONObject(lang);
            views.setTextViewText(R.id.dua_name, local != null ? local.optString("title") : slug);
            views.setTextViewText(R.id.dua_arabic, dua.optString("ar"));
            views.setTextViewText(R.id.dua_when, local != null ? local.optString("when") : "");
        }

        views.setOnClickPendingIntent(R.id.dua_box, Site.open(context, "/duas/" + slug));
        views.setOnClickPendingIntent(R.id.b_prayer, Site.open(context, "/prayer"));
        views.setOnClickPendingIntent(R.id.b_quran, Site.open(context, "/quran"));
        views.setOnClickPendingIntent(R.id.b_duas, Site.open(context, "/duas"));
        views.setOnClickPendingIntent(R.id.b_qibla, Site.open(context, "/qibla"));
        manager.updateAppWidget(ids, views);
    }
}
