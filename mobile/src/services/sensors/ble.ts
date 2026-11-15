import { BLE, HeartRate, LineBuffer, parseBleName, parseSensorLine, type Device, type Metrics, type Proximity } from '@orbit/shared';
import { PermissionsAndroid, Platform } from 'react-native';
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

// Android 12+ grants nothing from the manifest alone: without this the scan errors out silently.
async function androidPermissions() {
  if (Platform.OS !== 'android') return true;
  const P = PermissionsAndroid.PERMISSIONS;
  const want = Number(Platform.Version) >= 31 ? [P.BLUETOOTH_SCAN, P.BLUETOOTH_CONNECT] : [P.ACCESS_FINE_LOCATION];
  const got = await PermissionsAndroid.requestMultiple(want);
  return want.every((p) => got[p] === PermissionsAndroid.RESULTS.GRANTED);
}

async function scan() {
  if (!manager || scanning) return;
  scanning = true;
  if (!(await androidPermissions())) {
    scanning = false;
    console.warn('[ble] permisos de Bluetooth denegados');
    return;
  }
  if (!scanning) return; // stopped while the dialog was open
  manager.startDeviceScan(null, { allowDuplicates: true }, (err, d) => {
    if (err) {
      scanning = false;
      console.warn('[ble] scan error', err.errorCode, err.message);
      return;
    }
    if (!d) return;
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
  // Android starts at a 23-byte MTU (20-byte notifies), which cuts every ~60-byte CSV line; iOS negotiates on its own.
  d.connect(Platform.OS === 'android' ? { requestMTU: 247 } : undefined)
    .then((x) => x.discoverAllServicesAndCharacteristics())
    .then((x) => {
      useStore.getState().setDevice(device, true);
      console.log('[ble] connected', device, d.name);
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
      });
      x.onDisconnected(drop);
    })
    .catch((e) => {
      console.warn('[ble] connect', device, e?.message);
      drop();
    });
}
