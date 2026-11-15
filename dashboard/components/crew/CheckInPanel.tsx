import { ACHIEVEMENTS, type CheckIn, type CrewSnapshot } from "@orbit/shared";
import { Bandage, HeartHandshake, StickyNote, ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { fmtAgo } from "@/lib/domain/format";

const WORDS: Record<string, string[]> = {
  mood: ["", "Muy bajo", "Bajo", "Regular", "Bien", "Muy bien"],
  stress: ["", "Muy bajo", "Bajo", "Medio", "Alto", "Muy alto"],
  missionOutlook: ["", "Muy negativa", "Negativa", "Neutral", "Positiva", "Muy positiva"],
};

/** Five 28 x 6 segments. Polarity is said in words ("Estrés 2/5 · bajo"), never with red/green per value. */
function Scale({ label, k, v }: { label: string; k: keyof typeof WORDS; v: number }) {
  return (
    <div className="flex min-h-11 items-center gap-3 sm:gap-4">
      <span className="t-small w-24 shrink-0 text-muted sm:w-36">{label}</span>
      <span className="flex gap-1" role="meter" aria-valuemin={0} aria-valuemax={5} aria-valuenow={v} aria-label={`${label} ${v} de 5`}>
        {[1, 2, 3, 4, 5].map((i) => <span key={i} className={`h-1.5 w-4 rounded-[3px] sm:w-7 ${i <= v ? "bg-ink" : "bg-raised"}`} />)}
      </span>
      <span className="t-small ml-auto text-right tabular-nums">{v}/5 <span className="text-muted max-sm:block"><span className="max-sm:hidden">· </span>{WORDS[k][v].toLowerCase()}</span></span>
    </div>
  );
}

function Line({ icon: Icon, label, children }: { icon: typeof Bandage; label: string; children: string }) {
  return (
    <div className="flex min-h-11 items-center gap-3 py-2">
      <Icon size={16} strokeWidth={1.5} className="shrink-0 text-muted" aria-hidden />
      <span className="t-small w-32 shrink-0 text-muted">{label}</span>
      <span className="t-small whitespace-pre-wrap">{children}</span>
    </div>
  );
}

/** Last check-in and achievements. Bereavement is a plain line, with no detail. */
export function CheckInPanel({ checkIn, stats, now }: { checkIn?: CheckIn; stats: CrewSnapshot["stats"]; now: number }) {
  return (
    <div className="grid gap-x-6 gap-y-8 lg:grid-cols-2">
      <section aria-labelledby="ci-h">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="ci-h" className="t-heading">Último registro</h2>
          {checkIn && <span className="t-small text-ink3">{fmtAgo(checkIn.ts, now)}</span>}
        </div>
        {checkIn ? (
          <div className="ledger" style={{ ["--inset" as string]: "16px" }}>
            <Scale label="Ánimo" k="mood" v={checkIn.mood} />
            <Scale label="Estrés" k="stress" v={checkIn.stress} />
            <Scale label="Perspectiva de la misión" k="missionOutlook" v={checkIn.missionOutlook} />
            {checkIn.injury && <Line icon={Bandage} label="Lesión">{checkIn.injury}</Line>}
            {checkIn.bereavement && <Line icon={HeartHandshake} label="Familia">Pérdida familiar comunicada desde tierra.</Line>}
            {checkIn.note && <Line icon={StickyNote} label="Nota">{checkIn.note}</Line>}
          </div>
        ) : (
          <EmptyState compact icon={ClipboardList} title="Sin registros todavía" hint="Aparecen cuando el tripulante completa su check-in." />
        )}
      </section>
      <section aria-labelledby="lg-h">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="lg-h" className="t-heading">Logros</h2>
          <span className="t-title tabular-nums">{stats.xp} <span className="t-small font-normal text-muted">XP</span></span>
        </div>
        {stats.achievements.length ? (
          <ul className="flex flex-wrap gap-2">
            {stats.achievements.map((id) => {
              const a = ACHIEVEMENTS.find((x) => x.id === id);
              return <li key={id} title={a?.desc} className="t-small rounded-full bg-chip px-3 py-1">{a?.title ?? id}</li>;
            })}
          </ul>
        ) : (
          <EmptyState compact title="Ningún logro todavía" />
        )}
      </section>
    </div>
  );
}
