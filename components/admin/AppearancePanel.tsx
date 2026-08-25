'use client';

import { useRef, useState } from 'react';
import { ImageSquare, Trash } from '@phosphor-icons/react/dist/ssr';

type AppearancePanelProps = {
  settings: Record<string, string>;
  photoVersion: number | null;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

const FIELDS = [
  {
    key: 'couple_names',
    label: 'Names on the page',
    hint: 'Separated by "&". Each name appears on its own line.',
    rows: 1,
    max: 80,
  },
  {
    key: 'welcome_message',
    label: 'Welcome message',
    hint: 'The short greeting above the search box.',
    rows: 3,
    max: 400,
  },
  {
    key: 'closing_message',
    label: 'Message on the result card',
    hint: 'Shown beneath the table number once a guest finds their seat.',
    rows: 3,
    max: 400,
  },
] as const;

export default function AppearancePanel({
  settings,
  photoVersion,
  onSuccess,
  onError,
}: AppearancePanelProps) {
  const fileInput = useRef<HTMLInputElement>(null);

  const [values, setValues] = useState<Record<string, string>>({
    couple_names: settings.couple_names ?? '',
    welcome_message: settings.welcome_message ?? '',
    closing_message: settings.closing_message ?? '',
  });
  const [version, setVersion] = useState<number | null>(photoVersion);
  const [savingText, setSavingText] = useState(false);
  const [uploading, setUploading] = useState(false);

  const dirty = FIELDS.some((field) => values[field.key].trim() !== (settings[field.key] ?? '').trim());

  async function saveText() {
    setSavingText(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json();

      if (!response.ok) {
        onError(data.error ?? 'Those changes could not be saved.');
        return;
      }
      onSuccess('Wording updated.');
    } catch {
      onError('Could not reach the server. Please try again.');
    } finally {
      setSavingText(false);
    }
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    const form = new FormData();
    form.set('photo', file);

    try {
      const response = await fetch('/api/admin/photo', { method: 'POST', body: form });
      const data = await response.json();

      if (!response.ok) {
        onError(data.error ?? 'That photo could not be uploaded.');
        return;
      }

      // Bump the version so the browser fetches the new image rather than the cache.
      setVersion(Date.now());
      onSuccess('Photo updated.');
    } catch {
      onError('Could not reach the server. Please try again.');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function removePhoto() {
    try {
      const response = await fetch('/api/admin/photo', { method: 'DELETE' });
      if (!response.ok) {
        onError('That photo could not be removed.');
        return;
      }
      setVersion(null);
      onSuccess('Photo removed.');
    } catch {
      onError('Could not reach the server. Please try again.');
    }
  }

  return (
    <section aria-labelledby="appearance-heading" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <h2 id="appearance-heading" className="text-[18px] font-semibold tracking-tight text-ink">
          Wording on the guest page
        </h2>
        <p className="mt-1.5 max-w-[62ch] text-[15px] leading-relaxed text-muted">
          Everything guests read, in one place.
        </p>

        <div className="mt-5 space-y-4">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label htmlFor={field.key} className="label">
                {field.label}
              </label>

              {field.rows === 1 ? (
                <input
                  id={field.key}
                  value={values[field.key]}
                  maxLength={field.max}
                  onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                  className="field h-[48px] text-[15px]"
                />
              ) : (
                <textarea
                  id={field.key}
                  value={values[field.key]}
                  rows={field.rows}
                  maxLength={field.max}
                  onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                  className="field resize-y text-[15px]"
                />
              )}

              <p className="mt-1.5 flex justify-between gap-4 text-[13px] text-muted">
                <span>{field.hint}</span>
                <span className="tnum shrink-0">
                  {values[field.key].length}/{field.max}
                </span>
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void saveText()}
          disabled={savingText || !dirty}
          className="btn-primary mt-5"
        >
          {savingText ? 'Saving…' : 'Save wording'}
        </button>
      </div>

      {/* ---- Photo ---- */}
      <div>
        <h3 className="text-[15px] font-semibold tracking-tight text-ink">Photo</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Shown near the top of the guest page in a 4:5 frame. JPEG, PNG, WebP, or AVIF under 8 MB.
        </p>

        <div className="mt-4 overflow-hidden rounded-xl2 border border-line bg-lilac-50">
          {version ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`/api/photo?v=${version}`}
              alt="The photo currently shown to guests"
              className="aspect-[4/5] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[4/5] flex-col items-center justify-center gap-2 px-4 text-center">
              <ImageSquare size={26} weight="regular" aria-hidden="true" className="text-lilac-400" />
              <p className="text-[13px] text-muted">
                No photo yet. The guest page simply omits the frame.
              </p>
            </div>
          )}
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadPhoto(file);
          }}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="btn-quiet min-h-[44px] text-[14px]"
          >
            {uploading ? 'Uploading…' : version ? 'Replace photo' : 'Upload a photo'}
          </button>

          {version && (
            <button type="button" onClick={() => void removePhoto()} className="btn-danger">
              <Trash size={15} weight="regular" aria-hidden="true" />
              Remove
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
