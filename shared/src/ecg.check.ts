// Run: npm run check (from shared/). Asserts for the wearable CSV parser and the heart-rate estimator.
import { HeartRate, LineBuffer, PeakDetector, parseHeadLine, parsePulseLine, parseSensorLine, type SensorSample } from './ecg';

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

const v12 = parseSensorLine('22146,1877,48.1,72,1,-2.58,-0.60,0.01,0.081,-0.408,8.970,24.39');
check(v12?.leadsOn === true && v12.ecg === 48.1 && v12.temp === 24.39, '12-column firmware (with its bpm) parses like the 11-column one');
check(parseSensorLine('8501,1734,nan,nan,0,,,,,,,')?.leadsOn === false, '12-column line with electrodes off is kept');
const h10 = parseHeadLine('203427,0.02,-0.01,0.09,359.5,350.1,4.0,71,74,97');
check(h10?.bpm === 74 && h10.spo2 === 97 && h10.angle.z === 4, `10-column band uses the averaged pulse: ${JSON.stringify(h10)}`);
check(parseHeadLine('203427,0.02,-0.01,0.09,359.5,350.1,4.0,72,0,97')?.bpm === 72, '10-column band falls back to BPM before the average exists');
check(parseHeadLine('Tiempo_ms,AccelX,AccelY,AccelZ,GradosX,GradosY,GradosZ,BPM,PromBPM,SpO2') === null && parseSensorLine('203427,0.02,-0.01,0.09,359.5,350.1,4.0,71,74,97') === null, '10-column band header dropped, never read as chest');
const off = parseSensorLine('2806145,1859,nan,0,-2.1,-0.9,-32.7,0.17,-0.29,8.97,24.2');
check(off != null && !off.leadsOn && off.temp === 24.2, 'nan ECG (electrodes off) still yields temperature');

// A line cut in two by BLE is reassembled.
const lb = new LineBuffer();
check(lb.push('22146,1877,48.1,1\n22166,18').length === 1 && lb.push('85,66.0,1\n').join('|') === '22166,1885,66.0,1', 'LineBuffer joins split lines');

// Synthetic filtered ECG at 50 Hz, an R wave per beat, with a small T wave and baseline wander.
function trace(bpm: number, seconds: number, leads = true, step = 20): SensorSample[] {
  const out: SensorSample[] = [];
  const period = 60000 / bpm;
  for (let t = 0; t < seconds * 1000; t += step) {
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

// 250 Hz firmware: time in µs, read as ms.
check(parseSensorLine('29087312,1968,48.1,71,1,,,,,,,')?.t === 29087.312, '12-column time is µs, exposed as ms');
const hr250 = run(trace(72, 20, true, 4));
check(hr250 != null && Math.abs(hr250 - 72) <= 2, `72 bpm at 250 Hz reads ${hr250}`);
// The peak lands on the highest sample, not the first one over the threshold (PTT needs the exact time).
const pd = new PeakDetector(); let peak: number | undefined;
for (const s of trace(60, 5, true, 4)) if (pd.push(s.t, s.ecg)) peak = pd.last;
check(peak != null && peak % 1000 === 36, `R peak at its top sample (${peak})`);
check(parsePulseLine('P,522301128,1078')?.tUs === 522301128 && parsePulseLine('P,522301128,1078')?.ir === 1078, 'P line parses');
check(parsePulseLine('P,,1078') === null && parsePulseLine('S,1,22') === null && parsePulseLine('29087312,1968,nan') === null, 'bad P lines are dropped');
console.log('ecg.check: ok');
