# Haus aller Menschen — Ansar al-Mahdi (a.j.)

The website of the cultural, educational, sports and community association
**Haus aller Menschen – Ansar al-Mahdi (a.j.)**, Sautergasse 34–38, 1170 Vienna.

Fully bilingual (**فارسی / Deutsch**) with correct RTL and LTR handling, a public
front end, and a password-protected editorial area where staff manage every
piece of content — including editing the live public pages in place.

---

## Getting started

Three commands, from a fresh clone:

```bash
cp .env.example .env     # then fill in the values below
pnpm install
pnpm db:push && pnpm db:seed
pnpm dev
```

The site is then at <http://localhost:3000> and the editorial area at
<http://localhost:3000/admin>, using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you
put in `.env`.

Prefer Docker? `docker compose up` brings up Postgres and the app together,
pushing the schema and seeding on first run.

### Requirements

- Node 22 or newer
- pnpm 10 (`corepack enable`)
- PostgreSQL 16 — locally, in Docker, or on Supabase

---

## Environment variables

Every variable in `.env.example`, and what it is for:

| Variable                    | Required    | What it does                                                                                                              |
| --------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`              | yes         | Pooled Postgres connection used by the running app. On Supabase this is the **pooled** string (port 6543).                |
| `DIRECT_URL`                | yes         | Direct Postgres connection, used by `drizzle-kit` for migrations (port 5432). Locally both can be the same.               |
| `SUPABASE_URL`              | for uploads | Supabase project URL. Without it the media library says so and everything else still works.                               |
| `SUPABASE_SERVICE_ROLE_KEY` | for uploads | Server-side only. **Never** prefix it with `NEXT_PUBLIC_` — it bypasses row level security.                               |
| `SUPABASE_STORAGE_BUCKET`   | for uploads | Bucket name; `media` by default. Create it as a _public_ bucket.                                                          |
| `AUTH_SECRET`               | yes         | Signs the session and the in-place edit token. Generate with `openssl rand -base64 32`.                                   |
| `AUTH_URL`                  | yes         | The site's own origin, e.g. `https://haus-aller-menschen.at`.                                                             |
| `ADMIN_EMAIL`               | first run   | The admin account the seed creates.                                                                                       |
| `ADMIN_PASSWORD`            | first run   | Its password. **Change it after the first login.**                                                                        |
| `RESEND_API_KEY`            | for email   | Resend API key for form notifications. Without it, submissions are still stored — only the notification email is skipped. |
| `CONTACT_TO_EMAIL`          | for email   | Where those notifications are delivered.                                                                                  |
| `NEXT_PUBLIC_SITE_URL`      | yes         | Public origin, used for canonical URLs, `hreflang`, the sitemap and JSON-LD.                                              |

Nothing else. See **Cost** below for why the list is this short.

---

## Commands

| Command                                | What it does                          |
| -------------------------------------- | ------------------------------------- |
| `pnpm dev`                             | Development server                    |
| `pnpm build` / `pnpm start`            | Production build and server           |
| `pnpm typecheck`                       | TypeScript, `strict: true`            |
| `pnpm lint` / `pnpm format`            | ESLint / Prettier                     |
| `pnpm test`                            | Unit tests (Vitest)                   |
| `pnpm test:e2e`                        | End-to-end and axe tests (Playwright) |
| `pnpm db:push`                         | Apply the schema to the database      |
| `pnpm db:generate` / `pnpm db:migrate` | Generate and run SQL migrations       |
| `pnpm db:seed`                         | Load all content in both languages    |
| `pnpm db:studio`                       | Browse the database                   |

---

## Inhalte pflegen — eine Anleitung für die Redaktion

_(Diese Anleitung richtet sich an die Mitarbeiterinnen und Mitarbeiter des
Vereins. Programmierkenntnisse sind nicht nötig.)_

### Anmelden

Rufen Sie `ihre-adresse.at/admin` auf. Sie werden zur Anmeldung
weitergeleitet. Melden Sie sich mit Ihrer E-Mail-Adresse und Ihrem Passwort an.
Die Anmeldung gilt für acht Stunden.

