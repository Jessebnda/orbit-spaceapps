// Wearable CSV stream: one reading per line, ~20 ms apart, comma separated.
//   t_ms, ecg_raw, ecg_filtered, leads_ok, angX, angY, angZ, accX, accY, accZ, temp_c
// ECG is sent 50x/s; IMU + temperature every 5th line (the other columns are empty).

export interface SensorSample {
  /** ms since the ESP32 booted. */
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
  if (c.length !== 11) return null; // other wearables send other column counts (see parseHeadLine)
  const [t, ecgRaw, ecg, leads] = [num(c[0]), num(c[1]), num(c[2]), num(c[3])];
  if (t == null || ecgRaw == null || ecg == null || leads == null || ![t, ecgRaw, ecg].every(Number.isFinite)) return null;
  const out: SensorSample = { t, ecgRaw, ecg, leadsOn: leads === 1 };
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
const WINDOW = 150; // 3 s at 50 Hz
const MIN_SWING = 20; // filtered-ECG units; below this the trace is flat noise

/**
 * Beats per minute from the filtered ECG: R peaks = local maxima in the top 40 % of the last 3 s,
 * at least 300 ms apart; bpm = 60000 / median of the last 5 R-R intervals.
 * shortcut: threshold detector, fine for a clean filtered trace; swap for Pan-Tompkins if motion noise shows up.
 */
export class HeartRate {
  private win: { t: number; v: number }[] = [];
  private peaks: number[] = [];
  push(s: SensorSample): number | null {
    if (!s.leadsOn) { this.reset(); return null; }
    const last = this.win[this.win.length - 1];
    if (last && s.t < last.t) this.reset(); // ESP32 rebooted
    this.win.push({ t: s.t, v: s.ecg });
    if (this.win.length > WINDOW) this.win.shift();
    const n = this.win.length;
    if (n < 3) return this.bpm();
    const [a, b, c] = [this.win[n - 3], this.win[n - 2], this.win[n - 1]];
    const lo = Math.min(...this.win.map((x) => x.v)), hi = Math.max(...this.win.map((x) => x.v));
    const isPeak = b.v > a.v && b.v >= c.v && hi - lo >= MIN_SWING && b.v >= lo + 0.6 * (hi - lo);
    const prev = this.peaks[this.peaks.length - 1];
    if (isPeak && (prev == null || b.t - prev >= REFRACTORY_MS)) {
      this.peaks.push(b.t);
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
  reset() { this.win = []; this.peaks = []; }
}
