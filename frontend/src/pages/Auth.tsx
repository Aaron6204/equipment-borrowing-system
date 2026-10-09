import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";

type AuthMode = "login" | "register";

export default function Auth({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { startSession } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLogin = mode === "login";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMessage("");
    setIsSubmitting(true);
    try {
      const payload = isLogin
        ? { email: form.get("email"), password: form.get("password") }
        : { name: form.get("name"), studentNumber: form.get("studentNumber"), email: form.get("email"), password: form.get("password") };
      const { data } = await api.post(isLogin ? "/auth/login" : "/auth/register", payload);
      if (isLogin) {
  startSession(data.token, data.user);
  if (data.user.role === 'admin') {
    navigate("/dashboard", { replace: true });
  } else {
    navigate("/equipment", { replace: true });
  }
} else {
  navigate("/login", { replace: true, state: { registrationSuccess: true } });
}
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-nu-blue p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_12%,rgba(245,197,66,.3),transparent_25%),radial-gradient(circle_at_90%_84%,rgba(91,119,255,.42),transparent_30%)]" />
        <Link to="/" className="relative flex items-center gap-3"><span className="grid size-14 place-items-center rounded-2xl bg-white/10 text-2xl font-black text-nu-gold">S</span><span><span className="block text-lg font-extrabold">SEBS</span><span className="text-sm text-nu-gold">School Equipment Borrowing System</span></span></Link>
        <div className="relative max-w-md"><span className="grid size-14 place-items-center rounded-2xl bg-white/10 text-nu-gold"><ShieldCheck className="size-7" /></span><h1 className="mt-6 text-4xl font-black leading-tight">Borrowing tools should be the easy part.</h1><p className="mt-5 text-base leading-relaxed text-white/75">Manage requests, keep equipment visible, and return every item with a clear record.</p></div>
        <p className="relative text-sm text-white/55">National University Clark · CTADWEBL Project</p>
      </section>

      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
        <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-br from-nu-blue via-nu-royal to-[#7889ef] lg:hidden" />
        <div className="relative w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-3 text-white lg:hidden"><span className="grid size-11 place-items-center rounded-xl bg-white/15 text-lg font-black text-nu-gold">S</span><span><span className="block font-extrabold">SEBS</span><span className="text-xs text-white/75">School Equipment Borrowing System</span></span></Link>
          <div className="rounded-3xl bg-white p-6 shadow-xl shadow-nu-blue/10 sm:p-8 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
            <p className="text-sm font-bold uppercase tracking-[.16em] text-nu-royal">{isLogin ? "Welcome back" : "Join SEBS"}</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-nu-navy">{isLogin ? "Log in to your account" : "Create your account"}</h1>
            <p className="mt-3 text-sm leading-relaxed text-nu-muted">{isLogin ? "Access equipment records and manage borrowing activity." : "Start requesting school equipment with a clear, organized record."}</p>
            {isLogin && Boolean((location.state as { registrationSuccess?: boolean } | null)?.registrationSuccess) && <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm leading-relaxed text-emerald-800">Account created successfully. Please log in with your new email and password.</p>}

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              {!isLogin && <label><span className="label">Full name</span><span className="relative block"><UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-nu-muted" /><input className="input pl-10" name="name" placeholder="Juan Dela Cruz" autoComplete="name" onChange={() => setMessage("")} required /></span></label>}
              {!isLogin && <label><span className="label">School ID number</span><input className="input" name="studentNumber" placeholder="e.g. 2026-12345" onChange={() => setMessage("")} required /></label>}
              <label><span className="label">School email</span><span className="relative block"><Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-nu-muted" /><input className="input pl-10" name="email" type="email" placeholder="name@students.nu-clark.edu.ph" autoComplete="email" onChange={() => setMessage("")} required /></span></label>
              <label><span className="label">Password</span><span className="relative block"><LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-nu-muted" /><input className="input pl-10 pr-11" name="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" autoComplete={isLogin ? "current-password" : "new-password"} minLength={8} onChange={() => setMessage("")} required /><button type="button" onClick={() => setShowPassword((shown) => !shown)} className="absolute right-3 top-1/2 -translate-y-1/2 text-nu-muted hover:text-nu-royal" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span></label>
              {!isLogin && <><p className="mt-2 text-xs text-nu-muted">Use at least 8 characters.</p><label className="flex gap-2 text-sm text-nu-muted"><input type="checkbox" className="mt-0.5 size-4 accent-nu-royal" required />I agree to use SEBS responsibly and return equipment on time.</label></>}
              {message && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-relaxed text-red-700">{message}</p>}
              <div style={{ marginTop: "1.75rem" }}>
                <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? "Please wait…" : isLogin ? "Log in" : "Create account"}<ArrowRight className="size-4" /></button>
              </div>
            </form>
            <p className="mt-7 text-center text-sm text-nu-muted">{isLogin ? "New to SEBS?" : "Already have an account?"} <Link to={isLogin ? "/register" : "/login"} className="font-bold text-nu-royal hover:underline">{isLogin ? "Create an account" : "Log in"}</Link></p>
            {isLogin && <p className="mt-4 text-center text-xs text-nu-muted">Forgot password? Contact the equipment room administrator.</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
