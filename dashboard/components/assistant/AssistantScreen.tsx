"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { CircleCheck, LoaderCircle, Moon, Send, Square, type LucideIcon } from "lucide-react";
import { useChat } from "@/components/assistant/useChat";
import { actionChip } from "@/lib/domain/format";
import { useApi } from "@/lib/services/useApi";
import { type LlmState } from "@/lib/services/hub";

// Wording for the hub's model state, polled while this screen is mounted.
const LLM: Record<LlmState["state"], { text: string; Icon: LucideIcon; spin: boolean }> = {
  off: { text: "Dormido · se cargará al preguntar", Icon: Moon, spin: false },
  starting: { text: "Cargando modelo…", Icon: LoaderCircle, spin: true },
  ready: { text: "Listo", Icon: CircleCheck, spin: false },
};

export function AssistantScreen() {
  const llm = useApi<LlmState>("/api/llm", 5000);
  const chat = useChat();
  const [input, setInput] = useState("");

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    chat.send(text);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const status = llm.data ? LLM[llm.data.state] : undefined;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-title font-bold tracking-[-0.3px]">Asistente</h1>
          <p className="mt-1 text-small text-muted">Modelo local en este equipo. Puede actuar: enviar protocolos o resolver emergencias.</p>
        </div>
        <p className="flex items-center gap-1.5 text-caption text-muted" aria-live="polite">
          {status ? (
            <>
              <status.Icon size={14} strokeWidth={1.5} className={status.spin ? "animate-spin motion-reduce:animate-none" : undefined} aria-hidden />
              {status.text}
            </>
          ) : (
            <span className="text-faint">{llm.error ? "Hub sin respuesta" : "Consultando estado…"}</span>
          )}
        </p>
      </header>

      <section className="space-y-5" aria-label="Conversación">
        {chat.messages.length === 0 && <p className="text-small text-faint">Pregunta algo sobre la tripulación o pide una acción.</p>}
        {chat.messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-lg bg-raised px-4 py-2.5 text-small whitespace-pre-wrap">
              {m.content}
            </div>
          ) : (
            <div key={i} className="max-w-[85%] space-y-2">
              <p className="text-body whitespace-pre-wrap">{m.content}</p>
              {m.actions && m.actions.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {m.actions.map((a, j) => (
                    <li key={j} className="rounded-sm border border-hairline px-2 py-0.5 font-mono text-caption text-muted">
                      {actionChip(a)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ),
        )}
        {chat.busy && (
          <p className="flex items-center gap-2 text-small text-muted" role="status">
            <LoaderCircle size={14} className="animate-spin motion-reduce:animate-none" aria-hidden />
            Pensando… {chat.elapsed} s · puede tardar 2–3 min
            <button type="button" onClick={chat.cancel} className="ml-2 inline-flex items-center gap-1 text-caption text-faint hover:text-ink">
              <Square size={10} aria-hidden /> Cancelar
            </button>
          </p>
        )}
        {chat.error && <p className="text-small text-muted">{chat.error}</p>}
      </section>

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-hairline pt-5">
        <label className="sr-only" htmlFor="chat-input">Mensaje</label>
        <textarea
          id="chat-input"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={chat.busy}
          placeholder="Escribe un mensaje · Enter para enviar"
          className="min-h-10 flex-1 resize-none rounded-md border border-hairline bg-transparent px-3 py-2 text-small outline-none placeholder:text-faint focus:border-accent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={chat.busy || !input.trim()}
          className="inline-flex h-10 items-center gap-1.5 rounded-md border border-hairline px-3 text-small hover:bg-raised disabled:opacity-40"
        >
          <Send size={14} aria-hidden /> Enviar
        </button>
      </form>
    </div>
  );
}
