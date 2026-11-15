"use client";

import Link from "next/link";
import { ChevronRight, Sparkles, Send } from "lucide-react";
import { worstStatus, type MetricKey } from "@orbit/shared";
import { BehaviourPanel } from "@/components/crew/BehaviourPanel";
import { CheckInPanel } from "@/components/crew/CheckInPanel";
import { CommsPanel } from "@/components/crew/CommsPanel";
import { CrewVitals } from "@/components/crew/CrewVitals";
import { Avatar } from "@/components/ui/Avatar";
import { HubBanner } from "@/components/ui/HubBanner";
import { StatusMark } from "@/components/ui/StatusMark";
import type { Point } from "@/components/ui/ThresholdChart";
import { useApi } from "@/lib/services/useApi";
import { type CommsResponse, type HistoryPoint } from "@/lib/services/hub";
import { useHub } from "@/lib/services/useHub";
import { useNow } from "@/lib/services/useNow";

/** One member's detail. Container: fetches and wires the panels, draws nothing but the header itself. */
export function CrewScreen({ id }: { id: string }) {
  const { crew, loaded, connected, lastAt, emergencies } = useHub();
  const now = useNow();
  const member = crew.find((c) => c.member.id === id);
  const history = useApi<HistoryPoint[]>(`/api/history/${id}?hours=24`);
  const history14 = useApi<HistoryPoint[]>(`/api/history/${id}?hours=336`);
  const comms = useApi<CommsResponse>(`/api/comms/${id}?days=14`);
  const names = Object.fromEntries(crew.map((c) => [c.member.id, c.member.name]));

  const crumbs = (name?: string) => (
    <nav aria-label="Ruta" className="t-small mb-4 flex items-center gap-1 text-muted">
      <Link href="/" className="hover:text-ink">Vista general</Link>
      <ChevronRight size={12} aria-hidden />
      <span className="text-ink">{name ?? "Tripulante"}</span>
    </nav>
  );

  if (!member) {
    return (
      <div>
        <HubBanner connected={connected} lastAt={lastAt} />
        {crumbs()}
        <p className="t-body text-muted">{loaded ? "No hay ningún tripulante con ese identificador." : connected ? "Cargando…" : "Sin conexión con el hub."}</p>
      </div>
    );
  }

  const status = worstStatus(member.metrics);
  const victim = emergencies.some((e) => !e.resolved && e.victimId === id);
  const seriesOf = (h?: HistoryPoint[]) => (k: MetricKey): Point[] =>
    (h ?? []).flatMap((p) => {
      const v = p.metrics[k];
      return v == null ? [] : [{ ts: p.ts, v }];
    });

  return (
    <div>
      <HubBanner connected={connected} lastAt={lastAt} />
      {crumbs(member.member.name)}
      <header className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-4">
        <Avatar name={member.member.name} size={64} status={status} online={member.online} emergency={victim} />
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] leading-8 font-bold tracking-[-0.02em]">{member.member.name}</h1>
          <p className="t-small mt-1 flex flex-wrap items-center gap-x-3 text-muted">
            <span>{member.member.role} · {member.online ? "en línea" : "sin conexión"}</span>
            <StatusMark variant="pill" status={status} />
          </p>
        </div>
        {/* Phones stack the two actions full width instead of pushing the second off screen. */}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3">
          <Link href={`/asistente`} className="btn-lg"><Sparkles size={14} strokeWidth={1.5} aria-hidden />Preguntar al asistente</Link>
          <Link href={`/protocolos?para=${id}`} className="btn-lg primary"><Send size={14} strokeWidth={1.5} aria-hidden />Enviar protocolo</Link>
        </div>
      </header>

      <div className="space-y-6">
        <CrewVitals metrics={member.metrics} series24={seriesOf(history.data)} series14={seriesOf(history14.data)} now={now} error={history.error} />
        <CommsPanel crewId={id} records={comms.data?.records ?? []} names={names} now={now} anomalies={member.comms.anomalies} error={comms.error} loading={!comms.data && !comms.error} />
        <CheckInPanel crewId={id} hardNews={member.hardNews} checkIn={member.lastCheckIn} stats={member.stats} now={now} />
        <BehaviourPanel
          member={member.member}
          snapshot={member}
          history={history14.data ?? []}
          comms={comms.data?.records ?? []}
          names={names}
          now={now}
          anomalies={member.comms.anomalies}
        />
      </div>
    </div>
  );
}
