package at.hausallermenschen.app;

import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

/** The fa/de switch on the widgets: flips the language of all of them at once (and the app's). */
public class LanguageSwitch extends BroadcastReceiver {
    static final String ACTION = "at.hausallermenschen.app.LANG_SWITCH";
    /** The app changed the language: redraw in it, without flipping it again. */
    static final String REFRESH = "at.hausallermenschen.app.LANG_REFRESH";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (ACTION.equals(intent.getAction())) {
            Site.setLang(context, "fa".equals(Site.lang(context)) ? "de" : "fa");
        } else if (!REFRESH.equals(intent.getAction())) {
            return;
        }
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        PrayerWidget.render(context, manager, manager.getAppWidgetIds(new ComponentName(context, PrayerWidget.class)));
        QuranWidget.render(context, manager, manager.getAppWidgetIds(new ComponentName(context, QuranWidget.class)));
        CalendarWidget.renderAll(context);
        DuaWidget.render(context, manager, manager.getAppWidgetIds(new ComponentName(context, DuaWidget.class)));
    }
}
