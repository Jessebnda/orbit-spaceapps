import { useEffect, useState } from 'react';

// Live filtered-ECG trace for the heart-rate chart. Kept out of the zustand store: 50 writes/s would re-render every subscriber.
const WINDOW = 200; // 4 s at 50 Hz
const STALE_MS = 2000;
const FPS_MS = 66; // ~15 fps is smooth enough for a 4 s sweep

let buf: number[] = [];
let lastAt = 0;

export function pushEcg(v: number, leadsOn: boolean) {
  if (!leadsOn) {
    buf = []; // electrode off: show nothing rather than noise
    return;
  }
  buf.push(v);
  if (buf.length > WINDOW) buf.shift();
  lastAt = Date.now();
}

/** Last 4 s of filtered ECG, or null when no chest sensor is streaming. Polls only while `on`. */
export function useEcg(on: boolean): number[] | null {
  const [trace, setTrace] = useState<number[] | null>(null);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setTrace(Date.now() - lastAt < STALE_MS && buf.length > 10 ? buf.slice() : null), FPS_MS);
    return () => clearInterval(id);
  }, [on]);
  return on ? trace : null;
}
