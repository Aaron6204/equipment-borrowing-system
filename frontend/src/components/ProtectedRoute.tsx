import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Stops unauthenticated visitors from viewing any private SEBS screen.
export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
