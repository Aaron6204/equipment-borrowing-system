import { useState } from "react";
import { Link, useSearchParams, useOutletContext } from "react-router-dom";
import { Pencil, Plus, Search, Trash2, ShoppingCart, Ban, Minus, Info } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { useFetch } from "../hooks/useFetch";
import { useDebounce } from "../hooks/useDebounce";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import type { Borrowing, Category, Equipment } from "../types";
import { formatPeso } from "../utils/format";
import { MAX_LOAN_ITEMS, loanUnitsInCart, openLoanUnits } from "../utils/cart";
import type { CartItem } from "../components/Layout";
import PageHeader from "../components/PageHeader";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import CategoryManager from "../components/CategoryManager";

type OutletContextType = {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
};

export default function EquipmentList() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isSuspended = (user as any)?.status === "suspended";
  const { cart, setCart } = useOutletContext<OutletContextType>();

  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState(searchParams.get("type") ?? "");
  const [condition, setCondition] = useState("");
  const [sort, setSort] = useState("name");
  const debouncedSearch = useDebounce(search);

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

  const items = equipment.data ?? [];
  const totalAvailable = items.reduce((sum, item) => sum + item.available, 0);
  const lowStockCount = items.filter((item) => item.lowStock).length;
  const hasFilters = Boolean(search || category || type || condition);

  // Borrowing limit: at most 2 non-consumables at a time, counting what the student has already
  // requested or borrowed plus what is in the cart. Consumables only stop at the stock.
  const myBookings = useFetch<Borrowing[]>(!isAdmin && user?.id ? `/borrowings?borrower=${user.id}` : null);
  const loansAlreadyOpen = openLoanUnits(myBookings.data ?? []);
  const loanSlotsLeft = Math.max(MAX_LOAN_ITEMS - loansAlreadyOpen - loanUnitsInCart(cart), 0);

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

  function addToCart(item: Equipment) {
    if (item.type !== "consumable" && loanSlotsLeft <= 0) {
      showToast(`You can only borrow ${MAX_LOAN_ITEMS} non-consumable items at a time.`, "error");
      return;
    }
    setCart((prev) => [...prev, { ...item, cartQuantity: 1 }]);
  }

  function updateQuantity(itemId: string, delta: number) {
    setCart((prev) =>
      prev.map(item => {
        if (item._id === itemId) {
          return { ...item, cartQuantity: item.cartQuantity + delta };
        }
        return item;
      }).filter(item => item.cartQuantity > 0)
    );
  }

  // Consumables: set a typed amount, kept between 1 and the units available.
  function setQuantity(item: Equipment, typed: number): number {
    const quantity = Number.isFinite(typed) ? Math.min(Math.max(Math.floor(typed), 1), item.available) : 1;
    setCart((prev) => prev.map((c) => (c._id === item._id ? { ...c, cartQuantity: quantity } : c)));
    return quantity;
  }

  return (
    <>
      <PageHeader title="Equipment" subtitle="Everything in the equipment room and how many units are available">
        {isAdmin && (
          <Link to="/equipment/new" className="btn-primary">
            <Plus className="size-4" /> Add equipment
          </Link>
        )}
      </PageHeader>

      {isSuspended && !isAdmin && (
        <div className="mb-6 rounded-xl bg-red-50 p-4 border border-red-200 flex items-start gap-3 text-red-800 shadow-sm">
          <Ban className="size-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold">Account Suspended</h3>
            <p className="text-sm mt-1">Your borrowing privileges have been temporarily revoked. You cannot add items to your bag. Please contact the administrator for assistance.</p>
          </div>
        </div>
      )}

      {/* Borrowing limit, for students */}
      {!isAdmin && !isSuspended && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-nu-line bg-white p-4 text-sm text-nu-ink">
          <Info className="mt-0.5 size-4 shrink-0 text-nu-royal" />
          <p>
            <span className="font-semibold text-nu-navy">
              You can borrow {loanSlotsLeft} more non-consumable item{loanSlotsLeft === 1 ? "" : "s"}
            </span>{" "}
            (up to {MAX_LOAN_ITEMS} at a time{loansAlreadyOpen > 0 ? `, ${loansAlreadyOpen} already requested or borrowed` : ""}).
            Consumables have no limit, only what is in stock.
          </p>
        </div>
      )}

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
            ) : isAdmin ? (
              <Link to="/equipment/new" className="btn-primary">Add equipment</Link>
            ) : null}
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
                const percent = item.totalQuantity > 0 ? Math.round((item.available / item.totalQuantity) * 100) : 0;
                const canBorrow = item.available > 0 && item.condition !== "retired";
                
                const cartItem = cart.find((i) => i._id === item._id);
                const inCart = !!cartItem;
                // Non-consumables count toward the 2-item limit; consumables only stop at the stock.
                const isConsumable = item.type === "consumable";
                const limitReached = !isConsumable && loanSlotsLeft <= 0;

                return (
                  <li key={item._id} className="card flex min-w-0 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {/* Students just see text, Admins see a clickable link */}
                        {isAdmin ? (
                          <Link to={`/equipment/${item._id}`} className="block truncate text-base font-bold text-nu-navy hover:underline">
                            {item.name}
                          </Link>
                        ) : (
                          <span className="block truncate text-base font-bold text-nu-navy">
                            {item.name}
                          </span>
                        )}
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

                    <div className="mt-3 flex min-h-6 flex-wrap items-center gap-1.5">
                      {/* Consumables are bought, so show what one unit costs. */}
                      {item.type === "consumable" && (
                        <span className="mr-auto text-sm font-semibold text-nu-navy">
                          {formatPeso(item.costPerUnit ?? 0)} <span className="font-normal text-nu-muted">per unit</span>
                        </span>
                      )}
                      {item.type !== "consumable" && item.condition !== "good" && <StatusBadge value={item.condition} />}
                      {item.lowStock && <StatusBadge value={item.totalQuantity === 0 ? "out of stock" : "low stock"} />}
                    </div>
                    {item.type !== "consumable" && item.condition === "damaged" && item.damageNotes && (
                      <p className="mt-2 line-clamp-2 text-sm text-red-700" title={item.damageNotes}>
                        {item.damageNotes}
                      </p>
                    )}

                    <div className="mt-4 flex gap-2 border-t border-nu-line pt-4">
                      {isAdmin ? (
                        <>
                          <Link to={`/equipment/${item._id}`} className="btn-outline btn-sm flex-1">View Details</Link>
                          <Link to={`/equipment/${item._id}/edit`} className="btn-outline btn-sm" aria-label={`Edit ${item.name}`}>
                            <Pencil className="size-3.5" />
                          </Link>
                          <button type="button" className="btn-danger btn-sm" onClick={() => setToDelete(item)} aria-label={`Delete ${item.name}`}>
                            <Trash2 className="size-3.5" />
                          </button>
                        </>
                      ) : (
                        inCart ? (
                          <div className="flex flex-1 items-center justify-between rounded-lg bg-gray-50 border border-gray-200 p-1">
                            <button 
                              type="button" 
                              onClick={() => updateQuantity(item._id, -1)} 
                              className="btn-outline btn-sm px-3 bg-white"
                            >
                              <Minus className="size-3.5" />
                            </button>
                            {isConsumable ? (
                              // Consumables can be bought in any amount up to the stock, so allow typing it.
                              // The amount is saved when the box loses focus (or on Enter).
                              <input
                                key={cartItem.cartQuantity}
                                type="number"
                                min={1}
                                max={item.available}
                                defaultValue={cartItem.cartQuantity}
                                aria-label={`Quantity of ${item.name}`}
                                className="w-20 rounded-md border border-gray-200 bg-white px-2 py-1 text-center font-bold text-nu-navy"
                                onBlur={(e) => {
                                  e.currentTarget.value = String(setQuantity(item, e.currentTarget.valueAsNumber));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") e.currentTarget.blur();
                                }}
                              />
                            ) : (
                              <span className="font-bold text-nu-navy">{cartItem.cartQuantity}</span>
                            )}
                            <button
                              type="button"
                              onClick={() => updateQuantity(item._id, 1)}
                              disabled={limitReached || cartItem.cartQuantity >= item.available}
                              className="btn-outline btn-sm px-3 bg-white disabled:opacity-50"
                              aria-label={`Add one more ${item.name}`}
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!canBorrow || limitReached}
                            onClick={() => addToCart(item)}
                            className="btn-primary btn-sm flex-1 disabled:opacity-50"
                          >
                            {limitReached && canBorrow ? (
                              `Limit reached (${MAX_LOAN_ITEMS} max)`
                            ) : (
                              <>
                                <ShoppingCart className="size-4 mr-1 inline" /> Add to Cart
                              </>
                            )}
                          </button>
                        )
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {isAdmin && categories.data && <CategoryManager categories={categories.data} onChanged={() => { categories.refetch(); equipment.refetch(); }} />}

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