### Zwei Wege, dasselbe zu ändern

Sie können Inhalte auf zwei Arten bearbeiten. Beide schreiben in dieselbe
Datenbank — es gibt keine zwei Fassungen, die auseinanderlaufen könnten.

**1. Über die Verwaltung.** Auf der Übersichtsseite sehen Sie Kacheln, nach
Bereichen geordnet: _Website_, _Startseite_, _Programm_, _Verein_. Ein Klick
öffnet den passenden Editor.

**2. Direkt auf der Website.** Klicken Sie auf der Übersichtsseite auf
**„Website direkt bearbeiten“**. Die öffentliche Seite öffnet sich, und jeder
Text, den Sie ändern dürfen, ist mit einer gestrichelten türkisen Linie
umrandet. Klicken Sie hinein, tippen Sie, und klicken Sie daneben — fertig,
gespeichert. Unten läuft eine Leiste mit, die den Zeitpunkt der letzten
Speicherung zeigt. Mit **„Beenden“** verlassen Sie den Bearbeitungsmodus.

### Beide Sprachen

Jeder Text steht in **Deutsch und فارسی nebeneinander**. Über den Schalter
_Beide Sprachen · Nur Deutsch · Nur فارسی_ blenden Sie eine Spalte aus, wenn Sie
sich auf eine Sprache konzentrieren wollen.

Wichtig: Die beiden Sprachen sind getrennte Texte. Wenn Sie den deutschen Titel
ändern, ändert sich der persische **nicht** mit — es wird nichts automatisch
übersetzt. Denken Sie daran, beide zu pflegen.

Was dagegen _immer_ für beide Sprachen gilt: einen Eintrag **anlegen**,
**duplizieren**, **löschen** oder **verschieben**. So können die beiden
Sprachfassungen nie unterschiedlich viele Einträge haben.

### Speichern

In der Verwaltung sammeln sich Ihre Änderungen, bis Sie **Speichern** drücken.
Solange etwas ungespeichert ist, erscheint unten eine dunkle Leiste — und nur
dann. **⌘ + S** bzw. **Strg + S** speichert ebenfalls. Verlassen Sie die Seite
mit ungespeicherten Änderungen, fragt der Browser nach.

Beim direkten Bearbeiten auf der Website wird dagegen sofort gespeichert,
sobald Sie aus einem Textfeld herausklicken.

### Einträge hinzufügen, kopieren, löschen

Listen — Kurse, Termine, Bittgebete, Angebote — haben oben rechts einen Knopf
**„Neuer Eintrag“**. Jeder vorhandene Eintrag hat kleine Knöpfe zum
**Duplizieren**, **Löschen** und **Verschieben** (nach oben, nach unten).

Löschen fragt immer nach. Der **letzte** Eintrag einer Liste lässt sich nicht
löschen — sonst hätte die Seite nichts mehr anzuzeigen.

### Bilder

Unter **Medien** ziehen Sie Bilder einfach in das gestrichelte Feld. Tragen Sie
danach für jedes Bild einen **Alternativtext** ein, auf Deutsch und auf Persisch.
Das ist keine Formsache: Für blinde Besucherinnen und Besucher ist ein Bild
ohne Alternativtext schlicht nicht vorhanden.

Vor dem Löschen zeigt die Mediathek, an wie vielen Stellen ein Bild verwendet
wird.

### Nachrichten

Unter **Posteingang** landen alle Kontakt-, Mitglieds- und Spendenanfragen. Sie
können sie als _gelesen_ markieren, _archivieren_ und als CSV-Datei
herunterladen (die Datei öffnet sich in Excel korrekt, auch mit persischen
Namen).

Archivierte Nachrichten werden nach 24 Monaten gelöscht — so steht es in der
Datenschutzerklärung, und so hält es die Anwendung auch.

### Sicherung

