import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Framed block: glyph, what is missing, what will fill it, optional action. */
export function EmptyState({ icon: Icon, title, hint, action, compact }: { icon?: LucideIcon; title: string; hint?: string; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded-md bg-surface text-center ${compact ? "px-4 py-6" : "px-6 py-8"}`}>
      {Icon && <Icon size={20} strokeWidth={1.5} className="mb-3 text-faint" aria-hidden />}
      <p className="t-body">{title}</p>
      {hint && <p className="t-small mt-1 max-w-sm text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-px" aria-busy="true" role="status" aria-label="Cargando">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton h-14 rounded-md" />
      ))}
    </div>
  );
}
