/**
 * Decorative marks for the hero. Both are pure SVG, drawn from the design
 * tokens, and both are `aria-hidden` — they carry no information a reader
 * needs, so a screen reader should walk straight past them.
 */

/**
 * The association's pattern motif: an eight-point girih star on a repeating
 * grid, the geometry that runs through Persian tilework. Rendered at low
 * opacity as a ground behind the hero.
 */
export function PatternMotif() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{
        position: 'absolute',
        insetBlockStart: 0,
        insetInlineEnd: 0,
        inlineSize: 'min(38rem, 70%)',
        blockSize: 'auto',
        opacity: 0.07,
        color: 'var(--color-accent)',
        pointerEvents: 'none',
        zIndex: 0,
      }}
      viewBox="0 0 400 400"
      role="presentation"
    >
      <defs>
        <pattern id="ham-girih" width="80" height="80" patternUnits="userSpaceOnUse">
          {/* Two squares at 45° to each other make the eight-point star. */}
          <rect
            x="16"
            y="16"
            width="48"
            height="48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <rect
            x="16"
            y="16"
            width="48"
            height="48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            transform="rotate(45 40 40)"
          />
          <circle cx="40" cy="40" r="4" fill="currentColor" />
          {/* The connecting strapwork between neighbouring stars. */}
          <path
            d="M40 0 L40 16 M40 64 L40 80 M0 40 L16 40 M64 40 L80 40"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="400" height="400" fill="url(#ham-girih)" />
    </svg>
  );
}

/**
 * A Vienna skyline silhouette along the foot of the hero: Stephansdom,
 * Karlskirche's twin columns, the Riesenrad, the Rathaus tower and the
 * Donauturm, left to right.
 */
export function ViennaSkyline() {
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
        opacity: 0.1,
        color: 'var(--color-ink)',
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
