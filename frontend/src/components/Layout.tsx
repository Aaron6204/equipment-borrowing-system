import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Menu, Plus, X } from "lucide-react";
import Logo from "./Logo";
import Footer from "./Footer";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/equipment", label: "Equipment" },
  { to: "/borrowers", label: "Borrowers" },
  { to: "/borrowings", label: "Borrowings" },
  { to: "/overdue", label: "Overdue & Fines" },
  { to: "/statistics", label: "Statistics" },
];

// The shared frame of every page inside the system: header, navigation, and footer.
export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
    }`;

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
            <Link to="/borrowings/new" className="btn-gold ml-2">
              <Plus className="size-4" /> New Booking
            </Link>
          </nav>

          <button
            type="button"
            className="rounded-lg p-2 text-white hover:bg-white/10 lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
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
              <Link to="/borrowings/new" className="btn-gold mt-2" onClick={() => setMenuOpen(false)}>
                <Plus className="size-4" /> New Booking
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
