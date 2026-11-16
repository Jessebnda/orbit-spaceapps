// Crew album: helmet-camera JPEGs as plain files, so they survive hub restarts without the DB.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CrewPhoto } from '@orbit/shared';

const DIR = fileURLToPath(new URL('../../photos', import.meta.url));
mkdirSync(DIR, { recursive: true });
const ID = /^\d+_[A-Za-z0-9%._~!'()*-]+$/; // `${ts}_${encodeURIComponent(crewId)}`, so a path can never escape DIR

/** Returns the new photo, or null when the bytes are not a JPEG. */
export function savePhoto(crewId: string, ts: number, b64: string, name: string): CrewPhoto | null {
  const buf = Buffer.from(b64, 'base64');
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  const id = `${Math.round(ts)}_${encodeURIComponent(crewId)}`;
  writeFileSync(join(DIR, `${id}.jpg`), buf);
  return { id, crewId, name, ts };
}

export function listPhotos(nameOf: (id: string) => string): CrewPhoto[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.jpg') && ID.test(f.slice(0, -4)))
    .map((f) => {
      const id = f.slice(0, -4);
      const cut = id.indexOf('_');
      const crewId = decodeURIComponent(id.slice(cut + 1));
      return { id, crewId, name: nameOf(crewId), ts: Number(id.slice(0, cut)) };
    })
    .sort((a, b) => b.ts - a.ts);
}

export function photoBytes(id: string): Buffer | null {
  if (!ID.test(id)) return null;
  try { return readFileSync(join(DIR, `${id}.jpg`)); } catch { return null; }
}
