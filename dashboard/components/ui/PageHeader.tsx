import type { ReactNode } from "react";

/** h1 + one sentence about the data (the finding), never about how to use the screen. Actions on the right. */
export function PageHeader({ title, finding, actions }: { title: string; finding?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="t-title">{title}</h1>
        {finding && <p className="t-body mt-1 text-muted">{finding}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  );
}
