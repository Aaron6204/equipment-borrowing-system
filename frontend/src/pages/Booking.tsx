import { useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { ShoppingCart, Info } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import { formatPeso } from "../utils/format";
import { MAX_LOAN_ITEMS } from "../utils/cart";
import type { CartItem } from "../components/Layout";
import PageHeader from "../components/PageHeader";
import AdminBooking from "./AdminBooking";

type OutletContextType = {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
};

// /borrowings/new: admins get the multi-item booking form, students get their cart checkout.
export default function Booking() {
  const { user } = useAuth();
  return user?.role === "admin" ? <AdminBooking /> : <Checkout />;
}

// Student checkout: submits everything in the cart as one booking.
function Checkout() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { cart, setCart } = useOutletContext<OutletContextType>();

  const [purpose, setPurpose] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [schedule, setSchedule] = useState("today"); // Today/Tomorrow dropdown state
  const [agreement, setAgreement] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  async function onBorrowerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) return;
    setIsCheckingOut(true);

    try {
      // All items are sent together, so either the whole cart is booked or none of it is.
      await api.post("/borrowings/batch", {
        borrower: user?.id,
        items: cart.map((item) => ({ equipment: item._id, quantity: item.cartQuantity })),
        purpose: `${purpose} (Pickup: ${pickupTime})`,
        schedule, // today or tomorrow
      });

      showToast("Booking submitted! It is now in review.");
      setCart([]); 
      navigate("/borrowings"); 
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setIsCheckingOut(false);
    }
  }

  // Non-consumables in the cart are borrowed; consumables are bought with cash at pickup.
  const loanItems = cart.filter((item) => item.type !== "consumable");
  const purchaseItems = cart.filter((item) => item.type === "consumable");
  const amountDue = purchaseItems.reduce((sum, item) => sum + (item.costPerUnit ?? 0) * item.cartQuantity, 0);

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
      <PageHeader
        title="Checkout"
        subtitle={`Complete your reservation. Up to ${MAX_LOAN_ITEMS} non-consumable items at a time; consumables have no limit.`}
      />
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
              {/* The agreement only mentions returning or paying when the cart has that kind of item. */}
              <label htmlFor="agreement" className="grid gap-2 text-sm text-orange-900 leading-tight">
                {loanItems.length > 0 && (
                  <span>
                    <span className="font-bold block mb-1">I agree to return the borrowed items on time.</span>
                    Failure to return equipment by 9:00 PM on your scheduled due date will result in a late fee and potential suspension of borrowing privileges.
                  </span>
                )}
                {purchaseItems.length > 0 && (
                  <span>
                    <span className="font-bold block mb-1">I agree to pay {formatPeso(amountDue)} in cash at pickup.</span>
                    Consumables are bought, not borrowed. They are yours to keep and do not need to be returned.
                  </span>
                )}
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
                  <p className="text-xs text-nu-muted">
                    {item.type === "consumable"
                      ? `Purchase · ${formatPeso(item.costPerUnit ?? 0)} each`
                      : "Loan · return by 9:00 PM on the due date"}
                  </p>
                </div>
                <button type="button" onClick={() => setCart(cart.filter(i => i._id !== item._id))} className="text-red-500 hover:text-red-700 text-sm font-medium">
                  Remove
                </button>
              </li>
            ))}
          </ul>
          {purchaseItems.length > 0 && (
            <div className="mt-4 flex items-baseline justify-between border-t border-nu-line pt-4">
              <span className="text-sm font-semibold text-nu-navy">To pay in cash at pickup</span>
              <span className="text-lg font-bold text-nu-navy">{formatPeso(amountDue)}</span>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-nu-line text-sm text-nu-muted flex items-start gap-2">
            <Info className="size-4 shrink-0 mt-0.5 text-nu-royal" />
            <p>Your booking will be placed "In Review" until approved by the council/admin.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
