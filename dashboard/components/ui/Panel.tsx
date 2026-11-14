import type { ReactNode } from "react";

/** A surface one tone up from the ground. No border, no shadow. */
export function Panel({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg bg-surface p-5 ${className}`}>
      {title && <h2 className="mb-4 text-caption font-bold text-muted">{title}</h2>}
      {children}
    </section>
  );
}
