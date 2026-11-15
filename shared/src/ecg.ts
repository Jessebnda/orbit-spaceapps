// Chest CSV stream: one ECG reading per line, comma separated. Two firmware versions:
//   11 columns, 50 Hz:  t_ms, ecg_raw, ecg_filtered, leads_ok, angX, angY, angZ, accX, accY, accZ, temp_c
//   12 columns, 250 Hz: t_us, ecg_raw, ecg_filtered, bpm, leads_ok, ... (same tail; its bpm is ignored)
// IMU + temperature only on some lines (every 5th / 25th); the other columns are empty.

export interface SensorSample {
  /** ms since the ESP32 booted, fractional for the µs firmware. micros() wraps every ~71.6 min (seen as a reboot). */
  t: number;
  /** 0..4095 ADC counts. */
  ecgRaw: number;
  /** Centred around zero, can be negative. This is the trace to plot; it is NOT beats per minute. */
  ecg: number;
  /** false = electrode off. */
  leadsOn: boolean;
  /** degrees; Z is relative to boot. */
  angle?: { x: number; y: number; z: number };
  /** m/s², gravity included. */
  accel?: { x: number; y: number; z: number };
  /** °C of the surface the GY-906 points at (skin only if it faces the skin). */
  temp?: number;
}

const num = (s: string | undefined) => (s == null || s.trim() === '' ? undefined : Number(s));

/** Null for blank lines, headers, truncated lines and anything non-numeric (BLE can cut a line in half). */
export function parseSensorLine(line: string): SensorSample | null {
  const c = line.trim().split(',');
  // 12-column firmware: time in µs and its own bpm as column 4; the app computes pulse from the ECG itself, so drop it.
  const us = c.length === 12;
  if (us) c.splice(3, 1);
  if (c.length !== 11) return null; // other wearables send other column counts (see parseHeadLine)
  const [t, ecgRaw, ecg, leads] = [num(c[0]), num(c[1]), num(c[2]), num(c[3])];
  if (t == null || ecgRaw == null || leads == null || ![t, ecgRaw].every(Number.isFinite)) return null;
  // Electrodes off: the firmware sends "nan" for the filtered ECG. Keep the line for IMU/temp, mark the ECG unusable.
  const ecgOk = ecg != null && Number.isFinite(ecg);
  const out: SensorSample = { t: us ? t / 1000 : t, ecgRaw, ecg: ecgOk ? ecg : 0, leadsOn: leads === 1 && ecgOk };
  const v = c.slice(4, 11).map(num);
  if (v.length === 7 && v.every((x) => x != null && Number.isFinite(x))) {
    out.angle = { x: v[0]!, y: v[1]!, z: v[2]! };
    out.accel = { x: v[3]!, y: v[4]!, z: v[5]! };
    out.temp = v[6]!;
  }
  return out;
}

// Head band: AccelX,AccelY,AccelZ,GradosX,GradosY,GradosZ,BPM,SpO2 (its own PPG computes BPM and SpO2).
export interface HeadSample {
  accel: { x: number; y: number; z: number };
  angle: { x: number; y: number; z: number };
  /** Undefined while the sensor has no reading (the firmware sends 0). */
  bpm?: number;
  spo2?: number;
}

export function parseHeadLine(line: string): HeadSample | null {
  const c = line.trim().split(',');
  // Newer firmware: Tiempo_ms,AccelX..GradosZ,BPM,PromBPM,SpO2. Keep the averaged pulse, it jumps less.
  if (c.length === 10) c.splice(0, 1), c.splice(6, 2, Number(c[7]) > 0 ? c[7] : c[6]);
  if (c.length !== 8) return null;
  const v = c.map(num);
  if (!v.every((x) => x != null && Number.isFinite(x))) return null;
  const [ax, ay, az, gx, gy, gz, bpm, spo2] = v as number[];
  return {
    accel: { x: ax, y: ay, z: az },
    angle: { x: gx, y: gy, z: gz },
    bpm: bpm >= 30 && bpm <= 220 ? bpm : undefined,
    spo2: spo2 >= 70 && spo2 <= 100 ? spo2 : undefined,
  };
}

/** BLE notifies in small chunks, so a line can arrive split. Feed chunks, get whole lines back. */
export class LineBuffer {
  private rest = '';
  push(chunk: string): string[] {
    const parts = (this.rest + chunk).split(/\r?\n/);
    this.rest = parts.pop() ?? '';
    return parts.filter((l) => l.trim() !== '');
  }
}

