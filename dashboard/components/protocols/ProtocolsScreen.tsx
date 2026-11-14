"use client";

import { useState } from "react";
import { PROTOCOL_KIND_LABEL, type Protocol, type ProtocolKind } from "@orbit/shared";
import { CustomProtocolForm } from "@/components/protocols/CustomProtocolForm";
import { ProtocolLibrary } from "@/components/protocols/ProtocolLibrary";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/services/hub";
import { useApi } from "@/lib/services/useApi";
import { useHub } from "@/lib/services/useHub";

const KINDS: ProtocolKind[] = ["emergency", "physical", "mental"];

/** Container: owns the target member and the send action; the children only render. */
export function ProtocolsScreen() {
  const { crew, loaded } = useHub();
  const library = useApi<Protocol[]>("/api/protocols");
  const [picked, setPicked] = useState("");
  const [note, setNote] = useState<string>();

  const crewId = picked || crew[0]?.member.id || "";
  const who = crew.find((c) => c.member.id === crewId)?.member.name ?? "";

  async function send(body: object, done: string) {
    setNote(undefined);
    try {
      await api("/api/protocol", { method: "POST", body: JSON.stringify({ crewId, ...body }) });
      setNote(done);
      return true;
    } catch (e) {
      setNote(e instanceof Error ? e.message : "No se pudo enviar");
      return false;
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="mac-toolbar flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-title font-bold tracking-[-0.3px]">Protocolos</h1>
          <p className="mt-1 text-small text-muted">Biblioteca del hub. Elige a quién enviarlo.</p>
        </div>
        <label className="flex items-center gap-2 text-small text-muted">
          Destinatario
          <select
            value={crewId}
            onChange={(e) => setPicked(e.target.value)}
            className="rounded-md border border-hairline bg-bg px-2 py-1.5 text-small text-ink outline-none focus:border-accent"
          >
            {crew.map((c) => (
              <option key={c.member.id} value={c.member.id}>
                {c.member.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      {note && <p role="status" className="text-small text-muted">{note}</p>}
      {library.error && <p className="text-small text-muted">No se pudo leer la biblioteca: {library.error}</p>}
      {!loaded && !library.data && <EmptyState title="Esperando datos del hub…" />}

      {library.data && (
        <ProtocolLibrary
          kinds={KINDS.map((k) => ({ kind: k, label: PROTOCOL_KIND_LABEL[k] }))}
          protocols={library.data}
          canSend={!!crewId}
          onSend={(p) => send({ protocolId: p.id }, `Enviado a ${who}: ${p.title}`)}
        />
      )}

      <CustomProtocolForm canSend={!!crewId} onSubmit={(protocol) => send({ protocol }, `Enviado a ${who}`)} />
    </div>
  );
}
