"use client";

import { useRef, useState, type FormEvent } from "react";
import { Plus, Send, TriangleAlert } from "lucide-react";
import { PROTOCOL_KIND_LABEL, type Protocol, type ProtocolKind } from "@orbit/shared";
import { Segmented } from "@/components/ui/Segmented";

/** Builds a captain-authored protocol: one input per step, Enter adds one, Backspace on an empty one removes it. */
export function CustomProtocolForm({ canSend, name, error: sendError, onSubmit }: { canSend: boolean; name: string; error?: string; onSubmit: (p: Protocol) => Promise<boolean> | void }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ProtocolKind>("mental");
  const [steps, setSteps] = useState<string[]>([""]);
  const [errors, setErrors] = useState<{ title?: string; steps?: string }>({});
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focus = (i: number) => requestAnimationFrame(() => refs.current[i]?.focus());
  const setStep = (i: number, v: string) => setSteps((s) => s.map((x, j) => (j === i ? v : x)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const lines = steps.map((s) => s.trim()).filter(Boolean);
    const next = { title: title.trim() ? undefined : "Pon un título.", steps: lines.length ? undefined : "Añade al menos un paso." };
    setErrors(next);
    if (next.title || next.steps) return;
    await onSubmit({ id: crypto.randomUUID(), kind, title: title.trim(), steps: lines, createdBy: "captain" });
  }

  const Err = ({ m }: { m?: string }) => (m ? <p role="alert" className="t-small mt-1.5 flex items-center gap-1.5"><TriangleAlert size={14} className="text-[#FF9F0A]" aria-hidden />{m}</p> : null);

  return (
    <form onSubmit={submit} className="space-y-6" aria-labelledby="new-h">
      <h2 id="new-h" className="t-title">Nuevo protocolo</h2>
      <div>
        <label htmlFor="p-title" className="t-small mb-1.5 block text-muted">Título</label>
        <input id="p-title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!errors.title} />
        <Err m={errors.title} />
      </div>
      <div>
        <span className="t-small mb-1.5 block text-muted">Categoría</span>
        <Segmented label="Categoría" value={kind} onChange={setKind} options={(Object.keys(PROTOCOL_KIND_LABEL) as ProtocolKind[]).map((k) => ({ value: k, label: PROTOCOL_KIND_LABEL[k] }))} />
      </div>
      <div>
        <span className="t-small mb-1.5 block text-muted">Pasos</span>
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="t-heading w-6 text-right text-ink3 tabular-nums">{i + 1}</span>
              <input
                ref={(el) => { refs.current[i] = el; }}
                className="field"
                aria-label={`Paso ${i + 1}`}
                value={s}
                onChange={(e) => setStep(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); if (s.trim()) { setSteps((x) => [...x.slice(0, i + 1), "", ...x.slice(i + 1)]); focus(i + 1); } }
                  if (e.key === "Backspace" && !s && steps.length > 1) { e.preventDefault(); setSteps((x) => x.filter((_, j) => j !== i)); focus(Math.max(0, i - 1)); }
                }}
              />
            </li>
          ))}
        </ol>
        <button type="button" className="mac-btn mt-3 ml-9" onClick={() => { setSteps((s) => [...s, ""]); focus(steps.length); }}><Plus size={14} aria-hidden />Añadir paso</button>
        <Err m={errors.steps} />
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={!canSend} className="btn-lg primary"><Send size={14} aria-hidden />Crear y enviar a {name.split(" ")[0] || "…"}</button>
        {sendError && <p className="t-small flex items-center gap-1.5"><TriangleAlert size={14} className="text-[#FF9F0A]" aria-hidden />{sendError}</p>}
      </div>
    </form>
  );
}
