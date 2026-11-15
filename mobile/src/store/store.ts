import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { THRESHOLDS, type CheckIn, type CrewMember, type CrewSnapshot, type Device, type Emergency, type MetricKey, type Metrics, type Protocol, type Proximity } from '@orbit/shared';
import { ENV } from '../config/env';
import { dayKey } from '../domain/derive';
import type { DayStat, Stats } from './types';

export type DataSource = 'sim' | 'ble';
export type Sample = { ts: number; m: Metrics };
export type Session = { id: string; ts: number; done: boolean };
export type Exploration = { id: string; ts: number; title: string; place: string; km: number; minutes: number };
export type ChatMsg = { from: 'me' | 'pet'; text: string; ts: number };
export type Brain = { status: 'none' | 'downloading' | 'ready' | 'error'; progress: number };
export type Profile = { crewId: string; name: string; role: string };

type State = {
  profile: Profile;
  missionStart: number;
  hubUrl: string;
  dataSource: DataSource;
  /** Not persisted: the latest value changes every 2 s. */
  metrics: Metrics;
  devices: Partial<Record<Device, boolean>>;
  peers: Proximity[];
  hubOnline: boolean;
  self: CrewSnapshot | null;
  /** Roster from the hub so screens show names, not crew ids. */
  crew: CrewMember[];
  emergency: Emergency | null;
  activeSession: string | null;
  toast: string | null;
  brain: Brain;
  /** Persisted, one sample per minute, capped at 24 h. */
  history: Sample[];
  days: Record<string, DayStat>;
  checkins: CheckIn[];
  protocols: Protocol[];
  done: string[];
  checked: Record<string, number[]>;
  stats: Stats;
  explorations: Exploration[];
  unlocked: string[];
  chat: ChatMsg[];
  sessions: Session[];

  setProfile: (p: Partial<Profile>) => void;
  setHubUrl: (u: string) => void;
  setDataSource: (s: DataSource) => void;
  ingest: (m: Metrics) => void;
  setDevice: (d: Device, on: boolean) => void;
  setPeers: (p: Proximity[]) => void;
  setHubOnline: (on: boolean) => void;
  setSelf: (s: CrewSnapshot, crew: CrewMember[]) => void;
  setEmergency: (e: Emergency | null) => void;
  setBrain: (b: Partial<Brain>) => void;
  addCheckIn: (c: CheckIn) => void;
  addProtocol: (p: Protocol) => void;
  markDone: (id: string) => void;
  setChecked: (id: string, idx: number[]) => void;
  addStat: (k: 'petSec' | 'gameSec' | 'cprDrills', n: number) => void;
  /** End of a round: keeps the best score and banks the coins. */
  setBest: (score: number, coins?: number) => void;
  addExploration: (e: Exploration) => void;
  addChat: (m: ChatMsg) => void;
  addSession: (s: Session) => void;
  finishSession: (id: string) => void;
  snoozeSession: (id: string) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  unlock: (ids: string[]) => void;
  showToast: (text: string | null) => void;
};

/** Only these reach AsyncStorage. `metrics`, `peers`, `self`, `emergency` stay in memory. */
type Persisted = Pick<State, 'profile' | 'missionStart' | 'hubUrl' | 'dataSource' | 'history' | 'days' | 'checkins' | 'protocols' | 'done' | 'checked' | 'stats' | 'explorations' | 'unlocked' | 'chat' | 'sessions' | 'crew'>;

// Writes are debounced and skipped when unchanged, so the 2 s vitals stream never reaches disk.
let pendingWrite: ReturnType<typeof setTimeout> | null = null;
let lastWritten = '';
const debouncedStorage = {
  getItem: (k: string) => AsyncStorage.getItem(k),
  removeItem: (k: string) => AsyncStorage.removeItem(k),
  setItem: (k: string, v: string) => {
    if (pendingWrite) clearTimeout(pendingWrite);
    pendingWrite = setTimeout(() => {
      pendingWrite = null;
      if (v === lastWritten) return;
      lastWritten = v;
      AsyncStorage.setItem(k, v).catch(() => {});
    }, 3000);
  },
};

