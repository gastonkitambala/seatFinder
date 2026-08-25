'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowSquareOut, SignOut } from '@phosphor-icons/react/dist/ssr';
import type { Guest } from '@/lib/db';
import ImportPanel from './ImportPanel';
import GuestTable from './GuestTable';
import AppearancePanel from './AppearancePanel';
import { Toast, useToast } from './Toast';

type DashboardProps = {
  initialGuests: Guest[];
  settings: Record<string, string>;
  photoVersion: number | null;
};

export default function Dashboard({ initialGuests, settings, photoVersion }: DashboardProps) {
  const router = useRouter();
  const { toast, show, dismiss } = useToast();

  const [guests, setGuests] = useState<Guest[]>(initialGuests);

  const tableCount = useMemo(
    () => new Set(guests.map((g) => g.tableLabel.trim().toLowerCase())).size,
    [guests]
  );

  async function signOut() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <div className="min-h-[100dvh] bg-bg">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1000px] items-center gap-4 px-5 py-3.5 sm:px-8">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Seat finder</p>
            <p className="truncate text-[15px] font-semibold tracking-tight text-ink">
              {settings.couple_names}
            </p>
          </div>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="press hidden cursor-pointer items-center gap-1.5 rounded-full px-3 py-2
                       text-[14px] font-medium text-lilac-700 hover:bg-lilac-50 sm:inline-flex"
          >
            View guest page
            <ArrowSquareOut size={15} weight="regular" aria-hidden="true" />
          </a>

          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="Sign out"
            className="press flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center
                       gap-1.5 rounded-full px-3 text-[14px] font-medium text-muted
                       hover:bg-lilac-50 hover:text-ink"
          >
            <SignOut size={18} weight="regular" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1000px] px-5 pb-24 pt-8 sm:px-8">
        {/* Two figures, unboxed — the numbers carry themselves without cards. */}
        <div className="flex flex-wrap gap-x-12 gap-y-4 border-b border-line pb-8">
          <div>
            <p className="tnum text-[34px] font-semibold leading-none tracking-tight text-ink">
              {guests.length}
            </p>
            <p className="mt-1.5 text-[14px] text-muted">
              {guests.length === 1 ? 'guest' : 'guests'} seated
            </p>
          </div>
          <div>
            <p className="tnum text-[34px] font-semibold leading-none tracking-tight text-ink">
              {tableCount}
            </p>
            <p className="mt-1.5 text-[14px] text-muted">
              {tableCount === 1 ? 'table' : 'tables'} in use
            </p>
          </div>
        </div>

        <div className="space-y-12 pt-10">
          <ImportPanel
            guestCount={guests.length}
            onImported={({ imported, skipped, mode }) => {
              show(
                'success',
                `${imported} ${imported === 1 ? 'guest' : 'guests'} ${
                  mode === 'replace' ? 'imported' : 'added'
                }${skipped > 0 ? ` · ${skipped} ${skipped === 1 ? 'row' : 'rows'} skipped` : ''}.`
              );
              // Pull the committed list back from the server rather than guessing it.
              router.refresh();
              void fetch('/api/admin/guests')
                .then((r) => r.json())
                .then((data) => setGuests(data.guests ?? []))
                .catch(() => show('error', 'Imported, but the list below could not be refreshed. Reload the page.'));
            }}
            onError={(message) => show('error', message)}
          />

          <hr className="border-line" />

          <GuestTable
            guests={guests}
            onChange={setGuests}
            onSuccess={(message, action) => show('success', message, action)}
            onError={(message) => show('error', message)}
          />

          <hr className="border-line" />

          <AppearancePanel
            settings={settings}
            photoVersion={photoVersion}
            onSuccess={(message) => {
              show('success', message);
              router.refresh();
            }}
            onError={(message) => show('error', message)}
          />
        </div>
      </main>

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
