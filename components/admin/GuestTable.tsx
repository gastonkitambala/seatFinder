'use client';

import { useMemo, useRef, useState } from 'react';
import {
  Check,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Trash,
  UsersThree,
  X,
} from '@phosphor-icons/react/dist/ssr';
import type { Guest } from '@/lib/db';
import { searchGuests } from '@/lib/search';
import ConfirmDialog from './ConfirmDialog';

type GuestTableProps = {
  guests: Guest[];
  onChange: (guests: Guest[]) => void;
  onSuccess: (message: string, action?: { label: string; run: () => void }) => void;
  onError: (message: string) => void;
};

type Draft = { firstName: string; lastName: string; tableLabel: string };

const EMPTY_DRAFT: Draft = { firstName: '', lastName: '', tableLabel: '' };

export default function GuestTable({ guests, onChange, onSuccess, onError }: GuestTableProps) {
  const [filter, setFilter] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [adding, setAdding] = useState(false);
  const [newGuest, setNewGuest] = useState<Draft>(EMPTY_DRAFT);
  const [busyId, setBusyId] = useState<number | 'new' | null>(null);
  const [clearing, setClearing] = useState(false);

  const addFirstRef = useRef<HTMLInputElement>(null);

  // Reuse the guest-facing matcher so the organizer searches exactly as guests do.
  const visible = useMemo(() => {
    if (!filter.trim()) return guests;
    return searchGuests(guests, filter, Number.MAX_SAFE_INTEGER);
  }, [guests, filter]);

  function startEdit(guest: Guest) {
    setEditingId(guest.id);
    setDraft({
      firstName: guest.firstName,
      lastName: guest.lastName,
      tableLabel: guest.tableLabel,
    });
  }

  async function saveEdit(id: number) {
    if (!draft.firstName.trim() || !draft.tableLabel.trim()) {
      onError('A guest needs at least a first name and a table.');
      return;
    }

    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/guests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await response.json();

      if (!response.ok) {
        onError(data.error ?? 'That change could not be saved.');
        return;
      }

      onChange(guests.map((g) => (g.id === id ? data.guest : g)));
      setEditingId(null);
      onSuccess('Guest updated.');
    } catch {
      onError('Could not reach the server. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(guest: Guest) {
    setBusyId(guest.id);
    try {
      const response = await fetch(`/api/admin/guests/${guest.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        onError(data.error ?? 'That guest could not be removed.');
        return;
      }

      onChange(guests.filter((g) => g.id !== guest.id));

      // Undo re-creates the guest; the id will differ, which nothing depends on.
      onSuccess(`${guest.firstName} ${guest.lastName}`.trim() + ' removed.', {
        label: 'Undo',
        run: () => void restore(guest),
      });
    } catch {
      onError('Could not reach the server. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function restore(guest: Guest) {
    try {
      const response = await fetch('/api/admin/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: guest.firstName,
          lastName: guest.lastName,
          tableLabel: guest.tableLabel,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        onError(data.error ?? 'That guest could not be restored.');
        return;
      }
      onChange([...guests.filter((g) => g.id !== guest.id), data.guest]);
    } catch {
      onError('Could not reach the server. Please try again.');
    }
  }

  async function add() {
    if (!newGuest.firstName.trim() || !newGuest.tableLabel.trim()) {
      onError('A guest needs at least a first name and a table.');
      return;
    }

    setBusyId('new');
    try {
      const response = await fetch('/api/admin/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGuest),
      });
      const data = await response.json();

      if (!response.ok) {
        onError(data.error ?? 'That guest could not be added.');
        return;
      }

      onChange([...guests, data.guest]);
      setNewGuest(EMPTY_DRAFT);
      onSuccess(`${data.guest.firstName} added to table ${data.guest.tableLabel}.`);
      // Stay in the row so several guests can be added in a row.
      addFirstRef.current?.focus();
    } catch {
      onError('Could not reach the server. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function clearAll() {
    setClearing(false);
    try {
      const response = await fetch('/api/admin/guests', { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        onError(data.error ?? 'The list could not be cleared.');
        return;
      }
      onChange([]);
      onSuccess(`All ${data.deleted} guests removed.`);
    } catch {
      onError('Could not reach the server. Please try again.');
    }
  }

  /* ---------- Empty state: no guests at all ---------- */
  if (guests.length === 0) {
    return (
      <section aria-labelledby="guests-heading">
        <h2 id="guests-heading" className="text-[18px] font-semibold tracking-tight text-ink">
          Guest list
        </h2>

        <div className="mt-4 rounded-xl2 border border-dashed border-line bg-surface px-6 py-12 text-center">
          <UsersThree size={30} weight="regular" aria-hidden="true" className="mx-auto text-lilac-400" />
          <p className="mt-3 text-[16px] font-medium text-ink">No guests yet</p>
          <p className="mx-auto mt-1.5 max-w-[40ch] text-[14px] leading-relaxed text-muted">
            Upload a spreadsheet above to fill this in. Until then, visitors to the site see a
            &ldquo;seating is being finalised&rdquo; message instead of a search box.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="guests-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 id="guests-heading" className="text-[18px] font-semibold tracking-tight text-ink">
          Guest list
        </h2>
        <button
          type="button"
          onClick={() => setClearing(true)}
          className="press -mr-2 inline-flex min-h-[44px] cursor-pointer items-center rounded-lg px-2
                     text-[13px] font-medium text-danger hover:bg-[#fdf5f7]"
        >
          Remove every guest
        </button>
      </div>

      {/* ---- Filter ---- */}
      <div className="relative mt-4">
        <MagnifyingGlass
          size={18}
          weight="regular"
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
        />
        <label htmlFor="guest-filter" className="sr-only">
          Filter the guest list
        </label>
        <input
          id="guest-filter"
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name"
          autoComplete="off"
          className="field h-[48px] pl-[42px]"
        />
      </div>

      <p className="tnum mt-2.5 text-[13px] text-muted" aria-live="polite">
        {filter.trim()
          ? `${visible.length} of ${guests.length} guests`
          : `${guests.length} guests`}
      </p>

      {/* ---- No filter results ---- */}
      {visible.length === 0 ? (
        <div className="mt-3 rounded-xl2 border border-dashed border-line bg-surface px-6 py-10 text-center">
          <p className="text-[15px] text-ink">Nobody matches &ldquo;{filter.trim()}&rdquo;</p>
          <button
            type="button"
            onClick={() => setFilter('')}
            className="btn-quiet mt-4 min-h-[44px] text-[14px]"
          >
            Clear the filter
          </button>
        </div>
      ) : (
        <div className="mt-3 card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[14px]">
              <caption className="sr-only">Every guest and the table they are seated at</caption>
              <thead>
                <tr className="border-b border-line text-left text-[13px] text-muted">
                  <th scope="col" className="px-5 py-3 font-medium">First name</th>
                  <th scope="col" className="px-5 py-3 font-medium">Last name</th>
                  <th scope="col" className="px-5 py-3 font-medium">Table</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {visible.map((guest) => {
                  const isEditing = editingId === guest.id;
                  const isBusy = busyId === guest.id;

                  return (
                    <tr key={guest.id} className="border-b border-line last:border-b-0">
                      {isEditing ? (
                        <>
                          <td className="px-3 py-2">
                            <label className="sr-only" htmlFor={`first-${guest.id}`}>First name</label>
                            <input
                              id={`first-${guest.id}`}
                              value={draft.firstName}
                              onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
                              className="field h-[44px] px-3 py-2 text-[14px]"
                              autoFocus
                            />
                          </td>
                          <td className="px-3 py-2">
                            <label className="sr-only" htmlFor={`last-${guest.id}`}>Last name</label>
                            <input
                              id={`last-${guest.id}`}
                              value={draft.lastName}
                              onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
                              className="field h-[44px] px-3 py-2 text-[14px]"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <label className="sr-only" htmlFor={`table-${guest.id}`}>Table</label>
                            <input
                              id={`table-${guest.id}`}
                              value={draft.tableLabel}
                              onChange={(e) => setDraft({ ...draft, tableLabel: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void saveEdit(guest.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="field h-[44px] px-3 py-2 text-[14px]"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => void saveEdit(guest.id)}
                                disabled={isBusy}
                                aria-label={`Save changes to ${guest.firstName}`}
                                className="press flex h-11 w-11 cursor-pointer items-center justify-center
                                           rounded-lg text-success hover:bg-lilac-50 disabled:opacity-50"
                              >
                                <Check size={17} weight="regular" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                disabled={isBusy}
                                aria-label="Cancel editing"
                                className="press flex h-11 w-11 cursor-pointer items-center justify-center
                                           rounded-lg text-muted hover:bg-lilac-50 hover:text-ink"
                              >
                                <X size={17} weight="regular" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-5 py-3 text-ink">{guest.firstName}</td>
                          <td className="px-5 py-3 text-muted">{guest.lastName || '—'}</td>
                          <td className="tnum px-5 py-3 text-ink">{guest.tableLabel}</td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => startEdit(guest)}
                                aria-label={`Edit ${guest.firstName} ${guest.lastName}`.trim()}
                                className="press flex h-11 w-11 cursor-pointer items-center justify-center
                                           rounded-lg text-muted hover:bg-lilac-50 hover:text-lilac-700"
                              >
                                <PencilSimple size={17} weight="regular" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void remove(guest)}
                                disabled={isBusy}
                                aria-label={`Remove ${guest.firstName} ${guest.lastName}`.trim()}
                                className="press flex h-11 w-11 cursor-pointer items-center justify-center
                                           rounded-lg text-muted hover:bg-[#fdf5f7] hover:text-danger disabled:opacity-50"
                              >
                                <Trash size={17} weight="regular" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- Add one guest ---- */}
      <div className="mt-4">
        {adding ? (
          <div className="animate-rise card p-4">
            <p className="label">Add a guest</p>
            <div className="grid gap-2.5 sm:grid-cols-3">
              <div>
                <label htmlFor="new-first" className="sr-only">First name</label>
                <input
                  ref={addFirstRef}
                  id="new-first"
                  value={newGuest.firstName}
                  onChange={(e) => setNewGuest({ ...newGuest, firstName: e.target.value })}
                  placeholder="First name"
                  className="field h-[46px] text-[14px]"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="new-last" className="sr-only">Last name</label>
                <input
                  id="new-last"
                  value={newGuest.lastName}
                  onChange={(e) => setNewGuest({ ...newGuest, lastName: e.target.value })}
                  placeholder="Last name"
                  className="field h-[46px] text-[14px]"
                />
              </div>
              <div>
                <label htmlFor="new-table" className="sr-only">Table</label>
                <input
                  id="new-table"
                  value={newGuest.tableLabel}
                  onChange={(e) => setNewGuest({ ...newGuest, tableLabel: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void add();
                  }}
                  placeholder="Table"
                  className="field h-[46px] text-[14px]"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-col-reverse gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setNewGuest(EMPTY_DRAFT);
                }}
                className="btn-quiet min-h-[46px] text-[14px]"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => void add()}
                disabled={busyId === 'new'}
                className="btn-primary min-h-[46px] flex-1 text-[14px]"
              >
                {busyId === 'new' ? 'Adding…' : 'Add guest'}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="btn-quiet text-[14px]">
            <Plus size={16} weight="regular" aria-hidden="true" />
            Add a guest
          </button>
        )}
      </div>

      <ConfirmDialog
        open={clearing}
        title="Remove every guest?"
        body={`All ${guests.length} guests will be deleted, and the site will show a "seating is being finalised" message until you upload a new list. This cannot be undone.`}
        confirmLabel="Remove them all"
        onConfirm={() => void clearAll()}
        onCancel={() => setClearing(false)}
      />
    </section>
  );
}
