"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CircleCheck, ClipboardList, Plus, Send, TriangleAlert } from "lucide-react";
import { PROTOCOL_KIND_LABEL, type Protocol, type ProtocolKind } from "@orbit/shared";
import { CustomProtocolForm } from "@/components/protocols/CustomProtocolForm";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState, SkeletonRows } from "@/components/ui/EmptyState";
import { LedgerList, LedgerRow } from "@/components/ui/LedgerRow";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { api } from "@/lib/services/hub";
import { useApi } from "@/lib/services/useApi";
import { useHub } from "@/lib/services/useHub";

const KINDS: ProtocolKind[] = ["emergency", "physical", "mental"];

/** Container: owns recipient, category, selection and the send action. List on the left, steps and the send button on the right. */
export function ProtocolsScreen() {
  const { crew } = useHub();
  const library = useApi<Protocol[]>("/api/protocols");
  const para = useSearchParams().get("para");
  const [picked, setPicked] = useState("");
  const [kind, setKind] = useState<ProtocolKind>("emergency");
  const [sel, setSel] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [sent, setSent] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    try { setPicked(para ?? localStorage.getItem("orbit.protoTo") ?? ""); } catch { setPicked(para ?? ""); }
  }, [para]);

  const crewId = crew.some((c) => c.member.id === picked) ? picked : crew[0]?.member.id ?? "";
  const who = crew.find((c) => c.member.id === crewId)?.member.name ?? "";
  const all = library.data ?? [];
  const items = all.filter((p) => p.kind === kind);
  const current = creating ? undefined : items.find((p) => p.id === sel) ?? items[0];

  const choose = (id: string) => { setPicked(id); try { localStorage.setItem("orbit.protoTo", id); } catch { /* storage blocked */ } };

  async function send(body: object, done: string) {
    setError(undefined);
    try {
      await api("/api/protocol", { method: "POST", body: JSON.stringify({ crewId, ...body }) });
      setSent(done);
      setTimeout(() => setSent(undefined), 3000);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar");
      return false;
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const i = items.findIndex((p) => p.id === current?.id);
    const n = items[Math.min(items.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))];
    if (n) { setCreating(false); setSel(n.id); }
  }

  return (
    <div>
      <PageHeader title="Protocolos" finding={library.data ? `${all.length} protocolos · ${all.filter((p) => p.kind === "emergency").length} de emergencia` : undefined} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Segmented
          label="Categoría"
          value={kind}
          onChange={(k) => { setKind(k); setCreating(false); setSel(undefined); }}
          options={KINDS.map((k) => ({ value: k, label: PROTOCOL_KIND_LABEL[k], count: all.filter((p) => p.kind === k).length }))}
        />
        <div role="radiogroup" aria-label="Destinatario" className="flex flex-wrap items-center gap-1">
          <span className="t-small mr-2 text-muted">Enviar a</span>
          {crew.map((c) => {
            const on = c.member.id === crewId;
            return (
              <button key={c.member.id} type="button" role="radio" aria-checked={on} onClick={() => choose(c.member.id)} className={`flex h-9 items-center gap-2 rounded-full pr-3 pl-1 ${on ? "bg-white/10" : "row-hover"}`}>
                <span className={`rounded-full ${on ? "ring-2 ring-accent" : ""}`}><Avatar name={c.member.name} size={28} label={false} /></span>
                <span className={`t-small ${on ? "text-ink" : "text-muted"}`}>{c.member.name.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {library.error && <EmptyState compact icon={TriangleAlert} title="No se pudo leer la biblioteca" hint={library.error} />}
      {!library.data && !library.error && <SkeletonRows />}

      {library.data && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5" onKeyDown={onKey}>
            {items.length ? (
              <LedgerList label={PROTOCOL_KIND_LABEL[kind]}>
                {items.map((p) => (
                  <LedgerRow
                    key={p.id}
                    title={p.title}
                    meta={p.reason ?? `${p.steps.length} pasos${p.durationMin ? ` · ${p.durationMin} min` : ""}`}
                    selected={!creating && current?.id === p.id}
                    onClick={() => { setCreating(false); setSel(p.id); }}
                    tall
                  />
                ))}
              </LedgerList>
            ) : (
              <EmptyState compact icon={ClipboardList} title="Sin protocolos de esta categoría" />
            )}
            <div className="mt-4 px-4">
              <button type="button" className="mac-btn" onClick={() => setCreating(true)}><Plus size={14} aria-hidden />Nuevo protocolo</button>
            </div>
          </div>

          <div className="lg:col-span-7 lg:pl-6">
            {creating ? (
              <CustomProtocolForm name={who} canSend={!!crewId} onSubmit={async (protocol) => { const ok = await send({ protocol }, `Enviado a ${who}: ${protocol.title}`); if (ok) setCreating(false); return ok; }} error={error} />
            ) : current ? (
              <article aria-labelledby="proto-h">
                <h2 id="proto-h" className="t-title">{current.title}</h2>
                <p className="t-small mt-1 text-muted">{current.steps.length} pasos{current.durationMin ? ` · ${current.durationMin} min` : ""}</p>
                {current.reason && <p className="t-body mt-3 text-muted">{current.reason}</p>}
                <ol className="mt-6 space-y-4">
                  {current.steps.map((s, i) => (
                    <li key={i} className="flex gap-4">
                      <span className="t-title w-8 shrink-0 text-right text-ink3">{i + 1}</span>
                      <span className="t-body pt-0.5">{s}</span>
                    </li>
                  ))}
                </ol>
                <div className="sticky bottom-0 mt-8 flex items-center gap-4 bg-bg py-4">
                  <button type="button" disabled={!crewId || !!sent} className="btn-lg primary" onClick={() => send({ protocolId: current.id }, `Enviado a ${who}`)}>
                    {sent ? <CircleCheck size={14} aria-hidden /> : <Send size={14} aria-hidden />}
                    {sent ? "Enviado" : `Enviar a ${who.split(" ")[0] || "…"}`}
                  </button>
                  <p role="status" className="t-small text-muted">{sent}</p>
                  {error && <p className="t-small flex items-center gap-1.5"><TriangleAlert size={14} className="text-[#FF9F0A]" aria-hidden />{error}</p>}
                </div>
              </article>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
