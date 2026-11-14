// Design tokens come from shared/src/design.ts (single source for mobile and dashboard).
// This file only maps them to CSS vars (read by globals.css) and to chart props. Values are never redefined here.
import { color, radius, STATUS_LABEL, type as typeScale } from "@orbit/shared";

export { color };

const cssVars: Record<string, string> = {
  "--t-bg": color.bg,
  "--t-surface": color.surface,
  "--t-raised": color.raised,
  "--t-hairline": color.hairline,
  "--t-text": color.text,
  "--t-muted": color.muted,
  "--t-faint": color.faint,
  "--t-accent": color.accent,
  "--t-emergency": color.emergency,
  "--t-ok": color.status.ok,
  "--t-watch": color.status.watch,
  "--t-critical": color.status.critical,
  "--t-r-sm": `${radius.sm}px`,
  "--t-r-md": `${radius.md}px`,
  "--t-r-lg": `${radius.lg}px`,
  "--t-r-xl": `${radius.xl}px`,
  "--t-fs-status": `${typeScale.status.size}px`,
  "--t-fs-caption": `${typeScale.caption.size}px`,
  "--t-fs-body": `${typeScale.body.size}px`,
  "--t-fs-section": `${typeScale.section.size}px`,
  "--t-fs-title": `${typeScale.title.size}px`,
  "--t-fs-figure": `${typeScale.figure.size}px`,
  "--t-fs-hero": `${typeScale.hero.size}px`,
};

/** Injected once in the root layout as a <style> tag. */
export const themeCss = `:root{${Object.entries(cssVars)
  .map(([k, v]) => `${k}:${v}`)
  .join(";")}}`;

export const statusColor = color.status;
export const statusLabel = STATUS_LABEL;

/** Flat, bordered chart tooltip; no shadow. */
export const tooltipStyle = {
  background: color.surface,
  border: `1px solid ${color.hairline}`,
  borderRadius: radius.sm,
  fontSize: typeScale.small.size,
  color: color.text,
  boxShadow: "none",
} as const;

/** Axis tick style: faint, small, never louder than the data. */
export const tickStyle = { fill: color.muted, fontSize: typeScale.small.size } as const;

/** Chart chrome and data hues, all taken from the shared tokens. */
export const chart = {
  grid: color.hairline,
  cursor: color.faint,
  line: color.accent,
  /** Peer hues for stacked bars. Status colors are reserved for status, so peers use the accent and neutrals. */
  peers: [color.accent, color.text, color.muted],
  other: color.faint,
} as const;
