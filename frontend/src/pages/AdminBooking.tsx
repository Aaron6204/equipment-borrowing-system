import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Plus, Trash2, XCircle } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../hooks/useToast";
import { borrowingSchema } from "../schemas/borrowingSchema";
import type { BorrowingFormValues } from "../schemas/borrowingSchema";
import type { Borrower, Equipment, Standing } from "../types";
import { formatPeso } from "../utils/format";
import { MAX_LOAN_ITEMS } from "../utils/cart";
import PageHeader from "../components/PageHeader";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import FormField from "../components/FormField";

type Row = BorrowingFormValues["items"][number];

// Admin page: book several different items for one borrower in a single request.
// Non-consumables are limited to 2 at a time (counting what the borrower already has);
// consumables are limited only by stock. The server checks the same rules before saving.
export default function AdminBooking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const borrowers = useFetch<Borrower[]>("/borrowers");
  const equipment = useFetch<Equipment[]>("/equipment");

  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BorrowingFormValues>({
    resolver: zodResolver(borrowingSchema),
    defaultValues: {
      borrower: "",
      // "Book this item" on an equipment page fills in the first row.
      items: [{ equipment: searchParams.get("equipment") ?? "", quantity: 1 }],
      purpose: "",
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const borrowerId = watch("borrower");
  const rows = watch("items");
  const standing = useFetch<Standing>(borrowerId ? `/borrowers/${borrowerId}/standing` : null);

  // ---------- Values worked out from the current rows ----------
  const itemsById = new Map((equipment.data ?? []).map((item) => [item._id, item]));
  const itemOf = (row: Row | undefined) => (row ? itemsById.get(row.equipment) : undefined);
  const validQuantity = (row: Row) => (Number.isInteger(row.quantity) && row.quantity > 0 ? row.quantity : 0);

  // Non-consumable units in a list of rows (these count toward the 2-item limit).
  const loanUnits = (list: Row[]) =>
    list.reduce((sum, row) => (itemOf(row) && itemOf(row)!.type !== "consumable" ? sum + validQuantity(row) : sum), 0);

  const limit = standing.data?.loanLimit ?? MAX_LOAN_ITEMS;
  const alreadyOpen = standing.data?.openLoanUnits ?? 0;
  const loansInBooking = loanUnits(rows);
  const overLimit = alreadyOpen + loansInBooking > limit;
  const cashToCollect = rows.reduce((sum, row) => {
    const item = itemOf(row);
    return item?.type === "consumable" ? sum + (item.costPerUnit ?? 0) * validQuantity(row) : sum;
  }, 0);

  // What one row is allowed to take, and what is wrong with it (if anything).
  function rowLimits(index: number) {
    const row = rows[index];
    const item = itemOf(row);
    const otherRows = rows.filter((_, i) => i !== index);
    const loanSlots = Math.max(limit - alreadyOpen - loanUnits(otherRows), 0);
    const max = !item ? undefined : item.type === "consumable" ? item.available : Math.min(item.available, loanSlots);

    let problem = "";
    if (item && validQuantity(row) > item.available) problem = `Only ${item.available} available`;
    else if (item && item.type !== "consumable" && validQuantity(row) > loanSlots) {
      problem = `Limit reached: only ${loanSlots} more non-consumable item(s) allowed for this borrower`;
    }
    return { item, loanSlots, max, problem, chosenElsewhere: new Set(otherRows.map((r) => r.equipment)) };
  }

  const rowProblems = rows.map((_, index) => rowLimits(index).problem).filter(Boolean);
  const blocked = standing.data?.blocked === true;
  const canSubmit = !blocked && !overLimit && rowProblems.length === 0;

  async function onSubmit(values: BorrowingFormValues) {
    if (!canSubmit) {
      setError("root", { message: "Fix the highlighted items before submitting." });
      return;
    }
    try {
      const response = await api.post("/borrowings/batch", values);
      showToast(`Booking created for ${response.data.length} item(s).`);
      navigate("/borrowings");
    } catch (error) {
      setError("root", { message: getErrorMessage(error) });
    }
  }

  if (borrowers.loading || equipment.loading) return <Loading label="Loading booking form..." />;
  if (borrowers.error) return <ErrorMessage message={borrowers.error} onRetry={borrowers.refetch} />;
  if (equipment.error) return <ErrorMessage message={equipment.error} onRetry={equipment.refetch} />;

  const allItems = equipment.data ?? [];
  const loanItems = allItems.filter((item) => item.type !== "consumable");
  const consumableItems = allItems.filter((item) => item.type === "consumable");
  const selectedBorrower = (borrowers.data ?? []).find((b) => b._id === borrowerId);

  return (
    <>
      <PageHeader
        title="New booking (Admin)"
        subtitle={`Book one or more items for a borrower. Up to ${MAX_LOAN_ITEMS} non-consumable items at a time; consumables have no limit.`}
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="card lg:col-span-3">
          {errors.root && (
            <p className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">
              {errors.root.message}
            </p>
          )}

          <div className="grid gap-6">
            <FormField label="Borrower" htmlFor="borrower" error={errors.borrower?.message}>
              <select id="borrower" className={`input ${errors.borrower ? "input-error" : ""}`} {...register("borrower")}>
                <option value="">Select a borrower</option>
                {(borrowers.data ?? []).map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.studentNumber})
                  </option>
                ))}
              </select>
            </FormField>

            {/* Items: one row per item, two columns (item and quantity) */}
            <fieldset>
              <legend className="label">Items</legend>
              <div className="mb-1.5 hidden grid-cols-[1fr_7rem_2.75rem] gap-3 text-xs font-medium text-nu-muted sm:grid">
                <span>Item</span>
                <span>Quantity</span>
              </div>

              <ul className="grid gap-4">
                {fields.map((field, index) => {
                  const { item, loanSlots, max, problem, chosenElsewhere } = rowLimits(index);
                  const fieldErrors = errors.items?.[index];
                  const message = fieldErrors?.equipment?.message || fieldErrors?.quantity?.message || problem;
                  const quantity = validQuantity(rows[index] ?? { equipment: "", quantity: 0 });

                  // An option is unavailable if another row has it, it has no stock,
                  // or (for non-consumables) the borrower has no loan slots left.
                  const optionDisabled = (option: Equipment) =>
                    option._id !== rows[index]?.equipment &&
                    (chosenElsewhere.has(option._id) || option.available <= 0 || (option.type !== "consumable" && loanSlots <= 0));

                  return (
                    <li key={field.id}>
                      <div className="grid grid-cols-[1fr_5.5rem_2.75rem] items-start gap-2 sm:grid-cols-[1fr_7rem_2.75rem] sm:gap-3">
                        <select
                          aria-label={`Item ${index + 1}`}
                          className={`input ${fieldErrors?.equipment ? "input-error" : ""}`}
                          {...register(`items.${index}.equipment`)}
                        >
                          <option value="">Select an item</option>
                          <optgroup label="Non-consumable (borrowed and returned)">
                            {loanItems.map((option) => (
                              <option key={option._id} value={option._id} disabled={optionDisabled(option)}>
                                {option.name} ({option.available} available)
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Consumable (bought with cash)">
                            {consumableItems.map((option) => (
                              <option key={option._id} value={option._id} disabled={optionDisabled(option)}>
                                {option.name} ({option.available} in stock, {formatPeso(option.costPerUnit ?? 0)} each)
                              </option>
                            ))}
                          </optgroup>
                        </select>

                        <input
                          type="number"
                          min={1}
                          max={max}
                          aria-label={`Quantity for item ${index + 1}`}
                          className={`input ${fieldErrors?.quantity || problem ? "input-error" : ""}`}
                          {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        />

                        <button
                          type="button"
                          className="btn-outline h-full min-h-11 px-0 text-nu-muted hover:border-red-300 hover:text-red-600 disabled:opacity-40"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                          aria-label={`Remove item ${index + 1}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>

                      {message ? (
                        <p className="field-error">{message}</p>
                      ) : item ? (
                        <p className="mt-1.5 text-xs text-nu-muted">
                          {item.type === "consumable"
                            ? `Purchase · ${formatPeso(item.costPerUnit ?? 0)} each · ${formatPeso((item.costPerUnit ?? 0) * quantity)} total`
                            : `Loan · due 9:00 PM today · up to ${max ?? 0} for this borrower`}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              <button
                type="button"
                className="btn-outline btn-sm mt-4"
                onClick={() => append({ equipment: "", quantity: 1 })}
                disabled={fields.length >= allItems.length}
              >
                <Plus className="size-4" /> Add another item
              </button>
            </fieldset>

            <FormField label="Purpose (optional)" htmlFor="purpose" error={errors.purpose?.message}>
              <textarea
                id="purpose"
                rows={3}
                className={`input ${errors.purpose ? "input-error" : ""}`}
                placeholder="e.g. Physics laboratory activity"
                {...register("purpose")}
              />
            </FormField>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Link to="/borrowings" className="btn-outline">Cancel</Link>
            <button type="submit" className="btn-primary" disabled={isSubmitting || !canSubmit}>
              {isSubmitting ? "Submitting..." : `Submit booking${rows.length > 1 ? ` (${rows.length} items)` : ""}`}
            </button>
          </div>
        </form>

        {/* Live summary of the booking */}
        <aside className="card h-fit lg:col-span-2" aria-live="polite">
          <h2 className="text-lg font-bold text-nu-navy">Booking summary</h2>

          {!selectedBorrower ? (
            <p className="mt-3 text-sm text-nu-muted">Select a borrower to see their standing and limit.</p>
          ) : (
            <div className="mt-3 grid gap-3 text-sm">
              <p>
                <span className="font-semibold text-nu-navy">{selectedBorrower.name}</span>{" "}
                <span className="text-nu-muted">({selectedBorrower.studentNumber})</span>
              </p>
              {standing.loading && <p className="text-nu-muted">Checking standing...</p>}
              {standing.data && (
                <div
                  className={`flex items-start gap-2 rounded-xl p-3 ${blocked ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}
                >
                  {blocked ? <XCircle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
                  <div>
                    <p className="font-semibold">{blocked ? "Cannot borrow right now" : "In good standing"}</p>
                    {blocked && (
                      <ul className="mt-1 list-disc pl-4">
                        {standing.data.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
              {standing.data && (
                <div className={`rounded-xl p-3 ${overLimit ? "bg-red-50 text-red-800" : "bg-nu-mist text-nu-ink"}`}>
                  <p className="font-semibold">
                    Non-consumables: {alreadyOpen + loansInBooking} of {limit}
                  </p>
                  <p className="text-xs">
                    {alreadyOpen} already requested or borrowed, {loansInBooking} in this booking
                  </p>
                </div>
              )}
            </div>
          )}

          {rows.some((row) => itemOf(row)) && (
            <>
              <ul className="mt-4 grid gap-2 border-t border-nu-line pt-4 text-sm">
                {rows.map((row, index) => {
                  const item = itemOf(row);
                  if (!item) return null;
                  return (
                    <li key={index} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 font-medium text-nu-navy">
                        {validQuantity(row)} × {item.name}
                      </span>
                      <span className="shrink-0 text-xs text-nu-muted">
                        {item.type === "consumable" ? formatPeso((item.costPerUnit ?? 0) * validQuantity(row)) : "Loan"}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {cashToCollect > 0 && (
                <div className="mt-4 flex items-baseline justify-between border-t border-nu-line pt-4">
                  <span className="text-sm font-semibold text-nu-navy">Cash to collect at pickup</span>
                  <span className="text-lg font-bold text-nu-navy">{formatPeso(cashToCollect)}</span>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </>
  );
}
