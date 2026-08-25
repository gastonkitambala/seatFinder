import { normalize, tokenize } from './normalize';

export type SearchableGuest = {
  id: number;
  firstName: string;
  lastName: string;
  tableLabel: string;
};

/** Ranking tiers. Lower sorts first. */
const RANK_EXACT_FULL = 0;
const RANK_FIRST_PREFIX = 1;
const RANK_LAST_PREFIX = 2;
const RANK_SUBSTRING = 3;
const NO_MATCH = -1;

/**
 * Score one guest against a normalised query.
 * Returns a ranking tier, or NO_MATCH if the guest should not be shown.
 */
function scoreGuest(guest: SearchableGuest, query: string, queryTokens: string[]): number {
  const first = normalize(guest.firstName);
  const last = normalize(guest.lastName);
  const full = `${first} ${last}`.trim();
  const nameTokens = [...tokenize(guest.firstName), ...tokenize(guest.lastName)];

  if (full === query) return RANK_EXACT_FULL;

  // Every token the guest typed must be the start of some token in their name.
  // This is what lets "jo sm" reach "John Smith" while "zz" reaches nobody.
  const allTokensPrefix = queryTokens.every((qt) =>
    nameTokens.some((nt) => nt.startsWith(qt))
  );

  if (allTokensPrefix) {
    if (tokenize(guest.firstName).some((t) => t.startsWith(queryTokens[0]))) {
      return RANK_FIRST_PREFIX;
    }
    return RANK_LAST_PREFIX;
  }

  // Fallback: the raw query appears somewhere inside the full name. Catches
  // mid-word typing such as "mens" -> "Mensah" already covered above, plus
  // queries that span the space between first and last name.
  if (query.length >= 2 && full.includes(query)) return RANK_SUBSTRING;

  return NO_MATCH;
}

/**
 * Find guests matching a free-text query, best matches first.
 *
 * Runs entirely client-side over the full guest list so results appear as fast
 * as the guest can type, with no network round-trip at the venue.
 */
export function searchGuests(
  guests: SearchableGuest[],
  rawQuery: string,
  limit = 8
): SearchableGuest[] {
  const query = normalize(rawQuery);
  if (!query) return [];

  const queryTokens = tokenize(rawQuery);
  if (queryTokens.length === 0) return [];

  const scored: Array<{ guest: SearchableGuest; rank: number; sortKey: string }> = [];

  for (const guest of guests) {
    const rank = scoreGuest(guest, query, queryTokens);
    if (rank === NO_MATCH) continue;
    scored.push({
      guest,
      rank,
      sortKey: normalize(`${guest.firstName} ${guest.lastName}`),
    });
  }

  scored.sort((a, b) => a.rank - b.rank || a.sortKey.localeCompare(b.sortKey));

  return scored.slice(0, limit).map((s) => s.guest);
}

/** How many guests matched in total, used to decide whether to show "keep typing". */
export function countMatches(guests: SearchableGuest[], rawQuery: string): number {
  return searchGuests(guests, rawQuery, Number.MAX_SAFE_INTEGER).length;
}
