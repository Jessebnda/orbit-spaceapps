import Link from "next/link";
import { METRIC_META, formatMetric, statusOf, type CrewSnapshot, type MetricKey } from "@orbit/shared";
import { StatusMark } from "@/components/ui/StatusMark";
import { fmtAgo } from "@/lib/domain/format";
import { statusColor } from "@/lib/theme";

const COLUMNS: MetricKey[] = ["hr", "spo2", "bpSys", "temp", "resp", "sleep", "kcal", "water"];

/** Dense ledger of the crew: one row per member, status and values aligned on tabular figures. */
export function CrewTable({ crew, now, loaded }: { crew: CrewSnapshot[]; now: number; loaded: boolean }) {
  return (
    <div className="mac-group overflow-x-auto">
      <table className="mac-rows w-full min-w-[820px] text-small">
        <thead className="text-caption font-bold text-muted">
          <tr className="border-b border-hairline">
            <th scope="col" className="px-4 py-2 text-left font-bold">Miembro</th>
            <th scope="col" className="px-4 py-2 text-left font-bold">Estado</th>
            {COLUMNS.map((k) => (
              <th key={k} scope="col" className="px-4 py-2 text-right font-bold">
                {METRIC_META[k].label}
              </th>
            ))}
            <th scope="col" className="px-4 py-2 text-right font-bold">Ánimo</th>
            <th scope="col" className="px-4 py-2 text-left font-bold">Comunicación</th>
          </tr>
        </thead>
        <tbody>
          {crew.map((c) => (
            <tr key={c.member.id}>
              <td className="px-4 py-3">
                <Link href={`/crew/${c.member.id}`} className="font-semibold hover:underline">
                  {c.member.name}
                </Link>
                <div className="text-caption text-faint">
                  {c.member.role} · {c.online ? "en línea" : `visto ${fmtAgo(c.lastSeen, now)}`}
                </div>
              </td>
              <td className="px-4 py-3">
                <StatusMark status={c.status} />
              </td>
              {COLUMNS.map((k) => {
                const v = c.metrics[k];
                const status = statusOf(k, v, now);
                return (
                  <td key={k} className="px-4 py-3 text-right whitespace-nowrap tabular-nums" style={{ color: status === "ok" ? undefined : statusColor[status] }}>
                    {formatMetric(k, v)}
                    <div className="mt-0.5 flex justify-end">
                      <StatusMark status={status} showOk={false} />
                    </div>
                  </td>
                );
              })}
              <td className="px-4 py-3 text-right tabular-nums text-muted">{c.lastCheckIn ? `${c.lastCheckIn.mood}/5` : "—"}</td>
              <td className="px-4 py-3 text-caption">
                {c.comms.anomalies.length ? (
                  <span style={{ color: statusColor.watch }}>
                    {c.comms.anomalies.length} {c.comms.anomalies.length === 1 ? "alerta" : "alertas"}
                  </span>
                ) : (
                  <span className="text-faint">Normal</span>
                )}
              </td>
            </tr>
          ))}
          {!crew.length && (
            <tr>
              <td colSpan={COLUMNS.length + 4} className="px-4 py-6 text-center text-muted">
                {loaded ? "El hub no tiene miembros registrados." : "Esperando datos del hub…"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
