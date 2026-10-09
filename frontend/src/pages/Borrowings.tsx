import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Settings2 } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import type { Borrowing } from "../types";
import { formatDate, formatPeso } from "../utils/format";
import PageHeader from "../components/PageHeader";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";

const tabs: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "in_review", label: "In Review" },
  { value: "ready_for_pickup", label: "Ready for Pickup" },
  { value: "active", label: "Active" },
  { value: "returned", label: "Returned" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

function nextActions(borrowing: Borrowing, isAdmin: boolean): { status: string; label: string; primary: boolean }[] {
  if (borrowing.status === "in_review") {
    if (isAdmin) {
      return [
        { status: "ready_for_pickup", label: "Approve Booking", primary: true },
        { status: "cancelled", label: "Cancel", primary: false },
      ];
    } else {
      return [{ status: "cancelled", label: "Cancel Reservation", primary: false }];
    }
  }
  
  if (borrowing.status === "ready_for_pickup") {
    if (isAdmin) {
      return [
        { status: "active", label: "Item Handed Over", primary: true },
        { status: "cancelled", label: "Cancel", primary: false },
      ];
    }
    return [];
  }
  
  if (borrowing.status === "active" || borrowing.status === "overdue") {
    if (isAdmin) {
      return [{ status: "returned", label: "Mark Returned", primary: true }];
    }
  }
  
  return [];
}

export default function Borrowings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const [status, setStatus] = useState<string>("");
  
  // Build query string so borrowers only see their own bookings
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (!isAdmin && user?.id) query.set("borrower", user.id);
const url = query.toString() ? `/borrowings?${query.toString()}` : "/borrowings";
  const borrowings = useFetch<Borrowing[]>(url);
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Borrowing | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function changeStatus(borrowing: Borrowing, newStatus: string) {
    setBusyId(borrowing._id);
    try {
      const response = await api.patch(`/borrowings/${borrowing._id}/status`, { status: newStatus });
      const fine = response.data.fine;
      showToast(
        fine
          ? `Returned ${fine.daysOverdue} day(s) late. A fine of ${formatPeso(fine.amount)} was created.`
          : `Booking moved to ${newStatus.replace(/_/g, ' ')}`
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
      showToast("Booking deleted");
      borrowings.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  const list = borrowings.data ?? [];
  const totalUnits = list.reduce((sum, borrowing) => sum + borrowing.quantity, 0);

  return (
    <>
      <PageHeader 
        title={isAdmin ? "Bookings Management" : "My Bookings"} 
        subtitle={isAdmin ? "Approve, release, and manage equipment reservations" : "Track the status of your requested equipment"}
      >
        <Link to={isAdmin ? "/borrowings/new" : "/equipment"} className="btn-primary">
          <Plus className="size-4" /> {isAdmin ? "New booking" : "Browse Equipment"}
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

      {borrowings.loading && <Loading label="Loading bookings..." />}
      {borrowings.error && <ErrorMessage message={borrowings.error} onRetry={borrowings.refetch} />}
      {!borrowings.loading && !borrowings.error && list.length === 0 && (
        <EmptyState
          title={status ? `No ${status.replace(/_/g, ' ')} bookings` : "No bookings found"}
          message={isAdmin ? "Create a booking to see it here." : "Your requested equipment will appear here."}
        >
          <Link to={isAdmin ? "/borrowings/new" : "/equipment"} className="btn-primary">
            {isAdmin ? "New booking" : "Browse Equipment"}
          </Link>
        </EmptyState>
      )}

      {!borrowings.loading && !borrowings.error && list.length > 0 && (
        <>
          <p className="mb-3 text-sm text-nu-muted">
            {list.length} booking(s), {totalUnits} unit(s) in total
          </p>
          <ul className="grid gap-3">
            {list.map((borrowing) => {
              const actions = nextActions(borrowing, isAdmin);
              const busy = busyId === borrowing._id;
              const isConsumable = borrowing.equipment?.type === "consumable";
              const showStockAdjustment = isAdmin && borrowing.status === "returned" && isConsumable;

              return (
                <li key={borrowing._id} className="card !p-4 sm:!p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-nu-navy">
                        {borrowing.quantity} × {borrowing.equipment?.name ?? "Deleted item"}
                      </p>
                      <p className="text-sm text-nu-muted">
                        {isAdmin && <span className="font-semibold text-nu-ink mr-1">{borrowing.borrower?.name ?? "Unknown"}</span>}
                        {borrowing.purpose && `· ${borrowing.purpose}`}
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
                        {borrowing.dueDate ? formatDate(borrowing.dueDate) : "N/A (consumable)"}
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
                    
                    {showStockAdjustment && (
                      <Link to={`/equipment/${borrowing.equipment?._id}/edit`} className="btn-outline btn-sm text-orange-600 border-orange-200 hover:bg-orange-50">
                        <Settings2 className="size-3.5 mr-1 inline" /> Adjust Stock
                      </Link>
                    )}

                    {isAdmin && (actions.length === 0 || borrowing.status === "in_review") && (
                      <button type="button" className="btn-danger btn-sm" disabled={busy} onClick={() => setToDelete(borrowing)}>
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete booking?"
        message={`The record of ${toDelete?.quantity} × ${toDelete?.equipment?.name ?? "this item"} will be permanently removed.`}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}