import { anomalyText, type CommsAnomaly } from "@orbit/shared";
import { CommsChart } from "@/components/crew/CommsChart";
import { InView } from "@/components/ui/InView";
import { LedgerList, LedgerRow } from "@/components/ui/LedgerRow";
import { Panel } from "@/components/ui/Panel";
import type { CommsRow } from "@/lib/services/hub";

export function CommsPanel({ crewId, records, names, now, anomalies, error }: { crewId: string; records: CommsRow[]; names: Record<string, string>; now: number; anomalies: CommsAnomaly[]; error?: string }) {
  const nameOf = (id: string) => names[id] ?? id;
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Panel title="Comunicación · minutos por día y par">
        {error ? (
          <p className="text-small text-muted">No se pudo leer la comunicación: {error}</p>
        ) : (
          <InView height={260}>
            <CommsChart crewId={crewId} records={records} names={names} now={now} />
          </InView>
        )}
      </Panel>
      <Panel title="Alertas">
        {anomalies.length ? (
          <LedgerList label="Alertas de comunicación">
            {anomalies.map((a, i) => (
              <LedgerRow key={i}>
                <p className="text-small">{anomalyText(a, nameOf)}</p>
              </LedgerRow>
            ))}
          </LedgerList>
        ) : (
          <p className="text-small text-faint">Sin alertas. La conversación está dentro de lo habitual.</p>
        )}
      </Panel>
    </div>
  );
}
