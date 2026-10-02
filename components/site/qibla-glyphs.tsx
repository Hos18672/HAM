/**
 * Marks the qibla maps share.
 *
 * Its own file because the globe that used to hold it is gone: the page now
 * shows the street map and, where the tiles cannot be had, the drawn one,
 * and both put the same Kaaba on the same line.
 */

/** The Kaaba, drawn around (0, 0) at about 30 units across. */
export function KaabaGlyph() {
  const gold = 'var(--gold)';
  return (
    <g strokeLinejoin="round">
      <path d="M-13 -9 L-5 -15 L15 -15 L7 -9 Z" fill="#2b2b2b" />
      <path d="M7 -9 L15 -15 L15 8 L7 14 Z" fill="#0d0d0d" />
      <rect x="-13" y="-9" width="20" height="23" fill="#1a1a1a" />
      <rect x="-13" y="-4.5" width="20" height="3.2" fill={gold} />
      <rect x="-1" y="3.5" width="5" height="8.5" rx="0.6" fill={gold} />
      <path
        d="M-13 -9 L-5 -15 L15 -15 L15 8 L7 14 L-13 14 Z M7 -9 L7 14 M-13 -9 L7 -9"
        fill="none"
        stroke={gold}
        strokeWidth="1.4"
      />
    </g>
  );
}
