import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../hooks/useToast";
import { borrowingSchema } from "../schemas/borrowingSchema";
import type { BorrowingFormValues } from "../schemas/borrowingSchema";
import type { Availability, Borrower, Equipment, Standing } from "../types";
import { addDays, formatDate, formatPeso } from "../utils/format";
import PageHeader from "../components/PageHeader";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import FormField from "../components/FormField";
import StatusBadge from "../components/StatusBadge";

// Page 7: the booking screen, where a borrowing request is created.
export default function Booking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const borrowers = useFetch<Borrower[]>("/borrowers");
  const equipment = useFetch<Equipment[]>("/equipment");

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BorrowingFormValues>({
    resolver: zodResolver(borrowingSchema),
    defaultValues: { borrower: "", equipment: searchParams.get("equipment") ?? "", quantity: 1, purpose: "" },
  });

  // Watch the fields so the summary on the right updates as the user types.
  const borrowerId = watch("borrower");
  const equipmentId = watch("equipment");
  const quantity = watch("quantity");
  const validQuantity = Number.isInteger(quantity) && quantity >= 1 ? quantity : 1;

  // Ask the API about the selected borrower and item.
  const standing = useFetch<Standing>(borrowerId ? `/borrowers/${borrowerId}/standing` : null);
  const availability = useFetch<Availability>(
    equipmentId ? `/equipment/${equipmentId}/availability?quantity=${validQuantity}` : null
  );

  // Derived values: worked out from the selections during render, not stored in state.
  const selectedBorrower = borrowers.data?.find((b) => b._id === borrowerId);
  const selectedItem = equipment.data?.find((e) => e._id === equipmentId);
  const isConsumable = selectedItem?.type === "consumable";
  const loanDays = (selectedItem?.category?.maxLoanDays ?? 0) * (selectedBorrower?.type === "faculty" ? 2 : 1);
  const dueDatePreview = selectedItem && !isConsumable ? addDays(loanDays) : null;
  const dailyLateFee = (selectedItem?.category?.dailyFee ?? 0) * validQuantity;
  const cannotSubmit = standing.data?.blocked === true || availability.data?.canBorrow === false;

  async function onSubmit(values: BorrowingFormValues) {
    try {
      await api.post("/borrowings", values);
      showToast("Booking request created. It is now waiting for approval.");
      navigate("/borrowings");
    } catch (error) {
      setError("root", { message: getErrorMessage(error) });
    }
  }

  if (borrowers.loading || equipment.loading) return <Loading label="Loading booking form..." />;
  if (borrowers.error) return <ErrorMessage message={borrowers.error} onRetry={borrowers.refetch} />;
  if (equipment.error) return <ErrorMessage message={equipment.error} onRetry={equipment.refetch} />;

  return (
    <>
      <PageHeader title="New booking" subtitle="Request an item for a borrower. The request starts as pending." />

      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="card lg:col-span-3">
          {errors.root && (
            <p className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">
              {errors.root.message}
            </p>
          )}

          <div className="grid gap-5">
            <FormField label="Borrower" htmlFor="borrower" error={errors.borrower?.message}>
              <select id="borrower" className={`input ${errors.borrower ? "input-error" : ""}`} {...register("borrower")}>
                <option value="">Select a borrower</option>
                {(borrowers.data ?? []).map((borrower) => (
                  <option key={borrower._id} value={borrower._id}>
                    {borrower.name} ({borrower.studentNumber})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Item" htmlFor="equipment" error={errors.equipment?.message}>
              <select id="equipment" className={`input ${errors.equipment ? "input-error" : ""}`} {...register("equipment")}>
                <option value="">Select an item</option>
                {(equipment.data ?? []).map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name} ({item.available} available)
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Quantity" htmlFor="quantity" error={errors.quantity?.message}>
              <input id="quantity" type="number" min={1} className={`input ${errors.quantity ? "input-error" : ""}`} {...register("quantity", { valueAsNumber: true })} />
            </FormField>

            <FormField label="Purpose (optional)" htmlFor="purpose" error={errors.purpose?.message}>
              <textarea id="purpose" rows={3} className={`input ${errors.purpose ? "input-error" : ""}`} placeholder="e.g. Physics laboratory activity" {...register("purpose")} />
            </FormField>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Link to="/borrowings" className="btn-outline">Cancel</Link>
            <button type="submit" className="btn-primary" disabled={isSubmitting || cannotSubmit}>
              {isSubmitting ? "Submitting..." : "Submit request"}
            </button>
          </div>
        </form>

        {/* Live summary */}
        <aside className="card h-fit lg:col-span-2">
          <h2 className="text-lg font-bold text-nu-navy">Booking summary</h2>

          {!selectedBorrower && !selectedItem && (
            <p className="mt-3 text-sm text-nu-muted">Select a borrower and an item to see the availability and the due date.</p>
          )}

          {selectedBorrower && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-nu-muted">Borrower</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-nu-navy">{selectedBorrower.name}</span>
                <StatusBadge value={selectedBorrower.type} />
              </div>
              {standing.loading && <p className="mt-2 text-sm text-nu-muted">Checking standing...</p>}
              {standing.error && <p className="mt-2 text-sm text-red-700">{standing.error}</p>}
              {standing.data?.blocked && (
                <div className="mt-2 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-semibold">This borrower is blocked</p>
                    <p>{standing.data.reasons.join(". ")}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedItem && (
            <div className="mt-5 border-t border-nu-line pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-nu-muted">Item</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-nu-navy">{selectedItem.name}</span>
                <StatusBadge value={selectedItem.type} />
              </div>

              {availability.loading && <p className="mt-2 text-sm text-nu-muted">Checking availability...</p>}
              {availability.error && <p className="mt-2 text-sm text-red-700">{availability.error}</p>}
              {availability.data && !availability.loading && (
                <div className={`mt-2 flex items-start gap-2 rounded-xl p-3 text-sm ${availability.data.canBorrow ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                  {availability.data.canBorrow ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
                  <p>
                    <span className="font-semibold">{availability.data.reason}.</span> {availability.data.available} of{" "}
                    {availability.data.total} unit(s) free.
                  </p>
                </div>
              )}

              <div className="mt-3 flex items-start gap-2 rounded-xl bg-nu-mist p-3 text-sm">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-nu-royal" />
                {isConsumable ? (
                  <p>This is a consumable. It is issued for good, so it has no due date and no fee.</p>
                ) : (
                  <p>
                    Due <span className="font-semibold text-nu-navy">{formatDate(dueDatePreview?.toISOString())}</span> ({loanDays} day
                    loan). A late return costs {formatPeso(dailyLateFee)} per day.
                  </p>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
