import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  children?: ReactNode; // buttons shown on the right
}

export default function PageHeader({ title, subtitle, children }: Props) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-nu-navy sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-nu-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
