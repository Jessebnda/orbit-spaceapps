"use client";

import { useEffect, useRef, useState } from "react";
import type { Action, ChatMsg } from "@/lib/services/hub";
import { HubError, START_CMD, api } from "@/lib/services/hub";

const KEY = "orbit.assistant.chat";

/** Chat state and the cancelable request to POST /api/assistant. Kept in localStorage so it survives page changes and reloads. */
export function useChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const loaded = useRef(false);

  // Read after mount: the server render has no localStorage, reading during render would mismatch hydration.
  useEffect(() => {
    const read = () => { try { setMessages(JSON.parse(localStorage.getItem(KEY) ?? "[]") as ChatMsg[]); } catch { /* blocked or corrupt: start empty */ } };
    read();
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) read(); }; // another browser tab changed it
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  useEffect(() => {
    if (!loaded.current) { loaded.current = true; return; } // skip the mount pass, it would overwrite storage with []
    try { localStorage.setItem(KEY, JSON.stringify(messages)); } catch { /* full or blocked: keep it in memory only */ }
  }, [messages]);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string>();
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [busy]);

  // Abort any in-flight request on unmount.
  useEffect(() => () => abort.current?.abort(), []);

  async function send(text: string) {
    if (!text || busy) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setError(undefined);
    setElapsed(0);
    setBusy(true);
    const ac = new AbortController();
    abort.current = ac;
    try {
      const res = await api<{ reply: string; actions: Action[] }>("/api/assistant", {
        method: "POST",
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
        signal: ac.signal,
      });
      setMessages((m) => [...m, { role: "assistant", content: res.reply, actions: res.actions }]);
    } catch (err) {
      if (ac.signal.aborted) setError("Cancelado.");
      else if (err instanceof HubError && err.status === 503) setError(`El asistente no está en línea. Inícialo con ${START_CMD}`);
      else setError(err instanceof Error ? err.message : "Error al consultar el asistente");
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  function reset() {
    abort.current?.abort();
    setMessages([]);
    setError(undefined);
  }

  return { messages, busy, elapsed, error, send, reset, cancel: () => abort.current?.abort() };
}
