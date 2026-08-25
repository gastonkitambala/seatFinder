'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeSlash, Warning } from '@phosphor-icons/react/dist/ssr';

export default function LoginForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? 'Sign in failed. Please try again.');
        setPassword('');
        // Put the cursor back where the fix has to happen.
        inputRef.current?.focus();
        return;
      }

      router.replace('/admin');
      router.refresh();
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card p-6 shadow-soft">
      <label htmlFor="password" className="label">
        Password
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          id="password"
          name="password"
          type={visible ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'password-error' : undefined}
          className="field h-[52px] pr-[52px]"
        />

        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="press absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer
                     items-center justify-center rounded-lg text-muted hover:bg-lilac-50 hover:text-ink"
        >
          {visible ? (
            <EyeSlash size={19} weight="regular" aria-hidden="true" />
          ) : (
            <Eye size={19} weight="regular" aria-hidden="true" />
          )}
        </button>
      </div>

      {error && (
        <p
          id="password-error"
          role="alert"
          className="mt-2.5 flex items-start gap-1.5 text-[14px] leading-snug text-danger"
        >
          <Warning size={16} weight="regular" aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <button type="submit" disabled={busy || password.length === 0} className="btn-primary mt-5 w-full">
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
