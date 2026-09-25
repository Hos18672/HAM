/**
 * Decorative marks for the hero. Both are pure SVG, drawn from the design
 * tokens, and both are `aria-hidden` — they carry no information a reader
 * needs, so a screen reader should walk straight past them.
 */

/**
 * The pattern plate.
 *
 * The three tilings are the design's own, carried over path for path rather
 * than redrawn: `khatam`, the eight-point star-and-cross girih that runs
 * through Persian tilework, for the paper ground; `shesh`, the same geometry
 * at half the module, for dark bands; and `tumar`, a running interlace, for
 * rules. Each strokes a different token, so a plate is always in the right
 * ink for what it lies on.
 *
 * All of it is decorative and `aria-hidden` — a reader should walk straight
 * past it. The plate is masked so it fades out down the page instead of
 * ending on a hard edge, and `drift` sets it slowly moving.
 */
/**
 * The pattern definitions, once per document.
 *
 * A `fill="url(#ham-khatam)"` only resolves against a definition that is in
 * the same document, so these live in one hidden SVG mounted by the layout
 * rather than inside whichever element happens to use them first. The card
 * corner plates and the ground plate both draw from here.
 */
export function PatternDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <pattern id="ham-khatam" width="100" height="100" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="var(--pat)" strokeLinejoin="round">
            <g strokeWidth=".7" strokeOpacity=".34">
              <path d="M50.00 20.71L20.71 50.00L-20.71 50.00L-50.00 20.71L-50.00 -20.71L-20.71 -50.00L20.71 -50.00L50.00 -20.71ZM150.00 20.71L120.71 50.00L79.29 50.00L50.00 20.71L50.00 -20.71L79.29 -50.00L120.71 -50.00L150.00 -20.71ZM50.00 120.71L20.71 150.00L-20.71 150.00L-50.00 120.71L-50.00 79.29L-20.71 50.00L20.71 50.00L50.00 79.29ZM150.00 120.71L120.71 150.00L79.29 150.00L50.00 120.71L50.00 79.29L79.29 50.00L120.71 50.00L150.00 79.29ZM100.00 70.71L70.71 100.00L29.29 100.00L-0.00 70.71L-0.00 29.29L29.29 -0.00L70.71 -0.00L100.00 29.29Z" />
              <path d="M50.00 -29.29L79.29 0.00L50.00 29.29L20.71 0.00ZM0.00 20.71L29.29 50.00L0.00 79.29L-29.29 50.00ZM100.00 20.71L129.29 50.00L100.00 79.29L70.71 50.00ZM50.00 70.71L79.29 100.00L50.00 129.29L20.71 100.00Z" />
            </g>
            <g strokeWidth=".95" strokeOpacity=".8">
              <path d="M50.00 20.71L15.85 15.85L20.71 50.00L0.00 22.42L-20.71 50.00L-15.85 15.85L-50.00 20.71L-22.42 0.00L-50.00 -20.71L-15.85 -15.85L-20.71 -50.00L-0.00 -22.42L20.71 -50.00L15.85 -15.85L50.00 -20.71L22.42 -0.00ZM150.00 20.71L115.85 15.85L120.71 50.00L100.00 22.42L79.29 50.00L84.15 15.85L50.00 20.71L77.58 0.00L50.00 -20.71L84.15 -15.85L79.29 -50.00L100.00 -22.42L120.71 -50.00L115.85 -15.85L150.00 -20.71L122.42 -0.00ZM50.00 120.71L15.85 115.85L20.71 150.00L0.00 122.42L-20.71 150.00L-15.85 115.85L-50.00 120.71L-22.42 100.00L-50.00 79.29L-15.85 84.15L-20.71 50.00L-0.00 77.58L20.71 50.00L15.85 84.15L50.00 79.29L22.42 100.00ZM150.00 120.71L115.85 115.85L120.71 150.00L100.00 122.42L79.29 150.00L84.15 115.85L50.00 120.71L77.58 100.00L50.00 79.29L84.15 84.15L79.29 50.00L100.00 77.58L120.71 50.00L115.85 84.15L150.00 79.29L122.42 100.00ZM100.00 70.71L65.85 65.85L70.71 100.00L50.00 72.42L29.29 100.00L34.15 65.85L-0.00 70.71L27.58 50.00L-0.00 29.29L34.15 34.15L29.29 -0.00L50.00 27.58L70.71 -0.00L65.85 34.15L100.00 29.29L72.42 50.00Z" />
            </g>
            <g strokeWidth=".65" strokeOpacity=".45">
              <path d="M22.42 0.00L15.85 15.85L0.00 22.42L-15.85 15.85L-22.42 0.00L-15.85 -15.85L-0.00 -22.42L15.85 -15.85ZM122.42 0.00L115.85 15.85L100.00 22.42L84.15 15.85L77.58 0.00L84.15 -15.85L100.00 -22.42L115.85 -15.85ZM22.42 100.00L15.85 115.85L0.00 122.42L-15.85 115.85L-22.42 100.00L-15.85 84.15L-0.00 77.58L15.85 84.15ZM122.42 100.00L115.85 115.85L100.00 122.42L84.15 115.85L77.58 100.00L84.15 84.15L100.00 77.58L115.85 84.15ZM72.42 50.00L65.85 65.85L50.00 72.42L34.15 65.85L27.58 50.00L34.15 34.15L50.00 27.58L65.85 34.15Z" />
              <path d="M50.00 -12.30L62.30 0.00L50.00 12.30L37.70 0.00ZM0.00 37.70L12.30 50.00L0.00 62.30L-12.30 50.00ZM100.00 37.70L112.30 50.00L100.00 62.30L87.70 50.00ZM50.00 87.70L62.30 100.00L50.00 112.30L37.70 100.00Z" />
            </g>
          </g>
        </pattern>
        <pattern id="ham-shesh" width="50" height="50" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="var(--patBand)" strokeLinejoin="round">
            <g strokeWidth=".5" strokeOpacity=".3">
              <path d="M25.00 10.36L10.36 25.00L-10.36 25.00L-25.00 10.36L-25.00 -10.36L-10.36 -25.00L10.36 -25.00L25.00 -10.36ZM75.00 10.36L60.36 25.00L39.64 25.00L25.00 10.36L25.00 -10.36L39.64 -25.00L60.36 -25.00L75.00 -10.36ZM25.00 60.36L10.36 75.00L-10.36 75.00L-25.00 60.36L-25.00 39.64L-10.36 25.00L10.36 25.00L25.00 39.64ZM75.00 60.36L60.36 75.00L39.64 75.00L25.00 60.36L25.00 39.64L39.64 25.00L60.36 25.00L75.00 39.64ZM50.00 35.36L35.36 50.00L14.64 50.00L-0.00 35.36L-0.00 14.64L14.64 -0.00L35.36 -0.00L50.00 14.64Z" />
              <path d="M25.00 -14.64L39.64 0.00L25.00 14.64L10.36 0.00ZM0.00 10.36L14.64 25.00L0.00 39.64L-14.64 25.00ZM50.00 10.36L64.64 25.00L50.00 39.64L35.36 25.00ZM25.00 35.36L39.64 50.00L25.00 64.64L10.36 50.00Z" />
            </g>
            <g strokeWidth=".75" strokeOpacity=".72">
              <path d="M25.00 10.36L7.93 7.93L10.36 25.00L0.00 11.21L-10.36 25.00L-7.93 7.93L-25.00 10.36L-11.21 0.00L-25.00 -10.36L-7.93 -7.93L-10.36 -25.00L-0.00 -11.21L10.36 -25.00L7.93 -7.93L25.00 -10.36L11.21 -0.00ZM75.00 10.36L57.93 7.93L60.36 25.00L50.00 11.21L39.64 25.00L42.07 7.93L25.00 10.36L38.79 0.00L25.00 -10.36L42.07 -7.93L39.64 -25.00L50.00 -11.21L60.36 -25.00L57.93 -7.93L75.00 -10.36L61.21 -0.00ZM25.00 60.36L7.93 57.93L10.36 75.00L0.00 61.21L-10.36 75.00L-7.93 57.93L-25.00 60.36L-11.21 50.00L-25.00 39.64L-7.93 42.07L-10.36 25.00L-0.00 38.79L10.36 25.00L7.93 42.07L25.00 39.64L11.21 50.00ZM75.00 60.36L57.93 57.93L60.36 75.00L50.00 61.21L39.64 75.00L42.07 57.93L25.00 60.36L38.79 50.00L25.00 39.64L42.07 42.07L39.64 25.00L50.00 38.79L60.36 25.00L57.93 42.07L75.00 39.64L61.21 50.00ZM50.00 35.36L32.93 32.93L35.36 50.00L25.00 36.21L14.64 50.00L17.07 32.93L-0.00 35.36L13.79 25.00L-0.00 14.64L17.07 17.07L14.64 -0.00L25.00 13.79L35.36 -0.00L32.93 17.07L50.00 14.64L36.21 25.00Z" />
            </g>
          </g>
        </pattern>
        <pattern id="ham-tumar" width="48" height="16" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="var(--gold)" strokeWidth="1.1" strokeOpacity=".8">
            <path d="M0 8Q6 1 12 8T24 8T36 8T48 8" />
            <path d="M0 8Q6 15 12 8T24 8T36 8T48 8" />
            <path d="M12 4.6 15.4 8 12 11.4 8.6 8ZM36 4.6 39.4 8 36 11.4 32.6 8Z" />
            <path d="M0 4.6 3.4 8 0 11.4 -3.4 8ZM24 4.6 27.4 8 24 11.4 20.6 8ZM48 4.6 51.4 8 48 11.4 44.6 8Z" />
          </g>
        </pattern>
      </defs>
    </svg>
  );
}

