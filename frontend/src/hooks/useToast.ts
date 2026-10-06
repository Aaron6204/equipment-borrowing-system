import { useContext } from "react";
import { ToastContext } from "../context/ToastContext";

// Custom hook: gives any component the showToast() function.
// Usage: const { showToast } = useToast(); showToast("Equipment saved");
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}
