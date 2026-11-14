"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GOALS, METRIC_META, STATUS_LABEL, THRESHOLDS, formatMetric, statusOf, type CrewSnapshot, type Emergency, type MetricKey } from "@orbit/shared";
import { ArrowDownRight, ArrowRight, ArrowUpRight, TriangleAlert } from "lucide-react";
import { PaceRing } from "@/components/ui/PaceRing";
import { RangeBar } from "@/components/ui/RangeBar";
import { trendOf } from "@/lib/domain/vitals";
import { Avatar } from "@/components/ui/Avatar";
import { Segmented } from "@/components/ui/Segmented";
import { Sparkline } from "@/components/ui/Sparkline";
import { StatusMark } from "@/components/ui/StatusMark";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCrewBase, useCrewSpark } from "@/components/crew/useCrewSpark";
import { fmtAgo } from "@/lib/domain/format";
import { statusColor } from "@/lib/theme";
import { Users } from "lucide-react";

type View = "cards" | "table";
const RANK = { critical: 0, watch: 1, ok: 2 } as const;

function Mood({ v }: { v?: number }) {
  return (
    <span className="inline-flex items-center gap-[3px]" role="img" aria-label={v ? `Ánimo ${v} de 5` : "Ánimo sin registro"}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={`size-1.5 rounded-full ${v && i <= v ? "bg-ink" : "bg-raised"}`} />)}
    </span>
  );
}

function CardAlerts({ n }: { n: number }) {
  return n ? (
    <span className="inline-flex items-center gap-1" style={{ color: statusColor.watch }}><TriangleAlert size={12} aria-hidden />{n} {n === 1 ? "alerta" : "alertas"}</span>
  ) : <span>Sin alertas</span>;
}

const STRIP: { id: string; k: MetricKey; label: string }[] = [
  { id: "hr", k: "hr", label: "Ritmo" },
  { id: "spo2", k: "spo2", label: "SpO₂" },
  { id: "temp", k: "temp", label: "Temp." },
  { id: "bp", k: "bpSys", label: "Presión" },
  { id: "resp", k: "resp", label: "Resp." },
];
const UNIT: Partial<Record<MetricKey, string>> = { hr: "lpm", spo2: "%", temp: "°C", bpSys: "mmHg", resp: "rpm" };
const num = (k: MetricKey, v?: number) => (v == null ? "—" : formatMetric(k, v).replace(/ [^\d]+$/, ""));

function Trend({ k, v, base }: { k: MetricKey; v?: number; base?: number }) {
  const t = v == null ? undefined : trendOf(k, v, base);
  if (!t) return <span className="t-micro block h-3.5" />;
  const G = t.dir === "up" ? ArrowUpRight : t.dir === "down" ? ArrowDownRight : ArrowRight;
  return <span className="t-micro flex h-3.5 items-center gap-0.5 text-muted"><G size={11} aria-hidden />{t.dir === "flat" ? "igual" : `${t.delta > 0 ? "+" : "−"}${Math.abs(t.delta).toFixed(k === "temp" ? 1 : 0)}`}</span>;
}

