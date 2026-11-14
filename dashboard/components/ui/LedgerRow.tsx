import Link from "next/link";
import type { ReactNode } from "react";

/** Plain list on the ground: rows split by a 0.5 px hairline inset past the media slot. */
export function LedgerList({ children, label, inset = 16, className = "", id }: { children: ReactNode; label: string; inset?: number; className?: string; id?: string }) {
  return (
    <ul id={id} aria-label={label} className={`ledger ${className}`} style={{ ["--inset" as string]: `${inset}px` }}>
      {children}
    </ul>
  );
}

export function LedgerRow({ media, title, meta, trailing, action, selected, href, onClick, tall }: { media?: ReactNode; title: ReactNode; meta?: ReactNode; trailing?: ReactNode; action?: ReactNode; selected?: boolean; href?: string; onClick?: () => void; tall?: boolean }) {
  const cls = `flex items-center gap-3 px-4 py-2 ${meta || tall ? "min-h-14" : "min-h-11"} ${selected ? "row-selected" : ""} ${href || onClick ? "row-hover" : ""}`;
  const body = (
    <>
      {media && <span className="shrink-0">{media}</span>}
      <span className="min-w-0 flex-1">
        <span className="t-heading block truncate">{title}</span>
        {meta && <span className="t-small block truncate text-muted">{meta}</span>}
      </span>
      {trailing && <span className="t-small shrink-0 text-right tabular-nums">{trailing}</span>}
      {action && <span className="flex w-24 shrink-0 justify-end">{action}</span>}
    </>
  );
  if (href) return <li><Link href={href} className={cls}>{body}</Link></li>;
  if (onClick) return <li><button type="button" onClick={onClick} aria-pressed={selected} className={`${cls} w-full text-left`}>{body}</button></li>;
  return <li className={cls}>{body}</li>;
}
