import { useState } from "react";
import { Link, useNavigate, useSearchParams, useOutletContext } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShoppingCart, Info } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import { borrowingSchema } from "../schemas/borrowingSchema";
import type { BorrowingFormValues } from "../schemas/borrowingSchema";
import type { Availability, Borrower, Equipment, Standing } from "../types";
import type { CartItem } from "../components/Layout";
import PageHeader from "../components/PageHeader";
import Loading from "../components/Loading";
import ErrorMessage from "../components/ErrorMessage";
import FormField from "../components/FormField";

type OutletContextType = {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
};

export default function Booking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { cart, setCart } = useOutletContext<OutletContextType>();

  const borrowers = useFetch<Borrower[]>("/borrowers");
  const equipment = useFetch<Equipment[]>("/equipment");

  // --- ADMIN FORM SETUP ---
  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting } } = useForm<BorrowingFormValues>({
    resolver: zodResolver(borrowingSchema),
    defaultValues: { borrower: "", equipment: searchParams.get("equipment") ?? "", quantity: 1, purpose: "" },
  });

  const borrowerId = watch("borrower");
  const equipmentId = watch("equipment");
  const quantity = watch("quantity");
  const validQuantity = Number.isInteger(quantity) && quantity >= 1 ? quantity : 1;

  const standing = useFetch<Standing>(isAdmin && borrowerId ? `/borrowers/${borrowerId}/standing` : null);
  const availability = useFetch<Availability>(
    isAdmin && equipmentId ? `/equipment/${equipmentId}/availability?quantity=${validQuantity}` : null
  );
  
  // --- BORROWER CART STATE ---
  const [purpose, setPurpose] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [schedule, setSchedule] = useState("today"); // Today/Tomorrow dropdown state
  const [agreement, setAgreement] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // 1. Admin Submit
  async function onAdminSubmit(values: BorrowingFormValues) {
    try {
      await api.post("/borrowings", values);
      showToast("Booking request created.");
      navigate("/borrowings");
    } catch (error) {
      setError("root", { message: getErrorMessage(error) });
    }
  }

  // 2. Borrower Submit
  async function onBorrowerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) return;
    setIsCheckingOut(true);

    try {
      for (const item of cart) {
        await api.post("/borrowings", {
          borrower: user?.id, 
          equipment: item._id,
          quantity: item.cartQuantity, // NEW: Uses the actual quantity they chose!
          purpose: `${purpose} (Pickup: ${pickupTime})`,
          schedule: schedule // Passes today or tomorrow to backend
        });
      }
      
      showToast("Booking submitted! It is now in review.");
      setCart([]); 
      navigate("/borrowings"); 
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setIsCheckingOut(false);
    }
  }

  if (borrowers.loading || equipment.loading) return <Loading label="Loading booking form..." />;
  if (borrowers.error) return <ErrorMessage message={borrowers.error} onRetry={borrowers.refetch} />;
  if (equipment.error) return <ErrorMessage message={equipment.error} onRetry={equipment.refetch} />;

  // ==========================================
  // BORROWER CART VIEW
  // ==========================================
  if (!isAdmin) {
    if (cart.length === 0) {
      return (
        <>
          <PageHeader title="Checkout" subtitle="Complete your equipment reservation" />
          <div className="card text-center py-12">
            <ShoppingCart className="mx-auto size-12 text-nu-mist mb-4" />
            <h2 className="text-xl font-bold text-nu-navy">Your cart is empty</h2>
            <p className="text-nu-muted mt-2 mb-6">Browse the equipment list to add items you need.</p>
            <Link to="/equipment" className="btn-primary">Browse Equipment</Link>
          </div>
        </>
      );
    }

    return (
      <>
        <PageHeader title="Checkout" subtitle="Complete your equipment reservation. Max 2 items total." />
        <div className="grid gap-6 lg:grid-cols-5">
          <form onSubmit={onBorrowerSubmit} className="card lg:col-span-3">
            <h3 className="text-lg font-bold text-nu-navy mb-4 border-b border-nu-line pb-2">Reservation Details</h3>
            
            <div className="grid gap-5">
              <div>
                <label className="block text-sm font-semibold text-nu-navy mb-1">Where will this be used?</label>
                <textarea 
                  required
                  rows={3} 
                  className="input" 
                  placeholder="e.g., Physics Laboratory, Room 204 for Activity 3" 
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>

              {/* The Date and Time Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-nu-navy mb-1">Pickup Day</label>
                  <select 
                    className="input" 
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                  >
                    <option value="today">Today</option>
                    <option value="tomorrow">Tomorrow</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-nu-navy mb-1">Pick-up Time</label>
                  <input 
                    required
                    type="time" 
                    className="input" 
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-lg bg-orange-50 p-4 border border-orange-200">
                <input 
                  required
                  type="checkbox" 
                  id="agreement" 
                  className="mt-1 size-4 rounded border-orange-300 text-nu-royal focus:ring-nu-royal"
                  checked={agreement}
                  onChange={(e) => setAgreement(e.target.checked)}
                />
                <label htmlFor="agreement" className="text-sm text-orange-900 leading-tight">
                  <span className="font-bold block mb-1">I agree to return these items on time.</span>
                  Failure to return equipment by 9:00 PM on your scheduled due date will result in a late fee and potential suspension of borrowing privileges. Consumables must be reported when empty.
                </label>
              </div>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Link to="/equipment" className="btn-outline">Back to items</Link>
              <button type="submit" className="btn-primary" disabled={isCheckingOut || !agreement}>
                {isCheckingOut ? "Submitting..." : "Submit Reservation"}
              </button>
            </div>
          </form>

          <aside className="card h-fit lg:col-span-2">
            <h2 className="text-lg font-bold text-nu-navy mb-4">Items in Cart</h2>
            <ul className="grid gap-4">
              {cart.map((item) => (
                <li key={item._id} className="flex justify-between items-center border-b border-nu-line pb-3 last:border-0">
                  <div>
                    {/* Shows the actual quantity in the sidebar */}
                    <p className="font-semibold text-nu-navy">{item.cartQuantity} × {item.name}</p>
                    <p className="text-xs text-nu-muted">{item.type === 'consumable' ? 'Consumable' : 'Standard Loan'}</p>
                  </div>
                  <button type="button" onClick={() => setCart(cart.filter(i => i._id !== item._id))} className="text-red-500 hover:text-red-700 text-sm font-medium">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-nu-line text-sm text-nu-muted flex items-start gap-2">
              <Info className="size-4 shrink-0 mt-0.5 text-nu-royal" />
              <p>Your booking will be placed "In Review" until approved by the council/admin.</p>
            </div>
          </aside>
        </div>
      </>
    );
  }

  // ==========================================
  // ADMIN MANUAL VIEW (Unchanged)
  // ==========================================
  return (
    <>
      <PageHeader title="New booking (Admin)" subtitle="Manually assign an item to a borrower." />
      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={handleSubmit(onAdminSubmit)} noValidate className="card lg:col-span-3">
          {errors.root && (
            <p className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">
              {errors.root.message}
            </p>
          )}

          <div className="grid gap-5">
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
            <button type="submit" className="btn-primary" disabled={isSubmitting || (standing.data?.blocked === true || availability.data?.canBorrow === false)}>
              {isSubmitting ? "Submitting..." : "Submit request"}
            </button>
          </div>
        </form>

        <aside className="card h-fit lg:col-span-2">
          <h2 className="text-lg font-bold text-nu-navy">Booking summary</h2>
          <p className="mt-3 text-sm text-nu-muted">Summary functionality preserved for admin processing.</p>
        </aside>
      </div>
    </>
  );
}