Unter **Sicherung** laden Sie mit einem Klick alle Inhalte als eine JSON-Datei
herunter. **Machen Sie das regelmäßig.** Eine Sicherung lässt sich dort auch
wieder einspielen; vorher zeigt die Anwendung genau an, welche Tabelle wie viele
Einträge gewinnen oder verlieren würde, und fragt nach.

Benutzerkonten, Nachrichten und das Protokoll sind **nicht** Teil der Sicherung.

### Wer darf was

- **Redakteur** — alle Inhalte, Medien, Nachrichten, Einstellungen.
- **Administrator** — zusätzlich Benutzer verwalten und Sicherungen einspielen.

Unter **Protokoll** steht, wer wann was geändert hat.

---

## Deployment

### 1. Supabase (database and file storage, free tier)

1. Create a project at <https://supabase.com>.
2. **Settings → Database** gives you two connection strings. The _pooled_ one
   (transaction pooler, port 6543) is `DATABASE_URL`. For `DIRECT_URL` take the
   _session pooler_ string (port 5432): Supabase's direct host is IPv6-only on
   the free tier, and Netlify's build machines cannot reach it.
3. **Storage → New bucket** named `media`, marked **public**.
4. **Settings → API** gives you the project URL and the `service_role` key.

### 2. Resend (email, free tier)

Create an account, verify the association's domain, and take an API key. Until
the domain is verified Resend only delivers to the account owner's address,
which is enough to test with.

### 3. Netlify (hosting, free tier)

1. **Add new site → Import an existing project**, pick the repository. The
   build settings come from `netlify.toml`; leave the form's fields as they are.
2. **Site configuration → Environment variables**: add every variable from the
   table above. `AUTH_URL` and `NEXT_PUBLIC_SITE_URL` must be the site's real
   address (`https://<name>.netlify.app` until the domain is connected).
3. Deploy. Netlify runs `pnpm run deploy-build`, which applies the migrations,
   seeds the database **only if it is empty** (and creates the admin account
   from `ADMIN_EMAIL` / `ADMIN_PASSWORD` if it does not exist yet), then builds.
   Later deploys leave the content alone, so edits made on the site survive.
4. Log in at `/de/admin` and **change the seeded password immediately**.

### 4. Domain

Point the domain at Netlify and set it as the project's primary domain. This is
the only thing the association pays for.

### Why not GitHub Pages

GitHub Pages serves static files and nothing else. This is a server
application: `middleware.ts` routes the two locales and gates `/admin`, six
server-action modules carry every form and every save, three API routes handle
sign-in, uploads and revalidation, and all content lives in Postgres. None of
that can run on Pages, and cutting the app down until it could would remove the
admin, the live editing, the forms and the search — which is most of the point.

What Pages _can_ hold is a picture of the public site, and the
`Preview site` workflow publishes one:

<https://hos18672.github.io/HAM/>

It builds the real production app against a freshly seeded database, saves what
the 32 public pages render, and deploys that. The design, the typography, both
languages and the seeded content are all genuine — it is the real output of the
real app. Everything needing a server is inert: no sign-in, no admin, no live
editing, the forms do not submit and the search does not search. Every page
carries `noindex` and `robots.txt` refuses crawlers, which keeps the
preview from ever competing with the real site in a search engine. A nightly
run keeps the prayer times and the calendar current, since both are rendered
for the day of the build.

The workflow turns Pages on by itself the first time it runs. If that step is
refused, set **Settings → Pages → Source** to **GitHub Actions** once and
re-run it.

---

## Architecture notes

### The stack

Next.js 15 (App Router, React 19, Server Components), TypeScript in strict
mode, Tailwind v4 over the design system's own CSS custom properties, Drizzle
ORM against PostgreSQL 16, Auth.js v5 with a credentials provider, Zod at every
boundary, next-intl for routing and interface strings.

### Re-seeding is safe to repeat

`pnpm db:seed` gives every row a **deterministic id**, derived from its natural
key — a page's key, a course's slug, a commemoration's Hijri date. Running it
twice produces exactly the same ids.

