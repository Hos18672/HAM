#!/usr/bin/env bash
# Temporary: waits for the Netlify deploy of dbecd94, then checks the Quran and event pages.
S=https://ansar-ham.netlify.app
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$S/de/quran/page/7?probe=$i")
  echo "try $i: $code"; [ "$code" = 200 ] && break; sleep 15
done
for u in /de/quran/page/1 /fa/quran/page/50 /fa/quran/page/604 /de/quran/page/605 /fa/quran/2 /fa/quran/114 /de/events /de/events/eroeffnungsfest /de/events/does-not-exist /de /fa/prayer; do
  curl -s -o /tmp/b -w "$u %{http_code} %{time_total}s redirect=%{redirect_url}\n" "$S$u"
  grep -o '<title>[^<]*' /tmp/b | head -1
done
curl -s -D - -o /dev/null "$S/de/quran/page/1" | grep -i 'cache-status\|x-nextjs\|cache-control'
