import { Platform } from 'react-native';
import { HUB_PORT } from '@orbit/shared';

// Web: the page is served from the captain Mac, so the hub is the same host.
const webHub = Platform.OS === 'web' && typeof location !== 'undefined' ? `ws://${location.hostname}:${HUB_PORT}/ws` : undefined;

/** Defaults for the ship LAN. The hub URL is editable in Yo > Ajustes. */
export const ENV = {
  hubUrl: webHub ?? process.env.EXPO_PUBLIC_HUB_URL ?? `ws://192.168.1.50:${HUB_PORT}/ws`, // set at build time to the captain Mac IP
  // Bonsai-4B (Qwen3-based, 1-bit Q1_0, Apache-2.0); pinned revision so the size below stays valid
  petModelUrl: 'https://huggingface.co/prism-ml/Bonsai-4B-gguf/resolve/78f2c2bacd0904ffaba24b4873ed975e5818354a/Bonsai-4B-Q1_0.gguf',
  petModelFile: 'bonsai-4b-q1_0.gguf',
  // shortcut: size check only (catches truncated downloads); SHA-256 4524b3f9…e42168 if hashing on device gets cheap
  petModelBytes: 572_270_624,
  /** Earlier pet models, deleted on startup to free storage. */
  petLegacyFiles: ['qwen3-0.6b-q8_0.gguf'],
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
