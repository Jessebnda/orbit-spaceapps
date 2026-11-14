"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { THRESHOLDS, formatMetric, statusOf, type CrewSnapshot, type Emergency, type MetricKey } from "@orbit/shared";
import { TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Segmented } from "@/components/ui/Segmented";
import { Sparkline } from "@/components/ui/Sparkline";
import { StatusMark } from "@/components/ui/StatusMark";
import { EmptyState } from "@/components/ui/EmptyState";
import { VitalStrip } from "@/components/crew/VitalStrip";
import { useCrewSpark } from "@/components/crew/useCrewSpark";
import { fmtAgo } from "@/lib/domain/format";
import { statusColor } from "@/lib/theme";
import { Users } from "lucide-react";

type View = "cards" | "table";
const RANK = { critical: 0, watch: 1, ok: 2 } as const;
const HR_BAND: [number, number] = [THRESHOLDS.hr[1], THRESHOLDS.hr[2]];

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

function CrewCard({ c, now, victim }: { c: CrewSnapshot; now: number; victim: boolean }) {
  const spark = useCrewSpark(c.member.id);
  const hr = spark("hr");
  const hrStatus = statusOf("hr", c.metrics.hr, now);
  return (
    <Link href={`/crew/${c.member.id}`} className="card-hover block rounded-md bg-surface p-4 transition-colors">
      <div className="flex h-10 items-center gap-2.5">
        <Avatar name={c.member.name} size={40} status={c.status} online={c.online} emergency={victim} />
        <div className="min-w-0 flex-1">
          <p className="t-heading truncate">{c.member.name}</p>
          <p className="t-small truncate text-muted">{c.online ? c.member.role : `visto ${fmtAgo(c.lastSeen, now)}`}</p>
        </div>
        {victim ? <StatusMark variant="pill" status="critical" label="En emergencia" /> : <StatusMark variant="pill" status={c.status} />}
      </div>
      <div className="mt-4"><VitalStrip metrics={c.metrics} now={now} offline={!c.online} /></div>
      <div className="mt-3 h-10">
        <div className="t-micro flex justify-between text-ink3"><span>FC · 6 h</span><span className="t-small tabular-nums text-ink">{formatMetric("hr", c.metrics.hr)}</span></div>
        <Sparkline values={hr} width={236} height={22} band={HR_BAND} lastColor={hrStatus === "ok" ? undefined : statusColor[hrStatus]} />
      </div>
      <div className="t-small mt-3 flex h-6 items-center justify-between border-t-[0.5px] border-hairline pt-3 text-muted">
        <span>Sueño <b className="font-semibold text-ink tabular-nums">{c.metrics.sleep != null ? formatMetric("sleep", c.metrics.sleep) : "—"}</b></span>
        <Mood v={c.lastCheckIn?.mood} />
        <CardAlerts n={c.comms.anomalies.length} />
      </div>
    </Link>
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

