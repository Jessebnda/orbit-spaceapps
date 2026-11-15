import { useEffect, useState } from 'react';

// Live filtered-ECG trace for the heart-rate chart. Kept out of the zustand store: 50 writes/s would re-render every subscriber.
const WINDOW = 200; // 4 s at 50 Hz (the decoder thins 250 Hz chest data to 50 Hz)
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

const live = () => Date.now() - lastAt < STALE_MS && buf.length > 10;
export const ecgIsLive = live;

/** Textbook-shaped ECG at `bpm`, scrolling with the clock: P, QRS (~70 ms) and T waves. Used only as a labelled fallback. */
export function syntheticEcg(bpm: number, now = Date.now()): number[] {
  const period = 60000 / Math.min(220, Math.max(30, bpm));
  const out: number[] = [];
  for (let i = WINDOW - 1; i >= 0; i--) {
    const rt = (now - i * 20) % period; // ms since this beat started
    const p = rt > 60 && rt < 140 ? 10 * Math.sin(((rt - 60) / 80) * Math.PI) : 0;
    const q = rt >= 180 && rt < 195 ? -12 : 0;
    const r = rt >= 195 && rt < 255 ? 120 * (1 - Math.abs(rt - 225) / 30) : 0;
    const sw = rt >= 255 && rt < 275 ? -20 : 0;
    const tw = rt > 400 && rt < 560 ? 25 * Math.sin(((rt - 400) / 160) * Math.PI) : 0;
    out.push(p + q + r + sw + tw);
  }
  return out;
}

/**
 * Last 4 s of filtered ECG, or null when no chest sensor is streaming. Polls only while `on`.
 * With `synthBpm`, a synthetic trace stands in when nothing is live (check ecgIsLive() to label it).
 */
export function useEcg(on: boolean, synthBpm?: number): number[] | null {
  const [trace, setTrace] = useState<number[] | null>(null);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setTrace(live() ? buf.slice() : synthBpm != null ? syntheticEcg(synthBpm) : null), FPS_MS);
    return () => clearInterval(id);
  }, [on, synthBpm]);
  return on ? trace : null;
}
