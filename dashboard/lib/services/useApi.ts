"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/services/hub";

/** GET a hub endpoint. `pollMs` re-fetches while the calling screen is mounted; the timer is cleared on unmount. */
export function useApi<T>(path: string, pollMs = 0) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const load = useCallback(() => {
    api<T>(path).then(
      (d) => {
        setData(d);
        setError(undefined);
      },
      (e: Error) => setError(e.message),
    );
  }, [path]);
  useEffect(() => {
    load();
    if (!pollMs) return;
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);
  return { data, error, reload: load };
}
