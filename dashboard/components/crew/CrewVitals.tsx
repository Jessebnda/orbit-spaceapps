"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, TriangleAlert } from "lucide-react";
import { METRIC_META, THRESHOLDS, formatMetric, statusOf, type CrewSnapshot, type MetricKey } from "@orbit/shared";
import { EmptyState } from "@/components/ui/EmptyState";
import { InView } from "@/components/ui/InView";
import { Panel } from "@/components/ui/Panel";
import { RangeBar } from "@/components/ui/RangeBar";
import { Segmented } from "@/components/ui/Segmented";
import { StatusMark } from "@/components/ui/StatusMark";
import { ThresholdChart, type Point } from "@/components/ui/ThresholdChart";
import { base7, domainOf, trendOf } from "@/lib/domain/vitals";
import { fmtClock } from "@/lib/domain/format";

const VITALS: MetricKey[] = ["hr", "spo2", "bpSys", "bpDia", "temp", "resp"];
type Span = "6h" | "24h" | "14d";
const HOUR = 3_600_000;

/** Six vitals as tiles that act as tabs for one big chart. Opens on the most out-of-range one, else heart rate. */
export function CrewVitals({ metrics, series24, series14, now, error }: { metrics: CrewSnapshot["metrics"]; series24: (k: MetricKey) => Point[]; series14: (k: MetricKey) => Point[]; now: number; error?: string }) {
  const rank = { critical: 0, watch: 1, ok: 2 } as const;
  const initial = useMemo(() => [...VITALS].sort((a, b) => rank[statusOf(a, metrics[a])] - rank[statusOf(b, metrics[b])])[0], []); // eslint-disable-line react-hooks/exhaustive-deps
  const [sel, setSel] = useState<MetricKey>(rank[statusOf(initial, metrics[initial])] < 2 ? initial : "hr");
  const [span, setSpan] = useState<Span>("24h");
  const tabs = useRef<HTMLDivElement>(null);

  const pts = useMemo(() => {
    if (span === "14d") return series14(sel);
    const all = series24(sel);
    return span === "6h" ? all.filter((p) => p.ts >= (now || Date.now()) - 6 * HOUR) : all;
  }, [span, sel, series14, series24, now]);
  const [, wl, wh] = THRESHOLDS[sel];
  const vs = pts.map((p) => p.v);

  const onKey = (e: React.KeyboardEvent) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = VITALS[(VITALS.indexOf(sel) + d + VITALS.length) % VITALS.length];
    setSel(next);
    requestAnimationFrame(() => tabs.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus());
  };

  return (
    <section aria-label="Signos vitales" className="space-y-6">
      <div ref={tabs} role="tablist" aria-label="Signo vital" onKeyDown={onKey} className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6">
        {VITALS.map((k) => {
          const v = metrics[k];
          const st = statusOf(k, v);
          const [lo, hi] = domainOf(k);
          const b = base7(series14(k));
          const t = v == null ? undefined : trendOf(k, v, b);
          const G = t?.dir === "up" ? ArrowUpRight : t?.dir === "down" ? ArrowDownRight : ArrowRight;
          const on = sel === k;
          return (
            <button key={k} type="button" role="tab" id={`tab-${k}`} aria-selected={on} aria-controls="vital-chart" tabIndex={on ? 0 : -1} onClick={() => setSel(k)} className={`card-hover rounded-md bg-surface p-4 text-left ${on ? "ring-[1.5px] ring-accent" : ""}`}>
              <span className="flex h-5 items-center justify-between">
                <span className="t-small text-muted">{METRIC_META[k].label}</span>
                {st !== "ok" && <StatusMark variant="pill" status={st} />}
              </span>
              <span className="mt-1 flex items-baseline gap-1.5">
                <span className="t-figure">{v == null ? "—" : formatMetric(k, v).replace(/ [^\d]+$/, "")}</span>
                <span className="t-small text-muted">{METRIC_META[k].unit}</span>
              </span>
              <span className="mt-3 block"><RangeBar metric={k} value={v} base={b} label={`${METRIC_META[k].label}: ${v == null ? "sin dato" : formatMetric(k, v)}`} /></span>
              <span className="t-micro mt-1 flex justify-between text-ink3"><span>{Math.round(lo)}</span><span>{Math.round(hi)}</span></span>
              <span className="t-micro mt-1 flex min-h-3.5 items-center gap-1 text-muted">
                {t ? <><G size={11} aria-hidden />{t.dir === "flat" ? "igual que tu media de 7 días" : `${t.delta > 0 ? "+" : "−"}${Math.abs(t.delta).toFixed(k === "temp" ? 1 : 0)} · tu media de 7 días`}</> : "Aún sin media de 7 días"}
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="vital-chart" aria-labelledby={`tab-${sel}`}>
        <Panel
          title={METRIC_META[sel].label}
          subtitle={`Normal ${wl > 0 ? wl : "0"}–${wh < 1e6 ? wh : "∞"} ${METRIC_META[sel].unit}`}
          action={<Segmented label="Ventana" value={span} onChange={setSpan} options={[{ value: "6h", label: "6 h" }, { value: "24h", label: "24 h" }, { value: "14d", label: "14 d" }]} />}
        >
          {error ? (
            <EmptyState compact icon={TriangleAlert} title="No se pudo leer el histórico" hint={error} />
          ) : pts.length < 2 ? (
            <EmptyState compact title="Sin datos en esta ventana" hint="Aparecen cuando la banda envía lecturas." />
          ) : (
            <>
              <InView height={280}><ThresholdChart metric={sel} points={pts} span={span} /></InView>
              <p className="t-small mt-3 text-muted tabular-nums">
                Ahora {formatMetric(sel, metrics[sel])} · mín {formatMetric(sel, Math.min(...vs))} · máx {formatMetric(sel, Math.max(...vs))} · {fmtClock(pts[0].ts)}–{fmtClock(pts[pts.length - 1].ts)}
              </p>
            </>
          )}
        </Panel>
      </div>
    </section>
  );
}
