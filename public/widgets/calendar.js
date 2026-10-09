/*
 * The Windows calendar widget's content: today in three calendars and what
 * comes next, from the site's calendar feed (`/widget-data/calendar.json`).
 * Loaded by the service worker (`sw.js`). Both languages at once, as the
 * prayer-times widget has them: the board has no language of its own to ask.
 */
(function (root) {
  var ZONE = 'Europe/Vienna';
  var ROWS = 4;

  function isoDay(date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(date);
  }

  function noonOf(iso) {
    var p = iso.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2], 12));
  }

  function faDigits(text) {
    return String(text).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
  }

  /** [Hijri d, m, y, Persian d, m, y] for a day the feed covers, or null. */
  function dayEntry(feed, iso) {
    var index = Math.round((noonOf(iso) - noonOf(feed.from)) / 86400000);
    return index >= 0 && index < feed.days.length ? feed.days[index] : null;
  }

  function widgetData(feed, now) {
    var today = isoDay(now);
    var d = feed ? dayEntry(feed, today) : null;
    var others = d
      ? d[0] + '. ' + feed.hijriMonths.de[d[1] - 1] + ' ' + d[2] + ' · ' +
        // Isolated, or the Persian date's parts reorder against the Latin.
        '\u2067' + faDigits(d[3] + ' ' + feed.persianMonths.fa[d[4] - 1] + ' ' + d[5]) + '\u2069'
      : '';

    var items = [];
    var events = (feed && feed.events) || [];
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      var start = new Date(e.start);
      var end = e.end ? new Date(e.end) : new Date(start.getTime() + 7200000);
      if (end < now) continue;
      items.push({
        day: isoDay(start),
        at: start.getTime(),
        de: e.de.title,
        fa: e.fa.title,
        time: new Intl.DateTimeFormat('de-AT', { timeZone: ZONE, hour: '2-digit', minute: '2-digit' }).format(start),
        event: true,
      });
    }
    var occasions = (feed && feed.occasions) || [];
    for (var j = 0; j < occasions.length; j++) {
      var o = occasions[j];
      if (o.date < today) continue;
      items.push({ day: o.date, at: noonOf(o.date).getTime(), de: o.de, fa: o.fa, time: o.off ? 'Feiertag' : '', event: false });
    }
    items.sort(function (a, b) {
      return a.day < b.day ? -1 : a.day > b.day ? 1 : a.event === b.event ? a.at - b.at : a.event ? -1 : 1;
    });

    var short = new Intl.DateTimeFormat('de-AT', { timeZone: 'UTC', day: 'numeric', month: 'short' });
    return {
      title: 'تقویم · Kalender',
      today: new Intl.DateTimeFormat('de-AT', {
        timeZone: ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      }).format(now),
      others: others,
      upcoming: 'پیش رو · Demnächst',
      empty: items.length === 0,
      rows: items.slice(0, ROWS).map(function (item) {
        return {
          date: item.day === today ? 'heute' : short.format(noonOf(item.day)),
          de: item.de,
          fa: item.fa,
          time: item.time,
          event: item.event,
        };
      }),
    };
  }

  root.HamCalendar = { widgetData: widgetData };
})(typeof self !== 'undefined' ? self : globalThis);
