import { type ClientMsg, type HubMsg, type Protocol, type StatEvent } from '@orbit/shared';
import { ENV } from '../config/env';
import { useStore } from '../store/store';

const PET_TIMEOUT = ENV.petHubTimeoutMs;

let ws: WebSocket | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let backoff = 1000;
let stopped = true;
const queue: string[] = [];
/** Pending pet questions, answered in order by the hub's `pet_reply`. */
const petWaiting: ((text: string | null) => void)[] = [];

export function send(msg: ClientMsg) {
  const raw = JSON.stringify(msg);
  if (ws?.readyState === WebSocket.OPEN) ws.send(raw);
  else {
    queue.push(raw);
    if (queue.length > ENV.queueMax) queue.shift();
  }
}

export function sendStat(event: StatEvent) {
  send({ t: 'stat', crewId: useStore.getState().profile.crewId, ts: Date.now(), event });
}

/** Asks the hub's pet brain. Resolves null on timeout, so the caller falls back. */
export function askPet(text: string): Promise<string | null> {
  return new Promise((resolve) => {
    const done = (r: string | null) => {
      clearTimeout(t);
      const i = petWaiting.indexOf(done);
      if (i >= 0) petWaiting.splice(i, 1);
      resolve(r);
    };
    const t = setTimeout(() => done(null), PET_TIMEOUT);
    petWaiting.push(done);
    send({ t: 'pet_chat', crewId: useStore.getState().profile.crewId, text });
  });
}

function onMessage(msg: HubMsg) {
  const st = useStore.getState();
  if (msg.t === 'protocol') {
    if (msg.crewId === st.profile.crewId) st.addProtocol(msg.protocol as Protocol);
  } else if (msg.t === 'emergency') {
    st.setEmergency(msg.emergency.resolved ? null : msg.emergency);
  } else if (msg.t === 'pet_reply') {
    petWaiting.shift()?.(msg.text);
  } else if (msg.t === 'self') {
    st.setSelf(msg.snapshot, msg.crew ?? []); // ?? : older hub without roster
  }
}

function open() {
  const { hubUrl, profile } = useStore.getState();
  let sock: WebSocket;
  try {
    sock = new WebSocket(hubUrl);
  } catch {
    schedule();
    return;
  }
  ws = sock;
  sock.onopen = () => {
    backoff = 1000;
    useStore.getState().setHubOnline(true);
    sock.send(JSON.stringify({ t: 'hello', role: 'crew', member: { id: profile.crewId, name: profile.name, role: profile.role } }));
    while (queue.length) sock.send(queue.shift()!);
  };
  sock.onmessage = (e) => {
    try {
      onMessage(JSON.parse(String(e.data)) as HubMsg);
    } catch {
      // Malformed frame from the hub: skip it.
    }
  };
  sock.onclose = () => {
    if (sock !== ws) return; // replaced or stopped
    ws = null;
    useStore.getState().setHubOnline(false);
    schedule();
  };
  sock.onerror = () => sock.close();
}

function schedule() {
  if (stopped) return;
  timer = setTimeout(open, backoff);
  backoff = Math.min(backoff * 2, 15000);
}

/** Reconnects with the current URL and profile. Safe to call on every settings change. */
export function restart() {
  stop();
  stopped = false;
  open();
}

export function stop() {
  stopped = true;
  if (timer) clearTimeout(timer);
  timer = null;
  const old = ws;
  ws = null;
  old?.close();
  useStore.getState().setHubOnline(false);
}
