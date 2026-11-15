import { HeartRate, LineBuffer, parseSensorLine, type Metrics } from '@orbit/shared';

/**
 * One decoder per wearable link. Accepts both wire formats: JSON metrics every 2 s (reference firmware)
 * or the raw CSV stream (ECG 50 Hz + IMU/temp 10 Hz), and emits metrics at most every 2 s of device time.
 */
export function vitalsDecoder(onM: (m: Metrics) => void) {
  const lines = new LineBuffer();
  const hr = new HeartRate();
  let lastEmit = 0;
  let temp: number | undefined;
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
      const sample = parseSensorLine(line);
      if (!sample) continue;
      const bpm = hr.push(sample);
      // The GY-906 reads whatever it points at; below 30 °C it is reading air, not skin, and would raise a false hypothermia alarm.
      // shortcut: fixed cut-off, replace with a skin→core offset once the sensor sits on the body.
      if (sample.temp != null) temp = sample.temp >= 30 ? sample.temp : undefined;
      if (sample.t < lastEmit) lastEmit = sample.t; // ESP32 rebooted
      if (sample.t - lastEmit < 2000) continue;
      lastEmit = sample.t;
      const m: Metrics = {};
      if (bpm != null) m.hr = bpm;
      if (temp != null) m.temp = temp;
      if (Object.keys(m).length) onM(m);
    }
  };
}
