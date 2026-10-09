package at.hausallermenschen.app;

import android.content.Context;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The texts the widgets show, shipped inside the app so they work offline:
 * `assets/verses.json` (Arabic, Makarem Shirazi's Persian, Bubenheim & Elyas'
 * German — the editions the site's reader uses) and `assets/duas.json` (the
 * site's du'a catalogue). Both are written by `scripts/export-content.ts`
 * before every build.
 */
final class Content {
    private Content() {}

    private static JSONArray verses;
    private static JSONObject duas;

    static synchronized JSONArray verses(Context context) {
        if (verses == null) verses = readArray(context, "verses.json");
        return verses;
    }

    static synchronized JSONObject duas(Context context) {
        if (duas == null) {
            try {
                duas = new JSONObject(read(context, "duas.json"));
            } catch (Exception e) {
                duas = new JSONObject();
            }
        }
        return duas;
    }

    /** The calendar feed as the app was built with it, or null if it was not. */
    static JSONObject calendar(Context context) {
        try {
            return new JSONObject(read(context, "calendar.json"));
        } catch (Exception e) {
            return null;
        }
    }

    private static JSONArray readArray(Context context, String name) {
        try {
            return new JSONArray(read(context, name));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    private static String read(Context context, String name) throws Exception {
        try (InputStream in = context.getAssets().open(name)) {
            return readAll(in);
        }
    }

    /** All of a stream as UTF-8. InputStream.readAllBytes only exists from Android 13. */
    static String readAll(InputStream in) throws java.io.IOException {
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        for (int n; (n = in.read(buffer)) > 0; ) out.write(buffer, 0, n);
        return new String(out.toByteArray(), StandardCharsets.UTF_8);
    }
}
