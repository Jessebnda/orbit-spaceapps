import type { Status } from "@orbit/shared";
import { STATUS_LABEL } from "@orbit/shared";
import { color, statusColor } from "@/lib/theme";

const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/** Person as a disc of initials with a status ring (2 px, 2 px offset). Offline = dashed ring, dimmed disc. Emergency = red, thicker. */
export function Avatar({ name, size = 40, status, online = true, emergency = false, label = true }: { name: string; size?: number; status?: Status; online?: boolean; emergency?: boolean; label?: boolean }) {
  const ringW = emergency ? 2.5 : 2;
  const ring = emergency ? color.emergency : status ? statusColor[status] : "transparent";
  const r = size / 2 - ringW / 2;
  const text = `${name}${status ? `, ${STATUS_LABEL[status].toLowerCase()}` : ""}${online ? "" : ", sin conexión"}`;
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role={label ? "img" : undefined}
      aria-label={label ? text : undefined}
      aria-hidden={label ? undefined : true}
    >
      <svg width={size} height={size} className="absolute inset-0" aria-hidden>
        {status || emergency ? <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ring} strokeWidth={ringW} strokeDasharray={online ? undefined : "3 3"} /> : null}
      </svg>
      <span
        className="flex items-center justify-center rounded-full bg-raised font-semibold text-ink"
        style={{ width: size - (status || emergency ? 8 : 0), height: size - (status || emergency ? 8 : 0), fontSize: size >= 40 ? 15 : size >= 32 ? 13 : 11, opacity: online ? 1 : 0.5 }}
      >
        {initials(name)}
      </span>
    </span>
  );
}
