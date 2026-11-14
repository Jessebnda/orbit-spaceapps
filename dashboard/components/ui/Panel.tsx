import type { ReactNode } from "react";

/** Surface one tone up from the ground, for charts and maps only. No border, no shadow. */
export function Panel({ title, subtitle, action, children, className = "", id }: { title?: string; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`rounded-md bg-surface p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex min-h-7 items-start justify-between gap-4">
          <div className="min-w-0">
            {title && <h2 className="t-heading">{title}</h2>}
            {subtitle && <p className="t-small mt-0.5 text-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
