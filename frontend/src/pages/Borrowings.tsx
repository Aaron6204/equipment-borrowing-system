import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../hooks/useToast";
import type { Borrowing, BorrowingStatus } from "../types";
import { formatDate, formatPeso } from "../utils/format";
import PageHeader from "../components/PageHeader";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";

const tabs: { value: BorrowingStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "released", label: "Released" },
  { value: "returned", label: "Returned" },
  { value: "issued", label: "Issued" },
  { value: "cancelled", label: "Cancelled" },
];

// The buttons a borrowing may show, based on its current status and the item type.
// This mirrors the rules enforced by the API, which has the final say.
function nextActions(borrowing: Borrowing): { status: BorrowingStatus; label: string; primary: boolean }[] {
  const isConsumable = borrowing.equipment?.type === "consumable";
  if (borrowing.status === "pending") {
    return [
      { status: "approved", label: "Approve", primary: true },
      { status: "cancelled", label: "Cancel", primary: false },
    ];
  }
  if (borrowing.status === "approved") {
    return [
      isConsumable
        ? { status: "issued", label: "Issue", primary: true }
        : { status: "released", label: "Release", primary: true },
      { status: "cancelled", label: "Cancel", primary: false },
    ];
  }
  if (borrowing.status === "released") {
    return [{ status: "returned", label: "Mark returned", primary: true }];
  }
  return []; // returned, issued, and cancelled are final
}

// Page 8: every borrowing, with the buttons that move it through its statuses.
export default function Borrowings() {
  const [status, setStatus] = useState<BorrowingStatus | "">("");
  const borrowings = useFetch<Borrowing[]>(status ? `/borrowings?status=${status}` : "/borrowings");
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Borrowing | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function changeStatus(borrowing: Borrowing, newStatus: BorrowingStatus) {
    setBusyId(borrowing._id);
    try {
      const response = await api.patch(`/borrowings/${borrowing._id}/status`, { status: newStatus });
      const fine = response.data.fine;
      showToast(
        fine
          ? `Returned ${fine.daysOverdue} day(s) late. A fine of ${formatPeso(fine.amount)} was created.`
          : `Borrowing ${newStatus}`
      );
      borrowings.refetch();
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
      await api.delete(`/borrowings/${toDelete._id}`);
      showToast("Borrowing deleted");
      borrowings.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  const list = borrowings.data ?? [];
  // Derived value: total units across the borrowings currently shown.
  const totalUnits = list.reduce((sum, borrowing) => sum + borrowing.quantity, 0);

  return (
    <>
      <PageHeader title="Borrowings" subtitle="Approve, release, and receive borrowed items">
        <Link to="/borrowings/new" className="btn-primary">
          <Plus className="size-4" /> New booking
        </Link>
      </PageHeader>

      {/* Status filter */}
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            className={`min-h-9 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              status === tab.value ? "bg-nu-blue text-white" : "border border-nu-line bg-white text-nu-muted hover:text-nu-ink"
            }`}
            onClick={() => setStatus(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {borrowings.loading && <Loading label="Loading borrowings..." />}
      {borrowings.error && <ErrorMessage message={borrowings.error} onRetry={borrowings.refetch} />}
      {!borrowings.loading && !borrowings.error && list.length === 0 && (
        <EmptyState
          title={status ? `No ${status} borrowings` : "No borrowings yet"}
          message="Create a booking to see it here."
        >
          <Link to="/borrowings/new" className="btn-primary">New booking</Link>
        </EmptyState>
      )}

      {!borrowings.loading && !borrowings.error && list.length > 0 && (
        <>
          <p className="mb-3 text-sm text-nu-muted">
            {list.length} borrowing(s), {totalUnits} unit(s) in total
          </p>
          <ul className="grid gap-3">
            {list.map((borrowing) => {
              const actions = nextActions(borrowing);
              const isFinal = actions.length === 0;
              const busy = busyId === borrowing._id;
              return (
                <li key={borrowing._id} className="card !p-4 sm:!p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-nu-navy">
                        {borrowing.quantity} × {borrowing.equipment?.name ?? "Deleted item"}
                      </p>
                      <p className="text-sm text-nu-muted">
                        {borrowing.borrower?.name ?? "Deleted borrower"}
                        {borrowing.purpose && ` · ${borrowing.purpose}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {borrowing.daysOverdue > 0 && <StatusBadge value="overdue" />}
                      <StatusBadge value={borrowing.status} />
                    </div>
                  </div>

                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <div className="flex gap-1.5">
                      <dt className="text-nu-muted">Requested</dt>
                      <dd className="font-medium">{formatDate(borrowing.borrowDate)}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-nu-muted">Due</dt>
                      <dd className={`font-medium ${borrowing.daysOverdue > 0 ? "text-red-700" : ""}`}>
                        {borrowing.dueDate ? formatDate(borrowing.dueDate) : "Not returned (consumable)"}
                        {borrowing.daysOverdue > 0 && ` (${borrowing.daysOverdue} day(s) late)`}
                      </dd>
                    </div>
                    {borrowing.returnDate && (
                      <div className="flex gap-1.5">
                        <dt className="text-nu-muted">Returned</dt>
                        <dd className="font-medium">{formatDate(borrowing.returnDate)}</dd>
                      </div>
                    )}
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-nu-line pt-4">
                    {actions.map((action) => (
                      <button
                        key={action.status}
                        type="button"
                        className={`${action.primary ? "btn-primary" : "btn-outline"} btn-sm`}
                        disabled={busy}
                        onClick={() => changeStatus(borrowing, action.status)}
                      >
                        {busy ? "Working..." : action.label}
                      </button>
                    ))}
                    {(isFinal || borrowing.status === "pending") && (
                      <button type="button" className="btn-danger btn-sm" disabled={busy} onClick={() => setToDelete(borrowing)}>
                        Delete
                      </button>
                    )}
                    {isFinal && <span className="self-center text-xs text-nu-muted">This borrowing is final.</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete borrowing?"
        message={`The record of ${toDelete?.quantity} × ${toDelete?.equipment?.name ?? "this item"} will be permanently removed.`}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
