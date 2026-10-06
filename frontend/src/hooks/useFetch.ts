import { useCallback, useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/axios";

// Custom hook: loads data from the API and tracks its loading and error states.
// Pass null as the url to skip the request (for example, when nothing is selected yet).
// Usage: const { data, loading, error, refetch } = useFetch<Equipment[]>("/equipment");
export function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(url !== null);
  const [error, setError] = useState<string | null>(null);
  // Changing this number makes the effect below run again.
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    if (url === null) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    // "ignore" prevents an old, slow request from overwriting a newer one.
    let ignore = false;
    setLoading(true);
    setError(null);

    api
      .get<T>(url)
      .then((response) => {
        if (!ignore) setData(response.data);
      })
      .catch((err) => {
        if (!ignore) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [url, reloadCount]);

  const refetch = useCallback(() => setReloadCount((count) => count + 1), []);

  return { data, loading, error, refetch };
}
