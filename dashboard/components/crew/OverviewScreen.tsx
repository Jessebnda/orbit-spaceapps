"use client";

import { EmergencyBanner } from "@/components/emergency/EmergencyBanner";
import { ProximityGraph } from "@/components/proximity/ProximityGraph";
import { CrewBoard } from "@/components/crew/CrewBoard";
import { KpiStrip } from "@/components/crew/KpiStrip";
import { HubBanner } from "@/components/ui/HubBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusMark } from "@/components/ui/StatusMark";
import { useNow } from "@/lib/services/useNow";
import { useHub } from "@/lib/services/useHub";
import { fmtAgo } from "@/lib/domain/format";

/** Captain's overview: the screen's question is "is the whole crew within range right now, and who needs something?" */
export function OverviewScreen() {
  const { crew, emergencies, loaded, connected, lastAt } = useHub();
  const now = useNow();
  const flagged = crew.filter((c) => c.status !== "ok").sort((a, b) => (a.status === "critical" ? -1 : 1) - (b.status === "critical" ? -1 : 1));
  const finding = !loaded ? (
    "Esperando datos del hub…"
  ) : flagged.length ? (
    <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1">
      {flagged.map((c) => (
        <span key={c.member.id} className="inline-flex items-center gap-1.5">
          <span className="text-ink">{c.member.name}</span> <StatusMark status={c.status} size="small" />
        </span>
      ))}
    </span>
  ) : (
    "Toda la tripulación dentro de rango"
  );

  return (
    <div>
      <HubBanner connected={connected} lastAt={lastAt} />
      <PageHeader title="Vista general" finding={finding} actions={lastAt && now ? <span className="t-small text-ink3">Actualizado {fmtAgo(lastAt, now)}</span> : undefined} />
      <div className={`space-y-6 ${connected ? "" : "opacity-60"}`} aria-busy={!connected}>
        <EmergencyBanner emergencies={emergencies} crew={crew} loaded={loaded} />
        <KpiStrip crew={crew} loaded={loaded} />
        <CrewBoard crew={crew} emergencies={emergencies} now={now} loaded={loaded} />
        <ProximityGraph crew={crew} emergencies={emergencies} />
      </div>
    </div>
  );
}
