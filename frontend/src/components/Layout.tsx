import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { LogOut, Menu, Plus, ShoppingCart, X } from "lucide-react";
import Logo from "./Logo";
import Footer from "./Footer";
import { useAuth } from "../context/AuthContext";
import type { Equipment } from "../types";

// NEW: We extend Equipment to include how many the user wants in their cart
export type CartItem = Equipment & { cartQuantity: number };

const adminLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/equipment", label: "Equipment" },
  { to: "/borrowings", label: "Bookings" },
  { to: "/users", label: "Users" },
  { to: "/overdue", label: "Overdue & Fines" },
  { to: "/statistics", label: "Statistics" },
];

const borrowerLinks = [
  { to: "/equipment", label: "Browse Equipment" },
  { to: "/borrowings", label: "My Borrowings" },
];

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  
  // Cart state now holds CartItems
  const [cart, setCart] = useState<CartItem[]>([]);

  const isAdmin = user?.role === "admin";
  const links = isAdmin ? adminLinks : borrowerLinks;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
    }`;

  // NEW: Calculate the total number of units in the cart (e.g., 2 basketballs = 2)
  const totalCartUnits = cart.reduce((sum, item) => sum + item.cartQuantity, 0);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 bg-nu-blue shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3 text-white">
            <Logo size={48} />
            <span className="min-w-0">
              <span className="block truncate text-base font-bold leading-tight">Equipment Borrowing</span>
              <span className="block truncate text-xs text-nu-gold">National University Clark</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
            
            {isAdmin ? (
              <Link to="/borrowings/new" className="btn-gold ml-2">
                <Plus className="size-4" /> New Booking
              </Link>
            ) : (
              <Link to="/borrowings/new" className="btn-gold ml-2 relative">
                <ShoppingCart className="size-4" /> Cart ({totalCartUnits}/2)
              </Link>
            )}

            <button type="button" onClick={logout} className="ml-1 rounded-lg p-2 text-white/75 hover:bg-white/10 hover:text-white" aria-label="Log out">
              <LogOut className="size-4" />
            </button>
          </nav>

          <button
            type="button"
            className="rounded-lg p-2 text-white hover:bg-white/10 lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        {menuOpen && (
          <nav className="border-t border-white/10 px-4 pb-4 pt-2 lg:hidden" aria-label="Mobile">
            <div className="flex flex-col gap-1">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} className={linkClass} onClick={() => setMenuOpen(false)}>
                  {link.label}
                </NavLink>
              ))}
              
              {isAdmin ? (
                <Link to="/borrowings/new" className="btn-gold mt-2" onClick={() => setMenuOpen(false)}>
                  <Plus className="size-4" /> New Booking
                </Link>
              ) : (
                <Link to="/borrowings/new" className="btn-gold mt-2" onClick={() => setMenuOpen(false)}>
                  <ShoppingCart className="size-4" /> Checkout ({totalCartUnits}/2)
                </Link>
              )}

              <button type="button" className="btn mt-1 border border-white/20 text-white" onClick={logout}>Log out{user ? ` (${user.name})` : ""}</button>
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet context={{ cart, setCart }} />
      </main>

      <Footer />
    </div>
  );
}