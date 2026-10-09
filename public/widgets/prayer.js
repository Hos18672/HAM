/*
 * Prayer times for the service worker, which cannot import the app's
 * TypeScript: a line-for-line port of `lib/prayer-times.ts` (Jaʿfari angles,
 * shar'i midnight), loaded with importScripts() by `public/sw.js` for the
 * Windows widget. `tests/unit/widget-prayer.test.ts` holds the two to the
 * same minute for every day of a year, so a change to one without the
 * other fails the tests.
 */
(function (root) {
  var DEG = Math.PI / 180;
  var sin = function (d) { return Math.sin(d * DEG); };
  var cos = function (d) { return Math.cos(d * DEG); };
  var tan = function (d) { return Math.tan(d * DEG); };
  var asin = function (x) { return Math.asin(x) / DEG; };
  var acos = function (x) { return Math.acos(x) / DEG; };
  var atan = function (x) { return Math.atan(x) / DEG; };
  var atan2 = function (y, x) { return Math.atan2(y, x) / DEG; };
  var fixAngle = function (a) { var r = a - 360 * Math.floor(a / 360); return r < 0 ? r + 360 : r; };
  var fixHour = function (h) { var r = h - 24 * Math.floor(h / 24); return r < 0 ? r + 24 : r; };

  var VIENNA = { latitude: 48.2175, longitude: 16.326, timeZone: 'Europe/Vienna' };
  var JAFARI = { fajr: 16, isha: 14, maghrib: 4, horizon: 0.833, shadow: 1 };

  function julianDay(year, month, day) {
    var y = year, m = month;
    if (m <= 2) { y -= 1; m += 12; }
    var a = Math.floor(y / 100);
    var b = 2 - a + Math.floor(a / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
  }

  function sunPosition(jd) {
    var d = jd - 2451545.0;
    var g = fixAngle(357.529 + 0.98560028 * d);
    var q = fixAngle(280.459 + 0.98564736 * d);
    var L = fixAngle(q + 1.915 * sin(g) + 0.02 * sin(2 * g));
    var e = 23.439 - 0.00000036 * d;
    var declination = asin(sin(e) * sin(L));
    var ra = fixHour(atan2(cos(e) * sin(L), cos(L)) / 15);
    return { declination: declination, equationOfTime: fixHour(q / 15 - ra + 12) - 12 };
  }

  function hourAngle(angle, latitude, declination) {
    var x = (-sin(angle) - sin(declination) * sin(latitude)) / (cos(declination) * cos(latitude));
    if (x > 1 || x < -1) return null;
    return acos(x) / 15;
  }

  function civilDateIn(timeZone, date) {
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date);
    var get = function (t) {
      for (var i = 0; i < parts.length; i++) if (parts[i].type === t) return Number(parts[i].value);
      return 0;
    };
    return { year: get('year'), month: get('month'), day: get('day') };
  }

  function utcOffsetHours(timeZone, year, month, day) {
    var probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(probe);
    var get = function (t) {
      for (var i = 0; i < parts.length; i++) if (parts[i].type === t) return Number(parts[i].value);
      return 0;
    };
    var asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
    return (asUtc - probe.getTime()) / 3600000;
  }

  function computeDayHours(year, month, day, c, offset) {
    var jd = julianDay(year, month, day) + (12 - c.longitude / 15 - offset) / 24;
    var sun = sunPosition(jd);
    var dhuhr = fixHour(12 - c.longitude / 15 - sun.equationOfTime + offset);
    var T = function (angle) { return hourAngle(angle, c.latitude, sun.declination); };
    var tFajr = T(JAFARI.fajr), tHorizon = T(JAFARI.horizon), tMaghrib = T(JAFARI.maghrib), tIsha = T(JAFARI.isha);
    var tAsr = hourAngle(-atan(1 / (JAFARI.shadow + tan(Math.abs(c.latitude - sun.declination)))), c.latitude, sun.declination);
    return {
      fajr: tFajr === null ? null : dhuhr - tFajr,
      sunrise: tHorizon === null ? null : dhuhr - tHorizon,
      dhuhr: dhuhr,
      asr: tAsr === null ? null : dhuhr + tAsr,
      sunset: tHorizon === null ? null : dhuhr + tHorizon,
      maghrib: tMaghrib === null ? null : dhuhr + tMaghrib,
      isha: tIsha === null ? null : dhuhr + tIsha,
    };
  }

  var toMinutes = function (h) { return h === null || !isFinite(h) ? null : Math.round(h * 60); };

  /** The seven times for the civil day `date` falls on, in minutes after local midnight. */
  function dayTimes(date, place) {
    place = place || VIENNA;
    var d = civilDateIn(place.timeZone, date);
    var offset = utcOffsetHours(place.timeZone, d.year, d.month, d.day);
    var today = computeDayHours(d.year, d.month, d.day, place, offset);
    var t = civilDateIn(place.timeZone, new Date(Date.UTC(d.year, d.month - 1, d.day + 1, 12)));
    var tomorrowOffset = utcOffsetHours(place.timeZone, t.year, t.month, t.day);
    var tomorrow = computeDayHours(t.year, t.month, t.day, place, tomorrowOffset);
    var midnight = null;
    if (today.sunset !== null && tomorrow.fajr !== null) {
      var nextFajr = tomorrow.fajr + 24 - (tomorrowOffset - offset);
      midnight = today.sunset + (nextFajr - today.sunset) / 2;
    }
    return {
      fajr: toMinutes(today.fajr),
      sunrise: toMinutes(today.sunrise),
      dhuhr: toMinutes(today.dhuhr),
      asr: toMinutes(today.asr),
      maghrib: toMinutes(today.maghrib),
      isha: toMinutes(today.isha),
      midnight: toMinutes(midnight),
    };
  }

  function localMinutes(date, timeZone) {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date);
    var get = function (t) {
      for (var i = 0; i < parts.length; i++) if (parts[i].type === t) return Number(parts[i].value);
      return 0;
    };
    return (get('hour') % 24) * 60 + get('minute') + get('second') / 60;
  }

  function hhmm(minutes) {
    if (minutes === null) return '—';
    var m = ((minutes % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60), mm = m % 60;
    return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
  }

  var NAMES = {
    fajr: ['اذان صبح', 'Fadschr'],
    sunrise: ['طلوع آفتاب', 'Sonnenaufgang'],
    dhuhr: ['اذان ظهر', 'Dhuhr'],
    asr: ['عصر', 'Asr'],
    maghrib: ['اذان مغرب', 'Maghrib'],
    isha: ['عشا', 'Ischa'],
    midnight: ['نیمه‌شب شرعی', 'Mitternacht'],
  };
  var ROWS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'midnight'];
  var PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  /** What the widget's Adaptive Card template is filled with. */
  function widgetData(now) {
    var place = VIENNA;
    var times = dayTimes(now, place);
    var nowMin = localMinutes(now, place.timeZone);
    var next = null;
    for (var i = 0; i < PRAYERS.length; i++) {
      var v = times[PRAYERS[i]];
      if (v !== null && v > nowMin) { next = { key: PRAYERS[i], minutes: v }; break; }
    }
    if (!next) {
      var tomorrow = dayTimes(new Date(now.getTime() + 24 * 3600000), place);
      next = { key: 'fajr', minutes: tomorrow.fajr };
    }
    return {
      title: 'اوقات شرعی · Gebetszeiten',
      place: 'وین · Wien',
      date: new Intl.DateTimeFormat('de-AT', {
        timeZone: place.timeZone, weekday: 'long', day: 'numeric', month: 'long',
      }).format(now),
      nextLabel: 'نماز بعدی · Nächstes Gebet',
      nextName: NAMES[next.key][0] + ' · ' + NAMES[next.key][1],
      nextTime: hhmm(next.minutes),
      rows: ROWS.map(function (key) {
        return {
          fa: NAMES[key][0],
          de: NAMES[key][1],
          time: hhmm(times[key]),
          next: key === next.key && next.minutes === times[key],
        };
      }),
    };
  }

  root.HamPrayer = { dayTimes: dayTimes, widgetData: widgetData };
})(typeof self !== 'undefined' ? self : globalThis);
