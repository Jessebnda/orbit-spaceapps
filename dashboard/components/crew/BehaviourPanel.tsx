"use client";

import { useMemo, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { behaviorInsights, type CommsAnomaly, type CrewMember, type CrewSnapshot } from "@orbit/shared";
import { Panel } from "@/components/ui/Panel";
import { LedgerList, LedgerRow } from "@/components/ui/LedgerRow";
import { behaviourPrompt, dailySummaries } from "@/lib/domain/behaviour";
import { HubError, api, START_CMD, type CommsRow, type HistoryPoint } from "@/lib/services/hub";
import { statusColor } from "@/lib/theme";

/** Behaviour insights from 14 days of history and comms, plus the request to the assistant. */
export function BehaviourPanel({
  member,
  snapshot,
  history,
  comms,
  names,
  now,
  anomalies,
}: {
  member: CrewMember;
  snapshot: CrewSnapshot;
  history: HistoryPoint[];
  comms: CommsRow[];
  names: Record<string, string>;
  now: number;
  anomalies: CommsAnomaly[];
}) {
  const insights = useMemo(
    () => (now ? behaviorInsights(dailySummaries(history, comms, member.id, snapshot, now)) : []),
    [history, comms, member.id, snapshot, now],
  );
  const [reply, setReply] = useState<string>();
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string>();

  async function askAssistant() {
    setAsking(true);
    setAskError(undefined);
    setReply(undefined);
    const prompt = behaviourPrompt(member, insights, anomalies, (id) => names[id] ?? id);
    try {
      const res = await api<{ reply: string }>("/api/assistant", {
        method: "POST",
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });
      setReply(res.reply);
    } catch (e) {
      setAskError(
        e instanceof HubError && e.status === 503
          ? `El asistente no está en línea. Inícialo con ${START_CMD}`
          : e instanceof Error ? e.message : "Error al pedir el análisis",
      );
    } finally {
      setAsking(false);
    }
  }

  return (
    <Panel title="Análisis de comportamiento">
      {insights.length ? (
        <LedgerList label="Señales">
          {insights.map((i) => (
            <LedgerRow key={i.id}>
              <p className="text-small" style={{ color: statusColor[i.tone] }}>
                {i.text}
              </p>
            </LedgerRow>
          ))}
        </LedgerList>
      ) : (
        <p className="text-small text-faint">Sin señales destacadas en los últimos 14 días, o todavía no hay historial suficiente.</p>
      )}
      <p className="mt-3 text-caption text-faint">
        Calculado con 14 días de comunicación y vitales. El hub no envía histórico de registros de ánimo, así que las señales de ánimo solo usan el último día.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={askAssistant}
          disabled={asking}
          className="inline-flex items-center gap-2 rounded-md border border-hairline px-3 py-1.5 text-small hover:bg-raised disabled:opacity-50"
        >
          {asking ? <LoaderCircle size={14} className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Sparkles size={14} aria-hidden />}
          Pedir análisis al asistente
        </button>
        {asking && <span className="text-caption text-faint">Puede tardar 2–3 min</span>}
      </div>
      {askError && <p className="mt-3 text-small text-muted">{askError}</p>}
      {reply && <p className="mt-4 text-small whitespace-pre-wrap">{reply}</p>}
    </Panel>
  );
}
