"use client";

import { useEffect, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { EMERGENCY_LABEL, type CrewSnapshot, type Emergency } from "@orbit/shared";
import { beep } from "@/components/emergency/beep";
import { fmtAgo } from "@/lib/domain/format";
import { api } from "@/lib/services/hub";
import { color } from "@/lib/theme";

/** The only place the emergency red appears. Shows open emergencies, beeps when a new one arrives. */
export function EmergencyBanner({ emergencies, crew, loaded, now }: { emergencies: Emergency[]; crew: CrewSnapshot[]; loaded: boolean; now: number }) {
  const open = emergencies.filter((e) => !e.resolved);
  const names = new Map(crew.map((c) => [c.member.id, c.member.name]));
  const seen = useRef<Set<string> | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  // Beep only for emergencies that arrive after the first snapshot, not ones already open on load.
  useEffect(() => {
    if (!loaded) return;
    const ids = open.map((e) => e.id);
    const prev = seen.current;
    if (prev && ids.some((id) => !prev.has(id))) beep();
    seen.current = new Set(ids);
  }, [loaded, open]);

  if (!open.length) return null;

  async function resolve(id: string) {
    setPending(id);
    setError(undefined);
    try {
      await api("/api/resolve", { method: "POST", body: JSON.stringify({ emergencyId: id }) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo marcar como resuelto");
    } finally {
      setPending(null);
    }
  }

  return (
    <section
      role="alert"
      aria-label="Emergencias abiertas"
      className="mb-6 space-y-3 rounded-lg p-4"
      style={{ border: `1px solid ${color.emergency}66`, background: `${color.emergency}14` }}
    >
      {open.map((e) => {
        const responders = e.responders.map((id) => names.get(id) ?? id);
        return (
          <div key={e.id} className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-3">
              <TriangleAlert size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" style={{ color: color.emergency }} aria-hidden />
              <div>
                <p className="text-body font-semibold">
                  {EMERGENCY_LABEL[e.kind]} · {names.get(e.victimId) ?? e.victimId}
                  <span className="ml-2 text-small font-normal text-muted">{fmtAgo(e.ts, now)}</span>
                </p>
                <p className="mt-1 text-small text-muted">
                  {responders.length ? `Respondedores, más cercano primero: ${responders.join(", ")}` : "Sin respondedores cercanos"}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={pending === e.id}
              onClick={() => resolve(e.id)}
              className="rounded-md border border-hairline px-3 py-1.5 text-small hover:bg-raised disabled:opacity-50"
            >
              Marcar resuelto
            </button>
          </div>
        );
      })}
      {error && <p className="text-small text-muted">{error}</p>}
    </section>
  );
}
