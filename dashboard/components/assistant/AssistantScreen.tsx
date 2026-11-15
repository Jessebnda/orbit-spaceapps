"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, ArrowUpRight, CheckCheck, CircleCheck, LoaderCircle, Moon, RotateCcw, Send, Square, TriangleAlert, Wrench, type LucideIcon } from "lucide-react";
import { Markdown } from "@/components/assistant/Markdown";
import { useChat } from "@/components/assistant/useChat";
import { Monogram } from "@/components/shell/Nav";
import { LedgerList, LedgerRow } from "@/components/ui/LedgerRow";
import { actionLine } from "@/lib/domain/format";
import { useApi } from "@/lib/services/useApi";
import { useHub } from "@/lib/services/useHub";
import { type LlmState } from "@/lib/services/hub";

const LLM: Record<LlmState["state"], { text: string; Icon: LucideIcon; spin: boolean; tone: string }> = {
  off: { text: "Dormido · se carga al preguntar", Icon: Moon, spin: false, tone: "" },
  starting: { text: "Cargando modelo…", Icon: LoaderCircle, spin: true, tone: "" },
  ready: { text: "Listo", Icon: CircleCheck, spin: false, tone: "text-ink" },
};
const GLYPH = { send: Send, check: CheckCheck, wrench: Wrench };

export function AssistantScreen() {
  const llm = useApi<LlmState>("/api/llm", 5000);
  const chat = useChat();
  const { crew } = useHub();
  const [input, setInput] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const who = (id: string) => crew.find((c) => c.member.id === id)?.member.name ?? id;
  const watch = crew.find((c) => c.status === "watch");

  // Auto-scroll to the newest message unless the user scrolled up.
  useEffect(() => {
    const el = list.current;
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight });
  }, [chat.messages, chat.busy]);

  function submit(e?: FormEvent, text = input) {
    e?.preventDefault();
    const t = text.trim();
    if (!t || chat.busy) return;
    setInput("");
    stick.current = true;
    chat.send(t);
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  };
  const status = llm.data ? LLM[llm.data.state] : undefined;
  const suggestions = [
    "¿Quién está fuera de rango ahora?",
    watch ? `Envía respiración cuadrada a ${watch.member.name}` : "Resume el estado de la tripulación",
    "Resume el sueño de la tripulación",
  ];

  // Below md the 81 px top nav sits above main too, so the composer would start under the fold.
  return (
    <div className="mx-auto flex h-[calc(100dvh-48px-81px)] max-w-[720px] flex-col md:h-[calc(100dvh-48px)]">
      <header className="flex shrink-0 items-center justify-between gap-3 pb-4">
        <h1 className="t-title">Asistente</h1>
        <div className="flex items-center gap-4">
        <p className="t-small flex items-center gap-1.5 text-muted" aria-live="polite">
          {status ? (
            <>
              <status.Icon size={14} strokeWidth={1.5} className={`${status.tone} ${status.spin ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden />
              {status.text}
            </>
          ) : (
            <span className="text-ink3">{llm.error ? "Hub sin respuesta" : "Consultando estado…"}</span>
          )}
        </p>
        {chat.messages.length > 0 && (
          <button type="button" onClick={chat.reset} className="mac-btn !h-7 !px-2.5"><RotateCcw size={12} aria-hidden />Nueva conversación</button>
        )}
        </div>
      </header>

      <div
        ref={list}
        onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
        className="flex-1 space-y-6 overflow-y-auto pb-4"
        aria-live="polite"
        aria-label="Conversación"
      >
        {chat.messages.length === 0 && (
          <div className="pt-[8vh]">
            <Monogram size={28} />
            <h2 className="t-title mt-3">¿Qué necesitas saber?</h2>
            <div className="mt-6">
              <LedgerList label="Sugerencias" inset={16}>
                {suggestions.map((s) => (
                  <LedgerRow key={s} title={<span className="t-body font-normal">{s}</span>} trailing={<ArrowUpRight size={16} strokeWidth={1.5} className="text-muted" aria-hidden />} onClick={() => submit(undefined, s)} />
                ))}
              </LedgerList>
            </div>
          </div>
        )}
        {chat.messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="t-body ml-auto w-fit max-w-[80%] rounded-[18px] rounded-br-md bg-raised px-4 py-2 whitespace-pre-wrap">{m.content}</div>
          ) : (
            <div key={i} className="flex gap-3">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-raised"><Monogram size={16} /></span>
              <div className="min-w-0 max-w-[64ch] flex-1 space-y-3">
                <Markdown>{m.content}</Markdown>
                {m.actions && m.actions.length > 0 && (
                  <ul className="space-y-1.5">
                    {m.actions.map((a, j) => {
                      const l = actionLine(a, who);
                      const G = GLYPH[l.glyph];
                      return (
                        <li key={j} className="t-small flex h-10 items-center gap-2.5 rounded-md bg-surface px-3">
                          <G size={14} strokeWidth={1.5} className="shrink-0 text-muted" aria-hidden />
                          <span className="min-w-0 flex-1 truncate">{l.text}</span>
                          <span className="flex shrink-0 items-center gap-1 text-muted">
                            {l.failed ? <><TriangleAlert size={14} className="text-[#FF9F0A]" aria-hidden />falló</> : <><CircleCheck size={14} className="text-ink" aria-hidden />{l.glyph === "send" ? "enviado" : "hecho"}</>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ),
        )}
        {chat.busy && (
          <div className="flex gap-3" role="status">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-raised"><Monogram size={16} /></span>
            <div className="flex-1">
              <div className="space-y-2">{[100, 85, 55].map((w) => <div key={w} className="skeleton h-3 rounded-full" style={{ width: `${w}%` }} />)}</div>
              <p className="t-small mt-3 flex items-center gap-2 text-muted">
                Pensando… {chat.elapsed} s · puede tardar 2–3 min
                <button type="button" onClick={chat.cancel} className="mac-btn !h-7 !px-2.5"><Square size={10} aria-hidden />Cancelar</button>
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 bg-bg pt-2 pb-2">
        {chat.error && <p role="alert" className="t-small mb-2 flex items-center gap-1.5"><TriangleAlert size={14} className="text-[#FF9F0A]" aria-hidden />{chat.error}</p>}
        <form onSubmit={submit} className="relative">
          <label className="sr-only" htmlFor="chat-input">Mensaje</label>
          <textarea
            id="chat-input"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={chat.busy}
            aria-describedby="chat-hint"
            placeholder="Pregunta sobre la tripulación o pide una acción"
            className="field !h-auto min-h-[52px] resize-none !rounded-xl py-3 pr-14 disabled:opacity-50"
          />
          <span id="chat-hint" className="sr-only">Enter envía, Mayús más Enter añade una línea</span>
          <button type="submit" aria-label="Enviar" disabled={chat.busy || !input.trim()} className="absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full bg-accent text-[color:var(--t-on-accent)] disabled:bg-raised disabled:text-muted">
            <ArrowUp size={16} strokeWidth={2} aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
}
