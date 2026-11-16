import { pushEcg } from './ecgStream';
import { HeartRate, LineBuffer, PulseWave, bpFromPtt, parseHeadLine, parsePulseLine, parseSensorLine, type Device, type Metrics } from '@orbit/shared';

const EMIT_MS = 100; // UI refresh; history is still sampled per minute in the store
const ECG_WINS_MS = 3000; // with both wearables on, the chest ECG pulse beats the head-band PPG pulse

const TRACE_MS = 20; // the live trace stays at 50 Hz even when the chest sends 250 Hz
const PTT_MIN = 80, PTT_MAX = 500; // ms; outside this the R peak and the wrist pulse are not the same beat

let ecgHrAt = 0; // shared by every link: when the ECG last produced a pulse
let lastR: number | undefined; // newest unpaired chest R peak, phone ms (performance.now)
let ptts: number[] = []; // last accepted beats, for a median that ignores the odd false wrist peak
let bpAt = 0;
let imuLogAt = 0;

type Accel = { x: number; y: number; z: number };
let imuListener: ((tMs: number, a: Accel, from: Device) => void) | null = null;
/** Raw wearable accelerometer (m/s², gravity included), every IMU line, before the UI throttle. Returns the unsubscribe. */
export function onImu(fn: (tMs: number, a: Accel, from: Device) => void) {
  imuListener = fn;
  return () => { if (imuListener === fn) imuListener = null; };
}
let hrPaused = false;
/** While a jump test runs: motion artefacts make the ECG/PPG pulse jump, so hr is dropped and the last good value stays. */
export const pauseHr = (on: boolean) => { hrPaused = on; };

/** True while blood pressure is being estimated from real beats, so the mock stays quiet. */
export const bpIsMeasured = () => Date.now() - bpAt < 10_000;
let tempAt = 0;
/** True while a wearable sends a real temperature, so the mock steps aside. */
export const tempIsMeasured = () => Date.now() - tempAt < 10_000;

/**
 * Pulse transit time: chest R peak → wrist pulse peak, both moved to phone time with each link's clock offset.
 * Median of the last 9 beats → blood pressure (bpFromPtt, population calibration until a cuff reading exists).
 * Wrist beat = steepest IR upstroke (PulseWave). shortcut: ±5 ms of clock-sync error; tighten the sync before trusting it for BP.
 */
function pulseArrived(p: number, onM: (m: Metrics) => void) {
  if (lastR == null) return;
  const ptt = p - lastR;
  if (ptt < PTT_MIN || ptt > PTT_MAX) return;
  lastR = undefined; // first wrist pulse after each R peak only: later ones are the dicrotic notch or noise
  ptts = [...ptts.slice(-8), ptt];
  const med = [...ptts].sort((a, b) => a - b)[ptts.length >> 1];
  if (ptts.length < 9) return; // the first beats after putting the sensors on still carry false wrist peaks
  const bp = bpFromPtt(med);
  bpAt = Date.now();
  onM({ bpSys: bp.sys, bpDia: bp.dia });
  console.log('[ptt]', ptt.toFixed(0), 'ms, mediana', med.toFixed(0), 'ms →', `${bp.sys}/${bp.dia}`, 'mmHg');
}

/**
 * One decoder per wearable link. Wire formats:
 * - JSON metrics every 2 s (reference firmware),
 * - chest CSV, 11 columns (ECG 50 Hz, ms) or 12 columns (ECG 250 Hz, µs) + IMU/temp (pulse computed here from the ECG),
 * - band "P,<micros>,<ir>" raw PPG lines (pulse transit time),
 * - head band CSV, 8 columns: IMU + BPM + SpO2 computed on the ESP32.
 * `kind` reports which wearable this link turned out to be, once, from its first valid line.
 */
