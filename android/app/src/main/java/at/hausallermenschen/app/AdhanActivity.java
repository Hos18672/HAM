package at.hausallermenschen.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;
import java.util.Arrays;

/**
 * The adhan's own settings, the one screen the app draws natively: a switch
 * per prayer, and the two permissions the call needs (notifications, and
 * on Android 12+ the exact minute).
 *
 * The site opens it from its settings and from the bells on the prayer page
 * with {@code hamapp://adhan}. A bell's link names the prayer and the choice
 * ({@code hamapp://adhan?prayer=asr&on=0}): that is applied and the screen
 * closes at once, so the reader stays on the page they tapped.
 */
public class AdhanActivity extends Activity {
    private static final int ASK_NOTIFICATIONS = 11;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        Uri data = getIntent().getData();
        String prayer = data == null ? null : data.getQueryParameter("prayer");
        String on = data == null ? null : data.getQueryParameter("on");
        if (prayer != null && on != null && Arrays.asList(Adhan.KEYS).contains(prayer)) {
            Adhan.set(this, prayer, "1".equals(on));
            askForNotifications();
            finish();
            return;
        }
        Adhan.channel(this);
        Adhan.schedule(this);
        askForNotifications();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (!isFinishing()) build();
    }

    private void askForNotifications() {
        if (Build.VERSION.SDK_INT >= 33
            && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[] {Manifest.permission.POST_NOTIFICATIONS}, ASK_NOTIFICATIONS);
        }
    }

    private int dp(float value) {
        return Math.round(TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics()));
    }

    /** The screen, drawn in code: the paper ground, a white card of switches, the notes. */
    private void build() {
        android.content.Context local = Site.localized(this);
        boolean fa = "fa".equals(Site.lang(this));
        int paper = getColor(R.color.app_paper);
        int ink = getColor(R.color.app_ink);
        int head = getColor(R.color.app_head);
        int muted = getColor(R.color.app_muted);
        int card = getColor(R.color.app_card);

        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setPadding(dp(16), dp(24), dp(16), dp(24));
        column.setLayoutDirection(fa ? View.LAYOUT_DIRECTION_RTL : View.LAYOUT_DIRECTION_LTR);

        TextView title = new TextView(this);
        title.setText(local.getString(R.string.adhan_settings));
        title.setTextColor(head);
        title.setTextSize(22);
        title.setTypeface(title.getTypeface(), android.graphics.Typeface.BOLD);
        title.setPadding(dp(6), 0, dp(6), dp(14));
        column.addView(title);

        LinearLayout list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        GradientDrawable round = new GradientDrawable();
        round.setColor(card);
        round.setCornerRadius(dp(24));
        list.setBackground(round);
        list.setPadding(dp(16), dp(4), dp(16), dp(4));
        for (String key : Adhan.KEYS) {
            Switch row = new Switch(this);
            row.setText(Adhan.name(local, key));
            row.setTextColor(ink);
            row.setTextSize(16);
            row.setMinHeight(dp(56));
            row.setChecked(Adhan.isOn(this, key));
            row.setOnCheckedChangeListener((button, checked) -> Adhan.set(this, key, checked));
            list.addView(row);
        }
        column.addView(list);

        TextView note = new TextView(this);
        note.setText(local.getString(R.string.adhan_note));
        note.setTextColor(muted);
        note.setTextSize(13);
        note.setPadding(dp(6), dp(12), dp(6), dp(12));
        column.addView(note);

        if (!Adhan.exact(this)) {
            column.addView(action(local.getString(R.string.adhan_exact), head, () -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                        Uri.parse("package:" + getPackageName())));
                }
            }));
        }
        if (Build.VERSION.SDK_INT >= 33
            && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            column.addView(action(local.getString(R.string.adhan_allow), head, () ->
                startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName()))));
        }

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(paper);
        scroll.setFitsSystemWindows(true);
        scroll.addView(column);
        setContentView(scroll);
    }

    private Button action(String label, int colour, Runnable run) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextColor(getColor(R.color.app_on_head));
        GradientDrawable pill = new GradientDrawable();
        pill.setColor(colour);
        pill.setCornerRadius(dp(28));
        button.setBackground(pill);
        button.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, dp(52));
        params.topMargin = dp(10);
        button.setLayoutParams(params);
        button.setOnClickListener(v -> run.run());
        return button;
    }
}
