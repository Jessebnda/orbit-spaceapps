// All DB reads and writes. Every write is best-effort; reads return [] when the DB is down.
import type { CheckIn, CommsRecord, CrewMember, DaySummary, Emergency, Metrics, Protocol, StatEvent } from '@orbit/shared';
import { query, save } from './db';

export const saveCrew = (m: CrewMember) =>
  save('insert into crew (id, name, role) values ($1, $2, $3) on conflict (id) do update set name = excluded.name, role = excluded.role', [m.id, m.name, m.role]);

export const saveVitals = (crewId: string, ts: number, metrics: Metrics) =>
  save('insert into vitals (crew_id, ts, metrics) values ($1, to_timestamp($2::float8 / 1000), $3)', [crewId, ts, metrics]);

export const saveCheckin = (crewId: string, c: CheckIn) =>
  save('insert into checkins (crew_id, ts, data) values ($1, to_timestamp($2::float8 / 1000), $3)', [crewId, c.ts, c]);

export const saveComms = (r: CommsRecord) =>
  save('insert into comms (crew_id, peer_id, ts, minutes, channel) values ($1, $2, to_timestamp($3::float8 / 1000), $4, $5)', [r.crewId, r.peerId, r.ts, r.minutes, r.channel]);

export const saveStat = (crewId: string, ts: number, event: StatEvent) =>
  save('insert into stat_events (crew_id, ts, event) values ($1, to_timestamp($2::float8 / 1000), $3)', [crewId, ts, event]);

export const saveProtocol = (crewId: string, p: Protocol) =>
  save('insert into protocols (id, crew_id, data) values ($1, $2, $3)', [`${crewId}-${p.id}-${Date.now()}`, crewId, p]);

export const ackProtocol = (crewId: string, protocolId: string) =>
  save("update protocols set acked_at = now() where crew_id = $1 and data->>'id' = $2 and acked_at is null", [crewId, protocolId]);

export const saveEmergency = (e: Emergency) =>
  save(
    'insert into emergencies (id, ts, data, resolved) values ($1, to_timestamp($2::float8 / 1000), $3, $4) on conflict (id) do update set data = excluded.data, resolved = excluded.resolved',
    [e.id, e.ts, e, e.resolved ?? false],
  );

export async function vitalsSince(crewId: string, hours: number): Promise<{ ts: number; metrics: Metrics }[]> {
  try {
    const r = await query<{ ts: number; metrics: Metrics }>(
      'select (extract(epoch from ts) * 1000)::float8 as ts, metrics from vitals where crew_id = $1 and ts > to_timestamp($2::float8 / 1000) order by ts',
      [crewId, Date.now() - hours * 3_600_000],
    );
    return r.rows;
  } catch { return []; }
}

/** Last 7 days per calendar day (DB clock, UTC). Shortcut: UTC days, not ship time; move to ship tz when the ship sets one. */
export async function daySummaries(crewId: string, days = 7): Promise<DaySummary[]> {
  try {
    const w = 'ts > now() - make_interval(days => $2::int)';
    const p = [crewId, days];
    const d = "to_char(ts, 'YYYY-MM-DD')";
    const [vit, ci, com, st] = await Promise.all([
      query<any>(`select ${d} d, max((metrics->>'sleep')::float8) sleep, max((metrics->>'activity')::float8) activity from vitals where crew_id = $1 and ${w} group by d`, p),
      query<any>(`select ${d} d, avg((data->>'mood')::float8) mood, avg((data->>'stress')::float8) stress from checkins where crew_id = $1 and ${w} group by d`, p),
      query<any>(`select ${d} d, sum(minutes)::float8 m from comms where (crew_id = $1 or peer_id = $1) and ${w} group by d`, p),
      query<any>(`select ${d} d,
        (sum(case when event->>'type' = 'game_time' then (event->>'seconds')::float8 else 0 end) / 60)::float8 game,
        (sum(case when event->>'type' = 'pet_time' then (event->>'seconds')::float8 else 0 end) / 60)::float8 pet
        from stat_events where crew_id = $1 and ${w} group by d`, p),
    ]);
    const byDay = new Map<string, DaySummary>();
    const at = (day: string) => { let x = byDay.get(day); if (!x) byDay.set(day, x = { day }); return x; };
    for (const r of vit.rows) Object.assign(at(r.d), { sleep: r.sleep ?? undefined, activity: r.activity ?? undefined });
    for (const r of ci.rows) Object.assign(at(r.d), { mood: r.mood ?? undefined, stress: r.stress ?? undefined });
    for (const r of com.rows) at(r.d).commsMin = r.m;
    for (const r of st.rows) Object.assign(at(r.d), { gameMin: r.game, petMin: r.pet });
    return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  } catch { return []; }
}
