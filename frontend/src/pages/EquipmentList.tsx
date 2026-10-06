import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { useFetch } from "../hooks/useFetch";
import { useDebounce } from "../hooks/useDebounce";
import { useToast } from "../hooks/useToast";
import type { Category, Equipment } from "../types";
import PageHeader from "../components/PageHeader";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import CategoryManager from "../components/CategoryManager";

// Page 3: the inventory, with search, filters, and sorting done by the API.
export default function EquipmentList() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState(searchParams.get("type") ?? "");
  const [condition, setCondition] = useState("");
  const [sort, setSort] = useState("name");
  const debouncedSearch = useDebounce(search);

  // The filters are sent to the API as a query string.
  const query = new URLSearchParams({ sort });
  if (debouncedSearch) query.set("search", debouncedSearch);
  if (category) query.set("category", category);
  if (type) query.set("type", type);
  if (condition) query.set("condition", condition);

  const equipment = useFetch<Equipment[]>(`/equipment?${query.toString()}`);
  const categories = useFetch<Category[]>("/categories");
  const { showToast } = useToast();
  const [toDelete, setToDelete] = useState<Equipment | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Derived values: computed from the loaded list during render, not stored in state.
  const items = equipment.data ?? [];
  const totalAvailable = items.reduce((sum, item) => sum + item.available, 0);
  const lowStockCount = items.filter((item) => item.lowStock).length;
  const hasFilters = Boolean(search || category || type || condition);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/equipment/${toDelete._id}`);
      showToast(`${toDelete.name} deleted`);
      equipment.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  function clearFilters() {
    setSearch("");
    setCategory("");
    setType("");
    setCondition("");
  }

  return (
    <>
      <PageHeader title="Equipment" subtitle="Everything in the equipment room and how many units are available">
        <Link to="/equipment/new" className="btn-primary">
          <Plus className="size-4" /> Add equipment
        </Link>
      </PageHeader>

      {/* Filters */}
      <div className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-1">
          <label htmlFor="search" className="sr-only">Search equipment</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-nu-muted" />
          <input id="search" className="input pl-9" placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <label htmlFor="filter-category" className="sr-only">Category</label>
          <select id="filter-category" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {(categories.data ?? []).map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-type" className="sr-only">Type</label>
          <select id="filter-type" className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            <option value="non-consumable">Non-consumable</option>
            <option value="consumable">Consumable</option>
          </select>
        </div>
        <div>
          <label htmlFor="filter-condition" className="sr-only">Condition</label>
          <select id="filter-condition" className="input" value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="">All conditions</option>
            <option value="good">Good</option>
            <option value="damaged">Damaged</option>
            <option value="retired">Retired</option>
          </select>
        </div>
        <div>
          <label htmlFor="sort" className="sr-only">Sort by</label>
          <select id="sort" className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name">Sort: Name (A to Z)</option>
            <option value="-name">Sort: Name (Z to A)</option>
            <option value="-available">Sort: Most available</option>
            <option value="available">Sort: Least available</option>
            <option value="-totalQuantity">Sort: Largest quantity</option>
          </select>
        </div>
      </div>

      <div className="mt-6">
        {equipment.loading && <Loading label="Loading equipment..." />}
        {equipment.error && <ErrorMessage message={equipment.error} onRetry={equipment.refetch} />}

        {!equipment.loading && !equipment.error && items.length === 0 && (
          <EmptyState
            title={hasFilters ? "No equipment matches your filters" : "No equipment yet"}
            message={hasFilters ? "Try a different search or clear the filters." : "Add the first item to start lending."}
          >
            {hasFilters ? (
              <button type="button" className="btn-outline" onClick={clearFilters}>Clear filters</button>
            ) : (
              <Link to="/equipment/new" className="btn-primary">Add equipment</Link>
            )}
          </EmptyState>
        )}

        {!equipment.loading && !equipment.error && items.length > 0 && (
          <>
            <p className="mb-3 text-sm text-nu-muted">
              {items.length} item(s), {totalAvailable} unit(s) available
              {lowStockCount > 0 && `, ${lowStockCount} low on stock`}
            </p>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                // Share of units that can still be borrowed, used for the bar.
                const percent = item.totalQuantity > 0 ? Math.round((item.available / item.totalQuantity) * 100) : 0;
                return (
                  <li key={item._id} className="card flex min-w-0 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link to={`/equipment/${item._id}`} className="block truncate text-base font-bold text-nu-navy hover:underline">
                          {item.name}
                        </Link>
                        <p className="truncate text-sm text-nu-muted">{item.category?.name ?? "No category"}</p>
                      </div>
                      <StatusBadge value={item.type} />
                    </div>

                    <div className="mt-4">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-nu-muted">Available</span>
                        <span className="font-bold text-nu-navy">
                          {item.available} <span className="font-normal text-nu-muted">of {item.totalQuantity}</span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-nu-mist">
                        <div className={`h-full rounded-full ${percent > 30 ? "bg-nu-royal" : "bg-orange-500"}`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>

                    <div className="mt-3 flex min-h-6 flex-wrap gap-1.5">
                      {item.condition !== "good" && <StatusBadge value={item.condition} />}
                      {item.lowStock && <StatusBadge value={item.totalQuantity === 0 ? "out of stock" : "low stock"} />}
                    </div>

                    <div className="mt-4 flex gap-2 border-t border-nu-line pt-4">
                      <Link to={`/equipment/${item._id}`} className="btn-outline btn-sm flex-1">View</Link>
                      <Link to={`/equipment/${item._id}/edit`} className="btn-outline btn-sm" aria-label={`Edit ${item.name}`}>
                        <Pencil className="size-3.5" />
                      </Link>
                      <button type="button" className="btn-danger btn-sm" onClick={() => setToDelete(item)} aria-label={`Delete ${item.name}`}>
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {categories.data && <CategoryManager categories={categories.data} onChanged={() => { categories.refetch(); equipment.refetch(); }} />}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete equipment?"
        message={`"${toDelete?.name}" will be permanently removed from the inventory.`}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