export function vitalsDecoder(emit: (m: Metrics) => void, kind: (d: Device) => void = () => {}, toPhone?: () => ((espMs: number) => number) | null) {
  const onM = (m: Metrics) => {
    if (hrPaused) delete m.hr;
    if (Object.keys(m).length) emit(m);
  };
  const lines = new LineBuffer();
  const hr = new HeartRate();
  const ppg = new PulseWave();
  let lastEmit = 0;
  let lastTrace = 0;
  let pulses = { n: 0, since: Date.now(), dts: [] as number[], prev: 0 }; // P-line timing check, logged every 5 s
  let temp: number | undefined;
  let known = false;
  const seen = (d: Device) => {
    if (!known) kind(d);
    known = true;
  };
  return (text: string) => {
    if (text.trimStart().startsWith('{')) {
      try {
        onM(JSON.parse(text) as Metrics);
      } catch {
        // Truncated JSON: a frame this app does not understand.
      }
      return;
    }
    for (const line of lines.push(text)) {
      const pulse = parsePulseLine(line);
      if (pulse) {
        seen('band');
        const t = pulse.tUs / 1000;
        if (pulse.tUs > pulses.prev) pulses.dts.push(pulse.tUs - pulses.prev);
        pulses.prev = pulse.tUs;
        if (++pulses.n && Date.now() - pulses.since >= 5000) {
          const d = pulses.dts.sort((a, b) => a - b);
          console.log('[ppg] tasa', (pulses.n / ((Date.now() - pulses.since) / 1000)).toFixed(0), '/s dt_us min/med/max', d[0], d[d.length >> 1], d[d.length - 1], 'ir', pulse.ir);
          pulses = { n: 0, since: Date.now(), dts: [], prev: pulses.prev };
        }
        const map = toPhone?.();
        if (ppg.push(t, pulse.ir) && map) pulseArrived(map(ppg.last!), onM);
        continue;
      }
      const head = parseHeadLine(line);
      if (head) {
        seen('band');
        const now = Date.now(); // no device clock in this format
        // shortcut: phone arrival time; BLE batching can bunch lines, upgrade if the head band gains a timestamp column
        imuListener?.(now, head.accel, 'band');
        if (now - lastEmit < EMIT_MS) continue;
        lastEmit = now;
        const m: Metrics = {};
        if (head.bpm != null && now - ecgHrAt > ECG_WINS_MS) m.hr = head.bpm;
        if (head.spo2 != null) m.spo2 = head.spo2;
        if (Object.keys(m).length) onM(m);
        continue;
      }
      const sample = parseSensorLine(line);
      if (!sample) continue;
      seen('vest');
      if (sample.accel) imuListener?.(sample.t, sample.accel, 'vest');
      if (line.split(',').length === 12 && line.split(',')[5] !== '' && Date.now() - imuLogAt > 5000) {
        imuLogAt = Date.now();
        console.log('[imu] chaleco', sample.accel ? 'ok' : 'SIN accel', line.trim()); // every 5 s: did the IMU columns parse?
      }
      if (sample.t < lastTrace || sample.t - lastTrace >= TRACE_MS) {
        lastTrace = sample.t;
        pushEcg(sample.ecg, sample.leadsOn);
      }
      const r = hr.lastPeak;
      const bpm = hr.push(sample);
      const map = toPhone?.();
      if (hr.lastPeak != null && hr.lastPeak !== r && map) lastR = map(hr.lastPeak);
      // Raw surface temperature; statusOf treats < 30 °C as "not on the body" instead of hypothermia.
      // shortcut: no skin→core offset yet, calibrate once the sensor sits on the body.
      if (sample.temp != null) { temp = sample.temp; tempAt = Date.now(); }
      if (sample.t < lastEmit) lastEmit = sample.t; // ESP32 rebooted
      if (sample.t - lastEmit < EMIT_MS) continue;
      lastEmit = sample.t;
      const m: Metrics = {};
      if (bpm != null) {
        m.hr = bpm;
        ecgHrAt = Date.now();
      }
      if (temp != null) m.temp = temp;
      if (Object.keys(m).length) onM(m);
    }
  };
}
