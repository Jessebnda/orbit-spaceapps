"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LayoutDashboard, MessageSquare, Orbit, Route, Trophy, type LucideIcon } from "lucide-react";

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Vista general", icon: LayoutDashboard },
  { href: "/asistente", label: "Asistente", icon: MessageSquare },
  { href: "/protocolos", label: "Protocolos", icon: ClipboardList },
  { href: "/logros", label: "Logros", icon: Trophy },
  { href: "/exploracion", label: "Exploración", icon: Route },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="flex items-center gap-1 overflow-x-auto border-b border-hairline p-3 md:w-52 md:shrink-0 md:flex-col md:items-stretch md:border-r md:border-b-0 md:p-4"
    >
      <div className="hidden items-center gap-2 px-2 pt-1 pb-6 md:flex">
        <Orbit size={18} strokeWidth={1.5} className="text-accent" aria-hidden />
        <div className="leading-tight">
          <div className="text-section font-bold tracking-[0.12em]">ORBIT</div>
          <div className="text-status text-muted">Monitor de tripulación</div>
        </div>
      </div>
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-small whitespace-nowrap ${
              active ? "bg-raised text-ink" : "text-muted hover:text-ink"
            }`}
          >
            <Icon size={16} strokeWidth={1.5} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
