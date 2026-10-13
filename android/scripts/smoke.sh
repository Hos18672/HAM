#!/usr/bin/env bash
# Opens every screen of the installed app on the emulator, prints a small
# screenshot of each into the log (base64 JPEG after "SHOT <name>") and fails
# if the app crashed anywhere. Run by the Android app workflow.
set -u
APK=$(find apk -name '*debug*.apk' | head -1)
adb install -r "$APK"
adb shell pm grant at.hausallermenschen.app android.permission.POST_NOTIFICATIONS || true
adb logcat -c
SITE=${SITE_URL:-https://hos18672.github.io/HAM}

shot() {
  sleep "${2:-5}"
  adb exec-out screencap -p > shot.png
  if command -v convert > /dev/null; then
    convert shot.png -resize 360x -quality 55 shot.jpg
    echo "SHOT $1 $(base64 -w0 shot.jpg)"
  else
    echo "SHOT $1 $(base64 -w0 shot.png)"
  fi
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

if adb logcat -d | grep -E "FATAL EXCEPTION|ANR in at.hausallermenschen" -A 30; then
  echo "The app crashed."
  exit 1
fi
echo "No crash."
