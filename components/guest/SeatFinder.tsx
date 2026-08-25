'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react/dist/ssr';
import { searchGuests, countMatches, type SearchableGuest } from '@/lib/search';
import { normalize, tokenize } from '@/lib/normalize';
import ResultCard from './ResultCard';
import Flourish from './Flourish';

const MAX_RESULTS = 8;

type SeatFinderProps = {
  guests: SearchableGuest[];
  closingMessage: string;
  /**
   * The photo and welcome message, rendered on the server and passed down so
   * this component can retire them once a guest has their answer.
   */
  hero: React.ReactNode;
};

/**
 * Normalise one character at a time so the result stays index-aligned with the
 * original string. That alignment is what lets us highlight the matched prefix
 * of "Déborah" without the accent shifting the offsets.
 */
function normalizeAligned(value: string): string {
  return Array.from(value)
    .map((char) => normalize(char) || char.toLowerCase())
    .join('');
}

type Segment = { text: string; matched: boolean };

/** Split a name into matched and unmatched runs for emphasis in the list. */
function segmentName(name: string, queryTokens: string[]): Segment[] {
  if (queryTokens.length === 0) return [{ text: name, matched: false }];

  const segments: Segment[] = [];
  // Keep the separators so the name renders back exactly as it was typed.
  const parts = name.split(/([\s\-'’]+)/);

  for (const part of parts) {
    if (part === '' ) continue;

    if (/^[\s\-'’]+$/.test(part)) {
      segments.push({ text: part, matched: false });
      continue;
    }

    const aligned = normalizeAligned(part);
    const hit = queryTokens
      .filter((token) => aligned.startsWith(token))
      .sort((a, b) => b.length - a.length)[0];

    if (hit) {
      segments.push({ text: part.slice(0, hit.length), matched: true });
      const rest = part.slice(hit.length);
      if (rest) segments.push({ text: rest, matched: false });
    } else {
      segments.push({ text: part, matched: false });
    }
  }

  return segments;
}

export default function SeatFinder({ guests, closingMessage, hero }: SeatFinderProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SearchableGuest | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [touched, setTouched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const inputId = useId();

  const queryTokens = useMemo(() => tokenize(query), [query]);

  const results = useMemo(
    () => (query.trim() ? searchGuests(guests, query, MAX_RESULTS) : []),
    [guests, query]
  );

  const totalMatches = useMemo(
    () => (query.trim() ? countMatches(guests, query) : 0),
    [guests, query]
  );

  const hasQuery = query.trim().length > 0;
  const showNoMatch = hasQuery && touched && results.length === 0;
  const isOpen = hasQuery && results.length > 0 && !selected;

  // Reset the keyboard cursor whenever the visible result set changes.
  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  /**
   * Restore a result from ?g=<id> so a guest can reopen their own table from a
   * bookmark or a message they forwarded, without searching again.
   */
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get('g'));
    if (!Number.isFinite(id) || id <= 0) return;
    const match = guests.find((g) => g.id === id);
    if (match) setSelected(match);
  }, [guests]);

  const choose = useCallback((guest: SearchableGuest) => {
    setSelected(guest);
    setActiveIndex(-1);
    // Deep link without a navigation, so Back returns to the search.
    const url = new URL(window.location.href);
    url.searchParams.set('g', String(guest.id));
    window.history.replaceState(null, '', url);
    inputRef.current?.blur();
    // The hero collapses away beneath us; return to the top so the table
    // number is the first and only thing on screen.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const reset = useCallback(() => {
    setSelected(null);
    setQuery('');
    setTouched(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('g');
    window.history.replaceState(null, '', url);
    // Give the search field back to the guest without forcing the keyboard open.
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (query) {
        setQuery('');
        setTouched(false);
      } else {
        inputRef.current?.blur();
      }
      return;
    }

    if (!isOpen) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      // With no explicit cursor, Enter takes the single obvious answer.
      const target = activeIndex >= 0 ? results[activeIndex] : results.length === 1 ? results[0] : null;
      if (target) choose(target);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(results.length - 1);
    }
  }

  if (selected) {
    return (
      <div className="mt-6">
        <ResultCard guest={selected} closingMessage={closingMessage} onReset={reset} />
      </div>
    );
  }

  return (
    <>
      {hero}

      <section className="mt-6 animate-rise" style={{ animationDelay: '160ms' }}>
      <label htmlFor={inputId} className="sr-only">
        Search for your name to find your table
      </label>

      <div className="relative">
        <MagnifyingGlass
          size={22}
          weight="regular"
          aria-hidden="true"
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-lilac-500"
        />

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setTouched(true);
          }}
          onKeyDown={onKeyDown}
          placeholder="Find your seat"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 && results[activeIndex]
              ? `${listboxId}-option-${results[activeIndex].id}`
              : undefined
          }
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="search"
          className="field h-[60px] rounded-full pl-[54px] pr-[52px] text-[17px] shadow-soft"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setTouched(false);
              inputRef.current?.focus();
            }}
            aria-label="Clear the search"
            className="press absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer
                       items-center justify-center rounded-full text-muted hover:bg-lilac-50 hover:text-ink"
          >
            <X size={18} weight="regular" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Announced to screen readers without stealing focus from the input. */}
      <p className="sr-only" aria-live="polite">
        {hasQuery
          ? totalMatches === 0
            ? 'No names found.'
            : `${totalMatches} ${totalMatches === 1 ? 'name' : 'names'} found. Use the arrow keys to review them.`
          : ''}
      </p>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Matching guests"
          className="card mt-3 overflow-hidden shadow-soft"
        >
          {results.map((guest, index) => {
            const fullName = `${guest.firstName} ${guest.lastName}`.trim();
            const isActive = index === activeIndex;

            return (
              <li key={guest.id} className="stagger" style={{ ['--i' as string]: index }}>
                <button
                  type="button"
                  id={`${listboxId}-option-${guest.id}`}
                  role="option"
                  aria-selected={isActive}
                  // Fires before blur, so tapping a row never loses the choice.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(guest)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`press flex min-h-[62px] w-full cursor-pointer items-center px-5 py-3.5
                              text-left text-[17px] ${isActive ? 'bg-lilac-50' : 'bg-transparent'}
                              ${index > 0 ? 'border-t border-line' : ''}`}
                >
                  <span className="text-ink">
                    {segmentName(fullName, queryTokens).map((segment, i) =>
                      segment.matched ? (
                        <strong key={i} className="font-semibold text-lilac-700">
                          {segment.text}
                        </strong>
                      ) : (
                        <span key={i}>{segment.text}</span>
                      )
                    )}
                  </span>
                </button>
              </li>
            );
          })}

          {totalMatches > results.length && (
            <li className="border-t border-line px-5 py-3 text-[13px] text-muted">
              {totalMatches - results.length} more {totalMatches - results.length === 1 ? 'name' : 'names'} match
              — keep typing to narrow it down.
            </li>
          )}
        </ul>
      )}

      {showNoMatch && (
        <div className="animate-rise card mt-3 px-6 py-9 text-center shadow-soft">
          <div className="flex justify-center opacity-70">
            <Flourish variant="sprig" />
          </div>
          <p className="mt-4 font-display text-[22px] font-medium text-ink">
            We couldn&apos;t find that name
          </p>
          <p className="mx-auto mt-2 max-w-[32ch] text-[15px] leading-relaxed text-muted">
            Try your last name on its own, or a shorter spelling. If it still doesn&apos;t appear, a
            host at the entrance will be glad to help.
          </p>
        </div>
      )}
      </section>
    </>
  );
}
