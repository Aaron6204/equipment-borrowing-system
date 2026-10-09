import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  // 1. If they are not logged in at all, send them to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 2. If the page requires an admin, but the user is just a borrower, kick them out
  if (requireAdmin && user?.role !== "admin") {
    return <Navigate to="/equipment" replace />;
  }

  // 3. If they pass the checks, render the protected page
  return <Outlet />;
}