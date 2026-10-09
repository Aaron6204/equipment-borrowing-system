import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Boxes, ClipboardList, PackageMinus, Users } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../hooks/useToast";
import type { Borrowing, Equipment, Statistics } from "../types";
import PageHeader from "../components/PageHeader";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";

export default function Dashboard() {
  const stats = useFetch<Statistics>("/statistics");
  
  // 1. Fetch items that are currently "in_review" instead of "pending"
  const inReview = useFetch<Borrowing[]>("/borrowings?status=in_review");
  const lowStock = useFetch<Equipment[]>("/equipment/low-stock");
  
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function approve(borrowing: Borrowing) {
    setBusyId(borrowing._id);
    try {
      // 2. Move the status to "ready_for_pickup"
      await api.patch(`/borrowings/${borrowing._id}/status`, { status: "ready_for_pickup" });
      showToast(`Approved booking for ${borrowing.equipment?.name ?? "item"}`);
      inReview.refetch();
      stats.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader title="Dashboard" subtitle="What is happening in the equipment room right now">
        <Link to="/borrowings/new" className="btn-primary">
          New booking
        </Link>
      </PageHeader>

      {stats.loading && <Loading label="Loading summary..." />}
      {stats.error && <ErrorMessage message={stats.error} onRetry={stats.refetch} />}
      {stats.data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Equipment items"
            value={stats.data.totals.equipment}
            hint={`${stats.data.totals.nonConsumable} non-consumable, ${stats.data.totals.consumable} consumable`}
            icon={<Boxes className="size-5" />}
          />
          <StatCard
            label="Active bookings"
            value={stats.data.totals.activeBorrowings}
            // Temporarily hide the "pending" breakdown hint until we update the Statistics controller on the backend
            hint="Total items currently checked out" 
            icon={<ClipboardList className="size-5" />}
            tone="gold"
          />
          <StatCard
            label="Overdue items"
            value={stats.data.totals.overdueNow}
            hint={stats.data.totals.overdueNow > 0 ? "Follow up with borrowers" : "Everything is on time"}
            icon={<AlertTriangle className="size-5" />}
            tone={stats.data.totals.overdueNow > 0 ? "red" : "green"}
          />
          <StatCard
            label="Registered users"
            value={stats.data.totals.borrowers}
            hint={`${stats.data.returns.onTimeRate}% of returns on time`}
            icon={<Users className="size-5" />}
            tone="green"
          />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Bookings waiting for approval */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-nu-navy">Waiting for approval</h2>
            <Link to="/borrowings" className="text-sm font-semibold text-nu-royal hover:underline">
              View all
            </Link>
          </div>
          
          {inReview.loading && <Loading />}
          {inReview.error && <ErrorMessage message={inReview.error} onRetry={inReview.refetch} />}
          
          {inReview.data && inReview.data.length === 0 && (
            <EmptyState title="No bookings in review" message="New booking requests will appear here." />
          )}
          
          {inReview.data && inReview.data.length > 0 && (
            <ul className="card divide-y divide-nu-line !p-0">
              {inReview.data.map((borrowing) => (
                <li key={borrowing._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-nu-navy">
                      {borrowing.quantity} × {borrowing.equipment?.name ?? "Deleted item"}
                    </p>
                    <p className="truncate text-sm text-nu-muted">{borrowing.borrower?.name ?? "Unknown borrower"}</p>
                  </div>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    disabled={busyId === borrowing._id}
                    onClick={() => approve(borrowing)}
                  >
                    {busyId === borrowing._id ? "Approving..." : "Approve"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Consumables that need restocking */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-nu-navy">Low stock consumables</h2>
            <Link to="/equipment?type=consumable" className="text-sm font-semibold text-nu-royal hover:underline">
              View all
            </Link>
          </div>
          {lowStock.loading && <Loading />}
          {lowStock.error && <ErrorMessage message={lowStock.error} onRetry={lowStock.refetch} />}
          {lowStock.data && lowStock.data.length === 0 && (
            <EmptyState title="Stock levels are fine" message="No consumable is at or below its reorder level." />
          )}
          {lowStock.data && lowStock.data.length > 0 && (
            <ul className="card divide-y divide-nu-line !p-0">
              {lowStock.data.map((item) => (
                <li key={item._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <PackageMinus className="size-5 shrink-0 text-orange-600" />
                    <div className="min-w-0">
                      <Link to={`/equipment/${item._id}`} className="block truncate font-semibold text-nu-navy hover:underline">
                        {item.name}
                      </Link>
                      <p className="text-sm text-nu-muted">
                        {item.totalQuantity} left, reorder at {item.reorderLevel}
                      </p>
                    </div>
                  </div>
                  <StatusBadge value={item.totalQuantity === 0 ? "out of stock" : "low stock"} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}