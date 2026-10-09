package at.hausallermenschen.app;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

/** Links into the site, opened in the app itself (the Trusted Web Activity). */
final class Site {
    private Site() {}

    /** fa or de: the language the app's own texts are in, and the site's language in its links. */
    static String lang(Context context) {
        return context.getString(R.string.lang);
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
