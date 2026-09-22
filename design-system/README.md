# The design source

This folder is the design the site must match. It is vendored here so it can
never again be something that exists only in a chat attachment.

## Where it came from

Extracted from `Haus aller Menschen.dc.html`, the Claude Design prototype
(design-system project `051a4ac7-8d07-4d2c-a9b1-0bae9cc426bb`, "Broadsheet").
The file ships as a bundler-packed page: the real document is a
JSON-escaped string in a `<script type="__bundler/template">` block, with four
inlined stylesheets. Unpacked, those are:

| file             | what it is                                                           |
| ---------------- | -------------------------------------------------------------------- |
| `broadsheet.css` | the design system itself — tokens, print treatments, plate numerals  |
| `site.css`       | this site's own layer — palette, components, the whole motion system |
| `prototype.html` | the markup of all nine prototype pages, styles replaced by pointers  |

Two stylesheets from the original are deliberately not vendored: the web-font
`@font-face` blocks (the fonts are installed from npm and self-hosted under
`public/fonts`) and the 231 KB Phosphor Duotone icon-font sheet (the icons come
from `@phosphor-icons/react`).

## Which file wins

`site.css` does, for anything it defines. `broadsheet.css` is the underlying
system — a cyan/magenta press-ink palette — and `site.css` overrides its
palette wholesale for this association: deep green, gold, and a cream paper
ground. Where the two disagree, the site layer is the design.

`broadsheet.css` still matters on its own for the print treatments the site
layer does not redefine: `.halftone`, the `.cmyk` four-colour separation, and
the misregistered `.cmyk-num` plate numerals.

## Reading it

Both stylesheets are minified-ish source as authored — dense, but with the
original comments intact, and those comments carry the reasoning (why three
plates and not four, why the plate offsets are em-scaled, why the press driver
animates the SVG defs rather than the CSS filter). Worth reading before
changing anything in that area.

## Rule

Nothing in `app/globals.css` may hardcode a value that exists here as a token.
A literal colour, radius, duration or easing in the app is a bug, not a
shortcut — copy the token instead.
