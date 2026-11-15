import { HeartRate, LineBuffer, parseHeadLine, parseSensorLine, type Device, type Metrics } from '@orbit/shared';

const EMIT_MS = 100; // UI refresh; history is still sampled per minute in the store
const ECG_WINS_MS = 3000; // with both wearables on, the chest ECG pulse beats the head-band PPG pulse

let ecgHrAt = 0; // shared by every link: when the ECG last produced a pulse

/**
 * One decoder per wearable link. Wire formats:
 * - JSON metrics every 2 s (reference firmware),
 * - chest CSV, 11 columns: ECG 50 Hz + IMU/temp 10 Hz (pulse computed here from the ECG),
 * - head band CSV, 8 columns: IMU + BPM + SpO2 computed on the ESP32.
 * `kind` reports which wearable this link turned out to be, once, from its first valid line.
 */
export function vitalsDecoder(onM: (m: Metrics) => void, kind: (d: Device) => void = () => {}) {
  const lines = new LineBuffer();
  const hr = new HeartRate();
  let lastEmit = 0;
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
      const bpm = hr.push(sample);
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
