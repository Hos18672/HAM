/**
 * One line of a du'a: the Arabic, and what it says in each of the site's two
 * languages.
 *
 * A tuple rather than an object because there are some seven hundred of them
 * and a line of source per line of prayer is the only way these files stay
 * readable — and correctable. The Arabic is `null` where the line is a
 * rubric: "then say a hundred times", which is an instruction for the reader
 * and not part of what is recited.
 */
export type Line = readonly [arabic: string | null, persian: string, german: string];

export interface DuaText {
  lines: Line[];
  /** Which note under `SOURCES` says where this text came from. */
  origin: 'mafatih' | 'ziyarat' | 'house';
}
