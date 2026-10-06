import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md py-12 text-center">
      <p className="text-5xl font-extrabold text-nu-gold">404</p>
      <h1 className="mt-3 text-xl font-bold text-nu-navy">Page not found</h1>
      <p className="mt-2 text-sm text-nu-muted">The page you are looking for does not exist.</p>
      <Link to="/dashboard" className="btn-primary mt-6">
        Go to the dashboard
      </Link>
    </div>
  );
}