That is not cosmetic. The in-place editor emits `data-field="page.<id>.title"`,
so a page rendered before a re-seed would point at rows that no longer existed;
saving then failed on a foreign key and the editor could only say "Nicht
gespeichert". Stable ids remove the whole class of problem. If a page is ever
served from a cache older than its content anyway, the editor now says so and
reloads rather than leaving the reader to retype.

### Content lives in the database, not in the code

`messages/fa.json` and `messages/de.json` hold **interface chrome only** —
button labels, field names, error messages. Every word the association itself
writes lives in Postgres and is editable without a deployment.

Each content entity is a base row (slug, sort order, dates, publish flag) plus a
`*_translations` row per locale. That split is what makes side-by-side editing
possible: adding or reordering an entry touches the base row, so it applies to
both languages at once and they cannot drift apart.

### Pages are static; edits are instant

Public pages are prerendered. Each query is cached under a tag, and a content
write calls `revalidateTag` for that tag — so the site is served as static HTML
but an edit shows up straight away.

One subtlety worth knowing: `unstable_cache` stores its result as JSON, so a
`Date` crossing that boundary comes back as a string. The event queries
therefore deal in ISO strings inside the cache and revive them on the way out
(`lib/db/queries/content.ts`).

### In-place editing

Edit mode rides a **signed, httpOnly cookie** — never a client-side flag — so it
cannot be switched on from the browser. In that mode every managed text renders
as an editable region, marked by an explicit `data-field="entity.id.field"`
attribute that the component emits from the ids it already has. It never matches
rendered strings against content: two offers with the same title would be
indistinguishable and an edit would land on the wrong row.

### Prayer times are computed, not fetched

`lib/prayer-times.ts` implements the **Ja'fari (Shia)** method from first
principles — Fajr 16°, Isha 14°, Maghrib 4° after sunset, Asr at shadow factor
1, shar'i midnight at the midpoint from sunset to the next Fajr. DST is read
from the runtime's own IANA database rather than hard-coded. A time that does
not occur at a given latitude returns `null` and renders as an em dash.

The unit tests compare Vienna against published tables at a solstice, an
equinox and both DST boundaries, to ±2 minutes.

`lib/qibla.ts` computes the great-circle initial bearing (≈136.6° from the
association house) and the WGS84 geodesic distance (≈3 637 km — about 3 km
shorter than the spherical figure, which over that path is worth being accurate
about).

### The qibla map is the street you are standing in

The view that opens is a street map — OpenStreetMap's own tiles — with your
position in the middle and a gold arrow leaving it in the direction of
prayer. That is the one thing a drawing from our own data cannot give: a
bearing is only usable if you can see it **against the buildings in front of
you**.

The arrow may be drawn as a straight line because Mercator is conformal — it
preserves angles at a point — so the initial bearing of the great circle,
which is what the qibla is, leaves your position at that very angle on the
screen (`lib/slippy.ts`). There is no map library: the tiles are plain
`<img>` elements placed by transform, so nothing of theirs runs in the page.

**What it costs, plainly**: the tile server is told the reader's IP address
and, from the tiles asked for, roughly which patch of the earth they are
looking at. No script, no cookie, no identifier of ours. It is the only
third-party request this site makes from the browser, `img-src` in the CSP
allows that one host and nothing else, the privacy page says so in both
languages, and an e2e test walks every public page and fails if anything
else ever appears. For a reader who would rather ask nobody, the two views
behind it need no network at all — and when the tiles cannot be had the page
falls back to them by itself and says why.

### Behind it, a map centred on the person looking at it

The map that opens puts **you** in the middle — a house at the centre of the
disc, your own place — and the qibla is a straight gold arrow out of it. That
is what somebody standing in a room wants to know, and it is drawn on the one
projection where it is honestly true: **azimuthal equidistant about your own
position** (`lib/local-map.ts`), on which every straight line out of the centre
is the initial bearing of a great circle and every distance along it is to
scale. Zoom in and the rings are metres and it is a plan of the ground you are
on; zoom out and the coastlines arrive and the Kaaba appears at the end of the
same unbent line. With the compass running the whole map turns with the phone,
so the arrow points where you must physically face.

