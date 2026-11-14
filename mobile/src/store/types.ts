/** Per-day record: the highest sleep and activity seen that day. */
export type DayStat = { sleep?: number; activity?: number; comms?: number; gameSec?: number; petSec?: number };
export type Stats = { petSec: number; gameSec: number; bestScore: number; cprDrills: number };
