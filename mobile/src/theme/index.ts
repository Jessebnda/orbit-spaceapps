import type { TextStyle } from 'react-native';
import * as design from '@orbit/shared';

// Tokens come from shared (design.ts, re-exported by index). Do not redefine them here.
export const { color, space, radius, motion, STATUS_LABEL } = design;

/** Type style with tabular figures, so columns of numbers align. */
export function font(k: keyof typeof design.type, ink: string = design.color.text): TextStyle {
  const s = design.type[k];
  return {
    fontSize: s.size,
    lineHeight: s.lineHeight,
    fontWeight: s.weight,
    letterSpacing: 'letterSpacing' in s ? s.letterSpacing : undefined,
    color: ink,
    fontVariant: ['tabular-nums'],
  };
}
