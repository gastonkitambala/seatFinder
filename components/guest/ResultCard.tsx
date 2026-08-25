'use client';

import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import Flourish from './Flourish';
import type { SearchableGuest } from '@/lib/search';

type ResultCardProps = {
  guest: SearchableGuest;
  closingMessage: string;
  onReset: () => void;
};

/** A label of "12" reads as a number; "Head Table" reads as its own words. */
function isNumericLabel(label: string): boolean {
  return /^\d{1,3}$/.test(label.trim());
}

export default function ResultCard({ guest, closingMessage, onReset }: ResultCardProps) {
  const fullName = `${guest.firstName} ${guest.lastName}`.trim();
  const label = guest.tableLabel.trim();
  const numeric = isNumericLabel(label);

  return (
    <section
      className="animate-bloom card px-6 py-10 text-center shadow-soft sm:px-10 sm:py-12"
      aria-live="polite"
    >
      <p className="font-script text-[30px] leading-none text-lilac-600 sm:text-[34px]">Welcome,</p>

      <h2 className="mt-3 font-display text-[30px] font-medium leading-tight text-ink sm:text-[36px]">
        {fullName}
      </h2>

      <div className="mt-7 flex justify-center">
        <Flourish variant="sprig" />
      </div>

      <p className="eyebrow mt-6">Your table is</p>

      {/* The largest thing on the screen, by a wide margin — this is the answer
          the guest scanned the QR code to get.

          Set in the sans face rather than the display serif: Cormorant draws "1"
          as a bare stem that is indistinguishable from a capital I at this size,
          and the one character that must never be misread is this one. */}
      <p
        className={`mt-2 leading-[0.95] text-lilac-700 ${
          numeric
            ? 'tnum font-sans text-[clamp(4.5rem,20vw,7rem)] font-semibold tracking-tight'
            : 'font-display text-[clamp(2.25rem,10vw,3.5rem)] font-medium'
        }`}
      >
        {label}
      </p>

      <p className="mx-auto mt-8 max-w-[34ch] text-[15px] leading-relaxed text-muted">
        {closingMessage}
      </p>

      <button type="button" onClick={onReset} className="btn-quiet mt-9">
        <ArrowLeft size={18} weight="regular" aria-hidden="true" />
        Search another name
      </button>
    </section>
  );
}