const REFRACTORY_MS = 300; // 200 bpm ceiling
const WINDOW_MS = 3000;
const MIN_SWING = 20; // filtered-ECG units; below this the trace is flat noise

/**
 * Peaks in a stream: each stretch above 60 % of the last 3 s range gives one peak, at its highest sample,
 * at least 300 ms after the previous one. The highest sample (not the first crossing) keeps the timing
 * exact at 250 Hz, which pulse transit time needs.
 */
export class PeakDetector {
  private win: { t: number; v: number }[] = [];
  private top: { t: number; v: number } | undefined;
  /** Time of the newest peak, in the stream's own ms. */
  last: number | undefined;
  constructor(private minSwing = 0) {}
  /** True when this sample closed a new peak (its time is `last`). */
  push(t: number, v: number): boolean {
    const prevT = this.win[this.win.length - 1]?.t;
    if (prevT != null && t < prevT) this.reset(); // device rebooted or micros() wrapped
    this.win.push({ t, v });
    while (this.win[0].t < t - WINDOW_MS) this.win.shift();
    let lo = Infinity, hi = -Infinity;
    for (const x of this.win) { if (x.v < lo) lo = x.v; if (x.v > hi) hi = x.v; }
    if (hi - lo >= this.minSwing && hi > lo && v >= lo + 0.6 * (hi - lo)) {
      if (!this.top || v > this.top.v) this.top = { t, v };
      return false;
    }
    const top = this.top;
    this.top = undefined;
    if (!top || (this.last != null && top.t - this.last < REFRACTORY_MS)) return false;
    this.last = top.t;
    return true;
  }
  reset() { this.win = []; this.top = undefined; this.last = undefined; }
}

/**
 * Beats per minute from the filtered ECG: R peaks from PeakDetector, bpm = 60000 / median of the last 5 R-R intervals.
 * shortcut: threshold detector, fine for a clean filtered trace; swap for Pan-Tompkins if motion noise shows up.
 */
export class HeartRate {
  private det = new PeakDetector(MIN_SWING);
  private peaks: number[] = [];
  /** Newest R peak, ESP32 ms. */
  get lastPeak() { return this.det.last; }
  push(s: SensorSample): number | null {
    if (!s.leadsOn) { this.reset(); return null; }
    const before = this.det.last;
    if (this.det.push(s.t, s.ecg)) {
      if (before == null && this.peaks.length) this.peaks = []; // detector restarted: old peaks are another clock
      this.peaks.push(this.det.last!);
      if (this.peaks.length > 6) this.peaks.shift();
    }
    return this.bpm();
  }
  private bpm(): number | null {
    if (this.peaks.length < 4) return null;
    const rr = this.peaks.slice(1).map((p, i) => p - this.peaks[i]).sort((x, y) => x - y);
    const bpm = 60000 / rr[Math.floor(rr.length / 2)];
    return bpm >= 30 && bpm <= 220 ? Math.round(bpm) : null;
  }
  reset() { this.det.reset(); this.peaks = []; }
}

/**
 * Wrist pulse beats from raw IR, timed at the steepest upstroke (the usual pulse-transit-time marker).
 * IR drifts by thousands with pressure and movement, more than one beat; the slope of the smoothed IR
 * turns slow drift into a small constant the peak threshold ignores. IR drops when blood arrives, hence the minus.
 */
export class PulseWave {
  private det = new PeakDetector();
  private fast: number | undefined;
  private prev = { t: 0, v: 0 };
  get last() { return this.det.last; }
  push(t: number, ir: number): boolean {
    if (this.fast == null || t <= this.prev.t) { this.fast = ir; this.prev = { t, v: ir }; return false; }
    this.fast += (ir - this.fast) * 0.3; // ~30 ms smoothing at 100 Hz
    const slope = this.prev.v - this.fast; // per sample, not per µs: bunched FIFO timestamps (70 µs apart) would blow it up
    this.prev = { t, v: this.fast };
    return this.det.push(t, slope);
  }
}

/** Raw PPG from the band: "P,<micros>,<ir>", ~100 per second. */
export interface PulseSample { tUs: number; ir: number }
export function parsePulseLine(line: string): PulseSample | null {
  const c = line.trim().split(',');
  if (c.length !== 3 || c[0] !== 'P') return null;
  const tUs = Number(c[1]), ir = Number(c[2]);
  return Number.isFinite(tUs) && Number.isFinite(ir) && c[1] !== '' && c[2] !== '' ? { tUs, ir } : null;
}
