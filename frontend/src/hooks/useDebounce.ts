import { useEffect, useState } from "react";

// Custom hook: returns the value only after the user stops changing it for a moment.
// Used by search boxes so the API is not called on every keystroke.
export function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
