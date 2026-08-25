'use client';

import { useEffect, useRef } from 'react';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Confirmation for the two destructive actions: replacing the whole list and
 * emptying it. Built on <dialog> so focus trapping, Escape, and the backdrop
 * come from the platform rather than from hand-rolled key handlers.
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === ref.current) onCancel();
      }}
      aria-labelledby="confirm-title"
      className="w-[min(400px,calc(100vw-2rem))] rounded-xl2 border border-line bg-surface p-0
                 text-ink shadow-lift backdrop:bg-[rgba(42,35,64,0.45)]"
    >
      <div className="p-6">
        <h2 id="confirm-title" className="text-[18px] font-semibold tracking-tight">
          {title}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">{body}</p>

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="btn-quiet">
            Keep it as it is
          </button>
          <button type="button" onClick={onConfirm} className="btn-danger min-h-[48px] px-6">
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
