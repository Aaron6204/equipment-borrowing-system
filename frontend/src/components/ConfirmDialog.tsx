interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// The confirmation step shown before anything is deleted.
export default function ConfirmDialog({ open, title, message, confirmLabel = "Delete", busy, onConfirm, onCancel }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-nu-navy/50 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-nu-navy">{title}</h2>
        <p className="mt-2 text-sm text-nu-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-outline" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn bg-red-600 text-white hover:bg-red-700" onClick={onConfirm} disabled={busy}>
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
