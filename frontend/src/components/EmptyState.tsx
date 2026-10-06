import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface Props {
  title: string;
  message?: string;
  children?: ReactNode; // an optional action button
}

// Shown when a list has no records.
export default function EmptyState({ title, message, children }: Props) {
  return (
    <div className="card flex flex-col items-center gap-2 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-nu-mist text-nu-muted">
        <Inbox className="size-6" />
      </span>
      <p className="font-semibold text-nu-navy">{title}</p>
      {message && <p className="max-w-sm text-sm text-nu-muted">{message}</p>}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