Behind it, for anyone who wants to see _why_ that line is not the one a flat
map would draw, is the globe:

The globe is a globe and not a flat map because the direction of prayer
is the bearing of a great circle and a great circle is straight on no flat map
there is — on the Mercator that prayer apps print, the line from Vienna to
Mecca bends visibly south of where you must actually face.

It asks no tile service for the map. A tile is a request to somebody else's
server carrying the reader's address and, to within a street, their position:
the opposite of what this site promises, and forbidden by its own CSP besides.
So `lib/world-outline.ts` carries the coastlines and borders — Natural Earth's
public-domain 1:110m data, simplified to about a tenth of a degree and written
as encoded paths, 21 KB in all, imported only when the map is drawn. The map
therefore works on the static preview and on a bad connection, and `lib/globe.
ts` (orthographic projection, great circles, horizon clipping along the rim) is
pure arithmetic with unit tests.

The trade is resolution: the outline is continental, so neither map can show
which street you are standing in. Zoomed right in, the local map is rings and
an arrow on bare ground — which is still the whole answer, because the answer
is a direction.

### The Quran reader

Built to a design reference supplied as a working prototype, rebuilt in this
repo's own components (`components/site/quran-reader.tsx`). Two ways to read
the same page:

- **Vers für Vers / آیه‌به‌آیه** — each verse on its own, numbered, with its
  translation directly under it. This is how somebody studies, and it is the
  view that opens.
- **Mushaf** — the page as it is printed: justified, continuous, the verses
  running on into one another with their gold end-marks. This is how somebody
  recites, and clicking any verse starts presenting from it.

Above them a bar that holds every choice and, below 980px, folds all of it
behind one settings button so only three controls stay out. Along the foot a
slider over all 604 pages, which commits when it is let go rather than on
every pixel of the drag. The arrow keys turn the page, `F` fills the screen,
`P` presents, `T` turns the translation on and off, and a swipe of more than
70px does what the arrows do.

The words themselves keep the frame and the face this site has always set them
in, which is the one part of the reference this page does not take, on the
owner's word: the sheet is `.mushaf` — a gold double rule with a rosette at
each corner, a running head naming the surah and the juz, and the folio in its
ring at the foot — and the Arabic is **Scheherazade New**. The du'a reader
prints on the same sheet, so somebody who has read one page here knows the
other. Everything around the words is the reference's: the bar, the foot, the
arrows and the presentation overlay.

The reference loads its font and its icons from Google's and unpkg's CDNs; this
site loads nothing from anybody, so every face is vendored into `assets/fonts/`
and the icons were already a package.

#### A turn of the page is not a visit to the page

The data comes from `/api/quran/page/[page]` — or, where there is no server,
from a file the preview snapshot writes out for all 604 pages — and the
address is then written with `History.prototype.replaceState`, the method
itself rather than the one Next replaces it with. Next's version tells the
router the path has changed, and the router then rebuilds the route's whole
subtree: measured on the preview, every turn threw away the page shell and
built it again. Turning a leaf is not a navigation — the route is the same
page of the site before and after — so the address is written and the router
is left alone.

In the mushaf view the turn is paper (`components/site/use-paper-turn.ts`). A
deck of two sheets: the one in hand hangs on the spine — the right-hand edge,
this being a book bound on the right — and swings about it in 3D while the
page underneath comes into view, so the turn reveals rather than replaces.
**Onwards is a sweep from left to right**, because that is the hand: you take
the leaf you have finished, on the left, and carry it over the spine. (The
next page still _lies_ to the left, which is why the arrow keys read the other
way round — they name a side, the swipe names a movement of the hand.) The
angle is written straight onto the element frame by frame rather than held in
React state: a turn is sixty frames, and sixty renders of a page of the Quran
is sixty frames dropped. CSS 3D transforms, not a WebGL scene — a page of
justified Arabic has to stay selectable, searchable text, which it cannot be
inside a canvas. Under `prefers-reduced-motion` there is no sheet in the air.

