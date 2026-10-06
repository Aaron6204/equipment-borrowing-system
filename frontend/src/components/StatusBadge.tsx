// One coloured label for every kind of status in the system.
const styles: Record<string, string> = {
  // borrowing statuses
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  released: "bg-indigo-100 text-indigo-800",
  returned: "bg-emerald-100 text-emerald-800",
  issued: "bg-teal-100 text-teal-800",
  cancelled: "bg-slate-200 text-slate-700",
  // equipment
  consumable: "bg-nu-gold/30 text-nu-navy",
  "non-consumable": "bg-nu-blue/10 text-nu-blue",
  good: "bg-emerald-100 text-emerald-800",
  damaged: "bg-red-100 text-red-800",
  retired: "bg-slate-200 text-slate-700",
  // borrowers and fines
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-slate-200 text-slate-700",
  student: "bg-nu-blue/10 text-nu-blue",
  faculty: "bg-nu-gold/30 text-nu-navy",
  paid: "bg-emerald-100 text-emerald-800",
  unpaid: "bg-red-100 text-red-800",
  overdue: "bg-red-100 text-red-800",
  "low stock": "bg-orange-100 text-orange-800",
  "out of stock": "bg-red-100 text-red-800",
};

export default function StatusBadge({ value }: { value: string }) {
  return <span className={`badge capitalize ${styles[value] || "bg-slate-100 text-slate-700"}`}>{value}</span>;
}
