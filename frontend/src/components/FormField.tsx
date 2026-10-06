import type { ReactNode } from "react";

interface Props {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode; // the input, select, or textarea
}

// Wraps a form control with its label, hint, and per-field error message.
export default function FormField({ label, htmlFor, error, hint, children }: Props) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-nu-muted">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
