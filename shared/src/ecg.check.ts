// Run: npm run check (from shared/). Asserts for the wearable CSV parser and the heart-rate estimator.
import { HeartRate, LineBuffer, parseHeadLine, parseSensorLine, type SensorSample } from './ecg';

function check(v: boolean, m: string) { if (!v) throw new Error(m); }

// The two example lines from the firmware team.
const full = parseSensorLine('22146,1877,48.1,1,-2.58,-0.60,0.01,0.081,-0.408,8.970,24.39');
check(full?.t === 22146 && full.ecg === 48.1 && full.leadsOn && full.temp === 24.39 && full.accel?.z === 8.97 && full.angle?.x === -2.58, 'full line parses');
const ecgOnly = parseSensorLine('22166,1885,66.0,1,,,,,,,');
check(ecgOnly?.ecg === 66 && ecgOnly.temp === undefined && ecgOnly.accel === undefined, 'ECG-only line has no IMU or temperature');
check(parseSensorLine('22166,1885,66.0,0,,,,,,,')?.leadsOn === false, 'leads 0 = electrode off');
check(parseSensorLine('') === null && parseSensorLine('t,ecg') === null && parseSensorLine('22146,18') === null && parseSensorLine('a,b,c,d') === null, 'blank, header, truncated and non-numeric lines are dropped');

// Head band line: 8 columns, BPM and SpO2 from its own sensor; 0 means no reading.
const head = parseHeadLine('0.12,-0.40,9.79,1.5,-2.0,30.1,74,97');
check(head?.bpm === 74 && head.spo2 === 97 && head.accel.z === 9.79 && head.angle.z === 30.1, 'head line parses');
const noFinger = parseHeadLine('0.12,-0.40,9.79,1.5,-2.0,30.1,0,0');
check(noFinger != null && noFinger.bpm === undefined && noFinger.spo2 === undefined, 'head 0 BPM/SpO2 = no reading');
check(parseHeadLine('AccelX,AccelY,AccelZ,GradosX,GradosY,GradosZ,BPM,SpO2') === null, 'head header dropped');
check(parseSensorLine('0.12,-0.40,9.79,1.5,-2.0,30.1,74,97') === null && parseHeadLine('22146,1877,48.1,1,-2.58,-0.60,0.01,0.081,-0.408,8.970,24.39') === null, 'formats never mix');

const off = parseSensorLine('2806145,1859,nan,0,-2.1,-0.9,-32.7,0.17,-0.29,8.97,24.2');
check(off != null && !off.leadsOn && off.temp === 24.2, 'nan ECG (electrodes off) still yields temperature');

// A line cut in two by BLE is reassembled.
const lb = new LineBuffer();
check(lb.push('22146,1877,48.1,1\n22166,18').length === 1 && lb.push('85,66.0,1\n').join('|') === '22166,1885,66.0,1', 'LineBuffer joins split lines');

// Synthetic filtered ECG at 50 Hz, an R wave per beat, with a small T wave and baseline wander.
function trace(bpm: number, seconds: number, leads = true): SensorSample[] {
  const out: SensorSample[] = [];
  const period = 60000 / bpm;
  for (let t = 0; t < seconds * 1000; t += 20) {
    const rt = t % period; // ms since this beat's start
    const r = rt < 70 ? 120 * (1 - Math.abs(rt - 35) / 35) : 0; // R wave ~70 ms wide, like a real QRS
    const tw = rt > 250 && rt < 400 ? 20 * Math.sin(((rt - 250) / 150) * Math.PI) : 0;
    out.push({ t, ecgRaw: 2000, ecg: r + tw + 3 * Math.sin(t / 700), leadsOn: leads });
  }
  return out;
}
function run(samples: SensorSample[]) { const h = new HeartRate(); let last: number | null = null; for (const s of samples) last = h.push(s); return last; }

const hr72 = run(trace(72, 20));
check(hr72 != null && Math.abs(hr72 - 72) <= 3, `72 bpm trace reads ${hr72}`);
const hr110 = run(trace(110, 20));
check(hr110 != null && Math.abs(hr110 - 110) <= 4, `110 bpm trace reads ${hr110}`);
check(run(trace(72, 2)) === null, 'too few beats: no value yet');
check(run(trace(72, 20, false)) === null, 'electrode off gives no heart rate');
check(run(Array.from({ length: 500 }, (_, i) => ({ t: i * 20, ecgRaw: 2000, ecg: 1 + 0.1 * Math.sin(i), leadsOn: true }))) === null, 'a flat trace is not counted as beats');
console.log('ecg.check: ok');
