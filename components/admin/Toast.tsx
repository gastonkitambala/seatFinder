'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, Warning, X } from '@phosphor-icons/react/dist/ssr';

export type ToastTone = 'success' | 'error';

export type ToastState = {
  id: number;
  tone: ToastTone;
  message: string;
  action?: { label: string; run: () => void };
};

const DISMISS_AFTER = 6000;

/**
 * A single toast slot.
 *
 * Deliberately holds only one message: two stacked toasts on a phone cover the
 * content the organizer just changed. An undo action keeps its toast alive for
 * the full window rather than the shorter default.
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback(
    (tone: ToastTone, message: string, action?: ToastState['action']) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ id: Date.now(), tone, message, action });
      timer.current = setTimeout(() => setToast(null), DISMISS_AFTER);
    },
    []
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { toast, show, dismiss };
}

export function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  return (
    /* aria-live rather than role="alert" so the toast is announced without
       pulling focus away from whatever the organizer is doing. */
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-5"
    >
      {toast && (
        <div
          key={toast.id}
          className="animate-rise pointer-events-auto flex w-full max-w-[440px] items-start gap-3
                     rounded-xl2 border border-line bg-surface px-4 py-3.5 shadow-lift"
        >
          {toast.tone === 'success' ? (
            <CheckCircle size={20} weight="regular" aria-hidden="true" className="mt-0.5 shrink-0 text-success" />
          ) : (
            <Warning size={20} weight="regular" aria-hidden="true" className="mt-0.5 shrink-0 text-danger" />
          )}

          <p className="flex-1 text-[14px] leading-snug text-ink">{toast.message}</p>

          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.run();
                onDismiss();
              }}
              className="press shrink-0 cursor-pointer rounded-lg px-2.5 py-1 text-[14px] font-medium
                         text-lilac-700 hover:bg-lilac-50"
            >
              {toast.action.label}
            </button>
          )}

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss this message"
            className="press -mr-1 shrink-0 cursor-pointer rounded-lg p-1.5 text-muted hover:bg-lilac-50 hover:text-ink"
          >
            <X size={15} weight="regular" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
