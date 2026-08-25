import SeatFinder from '@/components/guest/SeatFinder';
import Flourish from '@/components/guest/Flourish';
import { listGuests, getSettings, getHeroPhotoVersion } from '@/lib/db';

// The seating chart can change during the day, so never serve a cached page.
export const dynamic = 'force-dynamic';

export default function GuestPage() {
  const guests = listGuests();
  const settings = getSettings();
  const photoVersion = getHeroPhotoVersion();

  const [firstName, secondName] = settings.couple_names.split(/\s*&\s*/);

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[520px] flex-col px-5 pb-14 pt-8 sm:px-6 sm:pt-12">
      <header className="animate-rise text-center">
        <p className="eyebrow">Together with our families</p>

        <h1 className="mt-4 font-script text-[clamp(2.25rem,10vw,3rem)] leading-[1.1] text-ink">
          <span className="block">{firstName}</span>
          {secondName && (
            <>
              <span className="block py-0.5 text-[0.55em] text-lilac-500">&amp;</span>
              <span className="block">{secondName}</span>
            </>
          )}
        </h1>

        <div className="mt-4 flex justify-center">
          <Flourish animate />
        </div>
      </header>

      <div>
        {guests.length > 0 ? (
          <SeatFinder
            guests={guests}
            closingMessage={settings.closing_message}
            hero={
              <>
                {photoVersion && (
                  <figure
                    className="animate-rise mx-auto mt-6 w-fit overflow-hidden rounded-xl3
                               border border-line bg-lilac-50 shadow-soft"
                    style={{ animationDelay: '80ms' }}
                  >
                    {/* Height-capped rather than width-filling, so the search field
                        below stays on the first screen of a phone. The frame narrows
                        on short devices instead of pushing the one thing guests came
                        for off-screen. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/photo?v=${photoVersion}`}
                      alt={`${settings.couple_names} on their wedding day`}
                      width={1000}
                      height={1250}
                      className="aspect-[4/5] max-h-[32dvh] w-auto max-w-full object-cover"
                    />
                  </figure>
                )}

                <p
                  className="animate-rise mx-auto mt-6 max-w-[34ch] text-center text-[15px]
                             leading-relaxed text-muted"
                  style={{ animationDelay: '120ms' }}
                >
                  {settings.welcome_message}
                </p>
              </>
            }
          />
        ) : (
          /* A guest must never meet a search box that cannot answer.
             Until the list is uploaded, the field is not rendered at all. */
          <section className="animate-rise card px-6 py-10 text-center shadow-soft">
            <div className="flex justify-center opacity-70">
              <Flourish variant="sprig" />
            </div>
            <p className="mt-4 font-display text-[22px] font-medium text-ink">
              Seating is being finalised
            </p>
            <p className="mx-auto mt-2 max-w-[32ch] text-[15px] leading-relaxed text-muted">
              Please check back shortly — your table will appear here as soon as the seating chart
              is ready.
            </p>
          </section>
        )}
      </div>

      <footer className="mt-auto pt-12 text-center">
        <div className="flex justify-center opacity-60">
          <Flourish />
        </div>
        <p className="mt-4 font-script text-[21px] text-lilac-500">{settings.couple_names}</p>
      </footer>
    </main>
  );
}
