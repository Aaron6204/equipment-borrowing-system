import { useSearchParams } from "react-router-dom";
import { Banknote, Clock, Coins, Repeat } from "lucide-react";
import { useFetch } from "../hooks/useFetch";
import type { Statistics, StatisticsPeriod } from "../types";
import { formatDate, formatPeso } from "../utils/format";
import PageHeader from "../components/PageHeader";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";

// Loan statuses, in pipeline order (consumable purchases are shown in their own section).
const statusOrder: (keyof Statistics["byStatus"])[] = ["in_review", "ready_for_pickup", "active", "overdue", "returned", "cancelled"];

// The time filters shown above the statistics.
const periods: { value: StatisticsPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
  { value: "quarter", label: "Past 3 months" },
  { value: "year", label: "Past year" },
  { value: "all", label: "All time" },
];

// A grid of small labelled numbers used inside the cards below.
function Tiles({ rows }: { rows: { label: string; value: string | number }[] }) {
  return (
    <dl className="mt-4 grid grid-cols-2 gap-3">
      {rows.map((row) => (
        <div key={row.label} className="rounded-xl bg-nu-mist p-4">
          <dt className="text-xs text-nu-muted">{row.label}</dt>
          <dd className="text-xl font-bold text-nu-navy">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// Page 10: summaries computed by the API, filtered by a time period.
export default function StatisticsPage() {
  // The chosen period lives in the address (?period=month) so it survives a refresh.
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("period") as StatisticsPeriod | null;
  const period: StatisticsPeriod = periods.some((p) => p.value === requested) ? requested! : "all";

  const { data, loading, error, refetch } = useFetch<Statistics>(`/statistics?period=${period}`);

  function choosePeriod(value: StatisticsPeriod) {
    setSearchParams(value === "all" ? {} : { period: value }, { replace: true });
  }

  const subtitle = !data?.period.since
    ? "Every borrowing, purchase, return, and fine on record"
    : data.period.key === "today"
      ? `Today, ${formatDate(data.period.since)}`
      : `${data.period.label}: ${formatDate(data.period.since)} to today`;

  // Derived values: used to size the bars below.
  const largestStatusCount = data ? Math.max(...statusOrder.map((status) => data.byStatus[status] || 0), 1) : 1;
  const largestUnits = data ? Math.max(...data.mostBorrowed.map((item) => item.units), 1) : 1;
  const largestSold = data ? Math.max(...data.sales.topSellers.map((item) => item.units), 1) : 1;
  const nothingInPeriod = data && data.totals.borrowings === 0 && data.sales.count === 0;

  return (
    <>
      <PageHeader title="Statistics" subtitle={subtitle} />

      {/* Period filter */}
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter by time period">
        {periods.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={period === option.value}
            className={`min-h-9 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              period === option.value ? "bg-nu-blue text-white" : "border border-nu-line bg-white text-nu-muted hover:text-nu-ink"
            }`}
            onClick={() => choosePeriod(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading && !data && <Loading label="Computing statistics..." />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}

      {data && (
        // Keep the old numbers on screen, faded, while the new period loads.
        <div className={`transition-opacity ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Loans"
              value={data.totals.borrowings}
              hint={`${data.totals.activeBorrowings} out right now`}
              icon={<Repeat className="size-5" />}
            />
            <StatCard
              label="On-time return rate"
              value={`${data.returns.onTimeRate}%`}
              hint={`${data.returns.onTime} of ${data.returns.returned} returns, kept ${data.returns.averageLoanDays} d on average`}
              icon={<Clock className="size-5" />}
              tone="green"
            />
            <StatCard
              label="Consumable sales"
              value={formatPeso(data.sales.revenue)}
              hint={`${data.sales.units} unit(s) sold in ${data.sales.count} purchase(s)`}
              icon={<Banknote className="size-5" />}
              tone="gold"
            />
            <StatCard
              label="Fines collected"
              value={formatPeso(data.fines.collected)}
              hint={`${formatPeso(data.fines.unpaid)} still unpaid`}
              icon={<Coins className="size-5" />}
              tone={data.fines.unpaid > 0 ? "red" : "green"}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Loans by status */}
            <section className="card">
              <h2 className="text-lg font-bold text-nu-navy">Loans by status</h2>
              <p className="text-sm text-nu-muted">Non-consumable requests made in this period</p>
              {data.totals.borrowings === 0 ? (
                <p className="mt-4 text-sm text-nu-muted">No loans were requested in this period.</p>
              ) : (
                <ul className="mt-4 grid gap-3">
                  {statusOrder.map((status) => {
                    const count = data.byStatus[status] || 0;
                    return (
                      <li key={status} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3">
                        <StatusBadge value={status} />
                        <div className="h-2.5 overflow-hidden rounded-full bg-nu-mist">
                          <div className="h-full rounded-full bg-nu-royal" style={{ width: `${(count / largestStatusCount) * 100}%` }} />
                        </div>
                        <span className="text-right text-sm font-bold text-nu-navy">{count}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Most borrowed */}
            <section className="card">
              <h2 className="text-lg font-bold text-nu-navy">Most borrowed items</h2>
              <p className="text-sm text-nu-muted">Ranked by total units requested</p>
              {data.mostBorrowed.length === 0 ? (
                <p className="mt-4 text-sm text-nu-muted">No items were borrowed in this period.</p>
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

            {/* Consumable sales */}
            <section className="card">
              <h2 className="text-lg font-bold text-nu-navy">Consumable sales</h2>
              <p className="text-sm text-nu-muted">Paid in cash at pickup</p>
              <Tiles
                rows={[
                  { label: "Revenue", value: formatPeso(data.sales.revenue) },
                  { label: "Units sold", value: data.sales.units },
                  { label: "Average purchase", value: formatPeso(data.sales.average) },
                  { label: "Waiting for pickup now", value: data.sales.awaitingPickup },
                ]}
              />
            </section>

            {/* Top-selling consumables */}
            <section className="card">
              <h2 className="text-lg font-bold text-nu-navy">Top-selling consumables</h2>
              <p className="text-sm text-nu-muted">Ranked by units sold</p>
              {data.sales.topSellers.length === 0 ? (
                <p className="mt-4 text-sm text-nu-muted">No consumables were bought in this period.</p>
              ) : (
                <ol className="mt-4 grid gap-3">
                  {data.sales.topSellers.map((item, index) => (
                    <li key={item._id}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-semibold text-nu-navy">
                          {index + 1}. {item.name}
                        </span>
                        <span className="shrink-0 text-nu-muted">
                          {item.units} unit(s), {formatPeso(item.revenue)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-nu-mist">
                        <div className="h-full rounded-full bg-nu-royal" style={{ width: `${(item.units / largestSold) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* Fines */}
            <section className="card">
              <h2 className="text-lg font-bold text-nu-navy">Fines</h2>
              <p className="text-sm text-nu-muted">Issued in this period, plus what is still owed</p>
              <Tiles
                rows={[
                  { label: "Fines issued", value: String(data.fines.count) },
                  { label: "Average fine", value: formatPeso(data.fines.average) },
                  { label: "Highest fine", value: formatPeso(data.fines.highest) },
                  { label: "Unpaid now", value: formatPeso(data.fines.unpaid) },
                ]}
              />
            </section>

            {/* Inventory, always the current state */}
            <section className="card">
              <h2 className="text-lg font-bold text-nu-navy">Right now</h2>
              <p className="text-sm text-nu-muted">Current inventory, not affected by the period</p>
              <Tiles
                rows={[
                  { label: "Non-consumable items", value: data.totals.nonConsumable },
                  { label: "Consumable items", value: data.totals.consumable },
                  { label: "Low on stock", value: data.totals.lowStock },
                  { label: "Overdue loans", value: data.totals.overdueNow },
                ]}
              />
            </section>
          </div>

          {nothingInPeriod && (
            <div className="mt-6">
              <EmptyState
                title="Nothing recorded in this period"
                message="Try a longer period. Statistics fill in as items are borrowed, returned, and bought."
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
