"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { ACHIEVEMENTS, type AchievementId, type CrewSnapshot } from "@orbit/shared";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState, SkeletonRows } from "@/components/ui/EmptyState";
import { Medal } from "@/components/ui/Medal";
import { PageHeader } from "@/components/ui/PageHeader";
import { useApi } from "@/lib/services/useApi";
import { useHub } from "@/lib/services/useHub";
import type { Exploration, LeaderRow } from "@/lib/services/hub";

const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

/**
 * Effort points: movement counts the same as looking after the mind, and nobody can win by overdoing it (200/day cap).
 * shortcut: the hub keeps no weekly history, so this is today's effort from the live snapshot; make it weekly when the hub exposes it.
 */
export function effortOf(c: CrewSnapshot, explorations: Exploration[], now: number) {
  const km = explorations.filter((e) => e.crewId === c.member.id && sameDay(e.ts, now)).reduce((s, e) => s + e.event.km, 0);
  const checkIn = c.lastCheckIn && sameDay(c.lastCheckIn.ts, now) ? 20 : 0;
  return Math.min(200, Math.round(Math.min(c.stats.activityMin, 120) + checkIn + Math.min(c.stats.petMin, 30) / 2 + 2 * Math.min(km, 10)));
}

export function LeaderboardScreen() {
  const board = useApi<LeaderRow[]>("/api/leaderboard", 15000);
  const explorations = useApi<Exploration[]>("/api/explorations", 30000);
  const { crew } = useHub();
  const [pick, setPick] = useState<string>();
  const now = Date.now();

  const xp = new Map((board.data ?? []).map((r) => [r.member.id, r]));
  const rows = crew
    .map((c) => ({ c, ep: effortOf(c, explorations.data ?? [], now), won: xp.get(c.member.id)?.achievements ?? c.stats.achievements, xp: xp.get(c.member.id)?.xp ?? c.stats.xp }))
    .sort((a, b) => b.ep - a.ep || a.c.member.name.localeCompare(b.c.member.name));
  const maxEp = Math.max(1, ...rows.map((r) => r.ep));
  const sel = rows.find((r) => r.c.member.id === pick) ?? rows[0];
  const holders = (id: AchievementId) => rows.filter((r) => r.won.includes(id));

  // Crew goal: 2 h of countermeasures each, shown as one bar split by who contributed.
  const goal = Math.max(crew.length, 1) * 120;
  const total = crew.reduce((s, c) => s + c.stats.activityMin, 0);
  const tones = [1, 0.72, 0.48, 0.32];
  const top = rows.filter((r) => r.ep === rows[0]?.ep);
  const finding = !rows.length ? "Esperando a la tripulación…" : top.length > 1 ? `${top.map((r) => r.c.member.name).join(" y ")} empatan con ${top[0].ep} EP` : `${top[0].c.member.name} lidera con ${top[0].ep} EP`;

  return (
    <div>
      <PageHeader title="Logros" finding={rows.length ? finding : undefined} />
      {board.error && <p role="alert" className="t-small mb-4 text-muted">No se pudo actualizar la clasificación: {board.error}</p>}
      {!rows.length && !board.error && <SkeletonRows />}

      {rows.length > 0 && (
        <>
          <section aria-labelledby="goal-h" className="mb-6 rounded-md bg-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="goal-h" className="t-heading">Meta de la tripulación · contramedidas de hoy</h2>
              <p className="t-title tabular-nums">{total} <span className="t-body font-normal text-muted">de {goal} min</span></p>
            </div>
            <div className="mt-4 flex h-2 gap-px overflow-hidden rounded-full bg-raised" role="meter" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={total} aria-label="Minutos de contramedidas de la tripulación">
              {[...crew].sort((a, b) => b.stats.activityMin - a.stats.activityMin).map((c, i) => (
                <span key={c.member.id} title={`${c.member.name} ${c.stats.activityMin} min`} style={{ width: `${(c.stats.activityMin / goal) * 100}%`, background: "var(--t-accent)", opacity: tones[Math.min(i, 3)] }} />
              ))}
            </div>
            <p className="t-small mt-2 text-muted">{total >= goal ? "Meta cumplida por toda la tripulación." : `Faltan ${goal - total} min para cerrar el día.`}</p>
          </section>

          <div className="grid gap-6 lg:grid-cols-12">
            <section aria-labelledby="rank-h" className="lg:col-span-7">
              <h2 id="rank-h" className="t-heading mb-1">Esfuerzo de hoy</h2>
              <p className="t-small mb-3 text-muted">Cuenta el movimiento igual que cuidar la mente. Nunca se ordena por signos vitales.</p>
              <ol className="ledger" style={{ ["--inset" as string]: "56px" }}>
                {rows.map((r, i) => {
                  const rank = r.ep > 0 && rows.findIndex((x) => x.ep === r.ep) < 3 ? rows.findIndex((x) => x.ep === r.ep) + 1 : undefined;
                  const mine = r.c.member.id === sel?.c.member.id;
                  return (
                    <li key={r.c.member.id}>
                      <button type="button" aria-pressed={mine} onClick={() => setPick(r.c.member.id)} className={`row-hover flex h-[72px] w-full items-center gap-4 px-4 text-left ${mine ? "row-selected" : ""}`}>
                        <span className={`t-title w-8 text-center tabular-nums ${rank === 1 ? "text-ink" : "text-muted"}`} aria-label={rank ? `Puesto ${rank}` : undefined}>{rank ?? ""}</span>
                        <Avatar name={r.c.member.name} size={40} online={r.c.online} label={false} />
                        <span className="min-w-0 flex-1">
                          <span className="t-heading block truncate">{r.c.member.name}</span>
                          <span className="mt-2 block h-1 overflow-hidden rounded-full bg-raised"><span className="block h-full rounded-full bg-accent" style={{ width: `${(r.ep / maxEp) * 100}%` }} /></span>
                        </span>
                        <span className="hidden w-24 justify-end gap-1 min-[1100px]:flex">
                          {r.won.filter((id): id is AchievementId => ACHIEVEMENTS.some((a) => a.id === id)).slice(-4).map((id) => <Medal key={id} id={id} earned size={24} />)}
                        </span>
                        <span className="text-right"><span className="t-title tabular-nums">{r.ep}</span> <span className="t-small text-muted">EP</span></span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>

            <section aria-labelledby="medals-h" className="lg:col-span-5">
              <h2 id="medals-h" className="t-heading mb-1">Parches de {sel?.c.member.name.split(" ")[0]}</h2>
              <p className="t-small mb-4 text-muted">{sel?.won.length ?? 0} de {ACHIEVEMENTS.length} · {sel?.xp ?? 0} XP</p>
              <ul className="grid grid-cols-5 gap-x-2 gap-y-5">
                {ACHIEVEMENTS.map((a) => {
                  const got = !!sel?.won.includes(a.id);
                  const who = holders(a.id);
                  return (
                    <li key={a.id} className="flex flex-col items-center text-center" title={a.desc}>
                      <Medal id={a.id} earned={got} size={56} />
                      <span className="sr-only-x">{got ? "Conseguido" : "Bloqueado"}</span>
                      <span className="t-small mt-1.5 font-semibold leading-tight">{a.title}</span>
                      <span className="t-micro text-muted">+{a.xp} XP</span>
                      <span className="mt-1.5 flex h-4 -space-x-1">{who.slice(0, 4).map((w) => <span key={w.c.member.id} className="rounded-full ring-1 ring-bg"><Avatar name={w.c.member.name} size={16} label={false} /></span>)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </>
      )}
      {board.data && !rows.length && <EmptyState icon={Trophy} title="Todavía no hay XP" />}
    </div>
  );
}
