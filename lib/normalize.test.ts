import { describe, it, expect } from 'vitest';
import { normalize, tokenize } from './normalize';

describe('normalize', () => {
  it('lowercases', () => {
    expect(normalize('JOHN')).toBe('john');
  });

  it('trims and collapses internal whitespace', () => {
    expect(normalize('  John   Smith ')).toBe('john smith');
  });

  it('strips diacritics so Deborah finds Deborah', () => {
    expect(normalize('Déborah')).toBe('deborah');
    expect(normalize('José')).toBe('jose');
    expect(normalize('Zoë')).toBe('zoe');
    expect(normalize('Renée-Claire')).toBe('renee-claire');
  });

  it('handles empty and whitespace-only input', () => {
    expect(normalize('')).toBe('');
    expect(normalize('   ')).toBe('');
  });
});

describe('tokenize', () => {
  it('splits on whitespace', () => {
    expect(tokenize('John Smith')).toEqual(['john', 'smith']);
  });

  it('splits hyphenated names into separate tokens', () => {
    expect(tokenize('Marie-Claire Dubois')).toEqual(['marie', 'claire', 'dubois']);
  });

  it('returns an empty array for blank input', () => {
    expect(tokenize('   ')).toEqual([]);
  });
});
