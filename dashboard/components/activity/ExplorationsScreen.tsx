"use client";

import { fmtAgo, fmtPace } from "@/lib/domain/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { LedgerList, LedgerRow } from "@/components/ui/LedgerRow";
import { useNow } from "@/lib/services/useNow";
import { useApi } from "@/lib/services/useApi";
import { type Exploration } from "@/lib/services/hub";

export function ExplorationsScreen() {
  const feed = useApi<Exploration[]>("/api/explorations");
  const now = useNow();
  const items = [...(feed.data ?? [])].sort((a, b) => b.ts - a.ts);

  // Totals per member, computed here so the hub only stores events.
  const totals = new Map<string, { name: string; km: number; minutes: number; count: number }>();
  for (const e of items) {
    const t = totals.get(e.crewId) ?? { name: e.name, km: 0, minutes: 0, count: 0 };
    t.km += e.event.km;
    t.minutes += e.event.minutes;
    t.count += 1;
    totals.set(e.crewId, t);
  }
  const rows = [...totals.values()].sort((a, b) => b.km - a.km);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="text-title font-bold tracking-[-0.3px]">Exploración</h1>
        <p className="mt-1 text-small text-muted">Caminatas y recorridos registrados por la tripulación.</p>
      </header>
      {feed.error && <p className="text-small text-muted">No se pudo leer las exploraciones: {feed.error}</p>}

      {rows.length > 0 && (
        <table className="w-full text-small">
          <caption className="mb-2 text-left text-caption font-bold text-muted">Totales</caption>
          <thead className="text-caption text-muted">
            <tr className="border-b border-hairline">
              <th scope="col" className="py-2 text-left font-bold">Miembro</th>
              <th scope="col" className="py-2 text-right font-bold">Km</th>
              <th scope="col" className="py-2 text-right font-bold">Minutos</th>
              <th scope="col" className="py-2 text-right font-bold">Ritmo</th>
              <th scope="col" className="py-2 text-right font-bold">Salidas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-hairline last:border-0">
                <td className="py-2.5">{r.name}</td>
                <td className="py-2.5 text-right tabular-nums">{r.km.toFixed(1)}</td>
                <td className="py-2.5 text-right tabular-nums">{Math.round(r.minutes)}</td>
                <td className="py-2.5 text-right tabular-nums">{fmtPace(r.minutes, r.km)}</td>
                <td className="py-2.5 text-right tabular-nums">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {feed.data && !items.length && <EmptyState>Todavía no hay exploraciones registradas.</EmptyState>}
      {items.length > 0 && (
        <LedgerList label="Exploraciones recientes">
          {items.map((e, i) => (
            <LedgerRow key={`${e.crewId}-${e.ts}-${i}`}>
              <div className="min-w-0">
                <p className="text-small font-semibold">
                  {e.event.title} <span className="font-normal text-muted">· {e.name}</span>
                </p>
                <p className="mt-0.5 text-caption text-faint">{e.event.place}</p>
              </div>
              <div className="flex gap-4 text-right text-small tabular-nums">
                <span>{e.event.km.toFixed(1)} km</span>
                <span className="text-muted">{Math.round(e.event.minutes)} min</span>
                <span className="text-muted">{fmtPace(e.event.minutes, e.event.km)}</span>
                <span className="w-24 text-caption text-faint">{fmtAgo(e.ts, now)}</span>
              </div>
            </LedgerRow>
          ))}
        </LedgerList>
      )}
    </div>
  );
}
