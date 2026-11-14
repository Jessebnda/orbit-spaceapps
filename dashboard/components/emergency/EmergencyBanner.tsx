"use client";

import { useEffect, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { EMERGENCY_LABEL, type CrewSnapshot, type Emergency } from "@orbit/shared";
import { beep } from "@/components/emergency/beep";
import { Avatar } from "@/components/ui/Avatar";
import { pairs } from "@/lib/domain/proximity";
import { api } from "@/lib/services/hub";
import { useNow } from "@/lib/services/useNow";
import { color, statusColor } from "@/lib/theme";

const clock = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
const spoken = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `hace ${Math.floor(s / 60)} minutos ${s % 60} segundos`; };
const approx = (m: number) => `≈${(Math.round(m * 2) / 2).toString().replace(".", ",")} m`;

/** Takeover for open emergencies: red bar, live stopwatch, nearest responders with distance, two-step resolve. The only red surface in the dashboard. */
export function EmergencyBanner({ emergencies, crew, loaded }: { emergencies: Emergency[]; crew: CrewSnapshot[]; loaded: boolean; now?: number }) {
  const open = emergencies.filter((e) => !e.resolved);
  const now = useNow(1000);
  const byId = new Map(crew.map((c) => [c.member.id, c]));
  const dist = new Map(pairs(crew).flatMap((p) => [[`${p.a}|${p.b}`, p.m], [`${p.b}|${p.a}`, p.m]] as const));
  const seen = useRef<Set<string> | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  // Beep only for emergencies that arrive after the first snapshot, not ones already open on load.
  useEffect(() => {
    if (!loaded) return;
    const ids = open.map((e) => e.id);
    const prev = seen.current;
    if (prev && ids.some((id) => !prev.has(id))) beep();
    seen.current = new Set(ids);
  }, [loaded, open]);

  useEffect(() => {
    document.title = open.length ? "● Emergencia · Orbit" : "Orbit · Monitor";
    return () => { document.title = "Orbit · Monitor"; };
  }, [open.length]);

  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(null), 3000);
    return () => clearTimeout(t);
  }, [confirm]);

  if (!open.length) return null;

  async function resolve(id: string) {
    if (confirm !== id) return setConfirm(id);
    setConfirm(null);
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
    <section role="alert" aria-label="Emergencias abiertas" className="takeover mb-6 space-y-6">
      {open.map((e) => {
        const victim = byId.get(e.victimId);
        const elapsed = now ? now - e.ts : 0;
        return (
          <div key={e.id} className="overflow-hidden rounded-md bg-surface">
            <div className="h-1.5" style={{ background: color.emergency }} aria-hidden />
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-4">
                <TriangleAlert size={28} strokeWidth={1.5} style={{ color: color.emergency }} aria-hidden />
                <h2 className="min-w-0 flex-1 text-[28px] leading-8 font-bold tracking-[-0.02em]">{EMERGENCY_LABEL[e.kind]} · {victim?.member.name ?? e.victimId}</h2>
                <p className="t-figure" aria-label={spoken(elapsed)} aria-live="off">{clock(elapsed)}</p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                <span className="t-small text-muted">Va primero</span>
                {e.responders.length ? (
                  <ol className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    {e.responders.map((id, i) => {
                      const r = byId.get(id);
                      const m = dist.get(`${e.victimId}|${id}`);
                      return (
                        <li key={id} className="flex items-center gap-2">
                          <Avatar name={r?.member.name ?? id} size={32} status={r?.status} online={r?.online} label={false} />
                          <span className="t-small font-semibold"><span className="tabular-nums">{i + 1}</span> {r?.member.name ?? id}{m != null && <span className="font-normal text-muted"> · {approx(m)}</span>}</span>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <span className="t-small inline-flex items-center gap-1.5"><TriangleAlert size={14} style={{ color: statusColor.watch }} aria-hidden />Sin respondedores cercanos</span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                {error && <p className="t-small mr-auto inline-flex items-center gap-1.5"><TriangleAlert size={14} style={{ color: statusColor.watch }} aria-hidden />{error}</p>}
                <a href="#proximidad" className="btn-lg">Ver proximidad</a>
                <button type="button" disabled={pending === e.id} onClick={() => resolve(e.id)} className={`btn-lg ${confirm === e.id ? "primary" : ""}`} aria-live="polite">
                  {confirm === e.id ? "Confirmar: resuelto" : "Marcar resuelto"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
