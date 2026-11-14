import type { ReactNode } from "react";

/** Ledger: rows separated by hairlines, no boxes. Wrap a set of rows in a <ul>. */
export function LedgerList({ children, label }: { children: ReactNode; label: string }) {
  return (
    <ul aria-label={label} className="divide-y divide-hairline border-y border-hairline">
      {children}
    </ul>
  );
}

export function LedgerRow({ children }: { children: ReactNode }) {
  return <li className="flex flex-wrap items-start justify-between gap-4 py-3">{children}</li>;
}
