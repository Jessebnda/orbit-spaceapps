import { BLE, parseBleName, type Device, type Metrics, type Proximity } from '@orbit/shared';
import { PermissionsAndroid, Platform } from 'react-native';
import type { BleManager as BleMgr, Device as BleDevice } from 'react-native-ble-plx';
import { ENV } from '../../config/env';
import { useStore } from '../../store/store';
import { classic } from './classic';
import { bpIsMeasured, vitalsDecoder } from './decoder';
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
let bpTimer: ReturnType<typeof setInterval> | null = null;

// shortcut: MOCK blood pressure for the demo, a random walk inside a healthy resting range (110–120 / 70–80 mmHg).
// Steps aside while decoder.ts estimates BP from pulse transit time (chest ECG + wrist PPG).
const BP_SYS: [number, number] = [110, 120], BP_DIA: [number, number] = [70, 80];
function mockBp(onMetrics: (m: Metrics) => void) {
  let sys = 115, dia = 75;
  const walk = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v + (Math.random() - 0.5) * 2));
  const tick = () => {
    if (bpIsMeasured()) return; // the chest + wrist pair is giving real pulse-transit estimates
    sys = walk(sys, BP_SYS);
    dia = walk(dia, BP_DIA);
    onMetrics({ bpSys: Math.round(sys), bpDia: Math.round(dia) });
  };
  tick();
  return setInterval(tick, 2000);
}
let onP: (p: Proximity[]) => void = () => {};
const connected = new Set<string>();
const named = new Set<string>();
const seen = new Map<string, { rssi: number; ts: number }>();

export const bleSource: SensorSource = {
  start(onMetrics, onPeers) {
    this.stop();
    if (!ensureManager()) return;
    crew = useStore.getState().profile.crewId;
    onM = onMetrics;
    onP = onPeers;
    scan();
    bpTimer = mockBp(onMetrics);
    peerTimer = setInterval(() => {
      const now = Date.now();
      onP([...seen.entries()].filter(([, v]) => now - v.ts < ENV.peerStaleMs).map(([id, v]) => ({ crewId: id, rssi: v.rssi })));
    }, 5000);
  },
  stop() {
    if (peerTimer) clearInterval(peerTimer);
    peerTimer = null;
    if (bpTimer) clearInterval(bpTimer);
    bpTimer = null;
    if (manager && scanning) manager.stopDeviceScan();
    scanning = false;
    seen.clear();
    classic.stop();
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
  classic.start(onM);
  manager.startDeviceScan(null, { allowDuplicates: true }, (err, d) => {
    if (err) {
      scanning = false;
      console.warn('[ble] scan error', err.errorCode, err.message);
      return;
    }
    if (!d) return;
    // One line per new advertiser, so a wearable with the wrong name or crew id shows up in the logs.
    if (!named.has(d.id) && (d.name || d.localName)) {
      named.add(d.id);
      console.log('[ble] visto', d.name ?? d.localName, d.rssi, 'crew', crew);
    }
    const p = parseBleName(d.name ?? d.localName);
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
      const decode = vitalsDecoder(onM);
      x.monitorCharacteristicForService(BLE.service, BLE.vitalsChar, (err, ch) => {
        if (!err && ch?.value) decode(atob(ch.value));
      });
      x.onDisconnected(drop);
    })
    .catch((e) => {
      console.warn('[ble] connect', device, e?.message);
      drop();
    });
}
