import type { Action } from "@/lib/services/hub";

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

export function fmtClock(ts: number) {
  return new Date(ts).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

export function fmtAgo(ts: number, now: number) {
  if (!now) return "—";
  const s = Math.max(0, (now - ts) / 1000);
  if (s >= 86_400) return rtf.format(-Math.floor(s / 86_400), "day");
  if (s >= 3600) return rtf.format(-Math.floor(s / 3600), "hour");
  if (s >= 60) return rtf.format(-Math.floor(s / 60), "minute");
  return rtf.format(-Math.floor(s), "second");
}

/** min/km from a total duration and distance. */
export function fmtPace(minutes: number, km: number) {
  if (km <= 0) return "—";
  const sec = Math.round((minutes / km) * 60);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")} /km`;
}

/** One compact line per tool call: "trigger_protocol → crewId: c2 · protocolId: box_breathing". */
export function actionChip(a: Action) {
  const args = Object.entries(a.args)
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(" · ");
  return args ? `${a.tool} → ${args}` : a.tool;
}

const TOOL_TEXT: Record<string, { glyph: "send" | "check" | "wrench"; text: (a: Action, who: (id: string) => string) => string }> = {
  trigger_protocol: { glyph: "send", text: (a, who) => `Protocolo enviado a ${who(String(a.args.crewId))}: ${String(a.args.protocolId).replace(/_/g, " ")}` },
  create_protocol: { glyph: "send", text: (a, who) => `Protocolo nuevo para ${who(String(a.args.crewId))}: ${String(a.args.title ?? "")}` },
  resolve_emergency: { glyph: "check", text: () => "Emergencia marcada como resuelta" },
  get_crew_overview: { glyph: "wrench", text: () => "Consultó el estado de la tripulación" },
  get_member_history: { glyph: "wrench", text: (a, who) => `Consultó el histórico de ${who(String(a.args.crewId))}` },
  get_comms: { glyph: "wrench", text: (a, who) => `Consultó la comunicación de ${who(String(a.args.crewId))}` },
  get_behavior_insights: { glyph: "wrench", text: (a, who) => `Analizó el comportamiento de ${who(String(a.args.crewId))}` },
  search_knowledge: { glyph: "wrench", text: () => "Buscó en la base de conocimiento" },
  list_protocols: { glyph: "wrench", text: () => "Consultó la biblioteca de protocolos" },
};

/** Readable Spanish line + glyph kind for a tool call. */
export function actionLine(a: Action, who: (id: string) => string) {
  const t = TOOL_TEXT[a.tool];
  const failed = typeof a.result === "string" && /"error"/.test(a.result);
  return { glyph: t?.glyph ?? "wrench", text: t ? t.text(a, who) : a.tool, failed };
}
