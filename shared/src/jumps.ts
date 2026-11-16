/**
 * Counts jumps from an accelerometer (m/s²). Gravity is not assumed: it is learned as a slow average of |a|,
 * so the same counter works at 1 g, at lunar/Martian g, in a microgravity harness, or on a sensor that already removes gravity.
 * A jump is a landing spike in |a| − gravity; it re-arms once the signal settles, and two jumps can't be closer than MIN_GAP_MS.
 */
const SPIKE = 5; // m/s² over gravity (~0.5 g): a landing on chest or wrist easily passes it, walking does not
const SETTLE = 1.5;
const MIN_GAP_MS = 400;
const GRAVITY_RATE = 0.02;

export class JumpCounter {
  count = 0;
  private gravity?: number;
  private armed = true;
  private lastAt = -Infinity;

  /** True when this sample completes a jump. */
  push(tMs: number, a: { x: number; y: number; z: number }): boolean {
    const m = Math.hypot(a.x, a.y, a.z);
    if (!Number.isFinite(m)) return false;
    this.gravity = this.gravity == null ? m : this.gravity + (m - this.gravity) * GRAVITY_RATE;
    const d = m - this.gravity; // landing pushes |a| above gravity; the flight phase dips below it and is not counted
    if (!this.armed) {
      if (Math.abs(d) < SETTLE) this.armed = true;
      return false;
    }
    if (d < SPIKE || tMs - this.lastAt < MIN_GAP_MS) return false;
    this.armed = false;
    this.lastAt = tMs;
    this.count++;
    return true;
  }
}
