"use client";

import { useEffect, useState } from "react";
import type { CrewSnapshot, Emergency, HubMsg } from "@orbit/shared";
import { HUB } from "@/lib/services/hub";

/**
 * Captain WebSocket. Each snapshot replaces the previous one (nothing accumulates).
 * Reconnects with backoff; the socket and the retry timer are closed on unmount.
 */
export function useHub() {
  const [snap, setSnap] = useState<{ crew: CrewSnapshot[]; emergencies: Emergency[] } | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let sock: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let delay = 1000;
    let closing = false;

    const connect = () => {
      const ws = new WebSocket(HUB.replace(/^http/, "ws") + "/ws");
      sock = ws;
      ws.onopen = () => {
        delay = 1000;
        setConnected(true);
        ws.send(JSON.stringify({ t: "hello", role: "captain" }));
      };
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data as string) as HubMsg;
        if (m.t === "snapshot") {
          setSnap({ crew: m.crew, emergencies: m.emergencies });
        } else if (m.t === "emergency") {
          setSnap((s) => s && { ...s, emergencies: [...s.emergencies.filter((x) => x.id !== m.emergency.id), m.emergency] });
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (closing) return;
        retry = setTimeout(connect, delay);
        delay = Math.min(delay * 2, 10_000);
      };
    };

    connect();
    return () => {
      closing = true;
      clearTimeout(retry);
      sock?.close();
    };
  }, []);

  return { crew: snap?.crew ?? [], emergencies: snap?.emergencies ?? [], loaded: snap !== null, connected };
}