export function PatternPlate({
  tiling = 'khatam',
  drift = false,
  opacity,
  rounded = false,
}: {
  /**
   * Which girih field to lay down.
   *
   * Not interchangeable: khatam is stroked in `--pat`, the page's own ink, and
   * disappears on anything dark; shesh is stroked in `--patBand`, the gold,
   * and is what the design lays over every band. Light ground takes khatam,
   * dark ground takes shesh.
   */
  tiling?: 'khatam' | 'shesh' | 'tumar';
  drift?: boolean;
  /** The plate sits at 0.62 by default; the header wants it far fainter. */
  opacity?: number;
  /** Follow the parent's corners — the header bar rounds as it detaches. */
  rounded?: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={drift ? 'plate ham-drift' : 'plate'}
      style={{
        ...(opacity === undefined ? {} : { opacity }),
        ...(rounded ? { borderRadius: 'inherit', overflow: 'hidden' } : {}),
      }}
    >
      <rect width="100%" height="100%" fill={`url(#ham-${tiling})`} />
    </svg>
  );
}

/** The former name, kept so the hero keeps working. */
export function PatternMotif() {
  return <PatternPlate />;
}

export function ViennaSkyline({
  tone = 'var(--color-ink)',
  opacity = 0.1,
}: {
  /** The line is drawn in the ink of whatever ground it sits on: the page's
      own on paper, gold on the band — where ink at a tenth is invisible. */
  tone?: string;
  opacity?: number;
} = {}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1200 120"
      preserveAspectRatio="xMidYMax slice"
      style={{
        position: 'absolute',
        insetInline: 0,
        insetBlockEnd: 0,
        inlineSize: '100%',
        blockSize: '7rem',
        opacity,
        color: tone,
        pointerEvents: 'none',
        zIndex: 0,
      }}
      role="presentation"
    >
      <g fill="currentColor">
        {/* Rathaus — the neo-Gothic tower with its flanking turrets. */}
        <path d="M60 120 V70 h12 V56 l8-14 8 14 v14 h12 V120 Z" />
        <rect x="44" y="84" width="14" height="36" />
        <rect x="94" y="84" width="14" height="36" />

        {/* Karlskirche — dome between the two relief columns. */}
        <path d="M250 120 V88 a26 26 0 0 1 52 0 v32 Z" />
        <rect x="222" y="62" width="10" height="58" />
        <rect x="320" y="62" width="10" height="58" />

        {/* Stephansdom — the south tower, the tallest thing on the line. */}
        <path d="M560 120 V54 l6-30 6 30 v66 Z" />
        <path d="M540 120 V72 h56 v48 Z" />
        <rect x="596" y="86" width="16" height="34" />

        {/* Riesenrad — the wheel in the Prater. */}
        <circle cx="810" cy="62" r="34" fill="none" stroke="currentColor" strokeWidth="3" />
        <path
          d="M810 28 v68 M776 62 h68 M786 38 l48 48 M834 38 l-48 48"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
        <path d="M790 90 L810 120 L830 90 Z" />

        {/* Donauturm. */}
        <path d="M1050 120 V44 h16 v76 Z" />
        <ellipse cx="1058" cy="40" rx="22" ry="9" />

        {/* The rooftops that carry the line between the landmarks. */}
        <path d="M0 120 v-18 h40 v18 Z M140 120 v-24 h70 v24 Z M350 120 v-20 h160 v20 Z M640 120 v-26 h120 v26 Z M860 120 v-22 h160 v22 Z M1090 120 v-20 h110 v20 Z" />
      </g>
    </svg>
  );
}

