"use client";
import { useState } from 'react';
import { fmtAgo, fmtPace } from '@/lib/domain/format';
import { EmptyState, SkeletonRows } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Medal } from '@/components/ui/Medal';
import { useNow } from '@/lib/services/useNow';
import { useApi } from '@/lib/services/useApi';
import { type Exploration } from '@/lib/services/hub';

export function ExplorationsScreen() {
  const feed = useApi<Exploration[]>('/api/explorations', 15000);
  const [member, setMember] = useState('all');
  const now = useNow();
  const all = [...(feed.data ?? [])].sort((a, b) => b.ts - a.ts);
  const names = new Map(all.map(e => [e.crewId, e.name]));
  const items = all.filter(e => member === 'all' || member === e.crewId);
  const km = items.reduce((s, e) => s + e.event.km, 0), minutes = items.reduce((s, e) => s + e.event.minutes, 0);
  const best = new Map<string, number>();
  for (const e of all) best.set(e.crewId, Math.max(best.get(e.crewId) ?? 0, e.event.km));
  return <div className="mx-auto max-w-5xl space-y-8">
    <PageHeader title="Exploración" finding="La bitácora de los recorridos de la tripulación." actions={names.size > 0 && <label className="t-small text-muted">Tripulante<select value={member} onChange={e => setMember(e.target.value)} className="field mt-1 block"><option value="all">Toda la tripulación</option>{[...names].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>} />
    {feed.error && <p role="alert" className="t-body text-muted">No se pudo actualizar la bitácora: {feed.error}</p>}
    {!feed.data && !feed.error && <SkeletonRows />}
    {items.length > 0 && <dl className="grid grid-cols-3 gap-4 rounded-xl bg-surface p-6">
      {[{ l: 'Distancia registrada', v: km.toFixed(1), u: 'km' }, { l: 'Tiempo en recorrido', v: Math.round(minutes), u: 'min' }, { l: 'Exploraciones', v: items.length, u: 'salidas' }].map(s => <div key={s.l}><dt className="t-small text-muted">{s.l}</dt><dd className="mt-2 t-lead">{s.v}<span className="ml-1 t-small text-muted">{s.u}</span></dd></div>)}
    </dl>}
    {feed.data && !items.length && <EmptyState title="La próxima salida empieza aquí" hint="Los recorridos registrados en el teléfono aparecerán en esta bitácora." />}
    <div className="grid gap-6 lg:grid-cols-2">
      {items.map((e, i) => <article key={`${e.crewId}-${e.ts}-${i}`} className="rounded-xl bg-surface p-6">
        <header className="flex items-center gap-4"><Medal id="first_explore" size={60} earned /><div className="min-w-0"><h2 className="t-title break-words">{e.event.title}</h2><p className="mt-1 t-small text-muted">{e.name} · {fmtAgo(e.ts, now)}</p><p className="mt-1 t-small text-muted">{e.event.place || 'Lugar sin registrar'}</p></div></header>
        <dl className="mt-6 grid grid-cols-3 gap-4">
          {[{ l: 'Distancia', v: e.event.km.toFixed(1), u: 'km' }, { l: 'Tiempo', v: Math.round(e.event.minutes), u: 'min' }, { l: 'Ritmo', v: fmtPace(e.event.minutes, e.event.km).replace(' /km', ''), u: 'min/km' }].map(s => <div key={s.l}><dt className="t-small text-muted">{s.l}</dt><dd className="mt-1 t-figure">{s.v}</dd><dd className="t-small text-muted">{s.u}</dd></div>)}
        </dl>
        {all.filter(x => x.crewId === e.crewId).length > 1 && e.event.km === best.get(e.crewId) && <p className="mt-5 t-small text-accent">Mayor distancia registrada de {e.name}</p>}
        <p className="mt-5 t-small text-muted">Registro manual · sin trazado GPS</p>
      </article>)}
    </div>
  </div>;
}
