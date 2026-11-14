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
  const data = await res.json();
  // long-poll endpoints (assistant) answer 200 early and put failures in the body
  if (data && typeof data === "object" && "error" in data && "status" in data) throw new HubError(data.status, data.error);
  return data as T;
}

export interface HistoryPoint { ts: number; metrics: Metrics }
export type { CommsRecord as CommsRow, CommsResponse } from "@orbit/shared";
export type { LeaderRow, Exploration } from "@orbit/shared"; // one contract with the hub
export interface Action { tool: string; args: Record<string, unknown>; result?: unknown }
export interface ChatMsg { role: "user" | "assistant"; content: string; actions?: Action[] }
export type LlmState = { state: "off" | "starting" | "ready" };