function CrewCard({ c, now, victim }: { c: CrewSnapshot; now: number; victim: boolean }) {
  const spark = useCrewSpark(c.member.id);
  const { base, nights } = useCrewBase(c.member.id, now);
  const [sel, setSel] = useState<string>("hr");
  const selK = STRIP.find((s) => s.id === sel)!.k;
  const selStatus = statusOf(selK, c.metrics[selK], now);
  const [, wl, wh] = THRESHOLDS[selK];
  const off = !c.online;
  const sleeps = nights.filter((n): n is number => n != null);
  return (
    <article className={`rounded-md bg-surface p-5 ${off ? "opacity-90" : ""}`} aria-label={c.member.name}>
      <div className="flex h-10 items-center gap-3">
        <Link href={`/crew/${c.member.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar name={c.member.name} size={40} status={c.status} online={c.online} emergency={victim} />
          <span className="min-w-0">
            <span className="t-heading block truncate">{c.member.name}</span>
            <span className="t-small block truncate text-muted">{c.online ? c.member.role : `visto ${fmtAgo(c.lastSeen, now)}`}</span>
          </span>
        </Link>
        {victim ? <StatusMark variant="pill" status="critical" label="En emergencia" /> : <StatusMark variant="pill" status={c.status} />}
      </div>

      <div className="mt-5 grid grid-cols-5 gap-3">
        {STRIP.map((s) => {
          const v = off ? undefined : c.metrics[s.k];
          const st = statusOf(s.k, v, now);
          return (
            <button key={s.id} type="button" aria-pressed={sel === s.id} onClick={() => setSel(s.id)} className={`-m-1 rounded-sm p-1 text-left ${sel === s.id ? "bg-white/[0.06]" : "row-hover"}`}>
              <span className="t-micro block text-muted">{s.label}</span>
              <span className="mt-0.5 flex items-baseline gap-1" style={{ color: st === "ok" ? undefined : statusColor[st] }}>
                <span className={`${s.id === "bp" ? "text-[22px] leading-8" : "t-figure"} font-semibold tabular-nums`}>{s.id === "bp" ? `${num("bpSys", v)}/${num("bpDia", off ? undefined : c.metrics.bpDia)}` : num(s.k, v)}</span>
                {st !== "ok" && <StatusMark status={st} variant="dot" />}
              </span>
              <span className="t-micro block text-ink3">{UNIT[s.k]}</span>
              <div className="mt-1"><RangeBar metric={s.k} value={v} base={base(s.k)} now={now} label={`${METRIC_META[s.k].label} ${num(s.k, v)} ${UNIT[s.k]}, ${STATUS_LABEL[st].toLowerCase()}`} /></div>
              <Trend k={s.k} v={v} base={base(s.k)} />
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <div className="t-micro mb-1 flex justify-between text-ink3"><span>{METRIC_META[selK].label} · 6 h</span><span>normal {wl}–{wh} {UNIT[selK]}</span></div>
        <Sparkline values={spark(selK)} height={48} band={[wl, wh]} lastColor={selStatus === "ok" ? undefined : statusColor[selStatus]} label={`Tendencia de ${METRIC_META[selK].label} en 6 horas`} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {(["activity", "kcal", "water"] as MetricKey[]).map((k) => {
          const v = off ? undefined : c.metrics[k];
          return (
            <div key={k} className="flex items-center gap-2.5">
              <PaceRing metric={k} value={v} now={now} label={`${METRIC_META[k].label} ${num(k, v)} de ${GOALS[k]} ${METRIC_META[k].unit}`} />
              <span className="min-w-0">
                <span className="t-micro block truncate text-muted">{METRIC_META[k].label} · {METRIC_META[k].unit}</span>
                <span className="t-small block whitespace-nowrap tabular-nums">{num(k, v)}<span className="text-ink3">/{GOALS[k]}</span></span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex h-7 items-center justify-between border-t-[0.5px] border-hairline pt-4 text-muted t-small">
        <span className="flex items-center gap-3">
          <span>Sueño <b className="font-semibold text-ink tabular-nums">{c.metrics.sleep != null ? formatMetric("sleep", c.metrics.sleep) : "—"}</b></span>
          <span className="flex h-5 items-end gap-[3px]" role="img" aria-label={sleeps.length ? `Sueño de las últimas noches: ${sleeps.map((n) => n.toFixed(1)).join(", ")} horas` : "Sin historial de sueño"}>
            {nights.map((n, i) => (
              <span key={i} className="w-1.5 rounded-t-[2px]" style={{ height: n == null ? 3 : Math.max(3, Math.min(20, (n / 9) * 20)), background: n == null ? "var(--t-raised)" : n < 4 ? statusColor.critical : n < 6 ? statusColor.watch : "var(--t-accent)" }} />
            ))}
          </span>
        </span>
        <span className="flex items-center gap-4"><Mood v={c.lastCheckIn?.mood} /><CardAlerts n={c.comms.anomalies.length} /></span>
      </div>
    </article>
  );
}

function Cell({ k, c, now, spark, hide }: { k: MetricKey; c: CrewSnapshot; now: number; spark?: number[]; hide?: boolean }) {
  const v = c.metrics[k];
  const s = statusOf(k, v, now);
  return (
    <td className={`px-3 py-2 text-right whitespace-nowrap tabular-nums ${hide ? "max-[1439px]:hidden" : ""}`}>
      <div className="t-body flex items-center justify-end gap-1.5" style={{ color: s === "ok" ? undefined : statusColor[s] }}>
        {s !== "ok" && <StatusMark status={s} variant="dot" />}
        {formatMetric(k, v)}
      </div>
      {spark && <div className="mt-0.5 flex justify-end"><Sparkline values={spark} width={64} height={16} /></div>}
    </td>
  );
}

function Row({ c, now, victim }: { c: CrewSnapshot; now: number; victim: boolean }) {
  const spark = useCrewSpark(c.member.id);
  const n = c.comms.anomalies.length;
  return (
    <tr className="row-hover h-14">
      <th scope="row" className="sticky left-0 z-[1] min-w-60 bg-surface px-4 py-2 text-left font-normal">
        <Link href={`/crew/${c.member.id}`} className="flex items-center gap-3">
          <Avatar name={c.member.name} size={32} status={c.status} online={c.online} emergency={victim} />
          <span className="min-w-0">
            <span className="t-heading block truncate">{c.member.name}</span>
            <span className="t-small block truncate text-muted">{c.member.role} · {c.online ? "en línea" : `visto ${fmtAgo(c.lastSeen, now)}`}</span>
          </span>
        </Link>
      </th>
      <td className="px-3"><StatusMark variant="pill" status={c.status} /></td>
      <Cell k="hr" c={c} now={now} spark={spark("hr")} />
      <Cell k="spo2" c={c} now={now} spark={spark("spo2")} />
      <Cell k="bpSys" c={c} now={now} spark={spark("bpSys")} />
      <Cell k="temp" c={c} now={now} />
      <Cell k="sleep" c={c} now={now} />
      <td className="px-3 text-right"><Mood v={c.lastCheckIn?.mood} /></td>
      <td className="t-small px-3 text-right whitespace-nowrap">{n ? <span style={{ color: statusColor.watch }}>{n} {n === 1 ? "alerta" : "alertas"}</span> : <span className="text-ink3">Normal</span>}</td>
      <Cell k="resp" c={c} now={now} hide /><Cell k="kcal" c={c} now={now} hide /><Cell k="water" c={c} now={now} hide />
    </tr>
  );
}

const TH = "t-small px-3 h-10 text-right font-medium whitespace-nowrap text-muted";

/** Crew as people: cards by default, a dense table on request. Sorted critical, watch, then name (stable between refreshes). */
export function CrewBoard({ crew, emergencies, now, loaded }: { crew: CrewSnapshot[]; emergencies: Emergency[]; now: number; loaded: boolean }) {
  const [view, setView] = useState<View>("cards");
  useEffect(() => {
    try { const v = localStorage.getItem("orbit.crewView"); if (v === "table" || v === "cards") setView(v); } catch { /* storage blocked: default view */ }
  }, []);
  const set = (v: View) => { setView(v); try { localStorage.setItem("orbit.crewView", v); } catch { /* ignore */ } };
  const victims = new Set(emergencies.filter((e) => !e.resolved).map((e) => e.victimId));
  const sorted = [...crew].sort((a, b) => Number(victims.has(b.member.id)) - Number(victims.has(a.member.id)) || RANK[a.status] - RANK[b.status] || a.member.name.localeCompare(b.member.name));

  return (
    <section aria-labelledby="crew-h">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="crew-h" className="t-heading">Tripulación</h2>
        <Segmented label="Vista" value={view} onChange={set} options={[{ value: "cards", label: "Tarjetas" }, { value: "table", label: "Tabla" }]} />
      </div>
      {!sorted.length ? (
        <EmptyState icon={Users} title={loaded ? "El hub no tiene tripulantes" : "Esperando datos del hub"} hint={loaded ? "Aparecen cuando un móvil se conecta." : undefined} />
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 min-[1440px]:grid-cols-4">
          {sorted.map((c) => <CrewCard key={c.member.id} c={c} now={now} victim={victims.has(c.member.id)} />)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md bg-surface">
          <table className="ledger-table w-full min-[1440px]:min-w-[1100px]">
            <thead>
              <tr>
                <th scope="col" className="t-small sticky left-0 z-[1] h-10 bg-surface px-4 text-left font-medium text-muted">Tripulante</th>
                <th scope="col" className="t-small px-3 text-left font-medium text-muted">Estado</th>
                <th scope="col" className={TH} title="Ritmo cardiaco">FC</th>
                <th scope="col" className={TH} title="Oxígeno en sangre">SpO₂</th>
                <th scope="col" className={TH} title="Presión sistólica">Presión</th>
                <th scope="col" className={TH}>Temp.</th>
                <th scope="col" className={TH}>Sueño</th>
                <th scope="col" className={TH}>Ánimo</th>
                <th scope="col" className={TH}>Comms</th>
                <th scope="col" className={`${TH} max-[1439px]:hidden`}>Resp.</th>
                <th scope="col" className={`${TH} max-[1439px]:hidden`}>Comida</th>
                <th scope="col" className={`${TH} max-[1439px]:hidden`}>Agua</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => <Row key={c.member.id} c={c} now={now} victim={victims.has(c.member.id)} />)}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

