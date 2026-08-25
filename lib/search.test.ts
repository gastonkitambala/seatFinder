import { describe, it, expect } from 'vitest';
import { searchGuests, type SearchableGuest } from './search';

const guests: SearchableGuest[] = [
  { id: 1, firstName: 'John', lastName: 'Smith', tableLabel: '12' },
  { id: 2, firstName: 'John', lastName: 'Doe', tableLabel: '4' },
  { id: 3, firstName: 'Johnny', lastName: 'Williams', tableLabel: '7' },
  { id: 4, firstName: 'Déborah', lastName: 'Mensah', tableLabel: '1' },
  { id: 5, firstName: 'Sarah', lastName: 'Johnson', tableLabel: '8' },
  { id: 6, firstName: 'Amara', lastName: 'Okonkwo', tableLabel: 'Head Table' },
  { id: 7, firstName: 'Marie-Claire', lastName: 'Dubois', tableLabel: '15' },
];

const names = (q: string) => searchGuests(guests, q).map((g) => `${g.firstName} ${g.lastName}`);

describe('searchGuests', () => {
  it('returns nothing for an empty query', () => {
    expect(searchGuests(guests, '')).toEqual([]);
    expect(searchGuests(guests, '   ')).toEqual([]);
  });

  it('matches a first-name prefix', () => {
    expect(names('jo')).toEqual(
      expect.arrayContaining(['John Smith', 'John Doe', 'Johnny Williams'])
    );
  });

  it('matches on last name alone', () => {
    expect(names('smith')).toEqual(['John Smith']);
  });

  it('is case-insensitive', () => {
    expect(names('SMITH')).toEqual(['John Smith']);
  });

  it('ignores leading, trailing, and repeated inner spaces', () => {
    expect(names('  JOHN   SMITH ')).toEqual(['John Smith']);
  });

  it('matches accented names typed without accents', () => {
    expect(names('deborah')).toEqual(['Déborah Mensah']);
  });

  it('matches multiple partial tokens across first and last name', () => {
    expect(names('jo sm')).toEqual(['John Smith']);
  });

  it('matches a hyphenated first name by either part', () => {
    expect(names('claire')).toEqual(['Marie-Claire Dubois']);
  });

  it('finds a guest whose surname merely contains the query as a prefix', () => {
    expect(names('johns')).toEqual(['Sarah Johnson']);
  });

  it('ranks an exact full-name match first', () => {
    const result = names('john doe');
    expect(result[0]).toBe('John Doe');
  });

  it('ranks first-name prefix matches above surname matches', () => {
    const result = names('john');
    expect(result.indexOf('John Smith')).toBeLessThan(result.indexOf('Sarah Johnson'));
  });

  it('sorts equally-ranked guests alphabetically', () => {
    expect(names('john').slice(0, 3)).toEqual(['John Doe', 'John Smith', 'Johnny Williams']);
  });

  it('returns an empty array when nothing matches', () => {
    expect(names('zzzz')).toEqual([]);
  });

  it('caps results at the requested limit', () => {
    expect(searchGuests(guests, 'jo')).toHaveLength(4);
    expect(searchGuests(guests, 'jo', 2)).toHaveLength(2);
  });

  it('handles a guest with no last name', () => {
    const single: SearchableGuest[] = [{ id: 9, firstName: 'Prince', lastName: '', tableLabel: '3' }];
    expect(searchGuests(single, 'prince')).toHaveLength(1);
  });
});
