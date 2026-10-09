package at.hausallermenschen.app;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;
import java.util.Locale;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

/** Links into the site, opened in the app itself (the Trusted Web Activity). */
final class Site {
    private Site() {}

    private static final String PREFS = "widgets";

    /**
     * fa or de: the language the widgets are in, and the site's language in
     * their links. The one picked with the switch on a widget, else the phone's.
     */
    static String lang(Context context) {
        String picked = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("lang", null);
        return picked != null ? picked : context.getString(R.string.lang);
    }

    static void setLang(Context context, String lang) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("lang", lang).apply();
    }

    /** A context whose strings are in the widgets' language, whatever the phone's is. */
    static Context localized(Context context) {
        Configuration config = new Configuration(context.getResources().getConfiguration());
        config.setLocale(new Locale(lang(context)));
        return context.createConfigurationContext(config);
    }

    /** Right to left for Persian, left to right for German; and the switch to the other language. */
    static void decorate(Context context, RemoteViews views) {
        boolean fa = "fa".equals(lang(context));
        views.setInt(R.id.root, "setLayoutDirection", fa ? View.LAYOUT_DIRECTION_RTL : View.LAYOUT_DIRECTION_LTR);
        views.setTextViewText(R.id.lang, fa ? "DE" : "فا");
        views.setContentDescription(R.id.lang, fa ? "Deutsch" : "فارسی");
        Intent toggle = new Intent(context, LanguageSwitch.class).setAction(LanguageSwitch.ACTION);
        views.setOnClickPendingIntent(R.id.lang, PendingIntent.getBroadcast(
            context, 2, toggle, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
    }

    /** {@code /prayer} → https://…/fa/prayer */
    static String url(Context context, String path) {
        return BuildConfig.SITE_URL + "/" + lang(context) + path;
    }

    static PendingIntent open(Context context, String path) {
        String url = url(context, path);
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url))
            .setClass(context, LauncherActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(
            context, url.hashCode(), intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** Persian digits in the Persian widgets, Latin ones in the German. */
    static String digits(Context context, String text) {
        if (!"fa".equals(lang(context))) return text;
        StringBuilder out = new StringBuilder(text.length());
        for (char c : text.toCharArray()) out.append(c >= '0' && c <= '9' ? (char) ('۰' + (c - '0')) : c);
        return out.toString();
    }
}