#### Presentation, for a room

A dark-green overlay showing one verse at a time
(`components/site/quran-present.tsx`), as large as it can be: the Arabic steps
through four sizes by the length of the verse, because three words set at the
size of forty wastes the wall and forty set at the size of three cannot be
read from the back. It takes the keys every presenter's clicker sends — space
and the page keys as well as the arrows — and a click anywhere on the stage,
because in a hall the nearest control is the screen. Stepping past the last
verse of a page opens the next page at its first; stepping back from the first
opens the previous page at its **last**. A gold bar along the foot shows where
the verse sits in its surah.

#### Two things that had to be worked around

The fixed furniture — the arrows either side, the bar along the foot, the
presentation overlay — is **portalled to the body**. The site reveals each
page with an animation whose wrapper keeps a transform, and an element with a
transform is the containing block for anything `position: fixed` inside it: the
foot was pinned two thousand pixels below the window rather than to it.

**Night mode is the site's own theme**, not a second one. The reference carries
its own night palette because it is a page on its own; here the site already
has a dark theme, a switch for it in the header and a cookie every server
render reads. A reader turning the lights down on the Quran page means the
lights, so the reader's night button drives the same switch.

### The du'a texts are in the code, not the database

`lib/dua-texts/` holds thirteen full texts — one file per du'a, one line of
source per line of prayer, as `[arabic, persian, german]`. They live in the
code and not in the database, as the Quran does and unlike everything the
editors keep, because they are scripture rather than editorial content:
nobody is going to reword Du'a Kumail from the admin screen.

- **Arabic and Persian** for the nine from Mafatih al-Jinan come from a
  published digital edition of it; the three ziyarat (Warith, Al Yasin, the
  Jamia Kabira) come from the Arabic ziyarat collections, segmented into the
  clauses they are read in.
- **German is the house's own working translation**, made line by line
  against the Arabic with the Persian beside it. The page says so, under
  "Textgrundlage". **Corrections are welcome and are a one-line diff** in the
  file named after the du'a; `tests/unit/dua-texts.test.ts` checks that no
  line ever loses a translation.

Adding a du'a means adding a file, a line in `lib/dua-texts/index.ts`, and a
row in the `duas` seed with the same slug.

### The lunar calendar is Iran's, not Saudi Arabia's

Every runtime ships ICU, and ICU's Hijri calendar is the **Umm al-Qura** table
Saudi Arabia publishes. That is not the calendar this community reads, and the
difference is not a constant: Umm al-Qura begins a month when the moon _sets
after the sun at Mecca_, the Iranian calendar when the crescent is _seen from
Iran_, which as a rule takes one more evening. Over the 310 months tabulated,
Iran begins a day later 200 times, on the same day 109 times, and two days
later once. Reading the Saudi table therefore put roughly two commemorations
in three on the wrong day.

So `lib/hijri-iran.ts` carries the month lengths of the **published Iranian
calendar** (Institute of Geophysics, University of Tehran), from 1 Muharram
1423 to the end of what has been published — currently Shawwal 1448, early
March 2027. `lib/hijri.ts` reads that table, and past its end falls back to
Umm al-Qura moved on by a day, which is the likelier of the two readings.

**Extending it is one line per year** in `MONTH_LENGTHS`: twelve numbers, 29
or 30, as the Iranian calendar for that year gives them. The unit tests pin
the conversion against the days Iran actually kept — Ashura, Arbaʿin, the
Prophet's birthday, the death of Fatima Masuma, and three first-of-Ramadans.

The days marked in the calendar beyond the ones the editors keep (`lib/
holidays.ts`) are Hijri dates for the same reason. They used to be read out of
the prayer-times API's holiday list, which is not a Shia calendar, comes in
the Saudi reckoning, and is absent from the static preview entirely.

