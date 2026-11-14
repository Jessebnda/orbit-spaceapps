import { useId } from 'react';
import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { BADGE_GLYPHS, BADGE_METALS, BADGE_PERIMETER, BADGE_SHAPES, BADGE_STYLE, type AchievementId } from '@orbit/shared';

/** Shared mission-patch geometry, embroidery and metal; title/tier are rendered as accessible text by the caller. */
export function Medal({ id, size = 88, earned = false, progress = 0 }: { id: AchievementId; size?: number; earned?: boolean; progress?: number }) {
  const uid = useId().replace(/:/g, '');
  const style = BADGE_STYLE[id];
  const shape = BADGE_SHAPES[style.category];
  const tier = id === 'cpr_trained' ? BADGE_METALS.oro : BADGE_METALS.bronce;
  const ink = earned ? tier.light : '#98989F';
  const perimeter = BADGE_PERIMETER[style.category];
  const p = Math.max(0, Math.min(1, progress));
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessible={false}>
      <Defs><LinearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
        {tier.stops.map((c, i) => <Stop key={i} offset={[0, .3, .55, .8, 1][i]} stopColor={c} />)}
      </LinearGradient></Defs>
      <Path d={shape} fill={earned ? `url(#${uid})` : '#1C1C1E'} stroke={earned ? 'none' : '#38383A'} strokeWidth={2} strokeDasharray={earned ? undefined : '5 4'} />
      <Path d={shape} transform="translate(9.6 9.6) scale(.84)" fill="#141416" />
      {size > 40 && <Path d={shape} transform="translate(15 15) scale(.75)" fill="none" stroke={ink} strokeOpacity={earned ? .6 : .3} strokeWidth={1.2} strokeDasharray="2.4 2.4" />}
      {!earned && p > 0 && <Path d={shape} fill="none" stroke={tier.light} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${p * perimeter} ${perimeter}`} />}
      <G transform="translate(37.2 37.2) scale(1.9)"><Path d={BADGE_GLYPHS[style.glyph]} fill="none" stroke={ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" opacity={earned ? 1 : .65} /></G>
    </Svg>
  );
}
