import { useId } from 'react';
import { BADGE_GLYPHS, BADGE_METALS, BADGE_SHAPES, BADGE_STYLE, type AchievementId } from '@orbit/shared';

export function Medal({ id, earned = false, size = 88 }: { id: AchievementId; earned?: boolean; size?: number }) {
  const uid = useId().replace(/:/g, '');
  const style = BADGE_STYLE[id], shape = BADGE_SHAPES[style.category];
  const metal = id === 'cpr_trained' ? BADGE_METALS.oro : BADGE_METALS.bronce;
  const ink = earned ? metal.light : 'var(--t-muted)';
  return <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
    <defs><linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">{metal.stops.map((c, i) => <stop key={i} offset={[0, .3, .55, .8, 1][i]} stopColor={c} />)}</linearGradient></defs>
    <path d={shape} fill={earned ? `url(#${uid})` : 'var(--t-surface)'} stroke={earned ? 'none' : 'var(--t-hairline)'} strokeWidth="2" strokeDasharray={earned ? undefined : '5 4'} />
    <path d={shape} transform="translate(9.6 9.6) scale(.84)" fill="#141416" />
    {size > 40 && <path d={shape} transform="translate(15 15) scale(.75)" fill="none" stroke={ink} strokeOpacity={earned ? .6 : .3} strokeWidth="1.2" strokeDasharray="2.4 2.4" />}
    <path d={BADGE_GLYPHS[style.glyph]} transform="translate(37.2 37.2) scale(1.9)" fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity={earned ? 1 : .65} />
  </svg>;
}
