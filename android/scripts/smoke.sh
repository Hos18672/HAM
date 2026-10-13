#!/usr/bin/env bash
# Opens every screen of the installed app on the emulator, prints a contact
# sheet of all the screenshots into the log (one base64 JPEG after "SHEET")
# and fails if the app crashed anywhere. Run by the Android app workflow.
set -u
APK=$(find apk -name '*debug*.apk' | head -1)
adb install -r "$APK"
adb shell pm grant at.hausallermenschen.app android.permission.POST_NOTIFICATIONS || true
adb logcat -c
SITE=${SITE_URL:-https://hos18672.github.io/HAM}

mkdir -p shots
n=0
shot() {
  sleep "${2:-5}"
  n=$((n + 1))
  adb exec-out screencap -p > "shots/$(printf %02d $n).png"
  echo "shot $n: $1"
}

open() {
  adb shell am start -W -a android.intent.action.VIEW -d "$SITE/$1" -n at.hausallermenschen.app/.MainActivity > /dev/null
  shot "$1" "${2:-5}"
}

adb shell am start -W -n at.hausallermenschen.app/.MainActivity > /dev/null
shot home 10
for path in fa/prayer fa/qibla fa/quran fa/quran/page/2 de/quran/page/440 fa/duas fa/duas/kumail \
  fa/calendar fa/events fa/more fa/settings fa/search de/contact de/about de/courses de; do
  open "$path"
done

# Landscape, and the dark theme.
adb shell settings put system accelerometer_rotation 0
adb shell settings put system user_rotation 1
open fa/quran/page/3
open fa 6
adb shell settings put system user_rotation 0
adb shell cmd uimode night yes
open fa/prayer 6
open fa/quran/page/50 6

if command -v montage > /dev/null; then
  montage shots/*.png -resize 150x333 -tile 8x -geometry +3+3 -background '#888' sheet.jpg
  convert sheet.jpg -quality 50 sheet.jpg
  echo "SHEET $(base64 -w0 sheet.jpg)"
fi

if adb logcat -d | grep -E "FATAL EXCEPTION|ANR in at.hausallermenschen" -A 30; then
  echo "The app crashed."
  exit 1
fi
echo "No crash."
