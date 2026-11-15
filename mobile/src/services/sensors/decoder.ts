import { pushEcg } from './ecgStream';
import { HeartRate, LineBuffer, PeakDetector, parseHeadLine, parsePulseLine, parseSensorLine, type Device, type Metrics } from '@orbit/shared';

const EMIT_MS = 100; // UI refresh; history is still sampled per minute in the store
const ECG_WINS_MS = 3000; // with both wearables on, the chest ECG pulse beats the head-band PPG pulse

const TRACE_MS = 20; // the live trace stays at 50 Hz even when the chest sends 250 Hz
const PTT_MIN = 80, PTT_MAX = 500; // ms; outside this the R peak and the wrist pulse are not the same beat

let ecgHrAt = 0; // shared by every link: when the ECG last produced a pulse
let lastR: number | undefined; // newest chest R peak, phone ms (performance.now)

/**
 * Pulse transit time: chest R peak → wrist pulse peak, both moved to phone time with each link's clock offset.
 * Logged only for now; blood pressure stays simulated until it is calibrated against a cuff.
 * shortcut: uses the PPG peak, not its foot, and ±5 ms of sync error; upgrade both before trusting it for BP.
 */
function pulseArrived(p: number) {
  if (lastR == null) return;
  const ptt = p - lastR;
  if (ptt >= PTT_MIN && ptt <= PTT_MAX) console.log('[ptt]', ptt.toFixed(1), 'ms');
}

/**
 * One decoder per wearable link. Wire formats:
 * - JSON metrics every 2 s (reference firmware),
 * - chest CSV, 11 columns (ECG 50 Hz, ms) or 12 columns (ECG 250 Hz, µs) + IMU/temp (pulse computed here from the ECG),
 * - band "P,<micros>,<ir>" raw PPG lines (pulse transit time),
 * - head band CSV, 8 columns: IMU + BPM + SpO2 computed on the ESP32.
 * `kind` reports which wearable this link turned out to be, once, from its first valid line.
 */
export function vitalsDecoder(onM: (m: Metrics) => void, kind: (d: Device) => void = () => {}, toPhone?: () => ((espMs: number) => number) | null) {
  const lines = new LineBuffer();
  const hr = new HeartRate();
  const ppg = new PeakDetector();
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
        // MAX3010x IR drops when blood arrives, so the pulse peak is the IR minimum.
        const map = toPhone?.();
        if (ppg.push(t, -pulse.ir) && map) pulseArrived(map(ppg.last!));
        continue;
      }
      const head = parseHeadLine(line);
      if (head) {
        seen('band');
        const now = Date.now(); // no device clock in this format
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
      if (sample.temp != null) temp = sample.temp;
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
