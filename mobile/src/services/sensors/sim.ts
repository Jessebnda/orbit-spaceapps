import { type MetricKey, type Metrics, type Proximity } from '@orbit/shared';
import { useStore } from '../../store/store';
import type { SensorSource } from './types';

// Plausible resting ranges. Each value is a random walk inside its range.
const RANGE: Record<MetricKey, [number, number]> = {
  hr: [58, 96], spo2: [95, 99], temp: [36.2, 37.2], bpSys: [106, 132], bpDia: [66, 84],
  resp: [11, 17], activity: [0, 240], sleep: [6, 8.5], kcal: [800, 2600], water: [0.8, 2.6],
};
const FAKE_PEERS = ['c2', 'c3', 'c4'];

/** Built-in demo source: vitals every 2 s, fake nearby crew every 5 s. */
export const simSource: SensorSource = {
  start(onMetrics, onPeers) {
    const cur = {} as Record<MetricKey, number>;
    for (const k of Object.keys(RANGE) as MetricKey[]) cur[k] = (RANGE[k][0] + RANGE[k][1]) / 2;
    const tick = () => {
      const m: Metrics = {};
      for (const k of Object.keys(RANGE) as MetricKey[]) {
        const [lo, hi] = RANGE[k];
        const step = k === 'activity' || k === 'kcal' || k === 'water' ? 0 : (hi - lo) * 0.04;
        cur[k] = Math.min(hi, Math.max(lo, cur[k] + (Math.random() - 0.5) * step));
        if (k === 'activity') cur[k] += 0.1; // minutes accumulate over the day
        m[k] = Math.round(cur[k] * 10) / 10;
      }
      onMetrics(m);
    };
    const tickPeers = () => onPeers(FAKE_PEERS.map((crewId) => ({ crewId, rssi: -45 - Math.round(Math.random() * 35) } as Proximity)));
    const st = useStore.getState();
    st.setDevice('band', true);
    st.setDevice('sleeve', true);
    st.setDevice('vest', true);
    tick();
    tickPeers();
    timers.push(setInterval(tick, 2000), setInterval(tickPeers, 5000));
  },
  stop() {
    timers.splice(0).forEach((t) => clearInterval(t));
  },
};

const timers: ReturnType<typeof setInterval>[] = [];
