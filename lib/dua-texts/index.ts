import type { DuaCategory, DuaPayload, DuaStub, DuaText, Line } from './types';
import { KUMAIL } from './kumail';
import { TAWASSUL } from './tawassul';
import { NUDBA } from './nudba';
import { AHD } from './ahd';
import { FARAJ } from './faraj';
import { JAWSHAN_KABIR } from './jawshan-kabir';
import { SAMAT } from './samat';
import { ZIYARAT_ASHURA } from './ziyarat-ashura';
import { ZIYARAT_ARBAIN } from './ziyarat-arbain';
import { ZIYARAT_WARITH } from './ziyarat-warith';
import { ZIYARAT_AL_YASIN } from './ziyarat-al-yasin';
import { ZIYARAT_JAMIA_KABIRA } from './ziyarat-jamia-kabira';
import { TASBIH_AL_ZAHRA } from './tasbih-al-zahra';

export type { Line, DuaText, DuaCategory, DuaPayload, DuaStub };

/**
 * The full texts, by the slug the database knows each du'a as.
 *
 * These live in the code and not in the database, as the Quran does and
 * unlike everything the editors keep: they are scripture, not editorial
 * content. Nobody at the house is going to reword Du'a Kumail from the
 * admin screen, and the one thing that might need correcting — the German —
 * is better corrected in a reviewed diff than in a text box.
 *
 * Each file is one line of source per line of prayer, so a correction is a
 * one-line change in a file named after the du'a.
 *
 * A du'a with no text here still has its card on the page; only the link to
 * read it is missing.
 */
const TEXTS: Record<string, DuaText> = {
  kumail: { lines: KUMAIL, origin: 'mafatih' },
  tawassul: { lines: TAWASSUL, origin: 'mafatih' },
  nudba: { lines: NUDBA, origin: 'mafatih' },
  ahd: { lines: AHD, origin: 'mafatih' },
  faraj: { lines: FARAJ, origin: 'mafatih' },
  'jawshan-kabir': { lines: JAWSHAN_KABIR, origin: 'mafatih' },
  samat: { lines: SAMAT, origin: 'mafatih' },
  'ziyarat-ashura': { lines: ZIYARAT_ASHURA, origin: 'mafatih' },
  'ziyarat-arbain': { lines: ZIYARAT_ARBAIN, origin: 'mafatih' },
  'ziyarat-warith': { lines: ZIYARAT_WARITH, origin: 'ziyarat' },
  'ziyarat-al-yasin': { lines: ZIYARAT_AL_YASIN, origin: 'ziyarat' },
  'ziyarat-jamia-kabira': { lines: ZIYARAT_JAMIA_KABIRA, origin: 'ziyarat' },
  'tasbih-al-zahra': { lines: TASBIH_AL_ZAHRA, origin: 'house' },
};

/** Every du'a that can be read in full, in the order the page lists them. */
export const DUA_TEXT_SLUGS = Object.keys(TEXTS);

export function duaText(slug: string): DuaText | null {
  return TEXTS[slug] ?? null;
}

/** Whether a line is a rubric — an instruction, not words to say. */
export const isRubric = (line: Line): boolean => line[0] === null;
