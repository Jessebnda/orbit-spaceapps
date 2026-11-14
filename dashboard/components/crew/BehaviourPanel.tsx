"use client";

import { useMemo, useState } from "react";
import { CircleCheck, Info, LoaderCircle, OctagonAlert, Sparkles, TriangleAlert } from "lucide-react";
import { Monogram } from "@/components/shell/Nav";
import { EmptyState } from "@/components/ui/EmptyState";
import { behaviorInsights, type CommsAnomaly, type CrewMember, type CrewSnapshot } from "@orbit/shared";
import { Panel } from "@/components/ui/Panel";
import { LedgerList, LedgerRow } from "@/components/ui/LedgerRow";
import { behaviourPrompt, dailySummaries } from "@/lib/domain/behaviour";
import { HubError, api, START_CMD, type CommsRow, type HistoryPoint } from "@/lib/services/hub";
import { statusColor } from "@/lib/theme";

const ToneGlyph = ({ tone }: { tone: "ok" | "watch" | "critical" }) => {
  const G = tone === "critical" ? OctagonAlert : tone === "watch" ? TriangleAlert : CircleCheck;
  return <G size={16} strokeWidth={2} style={{ color: statusColor[tone] }} aria-label={tone === "ok" ? "Normal" : tone === "watch" ? "Vigilar" : "Crítico"} role="img" />;
};

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
    <Panel
      title="Análisis de comportamiento"
      subtitle="Últimos 14 días"
      action={
        <span title="Calculado con comunicación y vitales. El hub no guarda histórico de ánimo, así que las señales de ánimo usan solo el último día." className="text-ink3">
          <Info size={14} strokeWidth={1.5} aria-label="Cómo se calcula" role="img" />
        </span>
      }
    >
      {insights.length ? (
        <LedgerList label="Señales">
          {insights.map((i) => (
            <LedgerRow
              key={i.id}
              media={<ToneGlyph tone={i.tone} />}
              title={<span className="t-body font-normal">{i.text}</span>}
            />
          ))}
        </LedgerList>
      ) : (
        <EmptyState compact icon={CircleCheck} title="Sin señales destacadas" hint={history.length < 20 ? "Todavía no hay historial suficiente." : undefined} />
      )}
      <div className="mt-5 flex items-center gap-3">
        <button type="button" onClick={askAssistant} disabled={asking} className="mac-btn">
          {asking ? <LoaderCircle size={14} className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Sparkles size={14} aria-hidden />}
          Pedir análisis al asistente
        </button>
        {asking && <span className="t-small text-ink3">Puede tardar 2–3 min</span>}
      </div>
      {asking && (
        <div className="mt-4 space-y-2" role="status" aria-label="Generando análisis">
          {[100, 90, 60].map((w) => <div key={w} className="skeleton h-3 rounded-full" style={{ width: `${w}%` }} />)}
        </div>
      )}
      {askError && <p className="t-small mt-4 flex items-center gap-1.5"><TriangleAlert size={14} style={{ color: statusColor.watch }} aria-hidden />{askError}</p>}
      {reply && (
        <div className="mt-4 flex gap-3" aria-live="polite">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-raised"><Monogram size={14} /></span>
          <div className="t-body min-w-0 flex-1 whitespace-pre-wrap">{reply}</div>
        </div>
      )}
    </Panel>
  );
}
