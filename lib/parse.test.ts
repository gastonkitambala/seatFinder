import { describe, it, expect } from 'vitest';
import { matchHeaders, parseCsv, rowsFromMatrix } from './parse';

describe('matchHeaders', () => {
  it('matches the documented headers', () => {
    expect(matchHeaders(['First Name', 'Last Name', 'Table'])).toEqual({
      ok: true, first: 0, last: 1, table: 2,
    });
  });

  it('ignores case, spaces, and underscores', () => {
    expect(matchHeaders(['  FIRSTNAME ', 'last_name', 'TABLE  NUMBER'])).toEqual({
      ok: true, first: 0, last: 1, table: 2,
    });
  });

  it('accepts common alternative spellings', () => {
    expect(matchHeaders(['Given Name', 'Surname', 'Table #'])).toEqual({
      ok: true, first: 0, last: 1, table: 2,
    });
    expect(matchHeaders(['Prénom', 'Nom', 'Table'])).toEqual({
      ok: true, first: 0, last: 1, table: 2,
    });
  });

  it('accepts columns in any order', () => {
    expect(matchHeaders(['Table', 'Last Name', 'First Name'])).toEqual({
      ok: true, first: 2, last: 1, table: 0,
    });
  });

  it('tolerates extra unrelated columns', () => {
    const r = matchHeaders(['Email', 'First Name', 'Notes', 'Last Name', 'Table']);
    expect(r).toEqual({ ok: true, first: 1, last: 3, table: 4 });
  });

  it('treats the last-name column as optional', () => {
    expect(matchHeaders(['Name', 'Table'])).toEqual({ ok: true, first: 0, last: -1, table: 1 });
  });

  it('reports which required column is missing and what it saw instead', () => {
    const r = matchHeaders(['Name', 'Seat']);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.missing).toEqual(['Table']);
      expect(r.seen).toEqual(['Name', 'Seat']);
    }
  });
});

describe('rowsFromMatrix', () => {
  const head = ['First Name', 'Last Name', 'Table'];

  it('reads valid rows', () => {
    const r = rowsFromMatrix([head, ['John', 'Smith', '12'], ['Sarah', 'Johnson', '8']]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rows).toEqual([
      { firstName: 'John', lastName: 'Smith', tableLabel: '12' },
      { firstName: 'Sarah', lastName: 'Johnson', tableLabel: '8' },
    ]);
    expect(r.errors).toEqual([]);
  });

  it('trims surrounding whitespace from every cell', () => {
    const r = rowsFromMatrix([head, ['  John ', ' Smith', ' 12 ']]);
    if (!r.ok) throw new Error('expected ok');
    expect(r.rows[0]).toEqual({ firstName: 'John', lastName: 'Smith', tableLabel: '12' });
  });

  it('keeps non-numeric table labels verbatim', () => {
    const r = rowsFromMatrix([head, ['Amara', 'Okonkwo', 'Head Table']]);
    if (!r.ok) throw new Error('expected ok');
    expect(r.rows[0].tableLabel).toBe('Head Table');
  });

  it('skips a row with no first name and reports the spreadsheet row number', () => {
    const r = rowsFromMatrix([head, ['John', 'Smith', '12'], ['', 'Nameless', '4']]);
    if (!r.ok) throw new Error('expected ok');
    expect(r.rows).toHaveLength(1);
    expect(r.errors).toEqual([{ row: 3, reason: 'Missing a first name' }]);
  });

  it('skips a row with no table and says so', () => {
    const r = rowsFromMatrix([head, ['John', 'Smith', '']]);
    if (!r.ok) throw new Error('expected ok');
    expect(r.rows).toHaveLength(0);
    expect(r.errors).toEqual([{ row: 2, reason: 'Missing a table' }]);
  });

  it('silently ignores fully blank rows', () => {
    const r = rowsFromMatrix([head, ['John', 'Smith', '12'], ['', '', ''], ['  ', '', '']]);
    if (!r.ok) throw new Error('expected ok');
    expect(r.rows).toHaveLength(1);
    expect(r.errors).toEqual([]);
  });

  it('splits a single Name column into first and last', () => {
    const r = rowsFromMatrix([['Name', 'Table'], ['Amara Okonkwo', '3']]);
    if (!r.ok) throw new Error('expected ok');
    expect(r.rows[0]).toEqual({ firstName: 'Amara', lastName: 'Okonkwo', tableLabel: '3' });
  });

  it('allows a guest with only a first name', () => {
    const r = rowsFromMatrix([head, ['Prince', '', '3']]);
    if (!r.ok) throw new Error('expected ok');
    expect(r.rows[0]).toEqual({ firstName: 'Prince', lastName: '', tableLabel: '3' });
  });

  it('rejects a file with no rows at all', () => {
    const r = rowsFromMatrix([]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/empty/i);
  });

  it('rejects a file whose header row is unusable', () => {
    const r = rowsFromMatrix([['Name', 'Seat'], ['John Smith', '12']]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('Table');
  });

  it('rejects a header-only file', () => {
    const r = rowsFromMatrix([head]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no guest rows/i);
  });
});

describe('parseCsv', () => {
  it('parses a well-formed CSV', () => {
    const r = parseCsv('First Name,Last Name,Table\nJohn,Smith,12\nSarah,Johnson,8\n');
    if (!r.ok) throw new Error('expected ok');
    expect(r.rows).toHaveLength(2);
    expect(r.rows[1].tableLabel).toBe('8');
  });

  it('handles quoted fields containing commas', () => {
    const r = parseCsv('First Name,Last Name,Table\n"Amara","Okonkwo, Jr.",3\n');
    if (!r.ok) throw new Error('expected ok');
    expect(r.rows[0].lastName).toBe('Okonkwo, Jr.');
  });

  it('handles CRLF line endings from Excel exports', () => {
    const r = parseCsv('First Name,Last Name,Table\r\nJohn,Smith,12\r\n');
    if (!r.ok) throw new Error('expected ok');
    expect(r.rows).toHaveLength(1);
  });

  it('strips a UTF-8 byte order mark before matching headers', () => {
    const r = parseCsv('﻿First Name,Last Name,Table\nJohn,Smith,12\n');
    expect(r.ok).toBe(true);
  });

  it('rejects an empty file', () => {
    const r = parseCsv('');
    expect(r.ok).toBe(false);
  });
});
