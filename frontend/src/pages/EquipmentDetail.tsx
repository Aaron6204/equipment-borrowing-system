import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { useFetch } from "../hooks/useFetch";
import type { Availability, Borrowing, Equipment } from "../types";
import { formatDate, formatPeso } from "../utils/format";
import PageHeader from "../components/PageHeader";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";

// Page 4: one item, its availability, and its borrowing history.
export default function EquipmentDetail() {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);

  const equipment = useFetch<Equipment>(`/equipment/${id}`);
  // The availability check is done by the API, for the quantity typed below.
  const availability = useFetch<Availability>(`/equipment/${id}/availability?quantity=${quantity}`);
  const history = useFetch<Borrowing[]>(`/borrowings?equipment=${id}`);

  if (equipment.loading) return <Loading label="Loading equipment..." />;
  if (equipment.error) {
    return (
      <>
        <ErrorMessage message={equipment.error} onRetry={equipment.refetch} />
        <Link to="/equipment" className="btn-outline mt-4">
          <ArrowLeft className="size-4" /> Back to equipment
        </Link>
      </>
    );
  }
  if (!equipment.data) return null;

  const item = equipment.data;
  const isConsumable = item.type === "consumable";

  return (
    <>
      <Link to="/equipment" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-nu-royal hover:underline">
        <ArrowLeft className="size-4" /> Back to equipment
      </Link>
      <PageHeader title={item.name} subtitle={item.category?.name ?? "No category"}>
        <Link to={`/equipment/${item._id}/edit`} className="btn-outline">Edit</Link>
        <Link to={`/borrowings/new?equipment=${item._id}`} className="btn-primary">Book this item</Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Details */}
        <section className="card lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={item.type} />
            <StatusBadge value={item.condition} />
            {item.lowStock && <StatusBadge value={item.totalQuantity === 0 ? "out of stock" : "low stock"} />}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-nu-mist p-4">
              <dt className="text-xs text-nu-muted">{isConsumable ? "In stock" : "Total units"}</dt>
              <dd className="text-2xl font-bold text-nu-navy">{item.totalQuantity}</dd>
            </div>
            <div className="rounded-xl bg-nu-mist p-4">
              <dt className="text-xs text-nu-muted">{isConsumable ? "Reserved" : "Reserved or out"}</dt>
              <dd className="text-2xl font-bold text-nu-navy">{item.held}</dd>
            </div>
            <div className="rounded-xl bg-nu-gold/30 p-4">
              <dt className="text-xs text-nu-muted">Available now</dt>
              <dd className="text-2xl font-bold text-nu-navy">{item.available}</dd>
            </div>
            <div className="rounded-xl bg-nu-mist p-4">
              <dt className="text-xs text-nu-muted">{isConsumable ? "Reorder level" : "Loan period"}</dt>
              <dd className="text-2xl font-bold text-nu-navy">
                {isConsumable ? item.reorderLevel : `${item.category?.maxLoanDays ?? "—"} d`}
              </dd>
            </div>
          </dl>

          <p className="mt-5 text-sm leading-relaxed text-nu-muted">
            {isConsumable
              ? "This is a consumable. It is issued and used up, so it has no due date and no overdue fee. Issuing it reduces the stock."
              : `This item must be returned. Students may keep it for ${item.category?.maxLoanDays ?? "—"} day(s) and faculty for twice as long. A late return costs ${formatPeso(item.category?.dailyFee ?? 0)} per unit per day${item.replacementCost > 0 ? `, up to its replacement cost of ${formatPeso(item.replacementCost)} per unit` : ""}.`}
          </p>
        </section>

        {/* Availability checker */}
        <section className="card">
          <h2 className="text-lg font-bold text-nu-navy">Check availability</h2>
          <label htmlFor="check-quantity" className="label mt-4">How many units do you need?</label>
          <input
            id="check-quantity"
            type="number"
            min={1}
            className="input"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          />

          <div className="mt-4 min-h-16">
            {availability.loading && <p className="text-sm text-nu-muted">Checking...</p>}
            {availability.error && <p className="text-sm text-red-700">{availability.error}</p>}
            {availability.data && !availability.loading && (
              <div className={`flex items-start gap-2 rounded-xl p-3 text-sm ${availability.data.canBorrow ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                {availability.data.canBorrow ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
                <div>
                  <p className="font-semibold">{availability.data.canBorrow ? "This request is possible" : "This request is not possible"}</p>
                  <p>
                    {availability.data.reason}. {availability.data.available} of {availability.data.total} unit(s) free.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Borrowing history */}
      <h2 className="mb-3 mt-8 text-lg font-bold text-nu-navy">Borrowing history</h2>
      {history.loading && <Loading />}
      {history.error && <ErrorMessage message={history.error} onRetry={history.refetch} />}
      {history.data && history.data.length === 0 && (
        <EmptyState title="Never borrowed" message="Borrowings of this item will be listed here." />
      )}
      {history.data && history.data.length > 0 && (
        <ul className="card divide-y divide-nu-line !p-0">
          {history.data.map((borrowing) => (
            <li key={borrowing._id} className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-nu-navy">
                  {borrowing.quantity} unit(s) to {borrowing.borrower?.name ?? "Deleted borrower"}
                </p>
                <p className="text-sm text-nu-muted">
                  {formatDate(borrowing.borrowDate)}
                  {borrowing.dueDate && `, due ${formatDate(borrowing.dueDate)}`}
                </p>
              </div>
              <div className="flex gap-1.5">
                {borrowing.daysOverdue > 0 && <StatusBadge value="overdue" />}
                <StatusBadge value={borrowing.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
