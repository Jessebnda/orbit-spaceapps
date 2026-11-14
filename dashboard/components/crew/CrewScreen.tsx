"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { worstStatus, type MetricKey } from "@orbit/shared";
import { BehaviourPanel } from "@/components/crew/BehaviourPanel";
import { CheckInPanel } from "@/components/crew/CheckInPanel";
import { CommsPanel } from "@/components/crew/CommsPanel";
import { CrewVitals } from "@/components/crew/CrewVitals";
import { Panel } from "@/components/ui/Panel";
import { StatusMark } from "@/components/ui/StatusMark";
import type { Point } from "@/components/ui/ThresholdChart";
import { useApi } from "@/lib/services/useApi";
import { type CommsRow, type HistoryPoint } from "@/lib/services/hub";
import { useHub } from "@/lib/services/useHub";
import { useNow } from "@/lib/services/useNow";

/** One member's detail. Container: fetches and wires the panels, draws nothing itself. */
export function CrewScreen({ id }: { id: string }) {
  const { crew, loaded, connected } = useHub();
  const now = useNow();
  const member = crew.find((c) => c.member.id === id);
  const history = useApi<HistoryPoint[]>(`/api/history/${id}?hours=24`);
  const history14 = useApi<HistoryPoint[]>(`/api/history/${id}?hours=336`);
  const comms = useApi<CommsRow[]>(`/api/comms/${id}?days=14`);
  const names = Object.fromEntries(crew.map((c) => [c.member.id, c.member.name]));

  const back = (
    <Link href="/" className="inline-flex items-center gap-1.5 text-small text-muted hover:text-ink">
      <ArrowLeft size={14} aria-hidden />
      Vista general
    </Link>
  );

  if (!member) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        {back}
        <p className="text-small text-muted">{loaded ? "Miembro no encontrado." : connected ? "Cargando…" : "Hub desconectado."}</p>
      </div>
    );
  }

  const series = (k: MetricKey): Point[] =>
    (history.data ?? []).flatMap((h) => {
      const v = h.metrics[k];
      return v == null ? [] : [{ ts: h.ts, v }];
    });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {back}
      <header>
        <h1 className="text-title font-bold tracking-[-0.3px]">{member.member.name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-small text-muted">
          {member.member.role} · {member.online ? "en línea" : "sin conexión"} · Estado <StatusMark status={worstStatus(member.metrics)} />
        </p>
      </header>

      <CrewVitals metrics={member.metrics} series={series} error={history.error} />
      <CommsPanel
        crewId={id}
        records={comms.data ?? []}
        names={names}
        now={now}
        anomalies={member.comms.anomalies}
        error={comms.error}
      />
      <CheckInPanel checkIn={member.lastCheckIn} stats={member.stats} />
      <Panel title="Protocolos">
        <p className="text-small text-faint">
          El hub no expone todavía los protocolos enviados ni sus confirmaciones por miembro.
        </p>
      </Panel>
      <BehaviourPanel
        member={member.member}
        snapshot={member}
        history={history14.data ?? []}
        comms={comms.data ?? []}
        names={names}
        now={now}
        anomalies={member.comms.anomalies}
      />
    </div>
  );
}
