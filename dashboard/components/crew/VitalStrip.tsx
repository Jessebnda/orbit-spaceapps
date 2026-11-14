import { THRESHOLDS, formatMetric, statusOf, type CrewSnapshot, type MetricKey } from "@orbit/shared";
import { StatusMark } from "@/components/ui/StatusMark";
import { statusColor } from "@/lib/theme";

import { RangeDial } from "@/components/ui/RangeDial";

const SHORT: Partial<Record<MetricKey, string>> = { hr: "FC", spo2: "SpO₂", bpSys: "Presión", temp: "Temp." };
void THRESHOLDS;

/** The four headline vitals of a member. */
export function VitalStrip({ metrics, now, offline }: { metrics: CrewSnapshot["metrics"]; now: number; offline?: boolean }) {
  return (
    <dl className="grid grid-cols-4 gap-2">
      {(["hr", "spo2", "bpSys", "temp"] as MetricKey[]).map((k) => {
        const s = statusOf(k, metrics[k], now);
        return (
          <div key={k} className="relative flex flex-col items-center">
            <div className="mb-1"><RangeDial metric={k} value={offline ? undefined : metrics[k]} size={46} /></div>
            <dd className="t-heading tabular-nums" style={{ color: s === "ok" || offline ? undefined : statusColor[s] }}>
              {offline || metrics[k] == null ? "—" : formatMetric(k, metrics[k]).replace(/ [^\d]+$/, "")}
              {s !== "ok" && !offline && <span className="ml-1 align-middle"><StatusMark status={s} variant="dot" /></span>}
            </dd>
            <dt className="t-micro text-ink3">{SHORT[k]}</dt>
          </div>
        );
      })}
    </dl>
  );
}