### Security

- Server actions re-check the session **inside** the action. Middleware only
  sees whether a cookie exists; it is not the boundary.
- Table and column identifiers are read from a closed map
  (`lib/db/entity-map.ts`), never from a request. Values are always bound
  parameters.
- Rate limiting is a single atomic upsert in Postgres.
- Forms carry a honeypot and a fill-time check. A tripped trap returns
  _success_ — telling a bot it failed only teaches it to try again.
- IP addresses are never stored; a salted hash is, which is what makes keeping
  it proportionate.
- Strict CSP with no third-party origins at all, `X-Frame-Options: DENY`, HSTS.
- Uploads are limited by MIME type and size, checked again on the server. SVG
  is deliberately excluded — it can carry script.

### Accessibility

WCAG 2.2 AA, verified with axe in CI on every public page in both languages and
on the admin pages. One `h1` per page, a skip link, visible focus everywhere,
keyboard-complete menus, lightbox, search and admin, `aria-live` for the prayer
countdown and the toasts, and `lang`/`dir` set from the locale.

### Privacy

There is no analytics, no tracker, no font CDN, no map embed and no social
button anywhere in the codebase — fonts are self-hosted from `public/fonts`.
That is why there is no cookie banner: the only cookies are the theme
preference and the editorial session, and neither needs consent. An e2e test
asserts that a page load makes **no** third-party requests, so this stays true.

---

## Cost

The stack is chosen so the association pays for one thing only.

| Service  | Plan | Cost                      | For                                        |
| -------- | ---- | ------------------------- | ------------------------------------------ |
| Netlify  | Free | free                      | hosting, builds, ISR                       |
| Supabase | Free | free                      | Postgres **and** file storage, one account |
| Resend   | Free | free (~3 000 mails/month) | form notifications                         |
| Domain   | —    | ~€15/year                 | the only real cost                         |

Deliberately **not** used: Upstash or Redis (rate limiting lives in Postgres),
UploadThing or S3 (Supabase Storage covers it), any analytics service, any font
or icon CDN. Each of those would be another account, another bill and another
processor to name in the privacy policy.

---

## Project layout

```
app/
  [locale]/(site)/     the public pages
  admin/               the editorial area (German, outside the locale tree)
  actions/             server actions — content, submissions, admin, search
  api/                 auth, upload, revalidate
components/
  ui/                  the design system primitives (.btn .tag .field .card …)
  site/                public components
  admin/               editor components
  editable/            in-place editing
lib/
  db/                  schema, queries, seed, entity map
  i18n/                routing, config, formatting
  validation/          Zod schemas
  prayer-times.ts qibla.ts hijri.ts search.ts auth.ts
messages/              fa.json, de.json — interface chrome only
tests/unit/ tests/e2e/
```

---

## Assumptions made while building

Recorded here rather than left implicit:

1. **The association's own copy.** The build specification referred to an
   existing HTML prototype and to the Broadsheet design-system files. Neither
   was present in this repository, and the design project could not be reached
   from the build environment. The design tokens were therefore taken from the
   values the specification states directly (the four colour roles, Source
   Serif 4, spacing at density 1.25×, the 2px radius baseline), with the
   100–900 OKLCH ramps derived from those anchors on one shared lightness
   scale. **The German and Persian text in `lib/db/seed-data.ts` was written
   for this build and is a stand-in for the association's own words** — it is
   plausible and complete, but it is not the prototype's copy. Replace it
   through `/admin`, or by editing the seed and re-running `pnpm db:seed`.
2. **Placeholder facts.** The phone number, email address, ZVR number and IBAN
   in the seed are placeholders in the right shape. Set the real ones under
   **Einstellungen**; the ZVR number lives in `lib/db/seed-data.ts`.
3. **Persian typography.** Source Serif 4 has no Arabic glyphs, so Persian and
   Arabic text is set in Noto Naskh Arabic — the serif of the Arabic script,
   carrying the same editorial weight. Both are self-hosted.
