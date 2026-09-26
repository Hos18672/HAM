# Homecoming — loader + hero (Three.js)

One scene on one transparent canvas, from the first frame of loading to the interactive hero.

1. **Loading:** the sky above the hero band is empty except for birds. Groups (V formations, loose flocks) fly in from the edges, one after another. Near the logo each bird leaves its group, glides down to its spot and lands, and that piece of the logo appears. The logo is built right to left.
2. **Hand-over:** at 100 % a light passes over the logo. The logo glides from the centre of the screen into its box in the hero layout, the sky birds open into a ring around it, and `onReady` fires so the header and text can fade in.
3. **Hero:** the finished logo holds 1,500 small birds (950 on phones). Under the pointer they take off and land again, a click startles them, now and then a few lift off the ring by themselves, and scrolling away sends the flock off.

The logo is drawn from its vector outlines at screen resolution, so the text stays sharp and readable.

## Files

| File | What it is |
|---|---|
| `src/homecoming.js` | The scene: `createHomecoming(host, options)` |
| `src/mount.js` | Integration without a framework: page states, scroll lock, progress, theme, fallback, safety net: `mountHomecoming(options)` |
| `src/page-progress.js` | Real loading progress (fonts, images, window load) |
| `src/readable-core.js`, `logo-shapes.js`, `logo-data.js`, `loader-clock.js` | Logo outlines, sharp-logo rendering, loading clock |
| `react/useHomecoming.js` | React hook around `mountHomecoming` |
| `react/HomecomingHero.example.jsx` | Example hero component (markup + refs) |
| `homecoming.css` | Hero layout, caption + progress line, page states |

Dependency: `three` (tested with 0.186). `logo-shapes.js` also imports `three/addons/loaders/SVGLoader.js`, which ships with `three`.

## Page states

`<html data-hc="…">` drives the CSS:

| State | Set by | Meaning |
|---|---|---|
| `boot` | `index.html` | Before any JavaScript: header and hero text hidden, caption visible |
| `loading` | `mountHomecoming` | Loader running; scroll locked |
| `ready` | `mountHomecoming` | Hand-over started: header and hero text fade in, scroll unlocked |

Safety nets: the page appears after 12 s if the script never runs (CSS), and after 20–26 s whatever happens (JS). Without WebGL 2 the `fallbackImage` is shown in the slot.

## `mountHomecoming(options)`

| Option | Type | Notes |
|---|---|---|
| `host` | element | Covers the hero section (`position:absolute; inset:0`). The canvas goes in here. |
| `anchor` | element | Square box in the hero layout where the logo ends up. The scene follows it (resize, RTL/LTR switch). |
| `eventsEl` | element | Receives clicks (usually the hero section) |
| `meterEl` | element | Scaled 0 → 1 with the loading progress |
| `theme` | `'light'` \| `'dark'` | Initial theme; later `setTheme()` |
| `skipLoader` | boolean | Start directly in the hero |
| `progress` | `'page'` \| Promise \| `null` | `'page'` = fonts + images + load; Promise = done when it resolves; `null` = call `complete()` yourself |
| `fallbackImage` | string | Logo picture for browsers without WebGL 2 |
| `onReady` | function | The hand-over starts |
| `onError` | function | The scene failed; the fallback is shown |
| `sceneOptions` | object | Passed to `createHomecoming` (see below) |

Returns `{ scene, setTheme(t), setProgress(p), complete(), dispose() }`. `dispose()` always leaves the page visible and unlocked.

## `createHomecoming(host, options)` (scene options)

| Option | Default | Notes |
|---|---|---|
| `minDuration` | `4.2` s | Shortest loader, even when everything is cached |
| `ringScale` | `1.32` | Radius of the bird ring around the logo in the hero (logo radius = 1) |
| `themes` | see `HOMECOMING_THEMES` | `{ light: {...}, dark: {...} }` with the keys `text`, `text2`, `gold`, `light`, `shade`, `halo`, `bird`, `birdFar`, `ghost` |
| `themeEl` / `themeAttr` | – / `'data-t'` | Alternative to `setTheme()`: watch an attribute |

The scene also sets two CSS variables on the host: `--hc-cx` (horizontal centre of the logo) and `--hc-cap` (top of the caption, just under the logo).

## Notes

- **Framing:** while loading, the logo is centred in the visible screen; the hero section must be at least one screen high.
- **Rendering:** the canvas is transparent, so the hero background stays yours. Rendering pauses when the hero is scrolled out of view, but the loader always runs to the end.
- **Reduced motion:** with `prefers-reduced-motion`, birds land quickly, with no light sweep and no idle take-offs.
- **Bird counts:** about 300 birds fly in on desktop (180 on phones), plus about 200 in the sky (120 on phones).

## Local change

This copy is not quite the one that shipped. The arriving groups and the small
sky groups used to fly in V formations; on this site they are all loose,
irregular flocks instead — the V read as an arrow pointing at the logo rather
than as birds. Two lines in `src/homecoming.js`, both marked
`CHANGED FOR THIS SITE`; the `'v'` shape itself is still in `flockShape` and
nothing else about the flight, the counts or the timings is touched. Re-apply
them if this folder is ever replaced with a newer build.

Two more, also marked `CHANGED FOR THIS SITE`:

- **Scrolling no longer freezes the flock.** Scrolling away used to push each
  of the logo's birds out to a fixed spot and hold it there, wings spread and
  still. A scattered bird now keeps flying — flapping and gliding, circling
  loosely around the spot the scroll pushed it to, facing the way it goes. At
  the top of the page nothing differs from the shipped scene.
- **The ring around the logo is looser.** It used to be one tight band, every
  bird at nearly the same distance and circling at the same speed. Each bird
  now keeps its own pace (a few circle the other way), swells in and out, and
  every so often drifts well away from the logo before coming back; one that
  drifts too far is held inside the screen.
- **The bird is exported.** `birdVertex`, `birdFragment`, `birdGeometry` and
  `flockShape` are exported so that `page-sky.js` draws the same birds.

`page-sky.js` is not part of the shipped scene at all: it was written for this
site. It puts the same birds, in loose flocks that cross the window and come
back from another edge, over every page (`components/site/wandering-birds.tsx`).
The page hands it no-fly boxes each frame (the cards, and the footer skyline's
roof line from `components/site/skyline-silhouette.ts`): flocks turn away as
they near one, and a bird the scroll carries over one is eased off it.
