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

/** The category a du'a is filed under on the index and in the reader. */
export type DuaCategory = 'dua' | 'ziyara' | 'taqib';

/**
 * Everything the page shows of one du'a, in one object.
 *
 * The reader turns to the next du'a by fetching this rather than by
 * navigating, so it has to carry the heading band as well as the words: a
 * reader left looking at the previous du'a's title over this one's lines
 * would be worse than the navigation it replaces.
 */
export interface DuaPayload {
  slug: string;
  category: DuaCategory;
  arabicTitle: string;
  title: string;
  summary: string;
  whenToRead: string;
  source: string;
  origin: DuaText['origin'];
  lines: Line[];
}

/** Just enough of a du'a to list it in the reader's picker. */
export interface DuaStub {
  slug: string;
  category: DuaCategory;
  title: string;
  arabicTitle: string;
}
