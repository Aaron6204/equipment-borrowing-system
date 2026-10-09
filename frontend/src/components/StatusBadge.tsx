// One coloured label for every kind of status in the system.
const styles: Record<string, string> = {
  // booking statuses
  in_review: "bg-amber-100 text-amber-800",
  ready_for_pickup: "bg-blue-100 text-blue-800",
  returned: "bg-emerald-100 text-emerald-800",
  purchased: "bg-teal-100 text-teal-800",
  completed: "bg-emerald-100 text-emerald-800",
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
  // "ready_for_pickup" is shown as "Ready for pickup"
  return (
    <span className={`badge capitalize ${styles[value] || "bg-slate-100 text-slate-700"}`}>{value.replace(/_/g, " ")}</span>
  );
}
