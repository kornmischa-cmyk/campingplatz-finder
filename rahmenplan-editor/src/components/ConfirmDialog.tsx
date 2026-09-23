import { useEffect, useRef, type ReactNode } from 'react';

export interface ConfirmRequest {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

/** Modaler Bestätigungsdialog auf Basis von <dialog> (Fokus-Falle und Esc liefert der Browser). */
export function ConfirmDialog({ req, onClose }: { req: ConfirmRequest | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (req && !d.open) d.showModal?.();
    if (!req && d.open) d.close();
  }, [req]);
  return (
    <dialog ref={ref} className="confirm-dialog" onClose={onClose} aria-labelledby="confirm-title">
      {req && (
        <>
          <h2 id="confirm-title">{req.title}</h2>
          <div>{req.body}</div>
          <div className="dialog-actions">
            <button className="btn" onClick={onClose} autoFocus>
              Abbrechen
            </button>
            <button
              className={req.danger ? 'btn danger' : 'btn primary'}
              onClick={() => {
                req.onConfirm();
                onClose();
              }}
            >
              {req.confirmLabel}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
