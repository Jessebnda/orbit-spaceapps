"use client";

import { EmergencyBanner } from "@/components/emergency/EmergencyBanner";
import { ProximityGraph } from "@/components/proximity/ProximityGraph";
import { CrewSummary } from "@/components/crew/CrewSummary";
import { CrewTable } from "@/components/crew/CrewTable";
import { HubBanner } from "@/components/ui/HubBanner";
import { Panel } from "@/components/ui/Panel";
import { useNow } from "@/lib/services/useNow";
import { useHub } from "@/lib/services/useHub";

/** Captain's overview: the screen's question is "is the crew within range right now?" */
export function OverviewScreen() {
  const { crew, emergencies, loaded, connected } = useHub();
  const now = useNow();
  const outOfRange = crew.filter((c) => c.status !== "ok").map((c) => c.member.name);
  const finding = !loaded
    ? "Esperando datos del hub…"
    : outOfRange.length
      ? `Fuera de rango: ${outOfRange.join(", ")}`
      : "Toda la tripulación dentro de rango";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-title font-bold tracking-[-0.3px]">Vista general</h1>
        <p className="mt-1 text-small text-muted">{finding}</p>
      </header>

      <HubBanner connected={connected} />
      <EmergencyBanner emergencies={emergencies} crew={crew} loaded={loaded} now={now} />
      <CrewSummary crew={crew} loaded={loaded} />
      <CrewTable crew={crew} now={now} loaded={loaded} />
      <Panel title="Proximidad">
        <ProximityGraph crew={crew} />
      </Panel>
    </div>
  );
}