/**
 * A hairline ring hung off a corner.
 *
 * The design uses these to break the edge of a band — a 460px circle mostly
 * outside the section, drawn in --patBand so it reads as a pressed line rather
 * than a border. Decorative, and never in the way.
 */
export function Ring({
  size = 460,
  side = 'end',
  top = -160,
  tone = 'var(--patBand)',
}: {
  size?: number;
  side?: 'start' | 'end';
  top?: number;
  tone?: string;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        ...(side === 'end'
          ? { insetInlineEnd: `${-size * 0.3}px` }
          : { insetInlineStart: `${-size * 0.3}px` }),
        insetBlockStart: `${top}px`,
        inlineSize: `${size}px`,
        blockSize: `${size}px`,
        border: `var(--rule-hair) solid ${tone}`,
        borderRadius: '50%',
        pointerEvents: 'none',
      }}
    />
  );
}

/**
 * The house's mark.
 *
 * The design's masthead and boot screen both show a round photographic logo,
 * which the association has not supplied. Rather than leave a hole where the
 * mark belongs, this draws one from the same vocabulary as everything else on
 * the site: the khatam eight-point star — two squares at 45° to each other,
 * the figure the whole girih ground is built from — in gold on the band green,
 * inside a hairline ring.
 *
 * It is a stand-in, and it is meant to be replaced: swap this for an <img>
 * pointing at the association's own file and nothing else has to change.
 */
