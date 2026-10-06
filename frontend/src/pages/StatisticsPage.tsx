import { Clock, Coins, Repeat, Timer } from "lucide-react";
import { useFetch } from "../hooks/useFetch";
import type { BorrowingStatus, Statistics } from "../types";
import { formatPeso } from "../utils/format";
import PageHeader from "../components/PageHeader";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";

const statusOrder: BorrowingStatus[] = ["pending", "approved", "released", "returned", "issued", "cancelled"];

// Page 10: summaries computed by the API from all the stored records.
export default function StatisticsPage() {
  const { data, loading, error, refetch } = useFetch<Statistics>("/statistics");

  if (loading) return <Loading label="Computing statistics..." />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!data) return null;

  // Derived values: used to size the bars below.
  const largestStatusCount = Math.max(...statusOrder.map((status) => data.byStatus[status]), 1);
  const largestUnits = Math.max(...data.mostBorrowed.map((item) => item.units), 1);

  return (
    <>
      <PageHeader title="Statistics" subtitle="Computed from every borrowing, return, and fine on record" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total borrowings" value={data.totals.borrowings} hint={`${data.totals.activeBorrowings} active now`} icon={<Repeat className="size-5" />} />
        <StatCard
          label="On-time return rate"
          value={`${data.returns.onTimeRate}%`}
          hint={`${data.returns.onTime} of ${data.returns.returned} returns`}
          icon={<Clock className="size-5" />}
          tone="green"
        />
        <StatCard label="Average loan length" value={`${data.returns.averageLoanDays} d`} hint="From release to return" icon={<Timer className="size-5" />} tone="gold" />
        <StatCard
          label="Fines collected"
          value={formatPeso(data.fines.collected)}
          hint={`${formatPeso(data.fines.unpaid)} still unpaid`}
          icon={<Coins className="size-5" />}
          tone={data.fines.unpaid > 0 ? "red" : "green"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Distribution by status */}
        <section className="card">
          <h2 className="text-lg font-bold text-nu-navy">Borrowings by status</h2>
          {data.totals.borrowings === 0 ? (
            <p className="mt-4 text-sm text-nu-muted">No borrowings have been recorded yet.</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {statusOrder.map((status) => (
                <li key={status} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3">
                  <StatusBadge value={status} />
                  <div className="h-2.5 overflow-hidden rounded-full bg-nu-mist">
                    <div className="h-full rounded-full bg-nu-royal" style={{ width: `${(data.byStatus[status] / largestStatusCount) * 100}%` }} />
                  </div>
                  <span className="text-right text-sm font-bold text-nu-navy">{data.byStatus[status]}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Most borrowed */}
        <section className="card">
          <h2 className="text-lg font-bold text-nu-navy">Most borrowed items</h2>
          <p className="text-sm text-nu-muted">Ranked by total units requested</p>
          {data.mostBorrowed.length === 0 ? (
            <p className="mt-4 text-sm text-nu-muted">No items have been borrowed yet.</p>
          ) : (
            <ol className="mt-4 grid gap-3">
              {data.mostBorrowed.map((item, index) => (
                <li key={item._id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-semibold text-nu-navy">
                      {index + 1}. {item.name}
                    </span>
                    <span className="shrink-0 text-nu-muted">
                      {item.units} unit(s), {item.times} time(s)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-nu-mist">
                    <div className="h-full rounded-full bg-nu-gold" style={{ width: `${(item.units / largestUnits) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Fines */}
        <section className="card">
          <h2 className="text-lg font-bold text-nu-navy">Fines</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: "Fines issued", value: String(data.fines.count) },
              { label: "Average fine", value: formatPeso(data.fines.average) },
              { label: "Highest fine", value: formatPeso(data.fines.highest) },
              { label: "Unpaid total", value: formatPeso(data.fines.unpaid) },
            ].map((row) => (
              <div key={row.label} className="rounded-xl bg-nu-mist p-4">
                <dt className="text-xs text-nu-muted">{row.label}</dt>
                <dd className="text-xl font-bold text-nu-navy">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Inventory */}
        <section className="card">
          <h2 className="text-lg font-bold text-nu-navy">Inventory</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: "Non-consumable items", value: data.totals.nonConsumable },
              { label: "Consumable items", value: data.totals.consumable },
              { label: "Low on stock", value: data.totals.lowStock },
              { label: "Overdue right now", value: data.totals.overdueNow },
            ].map((row) => (
              <div key={row.label} className="rounded-xl bg-nu-mist p-4">
                <dt className="text-xs text-nu-muted">{row.label}</dt>
                <dd className="text-xl font-bold text-nu-navy">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {data.totals.borrowings === 0 && (
        <div className="mt-6">
          <EmptyState title="Not enough data yet" message="Statistics fill in as borrowings are created and returned." />
        </div>
      )}
    </>
  );
}
