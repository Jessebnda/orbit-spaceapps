import { CircleCheck } from "lucide-react";
import { formatMetric, type CrewSnapshot } from "@orbit/shared";
import { StatusMark } from "@/components/ui/StatusMark";

/** Value with its unit as a smaller grey suffix ("6.4 h"). */
function Fig({ text }: { text?: string }) {
  if (!text) return <p className="t-figure mt-1 text-faint">—</p>;
  const [, v, u] = text.match(/^(.*?)(?: (\D+))?$/) ?? [, text];
  return <p className="t-figure mt-1">{v}{u && <span className="t-body ml-1 font-normal text-muted">{u}</span>}</p>;
}

function Bar({ ratio, from, to, mark }: { ratio: number; from: string; to: string; mark?: number }) {
  return (
    <div className="mt-3">
      <div className="relative">
      {/* Goal tick: the target is on the scale, not only in the note under it. */}
      {mark != null && <span className="absolute -top-1 z-[1] h-3 w-px bg-muted" style={{ left: `${mark * 100}%` }} aria-hidden />}
      <div className="h-1 overflow-hidden rounded-full bg-raised" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)} aria-label="Progreso">
        <div className="h-full rounded-full bg-ink" style={{ width: `${Math.min(1, Math.max(0, ratio)) * 100}%` }} />
      </div>
      </div>
      <div className="t-micro mt-1 flex justify-between text-ink3"><span>{from}</span><span>{to}</span></div>
    </div>
  );
}

/** One surface split in three. The first cell answers the screen's question; the others are sleep and exercise. */
export function KpiStrip({ crew, loaded }: { crew: CrewSnapshot[]; loaded: boolean }) {
  const critical = crew.filter((c) => c.status === "critical").length;
  const watch = crew.filter((c) => c.status === "watch").length;
  const out = critical + watch;
  const sleeps = crew.map((c) => c.metrics.sleep).filter((v): v is number => v != null);
  const avgSleep = sleeps.length ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : undefined;
  const activity = crew.reduce((a, c) => a + c.stats.activityMin, 0);
  const goal = Math.max(crew.length, 1) * 120; // 2 h each, the countermeasure in the brief

  return (
    <section aria-label="Resumen" className="grid grid-cols-1 divide-y divide-hairline rounded-md bg-surface md:grid-cols-12 md:divide-x md:divide-y-0">
      <div className="p-5 md:col-span-6">
        {/* Same order as its siblings (label, then value); the lead figure is larger because it answers the screen. */}
        <p className="t-small text-muted">Fuera de rango</p>
        <p className="t-lead mt-1">
          {loaded ? out : "—"} <span className="t-body font-normal text-muted">de {loaded ? crew.length : "—"} tripulantes</span>
        </p>
        <div className="mt-3 flex min-h-5 flex-wrap items-center gap-2">
          {loaded && out === 0 && (
            <span className="t-small inline-flex items-center gap-1.5 text-muted"><CircleCheck size={14} strokeWidth={1.5} aria-hidden /> Toda la tripulación en rango</span>
          )}
          {critical > 0 && <StatusMark variant="pill" status="critical" label={`${critical} ${critical === 1 ? "crítico" : "críticos"}`} />}
          {watch > 0 && <StatusMark variant="pill" status="watch" label={`${watch} vigilar`} />}
        </div>
      </div>
      <div className="p-5 md:col-span-3">
        <p className="t-small text-muted">Sueño medio</p>
        <Fig text={avgSleep == null ? undefined : formatMetric("sleep", avgSleep)} />
        <Bar ratio={(avgSleep ?? 0) / 8} from="0" to="8 h" mark={7 / 8} />
        <p className="t-micro mt-1 text-ink3">objetivo 7 h</p>
      </div>
      <div className="p-5 md:col-span-3">
        <p className="t-small text-muted">Actividad hoy</p>
        <Fig text={loaded ? `${activity} min` : undefined} />
        <Bar ratio={activity / goal} from="0" to={`${goal} min`} />
        <p className="t-micro mt-1 text-ink3">2 h por persona</p>
      </div>
    </section>
  );
}
