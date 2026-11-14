import { CircleCheck, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { color as palette, statusColor, statusLabel } from "@/lib/theme";
import type { Status } from "@orbit/shared";

const GLYPH: Record<Status, LucideIcon> = { ok: CircleCheck, watch: TriangleAlert, critical: OctagonAlert };
// Text on the 14 % tint: red needs a lighter step to hold 4.5:1.
const TEXT: Record<Status, string> = { ok: statusColor.ok, watch: statusColor.watch, critical: "#FF6961" };

/** Status is glyph + word, never color alone. `inline` (default), `pill` (tinted chip) or `dot` (8 px, word only for screen readers). */
export function StatusMark({ status, showOk = true, variant = "inline", size = "micro", label }: { status: Status; showOk?: boolean; variant?: "inline" | "pill" | "dot"; size?: "micro" | "small"; label?: string }) {
  if (status === "ok" && !showOk && variant !== "pill") return null;
  const text = label ?? statusLabel[status];
  if (variant === "dot") {
    return (
      <span className="inline-flex items-center">
        <span className="inline-block size-2 rounded-full" style={{ background: statusColor[status] }} aria-hidden />
        <span className="sr-only-x">{text}</span>
      </span>
    );
  }
  const Glyph = GLYPH[status];
  const fs = size === "small" ? "text-[13px]" : "text-[11px]";
  if (variant === "pill") {
    return (
      <span className={`inline-flex h-5 items-center gap-1 rounded-full px-2 font-semibold whitespace-nowrap ${fs}`} style={{ color: TEXT[status], background: `color-mix(in srgb, ${statusColor[status]} 14%, transparent)` }}>
        <Glyph size={12} strokeWidth={2} fill="currentColor" stroke={palette.surface} aria-hidden />
        {text}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 font-semibold whitespace-nowrap ${fs}`} style={{ color: TEXT[status] }}>
      {/* Knockout: filled glyph with its mark cut out in the surface colour. */}
      <Glyph size={13} strokeWidth={2} fill="currentColor" stroke={palette.surface} aria-hidden />
      {text}
    </span>
  );
}
