import type { ReactNode } from "react";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon: ReactNode;
  tone?: "blue" | "gold" | "red" | "green";
}

const tones = {
  blue: "bg-nu-blue/10 text-nu-blue",
  gold: "bg-nu-gold/30 text-nu-amber",
  red: "bg-red-100 text-red-700",
  green: "bg-emerald-100 text-emerald-700",
};

// A single number with a label, used on the dashboard and statistics pages.
export default function StatCard({ label, value, hint, icon, tone = "blue" }: Props) {
  return (
    <div className="card flex items-start gap-4">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm text-nu-muted">{label}</p>
        <p className="text-2xl font-bold tracking-tight text-nu-navy">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-nu-muted">{hint}</p>}
      </div>
    </div>
  );
}
