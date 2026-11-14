// REST client for the ship hub. The WebSocket lives in useHub.ts.
import { HUB_PORT, type Metrics } from "@orbit/shared";

export const HUB = process.env.NEXT_PUBLIC_HUB_URL ?? `http://localhost:${HUB_PORT}`;
export const START_CMD = "hub/scripts/llm.sh";

export class HubError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(HUB + path, {
    ...init,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  });
  if (!res.ok) throw new HubError(res.status, (await res.text()) || res.statusText);
  return res.json() as Promise<T>;
}

export interface HistoryPoint { ts: number; metrics: Metrics }
export interface CommsRow { crewId: string; peerId: string; ts: number; minutes: number; channel: string }
export interface LeaderRow { member: { id: string; name: string }; xp: number; achievements: string[] }
export interface Exploration { crewId: string; name: string; ts: number; event: { title: string; km: number; minutes: number; place: string } }
export interface Action { tool: string; args: Record<string, unknown>; result?: unknown }
export interface ChatMsg { role: "user" | "assistant"; content: string; actions?: Action[] }
export type LlmState = { state: "off" | "starting" | "ready" };
