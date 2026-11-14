import { ACHIEVEMENTS, type CheckIn, type CrewSnapshot } from "@orbit/shared";
import { Panel } from "@/components/ui/Panel";

/** Last check-in and achievements. Bereavement is shown as a plain line, with no detail. */
export function CheckInPanel({ checkIn, stats }: { checkIn?: CheckIn; stats: CrewSnapshot["stats"] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Último registro">
        {checkIn ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-small">
            <dt className="text-muted">Ánimo</dt>
            <dd className="tabular-nums">{checkIn.mood}/5</dd>
            <dt className="text-muted">Estrés</dt>
            <dd className="tabular-nums">{checkIn.stress}/5</dd>
            <dt className="text-muted">Perspectiva de la misión</dt>
            <dd className="tabular-nums">{checkIn.missionOutlook}/5</dd>
            {checkIn.injury && (
              <>
                <dt className="text-muted">Lesión</dt>
                <dd>{checkIn.injury}</dd>
              </>
            )}
            {checkIn.bereavement && (
              <>
                <dt className="text-muted">Familia</dt>
                <dd>Pérdida familiar comunicada desde tierra.</dd>
              </>
            )}
            {checkIn.note && (
              <>
                <dt className="text-muted">Nota</dt>
                <dd className="whitespace-pre-wrap">{checkIn.note}</dd>
              </>
            )}
          </dl>
        ) : (
          <p className="text-small text-faint">Sin registros.</p>
        )}
      </Panel>
      <Panel title="Logros">
        <p className="mb-3 text-small tabular-nums text-muted">{stats.xp} XP</p>
        {stats.achievements.length ? (
          <ul className="flex flex-wrap gap-2">
            {stats.achievements.map((id) => {
              const a = ACHIEVEMENTS.find((x) => x.id === id);
              return (
                <li key={id} title={a?.desc} className="rounded-sm border border-hairline px-2 py-1 text-caption text-muted">
                  {a?.title ?? id}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-small text-faint">Ningún logro todavía.</p>
        )}
      </Panel>
    </div>
  );
}
