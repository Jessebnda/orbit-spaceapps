import { parseBleName, type Device, type Metrics } from '@orbit/shared';
import { Platform } from 'react-native';
import type { BluetoothDevice } from 'react-native-bluetooth-classic';
import { useStore } from '../../store/store';
import { vitalsDecoder } from './decoder';

// Classic Bluetooth (SPP / BluetoothSerial) for wearables already paired in Android settings.
// shortcut: Android only, iOS has no SPP; move the firmware to BLE (firmware/esp32_orbit/orbit_ble_csv.h) for iPhone.
const WEARABLE = /^(ORB-|ESP32)/i;
const NOT_WEARABLE = /robot/i; // other ESP32 projects paired to the same phone
const RETRY_MS = 5000;

let active = false;
let onM: (m: Metrics) => void = () => {};
let retry: ReturnType<typeof setTimeout> | null = null;
const links = new Map<string, { dev: BluetoothDevice; sub: { remove(): void }; device?: Device }>();

function lib() {
  if (Platform.OS !== 'android') return null;
  try {
    return (require('react-native-bluetooth-classic') as typeof import('react-native-bluetooth-classic')).default;
  } catch {
    return null; // Expo Go: native module absent
  }
}

async function connectAll() {
  const bt = lib();
  if (!bt || !active) return;
  try {
    for (const d of await bt.getBondedDevices()) {
      if (!WEARABLE.test(d.name) || NOT_WEARABLE.test(d.name) || links.has(d.address)) continue;
      try {
        const dev = await bt.connectToDevice(d.address, { delimiter: '\n', charset: 'ascii' });
        if (!active) { void dev.disconnect(); return; }
        // Rate check: one log line per 5 s with updates/s and the last values.
        let n = 0;
        let since = Date.now();
        // ORB-<crew>-<device> names say which wearable it is; plain ESP32 names are told apart by their data format.
        const link: { dev: BluetoothDevice; sub: { remove(): void }; device?: Device } = { dev, sub: { remove() {} } };
        const mark = (device: Device) => {
          link.device = parseBleName(d.name)?.device ?? device;
          useStore.getState().setDevice(link.device, true);
          console.log('[bt] conectado', d.name, '→', link.device);
        };
        const decode = vitalsDecoder((m) => {
          onM(m);
          n++;
          const dt = Date.now() - since;
          if (dt >= 5000) {
            console.log('[bt] tasa', d.name, (n / (dt / 1000)).toFixed(1), '/s', JSON.stringify(m));
            n = 0;
            since = Date.now();
          }
        }, mark);
        let raw = 3;
        link.sub = dev.onDataReceived((e) => {
          if (raw > 0 && raw--) console.log('[bt] linea', d.name, e.data);
          decode(`${e.data}\n`);
        });
        links.set(d.address, link);
      } catch (e) {
        console.warn('[bt] no conecta', d.name, (e as Error)?.message); // busy with another app, off, or out of range
      }
    }
  } catch (e) {
    console.warn('[bt] bonded', (e as Error)?.message);
  }
  // Drop links that died, then try again later for any that are missing.
  for (const [addr, l] of links) {
    if (!(await l.dev.isConnected().catch(() => false))) {
      l.sub.remove();
      links.delete(addr);
      if (l.device) useStore.getState().setDevice(l.device, false);
    }
  }
  if (active) retry = setTimeout(connectAll, RETRY_MS);
}

export const classic = {
  start(onMetrics: (m: Metrics) => void) {
    onM = onMetrics;
    if (active) return;
    active = true;
    void connectAll();
  },
  stop() {
    active = false;
    if (retry) clearTimeout(retry);
    retry = null;
    for (const l of links.values()) {
      l.sub.remove();
      void l.dev.disconnect().catch(() => {});
      if (l.device) useStore.getState().setDevice(l.device, false);
    }
    links.clear();
  },
};
