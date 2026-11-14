"use client";

import { ACHIEVEMENTS } from "@orbit/shared";
import { EmptyState } from "@/components/ui/EmptyState";
import { useApi } from "@/lib/services/useApi";
import { type LeaderRow } from "@/lib/services/hub";

const TITLE = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export function LeaderboardScreen() {
  const board = useApi<LeaderRow[]>("/api/leaderboard");
  const rows = [...(board.data ?? [])].sort((a, b) => b.xp - a.xp);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-title font-bold tracking-[-0.3px]">Logros</h1>
        <p className="mt-1 text-small text-muted">XP acumulado por la tripulación.</p>
      </header>
      {board.error && <p className="text-small text-muted">No se pudo leer el ranking: {board.error}</p>}
      {board.data && !rows.length && <EmptyState>Todavía no hay XP registrado.</EmptyState>}
      {rows.length > 0 && (
        <ol className="divide-y divide-hairline border-y border-hairline">
          {rows.map((r, i) => (
            <li key={r.member.id} className="grid grid-cols-[2rem_1fr_auto] gap-x-4 gap-y-2 py-3">
              <span className="text-small tabular-nums text-faint">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-small font-semibold">{r.member.name}</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {r.achievements.map((id) => (
                    <li key={id} title={TITLE[id as keyof typeof TITLE]?.desc} className="rounded-sm border border-hairline px-2 py-0.5 text-caption text-muted">
                      {TITLE[id as keyof typeof TITLE]?.title ?? id}
                    </li>
                  ))}
                </ul>
              </div>
              <span className="text-right text-section font-semibold tabular-nums">{r.xp} XP</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
