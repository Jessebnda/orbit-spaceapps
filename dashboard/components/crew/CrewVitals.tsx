import { METRIC_META, formatMetric, statusOf, type CrewSnapshot, type MetricKey } from "@orbit/shared";
import { InView } from "@/components/ui/InView";
import { StatusMark } from "@/components/ui/StatusMark";
import { ThresholdChart, type Point } from "@/components/ui/ThresholdChart";
import { Panel } from "@/components/ui/Panel";

const VITALS: MetricKey[] = ["hr", "spo2", "bpSys", "bpDia", "temp", "resp"];

/** Six vitals, each with its current figure and a 24 h threshold chart. */
export function CrewVitals({ metrics, series, error }: { metrics: CrewSnapshot["metrics"]; series: (k: MetricKey) => Point[]; error?: string }) {
  return (
    <Panel title="Signos vitales · últimas 24 h">
      <p className="mb-4 text-caption text-faint">Fondo verde: rango normal · ámbar: vigilar · rojo: crítico.</p>
      <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
        {VITALS.map((k) => (
          <div key={k}>
            <div className="mb-2 flex items-baseline justify-between gap-3 text-small">
              <span className="text-muted">{METRIC_META[k].label}</span>
              <span className="flex items-center gap-2 text-figure font-semibold tabular-nums">
                {formatMetric(k, metrics[k])}
                <StatusMark status={statusOf(k, metrics[k])} showOk={false} />
              </span>
            </div>
            <InView height={160}>
              <ThresholdChart metric={k} points={series(k)} />
            </InView>
          </div>
        ))}
      </div>
      {error && <p className="mt-4 text-small text-muted">No se pudo leer el histórico: {error}</p>}
    </Panel>
  );
}
