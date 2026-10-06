import { useState } from "react";
import api, { getErrorMessage } from "../api/axios";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../hooks/useToast";
import type { Fine, OverdueBorrowing } from "../types";
import { formatDate, formatPeso } from "../utils/format";
import PageHeader from "../components/PageHeader";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";

// Page 9: items that are late right now, and the fines created from late returns.
export default function OverdueFines() {
  const [fineFilter, setFineFilter] = useState<"" | "unpaid" | "paid">("");
  const overdue = useFetch<OverdueBorrowing[]>("/borrowings/overdue");
  const fines = useFetch<Fine[]>(fineFilter ? `/fines?status=${fineFilter}` : "/fines");
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Fine | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function markReturned(borrowing: OverdueBorrowing) {
    setBusyId(borrowing._id);
    try {
      const response = await api.patch(`/borrowings/${borrowing._id}/status`, { status: "returned" });
      const fine = response.data.fine;
      showToast(fine ? `Item returned. A fine of ${formatPeso(fine.amount)} was created.` : "Item returned");
      overdue.refetch();
      fines.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function markPaid(fine: Fine) {
    setBusyId(fine._id);
    try {
      await api.put(`/fines/${fine._id}`, { status: "paid" });
      showToast(`Fine of ${formatPeso(fine.amount)} marked as paid`);
      fines.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/fines/${toDelete._id}`);
      showToast("Fine deleted");
      fines.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  // Derived values: totals computed from the loaded lists during render.
  const overdueList = overdue.data ?? [];
  const fineList = fines.data ?? [];
  const runningTotal = overdueList.reduce((sum, borrowing) => sum + borrowing.runningFee, 0);
  const unpaidTotal = fineList.filter((fine) => fine.status === "unpaid").reduce((sum, fine) => sum + fine.amount, 0);
  const paidTotal = fineList.filter((fine) => fine.status === "paid").reduce((sum, fine) => sum + fine.amount, 0);

  return (
    <>
      <PageHeader title="Overdue & Fines" subtitle="Late items and the fees that come from them" />

      {/* Overdue items */}
      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-nu-navy">Overdue right now</h2>
          {overdueList.length > 0 && (
            <p className="text-sm text-nu-muted">
              {overdueList.length} item(s), {formatPeso(runningTotal)} in running fees
            </p>
          )}
        </div>
        {overdue.loading && <Loading label="Loading overdue items..." />}
        {overdue.error && <ErrorMessage message={overdue.error} onRetry={overdue.refetch} />}
        {!overdue.loading && !overdue.error && overdueList.length === 0 && (
          <EmptyState title="Nothing is overdue" message="Every released item is still within its due date." />
        )}
        {!overdue.loading && !overdue.error && overdueList.length > 0 && (
          <ul className="grid gap-3 md:grid-cols-2">
            {overdueList.map((borrowing) => (
              <li key={borrowing._id} className="card border-red-200 !p-4 sm:!p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-nu-navy">
                      {borrowing.quantity} × {borrowing.equipment?.name ?? "Deleted item"}
                    </p>
                    <p className="text-sm text-nu-muted">{borrowing.borrower?.name ?? "Deleted borrower"}</p>
                  </div>
                  <span className="badge bg-red-100 text-red-800">{borrowing.daysOverdue} day(s) late</span>
                </div>
                <p className="mt-3 text-sm text-nu-muted">
                  Due {formatDate(borrowing.dueDate)}. Fee so far: {borrowing.daysOverdue} day(s) × {formatPeso(borrowing.dailyFee)} ×{" "}
                  {borrowing.quantity} unit(s) = <span className="font-bold text-red-700">{formatPeso(borrowing.runningFee)}</span>
                </p>
                <button
                  type="button"
                  className="btn-primary btn-sm mt-4"
                  disabled={busyId === borrowing._id}
                  onClick={() => markReturned(borrowing)}
                >
                  {busyId === borrowing._id ? "Working..." : "Mark returned and create fine"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Fines */}
      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-nu-navy">Fines</h2>
            <p className="text-sm text-nu-muted">
              {formatPeso(unpaidTotal)} unpaid, {formatPeso(paidTotal)} collected
            </p>
          </div>
          <div>
            <label htmlFor="fine-filter" className="sr-only">Filter fines</label>
            <select id="fine-filter" className="input w-auto" value={fineFilter} onChange={(e) => setFineFilter(e.target.value as "" | "unpaid" | "paid")}>
              <option value="">All fines</option>
              <option value="unpaid">Unpaid only</option>
              <option value="paid">Paid only</option>
            </select>
          </div>
        </div>
        {fines.loading && <Loading label="Loading fines..." />}
        {fines.error && <ErrorMessage message={fines.error} onRetry={fines.refetch} />}
        {!fines.loading && !fines.error && fineList.length === 0 && (
          <EmptyState title={fineFilter ? `No ${fineFilter} fines` : "No fines yet"} message="A fine is created automatically when an item is returned late." />
        )}
        {!fines.loading && !fines.error && fineList.length > 0 && (
          <ul className="card divide-y divide-nu-line !p-0">
            {fineList.map((fine) => (
              <li key={fine._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-nu-navy">
                    {formatPeso(fine.amount)} · {fine.borrower?.name ?? "Deleted borrower"}
                  </p>
                  <p className="text-sm text-nu-muted">
                    {fine.borrowing?.equipment?.name ?? "Deleted item"}, {fine.daysOverdue} day(s) late
                    {fine.paidAt && `, paid ${formatDate(fine.paidAt)}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={fine.status} />
                  {fine.status === "unpaid" && (
                    <button type="button" className="btn-primary btn-sm" disabled={busyId === fine._id} onClick={() => markPaid(fine)}>
                      {busyId === fine._id ? "Saving..." : "Mark as paid"}
                    </button>
                  )}
                  <button type="button" className="btn-danger btn-sm" onClick={() => setToDelete(fine)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete fine?"
        message={`The fine of ${toDelete ? formatPeso(toDelete.amount) : ""} for ${toDelete?.borrower?.name ?? "this borrower"} will be permanently removed.`}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
