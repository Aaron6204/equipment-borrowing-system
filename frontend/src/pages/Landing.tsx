import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  CircleHelp,
  GraduationCap,
  PackageCheck,
  ShieldCheck,
  Users,
} from "lucide-react";
import Logo from "../components/Logo";
import Footer from "../components/Footer";

const features = [
  { icon: Boxes, title: "Live inventory", text: "See which equipment is ready to borrow before submitting a request." },
  { icon: CalendarClock, title: "Clear due dates", text: "Keep every loan, return date, and overdue item in one organized place." },
  { icon: ClipboardCheck, title: "Simple tracking", text: "Record borrowers, approvals, returns, and equipment condition with confidence." },
];

const steps = [
  { number: "01", title: "Create an account", text: "Register with your school details to start a request." },
  { number: "02", title: "Choose equipment", text: "Browse available learning and event equipment." },
  { number: "03", title: "Request & collect", text: "Submit your request and collect after staff approval." },
];

export default function Landing() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f8fc] text-nu-ink">
      <header className="border-b border-nu-line/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <Logo size={48} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-base font-extrabold text-nu-navy">SEBS</span>
              <span className="block truncate text-xs font-medium text-nu-muted">School Equipment Borrowing</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-nu-muted md:flex" aria-label="Landing navigation">
            <a href="#how-it-works" className="hover:text-nu-royal">How it works</a>
            <a href="#features" className="hover:text-nu-royal">Features</a>
            <a href="#about" className="hover:text-nu-royal">About SEBS</a>
            <a href="#help" className="hover:text-nu-royal">Help</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="btn-outline hidden sm:inline-flex">Log in</Link>
            <Link to="/register" className="btn-primary whitespace-nowrap">Create account <ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden bg-nu-blue text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(245,197,66,.27),transparent_29%),radial-gradient(circle_at_90%_80%,rgba(91,119,255,.32),transparent_32%)]" />
          <div className="absolute -right-24 top-14 size-80 rounded-full border-[36px] border-white/10" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-wide text-nu-gold">
                <ShieldCheck className="size-4" /> NATIONAL UNIVERSITY CLARK
              </p>
              <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Equipment access, made <span className="text-nu-gold">simple.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
                SEBS helps students and staff reserve school equipment, monitor availability, and return items on time—without paper logbooks.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link to="/register" className="btn-gold">Get started <ArrowRight className="size-4" /></Link>
                <Link to="/login" className="btn border border-white/25 bg-white/5 text-white hover:bg-white/10">Log in to SEBS</Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/80">
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-nu-gold" /> Create an account</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-nu-gold" /> Sign in securely</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-nu-gold" /> Manage requests</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md self-center rounded-[1.75rem] border border-white/15 bg-white/95 p-5 text-nu-ink shadow-2xl shadow-black/25 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.16em] text-nu-muted">Your SEBS journey</p>
                  <h2 className="mt-1 text-xl font-extrabold text-nu-navy">Start with your account</h2>
                </div>
                <span className="grid size-11 place-items-center rounded-2xl bg-nu-gold/30 text-nu-navy"><ShieldCheck className="size-6" /></span>
              </div>
              <div className="mt-6 rounded-2xl border border-nu-line bg-nu-mist p-4">
                <ol className="space-y-3 text-sm">
                  <li className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-nu-royal text-xs font-bold text-white">1</span><span className="font-medium text-nu-navy">Create your school account</span></li>
                  <li className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-nu-royal text-xs font-bold text-white">2</span><span className="font-medium text-nu-navy">Log in to your private workspace</span></li>
                  <li className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-nu-royal text-xs font-bold text-white">3</span><span className="font-medium text-nu-navy">Submit and monitor requests</span></li>
                </ol>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-nu-blue px-4 py-3 text-white"><PackageCheck className="size-5 text-nu-gold" /><p className="text-sm font-semibold">Your information stays behind a secure sign-in.</p></div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[.16em] text-nu-royal">Built for campus life</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight text-nu-navy sm:text-4xl">Borrow with clarity from request to return.</h2></div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => <article key={title} className="card group"><span className="grid size-12 place-items-center rounded-2xl bg-nu-blue text-nu-gold transition group-hover:bg-nu-royal"><Icon className="size-6" /></span><h3 className="mt-5 text-xl font-bold text-nu-navy">{title}</h3><p className="mt-2 text-sm leading-relaxed text-nu-muted">{text}</p></article>)}
          </div>
        </section>

        <section id="how-it-works" className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-bold uppercase tracking-[.16em] text-nu-royal">A better borrowing flow</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight text-nu-navy sm:text-4xl">From need to return in three easy steps.</h2></div><Link to="/register" className="btn-outline w-fit">Create an account <ArrowRight className="size-4" /></Link></div>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">{steps.map((step) => <li key={step.number} className="rounded-2xl border border-nu-line p-6"><p className="text-4xl font-black text-nu-gold">{step.number}</p><h3 className="mt-6 text-xl font-bold text-nu-navy">{step.title}</h3><p className="mt-2 text-sm leading-relaxed text-nu-muted">{step.text}</p></li>)}</ol>
          </div>
        </section>

        <section id="about" className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:px-8 lg:py-24">
          <div className="rounded-3xl bg-nu-blue p-7 text-white sm:p-10">
            <span className="grid size-14 place-items-center rounded-2xl bg-white/10 text-nu-gold"><GraduationCap className="size-7" /></span>
            <p className="mt-8 text-sm font-bold uppercase tracking-[.16em] text-nu-gold">About SEBS</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">Built around the way schools actually share equipment.</h2>
            <p className="mt-5 leading-relaxed text-white/75">SEBS is a School Equipment Borrowing System for keeping learning tools, event supplies, and technology visible and accountable from one central workspace.</p>
            <div className="mt-8 border-t border-white/15 pt-6 text-sm text-white/70">Designed for students, faculty, and equipment-room staff.</div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:content-center">
            <article className="rounded-2xl border border-nu-line bg-white p-6 shadow-card"><BookOpen className="size-6 text-nu-royal" /><h3 className="mt-4 font-bold text-nu-navy">For students</h3><p className="mt-2 text-sm leading-relaxed text-nu-muted">Find what you need and submit borrowing requests with clear due dates.</p></article>
            <article className="rounded-2xl border border-nu-line bg-white p-6 shadow-card"><Users className="size-6 text-nu-royal" /><h3 className="mt-4 font-bold text-nu-navy">For staff</h3><p className="mt-2 text-sm leading-relaxed text-nu-muted">Track who has equipment out, what is overdue, and what needs attention.</p></article>
            <article className="rounded-2xl border border-nu-line bg-white p-6 shadow-card sm:col-span-2"><PackageCheck className="size-6 text-nu-royal" /><h3 className="mt-4 font-bold text-nu-navy">For better accountability</h3><p className="mt-2 text-sm leading-relaxed text-nu-muted">Replace paper records with one consistent source of truth for borrowing and returns.</p></article>
          </div>
        </section>

        <section id="help" className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[.16em] text-nu-royal">Need help?</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight text-nu-navy sm:text-4xl">Before you borrow</h2><p className="mt-3 text-sm leading-relaxed text-nu-muted">A few answers for a smooth equipment-room experience.</p></div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <article className="rounded-2xl border border-nu-line p-6"><CircleHelp className="size-6 text-nu-royal" /><h3 className="mt-4 font-bold text-nu-navy">How do I request an item?</h3><p className="mt-2 text-sm leading-relaxed text-nu-muted">Create an account, sign in, browse equipment, then make a booking request.</p></article>
              <article className="rounded-2xl border border-nu-line p-6"><CalendarClock className="size-6 text-nu-royal" /><h3 className="mt-4 font-bold text-nu-navy">What if I return it late?</h3><p className="mt-2 text-sm leading-relaxed text-nu-muted">The system tracks due dates and applies the relevant overdue fee when an item is returned.</p></article>
              <article className="rounded-2xl border border-nu-line p-6"><ShieldCheck className="size-6 text-nu-royal" /><h3 className="mt-4 font-bold text-nu-navy">Need account support?</h3><p className="mt-2 text-sm leading-relaxed text-nu-muted">Please visit or contact the equipment-room administrator for account and borrowing assistance.</p></article>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24"><div className="rounded-3xl bg-nu-gold px-6 py-10 text-center text-nu-navy sm:px-10"><Users className="mx-auto size-9" /><h2 className="mt-4 text-3xl font-extrabold tracking-tight">Ready to borrow smarter?</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-nu-navy/80">Create an account to begin managing equipment requests with SEBS.</p><Link to="/register" className="btn mt-7 bg-nu-navy text-white hover:bg-nu-blue">Create your account <ArrowRight className="size-4" /></Link></div></section>
      </main>
      <Footer />
    </div>
  );
}