4. **Course detail pages.** The data model supports them (every course has a
   slug and a body); the catalogue currently renders cards with anchors rather
   than separate routes, which is what the specification asked for.
5. **Submission retention.** 24 months for archived messages, seven years for
   membership records where Austrian tax and association law requires it. The
   privacy policy states both, and **Posteingang** enforces the first.
6. **Verse and line numbers.** Numbers set inside an Arabic text are Arabic-
   Indic on the German pages too: a verse-end sign (U+06DD) is an Arabic glyph
   that encloses the numeral following it, and a Latin digit neither fits
   inside it nor sits the right way round in a line that runs right to left.
   The numbers in the interface around the text — the folio, the pills beside
   each line, the superscripts in the translation — follow the page's own
   language. Al-Fatiha's Basmala carries its ۝١, as the Medina mushaf prints
   it: it is that surah's first verse, counted, unlike the Basmala over every
   other surah, which is not. A du'a's Basmala is likewise not one of its
   lines, so the prayer's first line is numbered one.
7. **The Quran's page is not justified.** The printed mushaf is, but it
   justifies by stretching the letters (kashida), and no browser can: a
   browser justifies by pulling the spaces between the words apart. Measured
   on a real page across nine column widths and six reading sizes, that left
   the widest space on a line between 0.86em and 2.45em against a normal
   space of 0.27em, and only past about twenty-two letters of Arabic across
   the column — wider than a laptop at the smallest reading size — did it
   settle back. The text is therefore set flush to the right, as Arabic is
   written, in both the mushaf view and a du'a read at a stretch. An e2e test
   holds every space under 0.4em.
8. **The printed page is black on warm paper, set close.** The mushaf view
   and a du'a read at a stretch are matched to a photographed printed page
   rather than to the site's own card: ink `--sheet-ink` (near-black, a warm
   off-white in dark mode), paper `--sheet` (a shade lighter than the page
   behind it, so the sheet still reads as a sheet), and a line close enough
   to the one above that the marks nearly touch. The leading was measured,
   not guessed: the printed page sets its lines 1.21 of their own inked
   height apart where ours stood at 1.60, and `line-height: 1.75` brings
   Scheherazade New to 1.26 with the same five-pixel clearance the printed
   page leaves. The Arabic of the scripture and of the prayers carries that
   ink in every view, so the same words are never two colours.
9. **The qibla page, against its reference design.** The page was rebuilt to
   a supplied reference (`Qibla.dc.html`): one stage with three tabs —
   compass, map, guide — and the figures beside it, fitting the first screen
   at 375×667, 768×1024, 924×539 and 1440×900 in both languages. Four things
   in that reference could not be copied as written, and were not:
   - **No font CDN.** The reference loads Vazirmatn and Manrope from Google
     Fonts. Both are already in this repository as self-hosted faces, so the
     page has the typography the reference asks for and still makes no
     request to a font host (see assumption 3 and the privacy page).
   - **No Leaflet.** The reference loads Leaflet and its stylesheet from
     unpkg. OpenStreetMap's tile host is the only third-party request this
     site makes, and the repository already carries its own slippy-tile map
     (`lib/slippy.ts`, unit-tested) with panning, zoom, a drawn fallback for
     when the tiles cannot be had, and now the great-circle path
     (`greatCirclePath` in `lib/qibla.ts`) and the two spans the reference
     wants — the street, and the whole way to Mecca. That map is used
     instead.
   - **The site's own tokens.** Green, gold, deep gold, ink and the stage's
     dark ground are the reference's values exactly, because they were
     already this design's values. Paper and card differ by a shade
     (`#f7f3e8` and `#fef7ed` against the reference's `#F4EFE3` and
     `#FFFDF7`): the site's own are used, so the page does not sit a tone
     apart from every other page.
   - **The page head.** This is the one page that does not open with the
     green band, because the band and the stage do not both fit on a phone.
     The band's kicker, title and lead are still here as a title row, and
     still edited in **Seiten** like every other page's.
