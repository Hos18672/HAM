#!/usr/bin/env bash
# Temporary: how long the live site takes to answer, page by page.
B=https://ansar-ham.netlify.app
for round in 1 2 3; do
  echo "=== round $round"
  for p in /de /fa /de/about /de/prayer /de/offers /de/calendar /de/contact; do
    curl -s -o /dev/null -w "html $p  ttfb=%{time_starttransfer}s total=%{time_total}s size=%{size_download}\n" "$B$p"
    curl -s -o /dev/null -H 'RSC: 1' -w "rsc  $p  ttfb=%{time_starttransfer}s total=%{time_total}s size=%{size_download}\n" "$B$p"
  done
done
echo "=== headers /de"
curl -s -D - -o /dev/null "$B/de"
echo "=== headers /de rsc"
curl -s -D - -o /dev/null -H 'RSC: 1' "$B/de/about"
echo "=== static asset"
A=$(curl -s "$B/de" | grep -o '/_next/static/[^"]*\.js' | head -1)
curl -s -D - -o /dev/null -w "ttfb=%{time_starttransfer}s\n" "$B$A"
echo "=== github pages"
for p in /de /de/about; do
  curl -s -o /dev/null -w "gh $p ttfb=%{time_starttransfer}s total=%{time_total}s\n" "https://hos18672.github.io/HAM$p/"
done
