import { HUB_PORT } from '@orbit/shared';

/** Defaults for the ship LAN. The hub URL is editable in Yo > Ajustes. */
export const ENV = {
  hubUrl: `ws://192.168.1.50:${HUB_PORT}/ws`,
  petModelUrl: 'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q8_0.gguf',
  petModelFile: 'qwen3-0.6b-q8_0.gguf',
  /** Memory: the pet context is freed after this idle time, and on background. */
  petIdleMs: 2 * 60_000,
  petContextTokens: 2048,
  petHubTimeoutMs: 8000,
  /** 24 h at one sample per minute. */
  historyMax: 1440,
  chatMax: 100,
  /** Offline queue for hub messages; oldest dropped first. */
  queueMax: 500,
  protocolsMax: 50,
  daysKeep: 30,
  /** A BLE proximity peer is stale after this long without an advertisement. */
  peerStaleMs: 15_000,
} as const;
