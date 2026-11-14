import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ACHIEVEMENTS } from '@orbit/shared';
import { newlyUnlocked } from '../domain/achievements';
import { useStore } from '../store/store';
import * as hub from './hub';
import { checkModel, release } from './petBrain';
import { bleSource } from './sensors/ble';
import { simSource } from './sensors/sim';
import type { SensorSource } from './sensors/types';

let started = false;
let active: SensorSource | null = null;

/** The app talks to one SensorSource; switching the data source is stop + start. */
function startSource() {
  active?.stop();
  active = useStore.getState().dataSource === 'ble' ? bleSource : simSource;
  active.start((m) => useStore.getState().ingest(m), (p) => useStore.getState().setPeers(p));
}

/** Unlocks what the local data now meets: toast, haptic, and a stat for the hub's XP total. */
export function checkAchievements() {
  const s = useStore.getState();
  const fresh = newlyUnlocked({ now: Date.now(), checkins: s.checkins, days: s.days, done: s.done, sessions: s.sessions, stats: s.stats, explorations: s.explorations }, s.unlocked);
  if (!fresh.length) return;
  s.unlock(fresh);
  for (const id of fresh) hub.sendStat({ type: 'achievement', id });
  const first = ACHIEVEMENTS.find((a) => a.id === fresh[0])!;
  s.showToast(`Logro: ${first.title} (+${first.xp} XP)`);
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Starts the data flow once the persisted store is loaded. Safe to call twice. */
export function startRuntime() {
  if (started) return;
  started = true;
  const go = () => {
    useStore.subscribe(checkAchievements);
    useStore.subscribe((s, p) => {
      if (s.profile !== p.profile || s.hubUrl !== p.hubUrl) hub.restart();
      if (s.dataSource !== p.dataSource || s.profile.crewId !== p.profile.crewId) startSource();
    });
    hub.restart();
    startSource();
    void checkModel();
    setInterval(() => {
      const { metrics, profile } = useStore.getState();
      if (Object.keys(metrics).length) hub.send({ t: 'vitals', crewId: profile.crewId, ts: Date.now(), metrics });
    }, 2000);
    setInterval(() => {
      const { peers, profile } = useStore.getState();
      hub.send({ t: 'proximity', crewId: profile.crewId, peers });
    }, 5000);
    AppState.addEventListener('change', (state) => {
      const bg = state !== 'active';
      active?.setBackground?.(bg);
      if (bg) void release();
      else if (!useStore.getState().hubOnline) hub.restart();
    });
  };
  if (useStore.persist.hasHydrated()) go();
  else useStore.persist.onFinishHydration(go);
}
