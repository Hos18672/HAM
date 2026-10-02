/**
 * The tajweed edition's markup, read into runs of text.
 *
 * Its own module rather than part of `lib/quran.ts`, which is server-only:
 * the segments it produces are rendered in the browser, and the parsing is
 * worth testing on its own.
 */

/**
 * Letters that are written but not pronounced, as the API's tajweed edition
 * marks them:
 *   wasl  hamzat al-wasl — the connecting alif, silent when read on from
 *         the word before
 *   lam   the lam of the article before a "sun" letter, which is assimilated
 *   silent any other letter that is written and not sounded
 * Every other tajweed mark (the lengthenings, the nasalisations …) is dropped
 * and its text kept as it is.
 */
export type SilentKind = 'wasl' | 'lam' | 'silent';
const SILENT: Record<string, SilentKind> = { h: 'wasl', l: 'lam', s: 'silent' };

export interface Segment {
  text: string;
  silent?: SilentKind;
}

/**
 * `ذ[n[َٲ]لِكَ [h:11[ٱ]لْكِتَ…` → plain runs and marked runs.
 *
 * The edition writes a rule as `[` code `[` text `]`, where the code is a
 * letter or two and may carry `:` and a number. Not every rule is written
 * that way, though: some carry no text and stand as `[g]` on their own, some
 * close with a second bracket, and some sit inside another. A regular
 * expression for one shape leaves the others on the page as Latin letters in
 * the middle of the Arabic — which is what `[g]` was, printed mid-verse.
 *
 * So this reads the string rather than matching it: `[` + a code opens a
 * rule, `]` closes the innermost open one, and anything else is text at
 * whatever rule is currently open. Unknown codes keep their text and lose
 * their marking, which is what every rule but the three silent ones does
 * anyway.
 */
export function parseTajweed(source: string): Segment[] {
  const segments: Segment[] = [];
  const open: (SilentKind | undefined)[] = [];
  const push = (text: string) => {
    if (!text) return;
    // The innermost rule wins: a silent letter inside a lengthening is still
    // silent.
    let silent: SilentKind | undefined;
    for (let i = open.length - 1; i >= 0; i -= 1)
      if (open[i] !== undefined) {
        silent = open[i];
        break;
      }
    const last = segments[segments.length - 1];
    if (last && last.silent === silent) last.text += text;
    else segments.push(silent ? { text, silent } : { text });
  };

  const text = source.replace(/^\uFEFF/, '');
  // `[` code, optionally `:` number, optionally the bracket that opens the
  // text. Without that bracket the rule carries no text and ends at its `]`.
  const opening = /^\[([a-z]+)(?::\d+)?(\[)?/;
  let at = 0;
  let plain = '';
  while (at < text.length) {
    const here = text[at]!;
    if (here === '[') {
      const tag = opening.exec(text.slice(at));
      if (tag) {
        push(plain);
        plain = '';
        at += tag[0].length;
        if (tag[2]) open.push(SILENT[tag[1]!]);
        // A rule with no text of its own: swallow the `]` that ends it.
        else if (text[at] === ']') at += 1;
        continue;
      }
    } else if (here === ']' && open.length) {
      push(plain);
      plain = '';
      open.pop();
      at += 1;
      continue;
    }
    plain += here;
    at += 1;
  }
  push(plain);

  // Nothing in the Quran's text is written in Latin letters, figures or
  // brackets, so anything of that kind still here is markup this reader did
  // not recognise, and a reader must never be shown it. The space between
  // words is the one piece of ASCII the text does use, and it stays.
  for (const segment of segments) segment.text = segment.text.replace(/[A-Za-z0-9[\]:]/g, '');
  return segments.filter((segment) => segment.text);
}
