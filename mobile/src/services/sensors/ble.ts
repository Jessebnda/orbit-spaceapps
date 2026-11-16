import { BLE, parseBleName, type Device, type Metrics, type Proximity } from '@orbit/shared';
import { PermissionsAndroid, Platform } from 'react-native';
import type { BleManager as BleMgr, Device as BleDevice } from 'react-native-ble-plx';
import { ENV } from '../../config/env';
import { useStore } from '../../store/store';
import { classic } from './classic';
import { bpIsMeasured, tempIsMeasured, vitalsDecoder } from './decoder';
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
// shortcut: MOCK temperature, water and sleep too (no working sensor for them yet); temperature steps aside when a wearable sends one.
function mockBp(onMetrics: (m: Metrics) => void) {
  let sys = 115, dia = 75, temp = 36.6, water = 1.2;
  const sleep = Math.round((6.8 + Math.random() * 1.2) * 10) / 10; // one night's value per app start
  const walk = (v: number, [lo, hi]: [number, number], step = 2) => Math.min(hi, Math.max(lo, v + (Math.random() - 0.5) * step));
  const tick = () => {
    const m: Metrics = { sleep, water: Math.round(water * 10) / 10 };
    water = Math.min(2.6, water + 0.0005); // ~1 L over the day, in 2 s steps
    if (!tempIsMeasured()) m.temp = Math.round((temp = walk(temp, [36.3, 36.9], 0.1)) * 10) / 10;
    if (!bpIsMeasured()) { // the chest + wrist pair is giving real pulse-transit estimates
      sys = walk(sys, BP_SYS);
      dia = walk(dia, BP_DIA);
      m.bpSys = Math.round(sys);
      m.bpDia = Math.round(dia);
    }
    onMetrics(m);
  };
  tick();
  return setInterval(tick, 2000);
}
let onP: (p: Proximity[]) => void = () => {};
const connected = new Set<string>();
const named = new Set<string>();
const seen = new Map<string, { rssi: number; ts: number }>();
// Plain ESP32 names ("esp32 banda mano") carry no crew id: in this demo every phone connects to them, as the Classic link does.
const PLAIN_WEARABLE = /^ESP/i;
// The head camera answers 0x01 <packet size> on 6e400002 with a raw JPEG on 6e400003 (any other byte there is ignored).
const CAMERA = /cabeza/i;
const CAM_CTRL = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
let cam: { id: string; dev: BleDevice; svc: string; write: (b64: string) => Promise<unknown>; mtu: number } | null = null;
let photoSink: ((bytes: string) => void) | null = null;

/** Asks the head camera for one photo; resolves with a JPEG data URI. */
export function takePhoto(timeoutMs = 10_000): Promise<string> {
  const c = cam;
  console.log('[cam] pedir foto', c ? `mtu ${c.mtu}` : 'sin cámara', photoSink ? 'ocupada' : '');
  if (!c) return Promise.reject(new Error('Conecta la cámara (esp cabeza) por Bluetooth.'));
  if (photoSink) return Promise.reject(new Error('Ya hay una foto en camino.'));
  return new Promise((resolve, reject) => {
    let buf = '';
    let started = false;
    let packets = 0, got = 0;
    const finish = (err: Error | null, uri?: string) => {
      clearTimeout(timer);
      photoSink = null;
      console.log('[cam] fin', err ? err.message : `${uri!.length} chars`, 'paquetes', packets, 'bytes', got);
      if (err) reject(err); else resolve(uri!);
    };
    let timer = setTimeout(() => finish(new Error('La cámara no respondió. Revisa el monitor serial del ESP32.')), timeoutMs);
    // No framing from the firmware: the JPEG itself is the frame, from its SOI (FF D8) to its EOI (FF D9).
    photoSink = (chunk) => {
      packets++; got += chunk.length;
      // a lost notify drops the JPEG's end marker: give up after a gap instead of waiting out the whole timeout
      clearTimeout(timer);
      timer = setTimeout(() => finish(new Error('La foto llegó incompleta. Toca otra vez.')), 1500);
      if (packets <= 2 || packets % 50 === 0) console.log('[cam] paquete', packets, got, JSON.stringify(chunk.slice(0, 12)));
      buf += chunk;
      if (!started) {
        const i = buf.indexOf('\xFF\xD8');
        if (i < 0) { buf = buf.slice(-1); return; }
        buf = buf.slice(i);
        started = true;
      }
      const end = buf.indexOf('\xFF\xD9');
      if (end >= 0) finish(null, `data:image/jpeg;base64,${btoa(buf.slice(0, end + 2))}`);
    };
    const size = Math.max(20, Math.min(244, c.mtu - 3)); // a packet must fit one notify (firmware caps at 244)
    c.write(btoa(String.fromCharCode(1, size))).then(() => console.log('[cam] comando enviado', 1, size)).catch((e) => finish(new Error(`No se pudo pedir la foto: ${e?.message ?? e}`)));
  });
}

