"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleCheck, ClipboardList, LayoutDashboard, MessageSquare, Route, Trophy, TriangleAlert, WifiOff, type LucideIcon, Camera } from "lucide-react";
import { useHub } from "@/lib/services/useHub";
import { useNow } from "@/lib/services/useNow";
import { fmtAgo } from "@/lib/domain/format";

const GROUPS: { label: string; links: { href: string; label: string; icon: LucideIcon }[] }[] = [
  {
    label: "Tripulación",
    links: [
      { href: "/", label: "Vista general", icon: LayoutDashboard },
      { href: "/asistente", label: "Asistente", icon: MessageSquare },
      { href: "/protocolos", label: "Protocolos", icon: ClipboardList },
    ],
  },
  {
    label: "Actividad",
    links: [
      { href: "/logros", label: "Logros", icon: Trophy },
      { href: "/exploracion", label: "Exploración", icon: Route },
      { href: "/album", label: "Álbum", icon: Camera },
    ],
  },
];

/** Orbit mark: a 14 px circle crossed by an ellipse tilted -25 degrees. */
function Monogram({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="var(--t-accent)" strokeWidth={1.5} aria-hidden>
      <circle cx="10" cy="10" r="5.5" />
      <ellipse cx="10" cy="10" rx="9" ry="3.6" transform="rotate(-25 10 10)" />
    </svg>
  );
}
export { Monogram };

/** macOS source list. 224 px sidebar, 56 px icon rail between 1024 and 1279, top bar below 1024. */
export function Nav() {
  const path = usePathname();
  const { crew, emergencies, connected, lastAt, loaded } = useHub();
  const now = useNow(5000);
  const open = emergencies.filter((e) => !e.resolved).length;
  const out = crew.filter((c) => c.status !== "ok").length;
  const online = crew.filter((c) => c.online).length;
  const badge = open > 0 ? { n: open, label: `${open} ${open === 1 ? "emergencia abierta" : "emergencias abiertas"}`, emergency: true } : out > 0 ? { n: out, label: `${out} ${out === 1 ? "miembro fuera de rango" : "miembros fuera de rango"}`, emergency: false } : null;

  return (
    <nav
      aria-label="Principal"
      className="mac-sidebar mobile-nav flex items-center gap-1 overflow-x-auto border-b border-hairline p-3 md:sticky md:top-0 md:h-screen md:w-14 md:shrink-0 md:flex-col md:items-stretch md:overflow-visible md:border-r md:border-b-0 md:px-2 md:py-4 xl:w-56 xl:px-3"
    >
      <div className="hidden md:block">
        <div className="flex h-8 items-center gap-2 px-2 max-xl:justify-center max-xl:px-0">
          <Monogram />
          <span className="t-heading max-xl:hidden">Orbit</span>
        </div>
        <div className="mt-3 hidden rounded-md bg-raised px-3 py-2 xl:block">
          <p className="t-small font-medium">Misión · Tripulación</p>
          <p className="t-micro text-ink3">
            {loaded ? `${crew.length} tripulantes · ${online} en línea` : "Conectando…"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 md:mt-4 md:flex-col md:items-stretch md:gap-0">
        {GROUPS.map((group, gi) => (
          <div key={group.label} className="flex items-center gap-1 md:flex-col md:items-stretch md:gap-0.5">
            <p className={`hidden px-2 pb-1 t-micro text-ink3 xl:block ${gi ? "pt-4" : ""}`}>{group.label}</p>
            {gi > 0 && <div className="mx-2 my-2 hidden h-px bg-hairline max-xl:md:block" aria-hidden />}
            {group.links.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? path === "/" || path.startsWith("/crew") : path.startsWith(href);
              const showBadge = href === "/" && badge;
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-8 items-center gap-2 rounded-sm px-2 text-[13px] font-medium whitespace-nowrap max-xl:md:justify-center ${active ? "bg-white/10 text-ink" : "text-ink hover:bg-white/5"}`}
                >
                  <Icon size={16} strokeWidth={1.5} aria-hidden className={active ? "text-ink" : "text-muted"} />
                  <span className="max-xl:md:sr-only">{href === "/" ? <><span className="md:hidden">General</span><span className="hidden md:inline">{label}</span></> : label}</span>
                  {showBadge && (
                    <span
                      aria-label={badge.label}
                      className={`ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center gap-0.5 rounded-full px-1.5 text-[11px] font-semibold tabular-nums max-xl:md:absolute max-xl:md:top-0 max-xl:md:right-0 max-xl:md:h-4 max-xl:md:min-w-4 max-xl:md:px-1 ${badge.emergency ? "bg-emergency text-white" : "bg-white/15 text-ink"}`}
                    >
                      {badge.emergency && <TriangleAlert size={10} strokeWidth={2.5} aria-hidden />}
                      {badge.n}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-auto hidden px-2 md:block max-xl:md:text-center" title={connected ? "Hub conectado" : "Sin hub"}>
        <p className="flex items-center gap-1.5 t-small max-xl:md:justify-center">
          {connected ? <CircleCheck size={14} strokeWidth={2} fill="currentColor" stroke="#1c1c1e" className="text-ink" aria-hidden /> : <WifiOff size={14} strokeWidth={1.5} className="text-[#FF9F0A]" aria-hidden />}
          <span className="max-xl:md:sr-only">{connected ? "Hub conectado" : "Sin hub"}</span>
        </p>
        <p className="t-micro mt-0.5 text-ink3 xl:block max-xl:hidden">{lastAt && now ? `último dato ${fmtAgo(lastAt, now)}` : "sin datos aún"}</p>
      </div>
    </nav>
  );
}
