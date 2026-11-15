import { anomalyText, type CommsAnomaly } from "@orbit/shared";
import { CheckCheck } from "lucide-react";
import { CommsChart } from "@/components/crew/CommsChart";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { InView } from "@/components/ui/InView";
import { Panel } from "@/components/ui/Panel";
import { StatusMark } from "@/components/ui/StatusMark";
import type { CommsRow } from "@/lib/services/hub";

export function CommsPanel({ crewId, records, names, now, anomalies, error, loading }: { crewId: string; records: CommsRow[]; names: Record<string, string>; now: number; anomalies: CommsAnomaly[]; error?: string; loading?: boolean }) {
  const nameOf = (id: string) => names[id] ?? id;
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Panel title="Comunicación" subtitle="Minutos por día y con quién · últimos 14 días" className="lg:col-span-8">
        {error ? (
          <EmptyState compact title="No se pudo leer la comunicación" hint={error} />
        ) : (
          <InView height={320}>{loading ? <div className="skeleton h-full rounded-md" /> : <CommsChart crewId={crewId} records={records} names={names} now={now} />}</InView>
        )}
      </Panel>
      <section className="lg:col-span-4 lg:pt-5" aria-labelledby="alerts-h">
        <h2 id="alerts-h" className="t-heading mb-3">Alertas</h2>
        {anomalies.length ? (
          <ul className="ledger" style={{ ["--inset" as string]: "16px" }}>
            {anomalies.map((a, i) => (
              <li key={i} className="flex items-start gap-3 py-3 pr-2">
                {a.peerId ? <Avatar name={nameOf(a.peerId)} size={24} label={false} /> : <span className="size-6" />}
                <div className="min-w-0 flex-1">
                  <p className="t-small text-ink">{anomalyText(a, nameOf)}</p>
                  <div className="mt-1"><StatusMark status="watch" label="Vigilar" /></div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact icon={CheckCheck} title="Sin alertas" hint="La conversación es la habitual." />
        )}
      </section>
    </div>
  );
}
