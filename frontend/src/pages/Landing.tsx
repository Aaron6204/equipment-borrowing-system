import { Link } from "react-router-dom";
import { ArrowRight, Boxes, CalendarClock, Coins, PackageCheck, Recycle } from "lucide-react";
import Logo from "../components/Logo";
import Footer from "../components/Footer";

const features = [
  {
    icon: Boxes,
    title: "Live availability",
    tagline: "Know what can be borrowed",
    text: "Every item shows the units left after reservations and items that are still out.",
  },
  {
    icon: CalendarClock,
    title: "Automatic due dates",
    tagline: "No more forgotten returns",
    text: "The due date is computed from the item's category, and late items are flagged.",
  },
  {
    icon: Coins,
    title: "Overdue fees",
    tagline: "Computed, not guessed",
    text: "Days late are multiplied by the daily fee, and a fine is created on return.",
  },
];

const steps = [
  { name: "Request", text: "A borrower asks for an item. The system checks the units available." },
  { name: "Approve", text: "Staff approve the request and the units are reserved." },
  { name: "Release", text: "The item is handed over. Consumables are deducted from stock." },
  { name: "Return", text: "The item comes back and any overdue fee is computed." },
];

// Page 1: the public landing page that introduces the system.
export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-nu-mist">
      <header className="bg-nu-blue">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3 text-white">
            <Logo size={52} />
            <span className="min-w-0">
              <span className="block truncate font-bold leading-tight">Equipment Borrowing</span>
              <span className="block truncate text-xs text-nu-gold">National University Clark</span>
            </span>
          </div>
          <Link to="/dashboard" className="btn-gold shrink-0">
            Open system
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-nu-blue pb-24 pt-10 text-white sm:pt-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="badge bg-white/10 text-nu-gold">School equipment room</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Borrow school equipment <span className="text-nu-gold">without the logbook</span>
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-white/80">
              One place to see what is available, record who borrowed it, and know exactly when it is due
              and what a late return costs.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/borrowings/new" className="btn-gold">
                Make a booking <ArrowRight className="size-4" />
              </Link>
              <Link to="/equipment" className="btn border border-white/30 text-white hover:bg-white/10">
                Browse equipment
              </Link>
            </div>
          </div>

          {/* A small illustration of one borrowing */}
          <div className="rounded-2xl bg-white p-5 text-nu-ink shadow-2xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-nu-muted">Sample borrowing</p>
                <p className="text-lg font-bold text-nu-navy">Scientific Calculator</p>
              </div>
              <span className="badge bg-indigo-100 text-indigo-800">Released</span>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-nu-mist p-3">
                <dt className="text-xs text-nu-muted">Available</dt>
                <dd className="text-xl font-bold text-nu-navy">9 / 10</dd>
              </div>
              <div className="rounded-xl bg-nu-mist p-3">
                <dt className="text-xs text-nu-muted">Loan period</dt>
                <dd className="text-xl font-bold text-nu-navy">2 days</dd>
              </div>
              <div className="rounded-xl bg-nu-gold/30 p-3">
                <dt className="text-xs text-nu-muted">Late fee</dt>
                <dd className="text-xl font-bold text-nu-navy">₱20 / day</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-nu-muted">
              Returned 3 days late: 3 × ₱20 = <span className="font-semibold text-nu-navy">₱60 fine</span>
            </p>
          </div>
        </div>
      </section>

      {/* Three feature cards */}
      <section className="mx-auto -mt-14 w-full max-w-6xl px-4 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="card">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-nu-gold/30 text-nu-blue">
                  <feature.icon className="size-6" />
                </span>
                <h2 className="text-lg font-bold text-nu-navy">{feature.title}</h2>
              </div>
              <p className="mt-3 text-sm font-medium text-nu-muted">{feature.tagline}</p>
              <p className="mt-2 text-sm leading-relaxed">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto mt-16 w-full max-w-6xl px-4 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-nu-navy">How borrowing works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.name} className="card">
              <span className="grid size-9 place-items-center rounded-full bg-nu-royal text-sm font-bold text-white">
                {index + 1}
              </span>
              <p className="mt-3 font-bold text-nu-navy">{step.name}</p>
              <p className="mt-1 text-sm leading-relaxed text-nu-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Two kinds of items */}
      <section className="mx-auto mt-16 w-full max-w-6xl px-4 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-nu-navy">Two kinds of items</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <article className="card">
            <PackageCheck className="size-7 text-nu-royal" />
            <h3 className="mt-3 text-lg font-bold text-nu-navy">Non-consumable</h3>
            <p className="mt-1 text-sm leading-relaxed text-nu-muted">
              Borrowed and returned, such as rulers, calculators, and projectors. These have a due date and
              an overdue fee.
            </p>
          </article>
          <article className="card">
            <Recycle className="size-7 text-nu-amber" />
            <h3 className="mt-3 text-lg font-bold text-nu-navy">Consumable</h3>
            <p className="mt-1 text-sm leading-relaxed text-nu-muted">
              Issued and used up, such as paper, glue, and tape. These reduce the stock and raise a
              low-stock warning.
            </p>
          </article>
        </div>
      </section>

      <Footer />
    </div>
  );
}
