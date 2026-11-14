import { Send } from "lucide-react";
import type { Protocol, ProtocolKind } from "@orbit/shared";
import { EmptyState } from "@/components/ui/EmptyState";
import { LedgerList } from "@/components/ui/LedgerRow";

/** Library grouped by kind. Each row shows the steps on demand. */
export function ProtocolLibrary({
  kinds,
  protocols,
  canSend,
  onSend,
}: {
  kinds: { kind: ProtocolKind; label: string }[];
  protocols: Protocol[];
  canSend: boolean;
  onSend: (p: Protocol) => void;
}) {
  return (
    <>
      {kinds.map(({ kind, label }) => {
        const items = protocols.filter((p) => p.kind === kind);
        return (
          <section key={kind} aria-labelledby={`kind-${kind}`}>
            <h2 id={`kind-${kind}`} className="mb-2 text-caption font-bold text-muted">
              {label}
            </h2>
            {items.length ? (
              <LedgerList label={label}>
                {items.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-small font-semibold">{p.title}</p>
                      {p.reason && <p className="mt-0.5 text-small text-muted">{p.reason}</p>}
                      <details className="mt-1 text-small text-faint">
                        <summary className="cursor-pointer select-none hover:text-muted">
                          {p.steps.length} pasos{p.durationMin ? ` · ${p.durationMin} min` : ""}
                        </summary>
                        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
                          {p.steps.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ol>
                      </details>
                    </div>
                    <button
                      type="button"
                      disabled={!canSend}
                      onClick={() => onSend(p)}
                      className="mac-btn shrink-0"
                    >
                      <Send size={14} aria-hidden /> Enviar
                    </button>
                  </li>
                ))}
              </LedgerList>
            ) : (
              <EmptyState title="Sin protocolos en esta categoría." />
            )}
          </section>
        );
      })}
    </>
  );
}
