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
   (port 6543) is `DATABASE_URL`; the _direct_ one (port 5432) is `DIRECT_URL`.
3. **Storage → New bucket** named `media`, marked **public**.
4. **Settings → API** gives you the project URL and the `service_role` key.

### 2. Resend (email, free tier)

Create an account, verify the association's domain, and take an API key. Until
the domain is verified Resend only delivers to the account owner's address,
which is enough to test with.

### 3. Vercel (hosting, free tier)

1. Import the repository.
2. Add every variable from the table above as a project environment variable.
   `AUTH_URL` and `NEXT_PUBLIC_SITE_URL` must be the real domain.
3. Deploy.
4. From your machine, pointed at the production database, run once:
   ```bash
   pnpm db:push && pnpm db:seed
   ```
5. Log in at `/admin` and **change the seeded password immediately**.

### 4. Domain

Point the domain at Vercel and set it as the project's primary domain. This is
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
carries a banner saying so, and `noindex` plus a refusing `robots.txt` keep the
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

| Service  | Plan  | Cost                      | For                                        |
| -------- | ----- | ------------------------- | ------------------------------------------ |
| Vercel   | Hobby | free                      | hosting, builds, ISR                       |
| Supabase | Free  | free                      | Postgres **and** file storage, one account |
| Resend   | Free  | free (~3 000 mails/month) | form notifications                         |
| Domain   | —     | ~€15/year                 | the only real cost                         |

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
