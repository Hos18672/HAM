const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/**
 * Where each bird lands on the mark, as a share of its box, and where it flies
 * in from, relative to that spot. Listed in the order they arrive: right to
 * left, the way the mark is written and the way it is revealed underneath.
 */
const BIRDS: { x: number; y: number; dx: string; dy: string }[] = [
  { x: 86, y: 52, dx: '70vw', dy: '-30vh' },
  { x: 74, y: 18, dx: '45vw', dy: '-55vh' },
  { x: 92, y: 34, dx: '80vw', dy: '10vh' },
  { x: 66, y: 42, dx: '30vw', dy: '-60vh' },
  { x: 50, y: 6, dx: '-10vw', dy: '-60vh' },
  { x: 56, y: 84, dx: '60vw', dy: '45vh' },
  { x: 44, y: 46, dx: '-55vw', dy: '-45vh' },
  { x: 50, y: 94, dx: '-20vw', dy: '55vh' },
  { x: 22, y: 58, dx: '-75vw', dy: '-20vh' },
  { x: 8, y: 48, dx: '-80vw', dy: '25vh' },
];

/**
 * The loader on a phone and in the app: birds fly in and the mark is built
 * under them, right to left, then the screen opens onto the page.
 *
 * It is armed by a script in the head (`data-splash` on <html>), only below
 * 1024px and once per browsing session, and is otherwise `display: none` — so
 * the logo image is never fetched for it. Everything after that is CSS: the
 * overlay hides itself when its last animation ends, with no script to wait for.
 */
export function PhoneSplash() {
  return (
    <div
      className="a-splash"
      aria-hidden="true"
      style={{ '--splash-logo': `url(${BASE}/logo-512.webp)` } as React.CSSProperties}
    >
      <div className="a-splash-mark">
        <span className="a-splash-ghost" />
        <span className="a-splash-logo" />
        {BIRDS.map((b, i) => (
          <span
            key={i}
            className="a-splash-bird"
            style={
              {
                left: `${b.x}%`,
                top: `${b.y}%`,
                '--dx': b.dx,
                '--dy': b.dy,
                '--d': `${0.12 + i * 0.1}s`,
              } as React.CSSProperties
            }
          >
            <svg viewBox="0 0 24 10">
              <path d="M0 5Q6-1 12 5Q18-1 24 5Q18 2 12 8Q6 2 0 5Z" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}
