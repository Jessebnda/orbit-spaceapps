/** Round tick values (1/2/5 x 10^n) covering [lo, hi] in about `n` steps; the last tick is >= hi. */
export function niceTicks(lo: number, hi: number, n = 4): number[] {
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 5, 10].find((m) => m * mag >= raw) ?? 10) * mag;
  const out: number[] = [];
  for (let v = Math.floor(lo / step) * step; v < hi + step - 1e-9; v += step) {
    out.push(Math.round(v / step) * step);
    if (v >= hi) break;
  }
  return out;
}
