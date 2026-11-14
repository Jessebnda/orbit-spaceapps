"use client";

import { WifiOff } from "lucide-react";
import { HUB } from "@/lib/services/hub";
import { useNow } from "@/lib/services/useNow";

/** Sticky 36 px strip under the top edge. Only drawn when the hub is gone; says how stale the data is. */
export function HubBanner({ connected, lastAt }: { connected: boolean; lastAt?: number }) {
  const now = useNow(1000);
  if (connected) return null;
  const s = lastAt && now ? Math.max(0, Math.round((now - lastAt) / 1000)) : undefined;
  return (
    <div role="status" className="sticky top-0 z-20 -mx-8 mb-6 flex h-9 items-center justify-center gap-2 bg-raised px-8 t-small text-muted">
      <WifiOff size={14} strokeWidth={1.5} aria-hidden />
      <span>
        <strong className="font-semibold text-ink">Hub desconectado</strong>
        {s != null && ` · datos de hace ${s < 60 ? `${s} s` : `${Math.floor(s / 60)} min`}`} · reintentando {HUB}
      </span>
    </div>
  );
}
