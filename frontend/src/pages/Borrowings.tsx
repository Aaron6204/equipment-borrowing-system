import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import type { Borrowing, Fine } from "../types";
import { formatDate, formatPeso } from "../utils/format";
import { groupBookings } from "../utils/bookings";
import type { Booking, BookingStatus } from "../utils/bookings";
import PageHeader from "../components/PageHeader";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";

const tabs: { value: BookingStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "in_review", label: "In Review" },
  { value: "ready_for_pickup", label: "Ready for Pickup" },
  { value: "active", label: "Active" },
  { value: "overdue", label: "Overdue" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

type Action = "approve" | "handover" | "return" | "cancel";

// Loans still out (not yet returned) in a booking.
const outstandingLoans = (booking: Booking) =>
  booking.loans.filter((item) => item.status === "active" || item.status === "overdue");

// The buttons a booking shows, depending on its status and who is looking.
function bookingActions(booking: Booking, isAdmin: boolean): { action: Action; label: string; primary: boolean }[] {
  if (!isAdmin) {
    return booking.status === "in_review" ? [{ action: "cancel", label: "Cancel Booking", primary: false }] : [];
  }
  switch (booking.status) {
    case "in_review":
      return [
        { action: "approve", label: "Approve Booking", primary: true },
        { action: "cancel", label: "Cancel", primary: false },
      ];
    case "ready_for_pickup":
      return [
        {
          action: "handover",
          label: booking.cashTotal > 0 ? `Handed Over & ${formatPeso(booking.cashTotal)} Paid` : "Handed Over",
          primary: true,
        },
        { action: "cancel", label: "Cancel", primary: false },
      ];
    case "active":
    case "overdue":
      return [
        {
          action: "return",
          label: outstandingLoans(booking).length > 1 ? "Mark All Returned" : "Mark Returned",
          primary: true,
        },
      ];
    default:
      return [];
  }
}

// One line under an item: what kind it is and its due date or price.
function itemDetail(item: Borrowing) {
  if (item.equipment?.type === "consumable" || item.status === "purchased") {
    const each = item.quantity > 1 ? ` (${formatPeso(item.unitPrice ?? 0)} each)` : "";
    return `Purchase · ${formatPeso(item.totalPrice ?? 0)}${each}`;
  }
  if (item.returnDate) return `Loan · returned ${formatDate(item.returnDate)}`;
  return `Loan · due ${formatDate(item.dueDate)}${item.daysOverdue > 0 ? ` (${item.daysOverdue} day(s) late)` : ""}`;
}

export default function Borrowings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [status, setStatus] = useState<BookingStatus | "">("");

  // Students only see their own bookings.
  const url = !isAdmin && user?.id ? `/borrowings?borrower=${user.id}` : "/borrowings";
  const borrowings = useFetch<Borrowing[]>(url);
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Move a whole booking at once (approve, hand over, return, cancel).
  async function runAction(booking: Booking, action: Action) {
    setBusyId(booking.id);
    try {
      const response = await api.patch<{ fines: Fine[]; cashCollected: number }>(`/borrowings/bookings/${booking.id}/status`, { action });
      const { fines, cashCollected } = response.data;
      const fineTotal = fines.reduce((sum, fine) => sum + fine.amount, 0);
      const messages: Record<Action, string> = {
        approve: `Booking ${booking.reference} approved and ready for pickup.`,
        handover: cashCollected > 0 ? `Handed over. ${formatPeso(cashCollected)} collected in cash.` : "Booking handed over.",
        return: fines.length
          ? `Returned. ${fines.length} late item(s): ${formatPeso(fineTotal)} in fines created.`
          : "Items returned.",
        cancel: `Booking ${booking.reference} cancelled.`,
      };
      showToast(messages[action]);
      borrowings.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setBusyId(null);
    }
  }

  // Return one item on its own (when a student brings back only part of a booking).
  async function returnItem(booking: Booking, item: Borrowing) {
    setBusyId(booking.id);
    try {
      const response = await api.patch<{ fine: Fine | null }>(`/borrowings/${item._id}/status`, { status: "returned" });
      const fine = response.data.fine;
      showToast(
        fine
          ? `${item.equipment?.name} returned ${fine.daysOverdue} day(s) late. A fine of ${formatPeso(fine.amount)} was created.`
          : `${item.equipment?.name ?? "Item"} returned.`
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
      await api.delete(`/borrowings/bookings/${toDelete.id}`);
      showToast(`Booking ${toDelete.reference} deleted`);
      borrowings.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  const allBookings = groupBookings(borrowings.data ?? []);
  const list = status ? allBookings.filter((booking) => booking.status === status) : allBookings;
  const itemCount = list.reduce((sum, booking) => sum + booking.items.length, 0);
  const statusLabel = tabs.find((tab) => tab.value === status)?.label.toLowerCase();

  return (
    <>
      <PageHeader
        title={isAdmin ? "Bookings Management" : "My Bookings"}
        subtitle={isAdmin ? "Approve, hand over, and close bookings" : "Track the status of your bookings"}
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

      {borrowings.loading && !borrowings.data && <Loading label="Loading bookings..." />}
      {borrowings.error && <ErrorMessage message={borrowings.error} onRetry={borrowings.refetch} />}
      {borrowings.data && list.length === 0 && (
        <EmptyState
          title={status ? `No ${statusLabel} bookings` : "No bookings found"}
          message={isAdmin ? "Create a booking to see it here." : "Your bookings will appear here."}
        >
          <Link to={isAdmin ? "/borrowings/new" : "/equipment"} className="btn-primary">
            {isAdmin ? "New booking" : "Browse Equipment"}
          </Link>
        </EmptyState>
      )}

      {borrowings.data && list.length > 0 && (
        <>
          <p className="mb-3 text-sm text-nu-muted">
            {list.length} booking(s), {itemCount} item(s)
          </p>
          <ul className="grid gap-3">
            {list.map((booking) => {
              const actions = bookingActions(booking, isAdmin);
              const busy = busyId === booking.id;
              const outstanding = outstandingLoans(booking);
              const canDelete = isAdmin && ["in_review", "completed", "cancelled"].includes(booking.status);
              const paid = booking.purchases.length > 0 && booking.purchases.every((item) => item.status === "purchased");

              return (
                <li key={booking.id} className="card !p-4 sm:!p-5">
                  {/* Header: reference, borrower, overall status */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-nu-navy">
                        Booking {booking.reference}{" "}
                        <span className="font-normal text-nu-muted">
                          · {booking.items.length} item{booking.items.length === 1 ? "" : "s"}
                        </span>
                      </p>
                      <p className="text-sm text-nu-muted">
                        {isAdmin && <span className="font-semibold text-nu-ink">{booking.borrower?.name ?? "Unknown"}</span>}
                        {isAdmin && booking.purpose && " · "}
                        {booking.purpose}
                      </p>
                    </div>
                    <StatusBadge value={booking.status} />
                  </div>

                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <div className="flex gap-1.5">
                      <dt className="text-nu-muted">Requested</dt>
                      <dd className="font-medium">{formatDate(booking.requestedAt)}</dd>
                    </div>
                    {booking.dueDate && booking.status !== "completed" && booking.status !== "cancelled" && (
                      <div className="flex gap-1.5">
                        <dt className="text-nu-muted">Due</dt>
                        <dd className={`font-medium ${booking.daysOverdue > 0 ? "text-red-700" : ""}`}>
                          {formatDate(booking.dueDate)}
                          {booking.daysOverdue > 0 && ` (${booking.daysOverdue} day(s) late)`}
                        </dd>
                      </div>
                    )}
                    {booking.cashTotal > 0 && (
                      <div className="flex gap-1.5">
                        <dt className="text-nu-muted">{paid ? "Paid (cash)" : "To pay (cash)"}</dt>
                        <dd className="font-medium">{formatPeso(booking.cashTotal)}</dd>
                      </div>
                    )}
                  </dl>

                  {/* The items in this booking */}
                  <ul className="mt-3 divide-y divide-nu-line rounded-xl border border-nu-line">
                    {booking.items.map((item) => (
                      <li key={item._id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="font-semibold text-nu-navy">
                            {item.quantity} × {item.equipment?.name ?? "Deleted item"}
                          </p>
                          <p className={`text-xs ${item.daysOverdue > 0 ? "text-red-700" : "text-nu-muted"}`}>{itemDetail(item)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge value={item.daysOverdue > 0 ? "overdue" : item.status} />
                          {/* Return one item on its own when more than one is still out */}
                          {isAdmin && outstanding.length > 1 && outstanding.includes(item) && (
                            <button
                              type="button"
                              className="btn-outline btn-sm"
                              disabled={busy}
                              onClick={() => returnItem(booking, item)}
                            >
                              Returned
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>

                  {(actions.length > 0 || canDelete || (!isAdmin && booking.status === "ready_for_pickup")) && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {actions.map((action) => (
                        <button
                          key={action.action}
                          type="button"
                          className={`${action.primary ? "btn-primary" : "btn-outline"} btn-sm`}
                          disabled={busy}
                          onClick={() => runAction(booking, action.action)}
                        >
                          {busy ? "Working..." : action.label}
                        </button>
                      ))}

                      {!isAdmin && booking.status === "ready_for_pickup" && (
                        <p className="text-sm font-medium text-nu-navy">
                          Ready for pickup.
                          {booking.cashTotal > 0 && ` Bring ${formatPeso(booking.cashTotal)} in cash.`}
                        </p>
                      )}

                      {canDelete && (
                        <button type="button" className="btn-danger btn-sm" disabled={busy} onClick={() => setToDelete(booking)}>
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete booking?"
        message={`Booking ${toDelete?.reference} and its ${toDelete?.items.length} item(s) will be permanently removed.`}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
