"use client";

import { Route } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState, SkeletonRows } from "@/components/ui/EmptyState";
import { Medal } from "@/components/ui/Medal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { RouteMap } from "@/components/activity/RouteMap";
import { fmtAgo, fmtPace } from "@/lib/domain/format";
import { useApi } from "@/lib/services/useApi";
import { useNow } from "@/lib/services/useNow";
import type { Exploration } from "@/lib/services/hub";

const hm = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, "0")}` : `${Math.round(min)} min`);

/** Record chip: accent at 14 %, a mini gold medal, text in accent. Only for comparisons against oneself. */
function Chip({ children }: { children: string }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[#0A2540] pr-2.5 pl-1 text-[11px] font-semibold text-accent">
      <Medal id="first_explore" earned size={18} />
      {children}
    </span>
  );
}

export function ExplorationsScreen() {
  const feed = useApi<Exploration[]>("/api/explorations", 15000);
  const now = useNow();
  const all = [...(feed.data ?? [])].sort((a, b) => b.ts - a.ts);
  const longest = new Map<string, number>();
  for (const e of all) longest.set(e.crewId, Math.max(longest.get(e.crewId) ?? 0, e.event.km));
  const count = new Map<string, number>();
  for (const e of all) count.set(e.crewId, (count.get(e.crewId) ?? 0) + 1);

  const totals = [...count.keys()]
    .map((id) => {
      const mine = all.filter((e) => e.crewId === id);
      return { id, name: mine[0].name, km: mine.reduce((s, e) => s + e.event.km, 0), min: mine.reduce((s, e) => s + e.event.minutes, 0), n: mine.length };
    })
    .sort((a, b) => b.km - a.km);
  const maxKm = Math.max(1, ...totals.map((t) => t.km));
  const today = all.filter((e) => new Date(e.ts).toDateString() === new Date(now || Date.now()).toDateString());
  const finding = all.length ? `${today.length || all.length} ${(today.length || all.length) === 1 ? "salida" : "salidas"} ${today.length ? "hoy" : "registradas"} · ${(today.length ? today : all).reduce((s, e) => s + e.event.km, 0).toFixed(1)} km entre todos` : undefined;

  return (
    <div>
      <PageHeader title="Exploración" finding={finding} />
      {feed.error && <p role="alert" className="t-small mb-4 text-muted">No se pudo actualizar la bitácora: {feed.error}</p>}
      {!feed.data && !feed.error && <SkeletonRows />}
      {feed.data && !all.length && <EmptyState icon={Route} title="Todavía no hay exploraciones" hint="Aparecen cuando alguien registra una salida en el móvil." />}

      {all.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            {all.map((e, i) => {
              const own = (count.get(e.crewId) ?? 0) > 1 && e.event.km === longest.get(e.crewId);
              return (
                <article key={`${e.crewId}-${e.ts}-${i}`} className="space-y-4 rounded-md bg-surface p-5" aria-label={e.event.title}>
                  <header className="flex items-center gap-3">
                    <Avatar name={e.name} size={40} label={false} />
                    <div className="min-w-0 flex-1">
                      <p className="t-heading">{e.name}</p>
                      <p className="t-small truncate text-muted">{fmtAgo(e.ts, now)} · {e.event.place || "Lugar sin registrar"}</p>
                    </div>
                    {own && <Chip>Salida más larga</Chip>}
                  </header>
                  <h2 className="t-title">{e.event.title}</h2>
                  <div>
                    <RouteMap seed={`${e.event.title}|${e.crewId}`} km={e.event.km} />
                    <p className="t-micro mt-1.5 text-ink3">Plano simulado</p>
                  </div>
                  <dl className="grid grid-cols-3 gap-6">
                    {[
                      { l: "Distancia", v: e.event.km.toFixed(1), u: "km" },
                      { l: "Tiempo", v: hm(e.event.minutes), u: "" },
                      { l: "Ritmo", v: fmtPace(e.event.minutes, e.event.km).replace(" /km", ""), u: "/km" },
                    ].map((s) => (
                      <div key={s.l}>
                        <dd className="t-figure">{s.v}{s.u && <span className="t-small ml-1 font-normal text-muted">{s.u}</span>}</dd>
                        <dt className="t-small text-muted">{s.l}</dt>
                      </div>
                    ))}
                  </dl>
                </article>
              );
            })}
          </div>

          <div className="lg:col-span-5">
            <Panel title="Totales" subtitle="Kilómetros por persona">
              <ol className="ledger" style={{ ["--inset" as string]: "0px" }}>
                {totals.map((t, i) => (
                  <li key={t.id} className="flex h-16 items-center gap-3">
                    <Avatar name={t.name} size={32} label={false} />
                    <div className="min-w-0 flex-1">
                      <p className="t-heading">{t.name}</p>
                      <p className="t-small text-muted">{hm(t.min)} · {t.n} {t.n === 1 ? "salida" : "salidas"}</p>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-raised"><div className="h-full rounded-full" style={{ width: `${(t.km / maxKm) * 100}%`, background: i === 0 ? "var(--t-accent)" : "var(--t-muted)" }} /></div>
                    </div>
                    <span className="t-body tabular-nums">{t.km.toFixed(1)} km</span>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
