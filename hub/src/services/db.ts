import pg from 'pg';

export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://orbit:orbit@127.0.0.1:5432/orbit';
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4, connectionTimeoutMillis: 2000 });
// Without a listener, an idle-client error (DB restart) would crash the hub.
pool.on('error', () => {});

/** Throws when the DB is down. Reads use this so they can fall back to memory. */
export const query = <T extends pg.QueryResultRow = pg.QueryResultRow>(sql: string, params?: unknown[]) =>
  pool.query<T>(sql, params);

export const closeDb = () => pool.end();

let warned = false;
/** Best-effort write. The in-memory state is authoritative while the DB is down. */
export async function save(sql: string, params?: unknown[]): Promise<void> {
  try {
    await pool.query(sql, params);
  } catch (e) {
    if (!warned) {
      warned = true;
      console.warn(`[db] write failed, running in memory: ${(e as Error).message}`);
    }
  }
}