const NOT_WEARABLE = /robot/i;

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
    const name = d.name ?? d.localName ?? '';
    const p = parseBleName(name);
    if (!p) {
      if (PLAIN_WEARABLE.test(name) && !NOT_WEARABLE.test(name) && !connected.has(d.id)) connect(d, null);
      return;
    }
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

/** `device` null: a plain ESP32 name, told apart by its data format; its data comes on the first notifying characteristic. */
function connect(d: BleDevice, device: Device | null) {
  connected.add(d.id);
  let kind = device;
  const drop = () => {
    connected.delete(d.id);
    if (kind) useStore.getState().setDevice(kind, false);
    if (cam?.id === d.id) { console.log('[cam] cámara desconectada'); cam = null; useStore.setState({ camera: false }); }
  };
  // Android starts at a 23-byte MTU (20-byte notifies), which cuts every ~60-byte CSV line; iOS negotiates on its own.
  d.connect(Platform.OS === 'android' ? { requestMTU: 247 } : undefined)
    .then((x) => x.discoverAllServicesAndCharacteristics())
    .then(async (x) => {
      const mark = (k: Device) => {
        kind = device ?? k;
        useStore.getState().setDevice(kind, true);
        console.log('[ble] conectado', d.name ?? d.localName, '→', kind);
      };
      if (device) mark(device);
      const decode = vitalsDecoder(onM, mark);
      let svc: string = BLE.service, chr: string = BLE.vitalsChar;
      if (!device) {
        // skip GAP/GATT (0x1800/0x1801): their 0x2A05 "service changed" indicates but carries no data
        const own = (await x.services()).filter((sv) => !/^0000180[01]-/i.test(sv.uuid));
        const chars = (await Promise.all(own.map((sv) => sv.characteristics()))).flat();
        const c = chars.find((c) => c.uuid === BLE.vitalsChar) ?? chars.find((c) => c.isNotifiable || c.isIndicatable);
        if (!c) throw new Error('sin característica notify');
        svc = c.serviceUUID; chr = c.uuid;
        console.log('[ble] leyendo', d.name ?? d.localName, svc, chr);
        const ctrl = chars.find((k) => k.uuid === CAM_CTRL && (k.isWritableWithResponse || k.isWritableWithoutResponse));
        if (ctrl && CAMERA.test(d.name ?? d.localName ?? '')) {
          const write = (b64: string) => ctrl.isWritableWithResponse ? x.writeCharacteristicWithResponseForService(ctrl.serviceUUID, ctrl.uuid, b64) : x.writeCharacteristicWithoutResponseForService(ctrl.serviceUUID, ctrl.uuid, b64);
          cam = { id: d.id, dev: x, svc: ctrl.serviceUUID, write, mtu: x.mtu ?? 23 };
          useStore.setState({ camera: true });
          if (Platform.OS === 'android') x.requestConnectionPriority(1).catch(() => {}); // high: shorter BLE interval, the JPEG arrives faster
          console.log('[ble] cámara lista', d.name ?? d.localName, 'mtu', x.mtu);
        }
      }
      let raw = 3; // first packets as they arrive, to see an unknown wearable's format in the logs
      x.monitorCharacteristicForService(svc, chr, (err, ch) => {
        if (err) return console.warn('[ble] notify', d.name ?? d.localName, err.message);
        if (!ch?.value) return;
        const text = atob(ch.value);
        if (photoSink && cam?.id === d.id) return photoSink(text); // photo bytes are not vitals lines
        if (raw > 0) { raw--; console.log('[ble] dato', d.name ?? d.localName, JSON.stringify(text.slice(0, 120))); }
        decode(text);
      });
      x.onDisconnected(drop);
    })
    .catch((e) => {
      console.warn('[ble] connect', device ?? d.name ?? d.localName, e?.message);
      setTimeout(drop, 5000); // a failed link is retried after a pause, not on every advertisement
    });
}
