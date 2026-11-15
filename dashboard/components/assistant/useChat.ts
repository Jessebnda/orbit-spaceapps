"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Action, ChatMsg } from "@/lib/services/hub";
import { HubError, START_CMD, api } from "@/lib/services/hub";

// The chat lives at module level, not in the component: a question keeps loading while the captain
// visits other pages, and the reply lands when it arrives. Messages also go to localStorage for reloads.
// shortcut: a reload or closed tab mid-answer still drops that reply (the request dies with the page);
// move the job to the hub and poll it if that matters.

const KEY = "orbit.assistant.chat";
type State = { messages: ChatMsg[]; busy: boolean; startedAt: number; error?: string };
const EMPTY: State = { messages: [], busy: false, startedAt: 0 };

let state = EMPTY;
let abort: AbortController | null = null;
const subs = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  if (patch.messages) {
    try { localStorage.setItem(KEY, JSON.stringify(state.messages)); } catch { /* full or blocked: memory only */ }
  }
  subs.forEach((f) => f());
}

function load() {
  try { state = { ...state, messages: JSON.parse(localStorage.getItem(KEY) ?? "[]") as ChatMsg[] }; } catch { /* blocked or corrupt: start empty */ }
  subs.forEach((f) => f());
}

if (typeof window !== "undefined") {
  load();
  window.addEventListener("storage", (e) => { if (e.key === KEY && !state.busy) load(); }); // another browser tab changed it
}

async function send(text: string) {
  if (!text || state.busy) return;
  const next: ChatMsg[] = [...state.messages, { role: "user", content: text }];
  set({ messages: next, busy: true, startedAt: Date.now(), error: undefined });
  const ac = new AbortController();
  abort = ac;
  try {
    const res = await api<{ reply: string; actions: Action[] }>("/api/assistant", {
      method: "POST",
      body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      signal: ac.signal,
    });
    if (abort !== ac) return; // the chat was reset while this was loading
    set({ messages: [...state.messages, { role: "assistant", content: res.reply, actions: res.actions }] });
  } catch (err) {
    if (abort !== ac) return;
    if (ac.signal.aborted) set({ error: "Cancelado." });
    else if (err instanceof HubError && err.status === 503) set({ error: `El asistente no está en línea. Inícialo con ${START_CMD}` });
    else set({ error: err instanceof Error ? err.message : "Error al consultar el asistente" });
  } finally {
    if (abort === ac) { abort = null; set({ busy: false }); }
  }
}

function reset() {
  const ac = abort;
  abort = null;
  ac?.abort();
  set({ messages: [], busy: false, error: undefined });
}

const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

/** Chat state and the cancelable request to POST /api/assistant. */
export function useChat() {
  const s = useSyncExternalStore(subscribe, () => state, () => EMPTY);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!s.busy) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [s.busy]);
  const elapsed = s.busy ? Math.max(0, Math.floor((now - s.startedAt) / 1000)) : 0;
  return { messages: s.messages, busy: s.busy, elapsed, error: s.error, send, reset, cancel: () => abort?.abort() };
}
