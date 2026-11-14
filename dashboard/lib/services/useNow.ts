"use client";

import { useEffect, useState } from "react";

/** Current time for relative labels. 0 until mounted, so server and client render the same first frame. */
export function useNow(everyMs = 30_000) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}