/** Sensor input is untrusted (BLE frames, simulator): keep only known keys with finite numbers. */
const sanitize = (m: Metrics): Metrics => {
  const out: Metrics = {};
  for (const k of Object.keys(THRESHOLDS) as MetricKey[]) {
    const v = m[k];
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  }
  return out;
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      profile: { crewId: 'c1', name: 'Tripulante', role: 'Especialista' },
      missionStart: Date.now(),
      hubUrl: ENV.hubUrl,
      dataSource: 'sim',
      metrics: {},
      devices: {},
      peers: [],
      hubOnline: false,
      self: null,
      crew: [],
      emergency: null,
      activeSession: null,
      toast: null,
      brain: { status: 'none', progress: 0 },
      history: [],
      days: {},
      checkins: [],
      protocols: [],
      done: [],
      checked: {},
      stats: { petSec: 0, gameSec: 0, bestScore: 0, cprDrills: 0 },
      explorations: [],
      unlocked: [],
      chat: [],
      sessions: [],

      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setHubUrl: (hubUrl) => set({ hubUrl }),
      setDataSource: (dataSource) => set({ dataSource }),

      ingest: (raw) => {
        const m = sanitize(raw);
        if (!Object.keys(m).length) return;
        const now = Date.now();
        const s = get();
        const metrics = { ...s.metrics, ...m };
        const day = dayKey(now);
        const cur = s.days[day] ?? {};
        const days: Record<string, DayStat> = { ...s.days, [day]: { sleep: m.sleep != null ? Math.max(cur.sleep ?? 0, m.sleep) : cur.sleep, activity: m.activity != null ? Math.max(cur.activity ?? 0, m.activity) : cur.activity } };
        const cutoff = dayKey(now - ENV.daysKeep * 86_400_000);
        for (const k of Object.keys(days)) if (k < cutoff) delete days[k];
        const last = s.history[s.history.length - 1];
        const history = !last || now - last.ts >= 60_000 ? [...s.history, { ts: now, m: metrics }].slice(-ENV.historyMax) : s.history;
        set({ metrics, days, history });
      },
      setDevice: (d, on) => set((s) => ({ devices: { ...s.devices, [d]: on } })),
      setPeers: (peers) => set({ peers }),
      setHubOnline: (hubOnline) => set({ hubOnline }),
      setSelf: (self, crew) => set((s) => {
        // Today's comms total is kept per day so the behaviour analysis can compare days.
        const day = dayKey(Date.now());
        return { self, crew, days: { ...s.days, [day]: { ...s.days[day], comms: self.comms.todayMin } } };
      }),
      setEmergency: (emergency) => set({ emergency }),
      setBrain: (b) => set((s) => ({ brain: { ...s.brain, ...b } })),

      addCheckIn: (c) => set((s) => ({ checkins: [...s.checkins, c] })),
      addProtocol: (p) => set((s) => ({ protocols: [p, ...s.protocols.filter((x) => x.id !== p.id)].slice(0, ENV.protocolsMax) })),
      markDone: (id) => set((s) => ({ done: s.done.includes(id) ? s.done : [...s.done, id] })),
      setChecked: (id, idx) => set((s) => ({ checked: { ...s.checked, [id]: idx } })),
      addStat: (k, n) => set((s) => {
        if (k === 'cprDrills') return { stats: { ...s.stats, cprDrills: s.stats.cprDrills + n } };
        const day = dayKey(Date.now());
        const field = k === 'petSec' ? 'petSec' : 'gameSec';
        const cur = s.days[day] ?? {};
        return { stats: { ...s.stats, [k]: s.stats[k] + n }, days: { ...s.days, [day]: { ...cur, [field]: (cur[field] ?? 0) + n } } };
      }),
      setBest: (score, coins = 0) => set((s) => ({ stats: { ...s.stats, bestScore: Math.max(s.stats.bestScore, score), coins: (s.stats.coins ?? 0) + coins } })),
      addExploration: (e) => set((s) => ({ explorations: [e, ...s.explorations] })),
      addChat: (m) => set((s) => ({ chat: [...s.chat, m].slice(-ENV.chatMax) })),
      addSession: (x) => set((s) => ({ sessions: [...s.sessions, x] })),
      finishSession: (id) => set((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? { ...x, done: true } : x)), activeSession: null })),
      snoozeSession: (id) => set((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? { ...x, ts: Date.now() + 10 * 60_000 } : x)), activeSession: null })),
      removeSession: (id) => set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) })),
      setActiveSession: (activeSession) => set({ activeSession }),
      unlock: (ids) => set((s) => ({ unlocked: [...s.unlocked, ...ids.filter((i) => !s.unlocked.includes(i))] })),
      showToast: (toast) => set({ toast }),
    }),
    {
      name: 'orbit_v1',
      // Bump to push a new build-time hub URL over the one saved on the phone; later edits in Ajustes stick.
      version: 2,
      migrate: (s) => ({ ...(s as Persisted), hubUrl: ENV.hubUrl }),
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (s): Persisted => ({
        profile: s.profile, missionStart: s.missionStart, hubUrl: s.hubUrl, dataSource: s.dataSource, history: s.history, days: s.days,
        checkins: s.checkins, protocols: s.protocols, done: s.done, checked: s.checked, stats: s.stats,
        explorations: s.explorations, unlocked: s.unlocked, chat: s.chat, sessions: s.sessions, crew: s.crew,
      }),
    },
  ),
);

/** crewId -> display name, falling back to the id while the roster hasn't arrived. */
export const useNameOf = () => {
  const crew = useStore((s) => s.crew);
  return (id: string) => crew.find((m) => m.id === id)?.name ?? id;
};
