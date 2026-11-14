import { formatMetric, type CrewSnapshot, type Status } from "@orbit/shared";
import { statusColor } from "@/lib/theme";

/** Three figures, one divided strip. The first one answers the screen's question. */
export function CrewSummary({ crew, loaded }: { crew: CrewSnapshot[]; loaded: boolean }) {
  const count = (s: Status) => crew.filter((c) => c.status === s).length;
  const outOfRange = count("watch") + count("critical");
  const sleeps = crew.map((c) => c.metrics.sleep).filter((v): v is number => v != null);
  const avgSleep = sleeps.length ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : undefined;
  const activity = crew.reduce((a, c) => a + c.stats.activityMin, 0);
  const dash = (v: string) => (loaded ? v : "—");

  return (
    <dl className="grid grid-cols-1 divide-y divide-hairline rounded-lg bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <div className="p-5">
        <dt className="text-caption font-bold text-muted">Fuera de rango</dt>
        <dd className="mt-1 text-figure font-semibold tabular-nums">{dash(String(outOfRange))}</dd>
        <dd className="mt-1 text-small tabular-nums">
          <span style={{ color: statusColor.critical }}>{count("critical")} {count("critical") === 1 ? "crítico" : "críticos"}</span>
          <span className="text-faint"> · </span>
          <span style={{ color: statusColor.watch }}>{count("watch")} vigilar</span>
        </dd>
      </div>
      <div className="p-5">
        <dt className="text-caption font-bold text-muted">Sueño medio</dt>
        <dd className="mt-1 text-figure font-semibold tabular-nums">{avgSleep == null ? "—" : formatMetric("sleep", avgSleep)}</dd>
        <dd className="mt-1 text-small text-faint">última lectura por miembro</dd>
      </div>
      <div className="p-5">
        <dt className="text-caption font-bold text-muted">Actividad hoy</dt>
        <dd className="mt-1 text-figure font-semibold tabular-nums">{dash(`${activity} min`)}</dd>
        <dd className="mt-1 text-small text-faint">suma de la tripulación</dd>
      </div>
    </dl>
  );
}
