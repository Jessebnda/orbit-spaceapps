"use client";

import { useEffect, useState } from "react";
import { Camera, X } from "lucide-react";
import type { CrewPhoto } from "@orbit/shared";
import { EmptyState, SkeletonRows } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { fmtAgo } from "@/lib/domain/format";
import { HUB } from "@/lib/services/hub";
import { useApi } from "@/lib/services/useApi";
import { useHub } from "@/lib/services/useHub";
import { useNow } from "@/lib/services/useNow";

const src = (p: CrewPhoto) => `${HUB}/api/photos/${p.id}.jpg`;

/** Crew album: every helmet-camera photo the station received, newest first. */
export function AlbumScreen() {
  const feed = useApi<CrewPhoto[]>("/api/photos", 10000);
  const now = useNow();
  const { photoAt } = useHub();
  const { reload } = feed;
  useEffect(() => { if (photoAt) reload(); }, [photoAt, reload]); // the hub announces each new photo
  const [open, setOpen] = useState<CrewPhoto | null>(null);
  const all = feed.data ?? [];
  const today = all.filter((p) => new Date(p.ts).toDateString() === new Date(now || Date.now()).toDateString()).length;

  return (
    <div>
      <PageHeader title="Álbum de la tripulación" finding={all.length ? `${all.length} ${all.length === 1 ? "foto" : "fotos"} · ${today} hoy` : undefined} />
      {feed.error && <p role="alert" className="t-small mb-4 text-muted">No se pudo actualizar el álbum: {feed.error}</p>}
      {!feed.data && !feed.error && <SkeletonRows />}
      {feed.data && !all.length && <EmptyState icon={Camera} title="Todavía no hay fotos" hint="Llegan aquí cuando alguien toma una foto con la cámara del casco desde el móvil." />}
      {all.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {all.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setOpen(p)} className="group block w-full overflow-hidden rounded-md bg-surface text-left" aria-label={`Foto de ${p.name}, ${fmtAgo(p.ts, now)}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- served by the hub, not Next */}
                <img src={src(p)} alt="" loading="lazy" className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                <p className="t-small truncate px-3 py-2 text-muted"><span className="text-ink">{p.name}</span> · {fmtAgo(p.ts, now)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <div role="dialog" aria-modal aria-label={`Foto de ${open.name}`} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/90 p-6" onClick={() => setOpen(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src(open)} alt={`Foto de ${open.name}`} className="max-h-[80vh] max-w-full rounded-md object-contain" />
          <p className="t-small text-muted">{open.name} · {fmtAgo(open.ts, now)}</p>
          <button type="button" onClick={() => setOpen(null)} className="absolute top-4 right-4 rounded-full p-2 text-muted hover:text-ink" aria-label="Cerrar foto"><X size={20} /></button>
        </div>
      )}
    </div>
  );
}