export function Mark({ className = 'brand-mark' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', inlineSize: '100%', blockSize: '100%', borderRadius: '50%' }}
    >
      <circle cx="50" cy="50" r="50" fill="var(--band)" />
      <g fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinejoin="round">
        <rect x="21" y="21" width="58" height="58" />
        <rect x="21" y="21" width="58" height="58" transform="rotate(45 50 50)" />
      </g>
      <circle cx="50" cy="50" r="15" fill="var(--gold)" fillOpacity="0.9" />
      <circle cx="50" cy="50" r="48.5" fill="none" stroke="var(--gold)" strokeOpacity="0.55" />
    </svg>
  );
}

/**
 * Vienna, as a line.
 *
 * The design closes the home page on a drawing of the city — Karlskirche's
 * dome, the Stephansdom spire, the Riesenrad — in a single gold stroke on the
 * sunk card. Not the same object as `ViennaSkyline`, which is a filled
 * silhouette used as a ground inside the hero frame: this one is the drawing
 * the eye is meant to rest on, so it is stroked, and the paths are the
 * design's own.
 */
export function ViennaLine() {
  return (
    <svg
      viewBox="0 0 640 120"
      aria-hidden="true"
      focusable="false"
      // Sized in CSS, not by attribute: `height="auto"` is not a length, so
      // the browser rejects it and logs an error on every page that draws it.
      style={{ display: 'block', position: 'relative', inlineSize: '100%', blockSize: 'auto' }}
    >
      <g
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M30 100V66h66v34z" />
        <path d="M56 66V30h14v36z" />
        <path d="M56 30l7-13 7 13z" />
        <path d="M63 17V9" />
        <path d="M40 100V84h8v16M78 100V84h8v16" strokeOpacity=".55" />
        <path d="M136 100V78h28v22z" />
        <path d="M134 78l16-13 16 13z" />
        <path d="M132 76a18 18 0 0 1 36 0" />
        <path d="M147 58h6v-6h-6z" />
        <path d="M150 52V42M146 46h8" />
        <path d="M114 100V64h6v36zM113 64h8M180 100V64h6v36zM179 64h8" />
        <path d="M206 100V74h32v26z" />
        <circle cx="222" cy="62" r="12" />
        <path d="M210 62h24M222 50v24" strokeOpacity=".5" />
        <path d="M284 100V62h50v38z" />
        <path d="M284 62l25-13 25 13" />
        <path d="M262 100V56h16v44z" />
        <path d="M262 56l8-48 8 48z" />
        <path d="M270 8V1" />
        <path d="M318 62V44h10v18z" />
        <path d="M318 44l5-9 5 9z" />
        <path d="M352 100V76h68v24z" />
        <path d="M366 76a20 20 0 0 1 40 0" />
        <path d="M382 56h8v-6h-8z" />
        <path d="M386 50V40" />
        <path d="M362 100V86h10v14M400 100V86h10v14" strokeOpacity=".55" />
        <circle cx="520" cy="62" r="38" />
        <circle cx="520" cy="62" r="30" strokeOpacity=".5" />
        <path d="M520 24v76M482 62h76M493 35l54 54M547 35l-54 54" strokeOpacity=".65" />
        <path d="M502 100l16-38M538 100l-16-38" />
        <path d="M0 100h640" strokeWidth="1.4" />
        <path d="M0 106h640" strokeWidth=".8" strokeOpacity=".4" />
      </g>
      <circle cx="520" cy="62" r="4" fill="var(--gold)" />
    </svg>
  );
}
