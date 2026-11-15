import { BLE, HeartRate, LineBuffer, parseBleName, parseSensorLine, type Device, type Metrics, type Proximity } from '@orbit/shared';
import type { BleManager as BleMgr, Device as BleDevice } from 'react-native-ble-plx';
import { ENV } from '../../config/env';
import { useStore } from '../../store/store';
import type { SensorSource } from './types';

// Optional native module: absent in Expo Go, where the simulator is the source.
let manager: BleMgr | null = null;
let attempted = false;
function ensureManager() {
  if (!attempted) {
    attempted = true;
    try {
      const { BleManager } = require('react-native-ble-plx') as typeof import('react-native-ble-plx');
      manager = new BleManager();
    } catch { manager = null; }
  }
  return manager;
}
export const bleAvailable = () => ensureManager() !== null;

let crew = '';
let onM: (m: Metrics) => void = () => {};
let scanning = false;
let peerTimer: ReturnType<typeof setInterval> | null = null;
let onP: (p: Proximity[]) => void = () => {};
const connected = new Set<string>();
const seen = new Map<string, { rssi: number; ts: number }>();

export const bleSource: SensorSource = {
  start(onMetrics, onPeers) {
    this.stop();
    if (!ensureManager()) return;
    crew = useStore.getState().profile.crewId;
    onM = onMetrics;
    onP = onPeers;
    scan();
    peerTimer = setInterval(() => {
      const now = Date.now();
      onP([...seen.entries()].filter(([, v]) => now - v.ts < ENV.peerStaleMs).map(([id, v]) => ({ crewId: id, rssi: v.rssi })));
    }, 5000);
  },
  stop() {
    if (peerTimer) clearInterval(peerTimer);
    peerTimer = null;
    if (manager && scanning) manager.stopDeviceScan();
    scanning = false;
    seen.clear();
  },
  /** Background pauses only the proximity scan. Connections to our own devices are kept. */
  setBackground(bg) {
    if (!manager || !crew) return;
    if (bg) {
      if (scanning) manager.stopDeviceScan();
      scanning = false;
    } else scan();
  },
};

function scan() {
  if (!manager || scanning) return;
  scanning = true;
  manager.startDeviceScan(null, { allowDuplicates: true }, (err, d) => {
    if (err || !d) return;
    const p = parseBleName(d.name);
    if (!p) return;
    if (p.crewId === crew) {
      if (!connected.has(d.id)) connect(d, p.device);
    } else {
      // Strongest signal per crew member: any one of their devices shows they are near.
      const old = seen.get(p.crewId);
      const rssi = d.rssi ?? -100;
      if (!old || rssi >= old.rssi || Date.now() - old.ts > ENV.peerStaleMs) seen.set(p.crewId, { rssi, ts: Date.now() });
    }
  });
}

function connect(d: BleDevice, device: Device) {
  connected.add(d.id);
  const drop = () => {
    connected.delete(d.id);
    useStore.getState().setDevice(device, false);
  };
  d.connect()
    .then((x) => x.discoverAllServicesAndCharacteristics())
    .then((x) => {
      useStore.getState().setDevice(device, true);
      // Two wire formats: JSON metrics every 2 s (reference firmware) or the raw CSV stream (ECG 50 Hz + IMU/temp 10 Hz).
      const lines = new LineBuffer();
      const hr = new HeartRate();
      let lastEmit = 0;
      let temp: number | undefined;
      x.monitorCharacteristicForService(BLE.service, BLE.vitalsChar, (err, ch) => {
        if (err || !ch?.value) return;
        const text = atob(ch.value);
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
          if (sample.temp != null) temp = sample.temp;
          if (sample.t < lastEmit) lastEmit = sample.t; // ESP32 rebooted
          if (sample.t - lastEmit < 2000) continue;
          lastEmit = sample.t;
          const m: Metrics = {};
          if (bpm != null) m.hr = bpm;
          if (temp != null) m.temp = temp;
          if (Object.keys(m).length) onM(m);
        }
      });
      x.onDisconnected(drop);
    })
    .catch(drop);
}
