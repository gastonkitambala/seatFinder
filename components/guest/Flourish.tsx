type FlourishProps = {
  variant?: 'divider' | 'sprig';
  className?: string;
  animate?: boolean;
};

/**
 * The single decorative element in the whole design.
 *
 * A laurel drawn as a thin line, used in exactly three places: under the
 * couple's names, above the table number, and as the footer rule. Anywhere else
 * and it stops reading as elegant and starts reading as clip art.
 */
export default function Flourish({
  variant = 'divider',
  className = '',
  animate = false,
}: FlourishProps) {
  const wrapper = `${animate ? 'flourish ' : ''}${className}`;

  if (variant === 'sprig') {
    return (
      <svg
        viewBox="0 0 56 38"
        width="56"
        height="38"
        fill="none"
        aria-hidden="true"
        focusable="false"
        className={wrapper}
        style={{ ['--dash' as string]: '190' }}
      >
        <g
          stroke="var(--lilac-200)"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Stem, rising to a single bud */}
          <path d="M28 36V10" />

          {/* Leaves sweeping down and away, largest at the base */}
          <path d="M28 30C24 30 18 27 15 22c5-1 11 2 13 8Z" fill="var(--lilac-50)" />
          <path d="M28 30c4 0 10-3 13-8-5-1-11 2-13 8Z" fill="var(--lilac-50)" />
          <path d="M28 22c-3.4 0-8.4-2.6-10.8-6.6 4.2-.9 9.2 1.7 10.8 6.6Z" fill="var(--lilac-50)" />
          <path d="M28 22c3.4 0 8.4-2.6 10.8-6.6-4.2-.9-9.2 1.7-10.8 6.6Z" fill="var(--lilac-50)" />
          <path d="M28 15c-2.6 0-6.4-2-8.2-5 3.2-.7 7 1.3 8.2 5Z" fill="var(--lilac-50)" />
          <path d="M28 15c2.6 0 6.4-2 8.2-5-3.2-.7-7 1.3-8.2 5Z" fill="var(--lilac-50)" />
        </g>

        <circle cx="28" cy="7" r="2" fill="var(--lilac-200)" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 240 30"
      width="240"
      height="30"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={`max-w-full ${wrapper}`}
      style={{ ['--dash' as string]: '340' }}
    >
      <g
        stroke="var(--lilac-200)"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* The two long stems that carry the eye across */}
        <path d="M6 15h106" />
        <path d="M128 15h106" />

        {/* Left laurel: two leaves per side, sweeping back along the stem */}
        <path d="M112 15c-5-5-13-8-21-6 4 5 12 8 21 6Z" fill="var(--lilac-50)" />
        <path d="M112 15c-5 5-13 8-21 6 4-5 12-8 21-6Z" fill="var(--lilac-50)" />
        <path d="M99 15c-4-4-10-6.4-16.4-4.8C86 14 92 16.2 99 15Z" fill="var(--lilac-50)" />
        <path d="M99 15c-4 4-10 6.4-16.4 4.8C86 16 92 13.8 99 15Z" fill="var(--lilac-50)" />

        {/* Right laurel, mirrored */}
        <path d="M128 15c5-5 13-8 21-6-4 5-12 8-21 6Z" fill="var(--lilac-50)" />
        <path d="M128 15c5 5 13 8 21 6-4-5-12-8-21-6Z" fill="var(--lilac-50)" />
        <path d="M141 15c4-4 10-6.4 16.4-4.8C154 14 148 16.2 141 15Z" fill="var(--lilac-50)" />
        <path d="M141 15c4 4 10 6.4 16.4 4.8C154 16 148 13.8 141 15Z" fill="var(--lilac-50)" />
      </g>

      {/* The one solid mark, holding the centre */}
      <circle cx="120" cy="15" r="2.4" fill="var(--lilac-200)" />
    </svg>
  );
}
