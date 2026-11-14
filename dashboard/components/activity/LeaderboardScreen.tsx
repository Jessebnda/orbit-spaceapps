"use client";
import { useState } from 'react';
import { ACHIEVEMENTS, BADGE_STYLE, CATEGORY_LABEL, type AchievementId, type BadgeCategory } from '@orbit/shared';
import { EmptyState, SkeletonRows } from '@/components/ui/EmptyState';
import { Medal } from '@/components/ui/Medal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { useApi } from '@/lib/services/useApi';
import { type LeaderRow } from '@/lib/services/hub';

export function LeaderboardScreen() {
  const board = useApi<LeaderRow[]>('/api/leaderboard', 15000);
  const [member, setMember] = useState('');
  const [category, setCategory] = useState<BadgeCategory | 'all'>('all');
  const [selected, setSelected] = useState<AchievementId | null>(null);
  const rows = [...(board.data ?? [])].sort((a, b) => b.xp - a.xp || a.member.name.localeCompare(b.member.name));
  const crew = rows.find(r => r.member.id === member) ?? rows[0];
  const earned = crew?.achievements ?? [];
  const items = ACHIEVEMENTS.filter(a => category === 'all' || BADGE_STYLE[a.id].category === category);
  const detail = ACHIEVEMENTS.find(a => a.id === selected);
  return <div className="mx-auto max-w-5xl space-y-8">
    <PageHeader title="Logros" finding="Los hábitos que hacen avanzar la misión." />
    {board.error && <p role="alert" className="t-body text-muted">No se pudo actualizar la vitrina: {board.error}</p>}
    {!board.data && !board.error && <SkeletonRows />}
    <section className="rounded-xl bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="t-heading">Vitrina de misión</h2><p className="mt-2 t-lead">{earned.length} <span className="t-body text-muted">de {ACHIEVEMENTS.length} parches</span></p></div>
        {rows.length > 0 && <label className="t-small text-muted">Tripulante<select className="field mt-1 block min-w-48" value={crew?.member.id ?? ''} onChange={e => { setMember(e.target.value); setSelected(null); }}>{rows.map(r => <option key={r.member.id} value={r.member.id}>{r.member.name}</option>)}</select></label>}
      </div>
      <div className="mt-6 flex flex-wrap gap-2" aria-label="Categoría de logro">
        {(['all', ...Object.keys(CATEGORY_LABEL)] as (BadgeCategory | 'all')[]).map(c => <button key={c} type="button" aria-pressed={category === c} onClick={() => { setCategory(c); setSelected(null); }} className={`min-h-9 rounded-full px-3 t-small ${category === c ? 'bg-ink text-bg' : 'text-muted hover:bg-raised'}`}>{c === 'all' ? 'Todos' : CATEGORY_LABEL[c]}</button>)}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        {items.map(a => <button key={a.id} type="button" onClick={() => setSelected(selected === a.id ? null : a.id)} aria-expanded={selected === a.id} aria-controls="medal-detail" className={`flex flex-col items-center gap-2 rounded-lg p-3 text-center hover:bg-raised ${selected === a.id ? 'bg-raised' : ''}`}>
          <Medal id={a.id} earned={earned.includes(a.id)} />
          <span className="t-heading">{a.title}</span>
          <span className="t-small text-muted">{earned.includes(a.id) ? a.id === 'cpr_trained' ? 'Oro conseguido' : 'Bronce conseguido' : 'Por conseguir'}</span>
        </button>)}
      </div>
      {detail && <div id="medal-detail" className="mt-6 flex flex-wrap items-center gap-6 rounded-lg bg-raised p-5" role="region" aria-label={detail.title}>
        <Medal id={detail.id} size={120} earned={earned.includes(detail.id)} />
        <div className="flex-1"><h3 className="t-title">{detail.title}</h3><p className="mt-2 t-body text-muted">{detail.desc}</p><p className="mt-2 t-small">{CATEGORY_LABEL[BADGE_STYLE[detail.id].category]} · {detail.xp} XP</p><p className="mt-1 t-small text-muted">{earned.includes(detail.id) ? `${crew?.member.name} ya consiguió este parche.` : 'Se desbloquea al completar el objetivo en el teléfono.'}</p></div>
        <button type="button" className="mac-btn" onClick={() => setSelected(null)}>Cerrar</button>
      </div>}
    </section>
    <section><h2 className="mb-4 t-heading">Experiencia de la tripulación</h2><p className="mb-4 t-small text-muted">XP acumulado por logros. Los signos vitales no se utilizan para ordenar esta lista.</p>
      {board.data && !rows.length && <EmptyState title="La misión aún no tiene logros registrados" hint="Los primeros parches aparecerán cuando la tripulación complete sus hábitos." />}
      <ol className="ledger overflow-hidden rounded-lg bg-surface">
        {rows.map((r, i) => <li key={r.member.id} className="flex items-center gap-4 px-4 py-4">
          <span className="w-5 t-small tabular-nums text-muted">{i < 3 ? i + 1 : '·'}</span>
          <Avatar name={r.member.name} size={36} />
          <button type="button" className="min-w-0 flex-1 text-left hover:text-accent" onClick={() => setMember(r.member.id)}><span className="t-heading block">{r.member.name}</span><span className="t-small text-muted">{r.achievements.length} parches de misión</span></button>
          <div className="hidden gap-1 sm:flex">{r.achievements.slice(-3).filter((id): id is AchievementId => ACHIEVEMENTS.some(a => a.id === id)).map(id => <Medal key={id} id={id} earned size={36} />)}</div>
          <span className="t-figure tabular-nums">{r.xp}<span className="ml-1 t-small text-muted">XP</span></span>
        </li>)}
      </ol>
    </section>
  </div>;
}
