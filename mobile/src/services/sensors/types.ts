import type { Metrics, Proximity } from '@orbit/shared';

/** Both sources (simulator and BLE) implement this. The rest of the app never knows which one runs. */
export interface SensorSource {
  start(onMetrics: (m: Metrics) => void, onPeers: (p: Proximity[]) => void): void;
  stop(): void;
  /** Optional: BLE pauses only the proximity scan in background; the simulator needs nothing. */
  setBackground?(bg: boolean): void;
}
