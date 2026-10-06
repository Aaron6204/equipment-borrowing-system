import { AlertTriangle } from "lucide-react";

interface Props {
  message: string;
  onRetry?: () => void;
}

// Shown when a request fails, with a button to try again.
export default function ErrorMessage({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between" role="alert">
      <div className="flex items-start gap-3 text-sm text-red-800">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-semibold">Could not load the data</p>
          <p>{message}</p>
        </div>
      </div>
      {onRetry && (
        <button type="button" className="btn-danger btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
