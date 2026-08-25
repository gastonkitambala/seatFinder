'use client';

import { useRef, useState } from 'react';
import {
  ArrowCounterClockwise,
  FileArrowUp,
  FileX,
  Table as TableIcon,
  Warning,
} from '@phosphor-icons/react/dist/ssr';
import ConfirmDialog from './ConfirmDialog';

type PreviewRow = { firstName: string; lastName: string; tableLabel: string };
type RowError = { row: number; reason: string };

type Preview = {
  fileName: string;
  headers: string[];
  total: number;
  rows: PreviewRow[];
  errors: RowError[];
};

type ImportPanelProps = {
  guestCount: number;
  onImported: (summary: { imported: number; skipped: number; mode: 'replace' | 'append' }) => void;
  onError: (message: string) => void;
};

type Mode = 'replace' | 'append';

const ACCEPT = '.csv,.xlsx,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export default function ImportPanel({ guestCount, onImported, onError }: ImportPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('replace');
  const [busy, setBusy] = useState<'reading' | 'saving' | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState(false);

  function clear() {
    setFile(null);
    setPreview(null);
    setFileError(null);
    setBusy(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  async function readFile(candidate: File) {
    setFile(candidate);
    setPreview(null);
    setFileError(null);
    setBusy('reading');

    const form = new FormData();
    form.set('file', candidate);
    form.set('mode', mode);
    form.set('commit', 'false');

    try {
      const response = await fetch('/api/admin/import', { method: 'POST', body: form });
      const data = await response.json();

      if (!response.ok) {
        setFileError(data.error ?? 'That file could not be read.');
        return;
      }

      setPreview({
        fileName: data.fileName,
        headers: data.headers,
        total: data.total,
        rows: data.rows,
        errors: data.errors,
      });
    } catch {
      setFileError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  async function commit() {
    if (!file) return;

    setConfirming(false);
    setBusy('saving');

    const form = new FormData();
    form.set('file', file);
    form.set('mode', mode);
    form.set('commit', 'true');

    try {
      const response = await fetch('/api/admin/import', { method: 'POST', body: form });
      const data = await response.json();

      if (!response.ok) {
        onError(data.error ?? 'The guest list could not be saved.');
        return;
      }

      onImported({ imported: data.imported, skipped: data.skipped, mode: data.mode });
      clear();
    } catch {
      onError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  function attemptCommit() {
    // Replacing wipes the existing chart, so it needs a deliberate second step.
    if (mode === 'replace' && guestCount > 0) {
      setConfirming(true);
      return;
    }
    void commit();
  }

  return (
    <section aria-labelledby="import-heading">
      <h2 id="import-heading" className="text-[18px] font-semibold tracking-tight text-ink">
        Upload the seating chart
      </h2>
      <p className="mt-1.5 max-w-[62ch] text-[15px] leading-relaxed text-muted">
        A CSV or Excel file with a heading row. Column order does not matter, and extra columns are
        ignored.
      </p>

      {/* The expected shape, shown rather than described. */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[380px] border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr className="text-left text-muted">
              <th className="rounded-tl-lg border border-line bg-lilac-50 px-3 py-2 font-medium">First Name</th>
              <th className="border-y border-r-0 border-line bg-lilac-50 px-3 py-2 font-medium">Last Name</th>
              <th className="rounded-tr-lg border border-line bg-lilac-50 px-3 py-2 font-medium">Table</th>
            </tr>
          </thead>
          <tbody className="text-ink">
            <tr>
              <td className="border-x border-b border-line px-3 py-2">Amara</td>
              <td className="border-b border-line px-3 py-2">Okonkwo</td>
              <td className="tnum border-x border-b border-line px-3 py-2">12</td>
            </tr>
            <tr>
              <td className="rounded-bl-lg border-x border-b border-line px-3 py-2">Tobias</td>
              <td className="border-b border-line px-3 py-2">Lindqvist</td>
              <td className="tnum rounded-br-lg border-x border-b border-line px-3 py-2">Head Table</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ---- Drop zone ---- */}
      {!preview && !fileError && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) void readFile(dropped);
          }}
          className={`mt-5 rounded-xl2 border-2 border-dashed p-8 text-center transition-colors duration-200
                      ${dragging ? 'border-lilac-400 bg-lilac-50' : 'border-line bg-surface'}`}
        >
          {busy === 'reading' ? (
            <div className="flex flex-col items-center gap-3">
              <div className="skeleton h-10 w-10 rounded-full" />
              <p className="text-[15px] text-muted">Reading {file?.name}…</p>
            </div>
          ) : (
            <>
              <FileArrowUp size={30} weight="regular" aria-hidden="true" className="mx-auto text-lilac-400" />
              <p className="mt-3 text-[15px] text-ink">Drop your guest list here</p>
              <p className="mt-1 text-[13px] text-muted">CSV or XLSX, up to 5 MB</p>

              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="btn-quiet mt-4"
              >
                Choose a file
              </button>
            </>
          )}

          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const chosen = e.target.files?.[0];
              if (chosen) void readFile(chosen);
            }}
          />
        </div>
      )}

      {/* ---- The file could not be read at all ---- */}
      {fileError && (
        <div className="animate-rise mt-5 rounded-xl2 border border-[#f0d7dd] bg-[#fdf5f7] p-5" role="alert">
          <div className="flex items-start gap-3">
            <FileX size={22} weight="regular" aria-hidden="true" className="mt-0.5 shrink-0 text-danger" />
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-ink">
                {file?.name ?? 'That file'} could not be imported
              </p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink/80">{fileError}</p>

              <button type="button" onClick={clear} className="btn-quiet mt-4 min-h-[44px] text-[14px]">
                <ArrowCounterClockwise size={16} weight="regular" aria-hidden="true" />
                Try a different file
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Parsed and ready, awaiting confirmation ---- */}
      {preview && (
        <div className="animate-rise mt-5 card overflow-hidden">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-lilac-50 px-5 py-3.5">
            <TableIcon size={18} weight="regular" aria-hidden="true" className="text-lilac-600" />
            <p className="text-[15px] font-medium text-ink">{preview.fileName}</p>
            <p className="tnum text-[14px] text-muted">
              {preview.total} {preview.total === 1 ? 'guest' : 'guests'} ready
              {preview.errors.length > 0 && ` · ${preview.errors.length} to skip`}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-[14px]">
              <caption className="sr-only">
                The first {preview.rows.length} rows of the file you uploaded
              </caption>
              <thead>
                <tr className="text-left text-[13px] text-muted">
                  <th scope="col" className="px-5 py-2.5 font-medium">First name</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Last name</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Table</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-5 py-2.5 text-ink">{row.firstName}</td>
                    <td className="px-5 py-2.5 text-muted">{row.lastName || '—'}</td>
                    <td className="tnum px-5 py-2.5 text-ink">{row.tableLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.total > preview.rows.length && (
            <p className="border-t border-line px-5 py-2.5 text-[13px] text-muted">
              …and {preview.total - preview.rows.length} more rows.
            </p>
          )}

          {preview.errors.length > 0 && (
            <div className="border-t border-line bg-[#fdf9f4] px-5 py-4">
              <p className="flex items-center gap-2 text-[14px] font-medium text-ink">
                <Warning size={17} weight="regular" aria-hidden="true" className="text-[#9a6a1f]" />
                These rows will be skipped
              </p>
              <ul className="mt-2 space-y-1 text-[13px] text-muted">
                {preview.errors.slice(0, 8).map((error) => (
                  <li key={error.row}>
                    Row {error.row} — {error.reason.toLowerCase()}
                  </li>
                ))}
                {preview.errors.length > 8 && (
                  <li>…and {preview.errors.length - 8} more.</li>
                )}
              </ul>
            </div>
          )}

          <div className="border-t border-line px-5 py-4">
            <fieldset>
              <legend className="label">What should happen to the current list?</legend>

              <div className="mt-1 space-y-2">
                {(
                  [
                    {
                      value: 'replace' as const,
                      title: 'Replace the whole list',
                      detail:
                        guestCount > 0
                          ? `Removes all ${guestCount} guests currently saved, then imports these.`
                          : 'Imports these guests as the complete list.',
                    },
                    {
                      value: 'append' as const,
                      title: 'Add to the list',
                      detail: 'Keeps everyone already saved and adds these on top.',
                    },
                  ]
                ).map((option) => (
                  <label
                    key={option.value}
                    className={`press flex cursor-pointer items-start gap-3 rounded-xl border p-3.5
                                ${mode === option.value ? 'border-lilac-400 bg-lilac-50' : 'border-line bg-surface hover:border-lilac-200'}`}
                  >
                    <input
                      type="radio"
                      name="import-mode"
                      value={option.value}
                      checked={mode === option.value}
                      onChange={() => setMode(option.value)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--lilac-600)]"
                    />
                    <span>
                      <span className="block text-[15px] font-medium text-ink">{option.title}</span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-muted">
                        {option.detail}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row">
              <button type="button" onClick={clear} className="btn-quiet" disabled={busy === 'saving'}>
                Cancel
              </button>
              <button
                type="button"
                onClick={attemptCommit}
                disabled={busy === 'saving' || preview.total === 0}
                className="btn-primary flex-1"
              >
                {busy === 'saving'
                  ? 'Saving…'
                  : `Import ${preview.total} ${preview.total === 1 ? 'guest' : 'guests'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title="Replace the entire guest list?"
        body={`All ${guestCount} guests currently saved will be removed and replaced with the ${preview?.total ?? 0} in this file. This cannot be undone.`}
        confirmLabel="Replace the list"
        onConfirm={() => void commit()}
        onCancel={() => setConfirming(false)}
      />
    </section>
  );
}
