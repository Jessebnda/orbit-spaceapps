/** Keeps charts light: at most `max` evenly spaced points. */
export function downsample<T>(a: T[], max = 500): T[] {
  if (a.length <= max) return a;
  const step = a.length / max;
  return Array.from({ length: max }, (_, i) => a[Math.floor(i * step)]);
}
