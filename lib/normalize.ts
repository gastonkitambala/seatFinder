/**
 * Text normalisation shared by the guest search and the spreadsheet importer.
 *
 * Guests type their own name into a phone at a wedding: with the wrong case, with
 * stray spaces, and almost never with the accents that are on the seating chart.
 * Everything below exists so that "  DEBORAH " still finds "Deborah" with an accent.
 */

/** Combining diacritical marks, left over after an NFD decomposition. */
const COMBINING_MARKS = /[̀-ͯ]/g;

/** Whitespace, hyphens, and both flavours of apostrophe. */
const TOKEN_SEPARATORS = /[\s\-'’]+/;

/** Lowercase, strip accents, trim, and collapse runs of whitespace to one space. */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Split a name into searchable tokens.
 *
 * Hyphens and apostrophes break into separate tokens so that "Marie-Claire" is
 * reachable by typing either "marie" or "claire", and "O'Brien" by "brien".
 */
export function tokenize(value: string): string[] {
  return normalize(value).split(TOKEN_SEPARATORS).filter(Boolean);
}
