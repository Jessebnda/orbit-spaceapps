import { statusColor, statusLabel } from "@/lib/theme";
import type { Status } from "@orbit/shared";

/** Square mark plus uppercase label: status is shape and text, never color alone. Omit it for "ok" in dense cells. */
export function StatusMark({ status, showOk = true }: { status: Status; showOk?: boolean }) {
  if (status === "ok" && !showOk) return null;
  const color = statusColor[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-status font-extrabold tracking-[0.08em] uppercase whitespace-nowrap" style={{ color }}>
      <span className="inline-block size-2" style={{ background: color }} aria-hidden />
      {statusLabel[status]}
    </span>
  );
}
