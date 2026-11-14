"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { PROTOCOL_KIND_LABEL, type Protocol, type ProtocolKind } from "@orbit/shared";
import { Panel } from "@/components/ui/Panel";

/** Builds a captain-authored protocol and hands it to the caller to send. */
export function CustomProtocolForm({ canSend, onSubmit }: { canSend: boolean; onSubmit: (p: Protocol) => Promise<boolean> | void }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ProtocolKind>("mental");
  const [steps, setSteps] = useState("");
  const [error, setError] = useState<string>();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const lines = steps.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!title.trim() || !lines.length) {
      setError("Pon un título y al menos un paso.");
      return;
    }
    setError(undefined);
    const ok = await onSubmit({ id: crypto.randomUUID(), kind, title: title.trim(), steps: lines, createdBy: "captain" });
    if (ok !== false) {
      setTitle("");
      setSteps("");
    }
  }

  return (
    <Panel title="Crear protocolo propio">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <label className="block text-small">
            <span className="mb-1 block text-muted">Título</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-hairline bg-transparent px-3 py-2 text-small outline-none focus:border-accent" />
          </label>
          <label className="block text-small">
            <span className="mb-1 block text-muted">Pasos, uno por línea</span>
            <textarea rows={4} value={steps} onChange={(e) => setSteps(e.target.value)} className="w-full resize-y rounded-md border border-hairline bg-transparent px-3 py-2 text-small outline-none focus:border-accent" />
          </label>
          {error && <p className="text-small text-muted">{error}</p>}
        </div>
        <div className="flex flex-col justify-between gap-4 md:w-44">
          <label className="block text-small">
            <span className="mb-1 block text-muted">Categoría</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as ProtocolKind)} className="w-full rounded-md border border-hairline bg-bg px-2 py-2 text-small outline-none focus:border-accent">
              {(Object.keys(PROTOCOL_KIND_LABEL) as ProtocolKind[]).map((k) => (
                <option key={k} value={k}>
                  {PROTOCOL_KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={!canSend} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-hairline px-3 py-2 text-small hover:bg-raised disabled:opacity-40">
            <Send size={14} aria-hidden /> Crear y enviar
          </button>
        </div>
      </form>
    </Panel>
  );
}
