/**
 * The SVG filter definitions behind `.cmyk` and `.halftone`.
 *
 * Mounted once in the root layout: filters are referenced by id, so one copy
 * in the document serves every image on the page. The element is hidden but
 * must stay in the layout tree — `display: none` would stop the filters
 * resolving in some engines.
 */
export function PrintPlates() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        {/*
          Four-plate process separation. The colour matrix pushes the image
          towards the two spot inks, then a slight blur-and-offset on the
          duplicated layers reads as misregistration on press.
        */}
        <filter id="bs-plate-cmyk" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.95 0.05 0    0 0
                    0.02 0.92 0.06 0 0
                    0    0.08 0.94 0 0
                    0    0    0    1 0"
            result="plates"
          />
          {/* Cyan plate, offset up-left. */}
          <feOffset in="plates" dx="-1.1" dy="-1.1" result="cyanShift" />
          <feColorMatrix
            in="cyanShift"
            type="matrix"
            values="0 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 0.34 0"
            result="cyan"
          />
          {/* Magenta plate, offset down-right. */}
          <feOffset in="plates" dx="1.1" dy="1.1" result="magentaShift" />
          <feColorMatrix
            in="magentaShift"
            type="matrix"
            values="1 0 0 0 0
                    0 0 0 0 0
                    0 0 1 0 0
                    0 0 0 0.3 0"
            result="magenta"
          />
          <feMerge>
            <feMergeNode in="plates" />
            <feMergeNode in="cyan" />
            <feMergeNode in="magenta" />
          </feMerge>
          {/* A trace of paper grain over the whole thing. */}
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" result="grain" />
          <feComposite in="grain" in2="SourceAlpha" operator="in" result="grainMasked" />
          <feBlend in2="grainMasked" mode="multiply" />
        </filter>

        {/*
          The simpler newsprint dot screen for interface imagery: posterise to a
          few tones, then break the edges with fine noise so it reads as a
          halftone rather than a flat threshold.
        */}
        <filter id="bs-plate-halftone" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.33 0.33 0.33 0 0
                    0.33 0.33 0.33 0 0
                    0.33 0.33 0.33 0 0
                    0    0    0    1 0"
            result="grey"
          />
          <feComponentTransfer in="grey" result="posterised">
            <feFuncR type="discrete" tableValues="0 0.25 0.5 0.75 1" />
            <feFuncG type="discrete" tableValues="0 0.25 0.5 0.75 1" />
            <feFuncB type="discrete" tableValues="0 0.25 0.5 0.75 1" />
          </feComponentTransfer>
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" result="screen" />
          <feDisplacementMap
            in="posterised"
            in2="screen"
            scale="1.6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
