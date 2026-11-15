import { Platform, type TextStyle } from 'react-native';
import * as design from '@orbit/shared';

// Tokens come from shared (design.ts, re-exported by index). Do not redefine them here; local additions below only.
export const { color, space, radius: sharedRadius, motion, STATUS_LABEL } = design;

/** shared radius + `card` (20, Apple Health card). Local until shared adds it. */
export const radius = { ...sharedRadius, card: 20, sheet: 28 } as const;

/** shared type + `display` (40/700): detail values. Local until shared adds it. */
const type = { ...design.type, display: { size: 40, lineHeight: 46, weight: '700', letterSpacing: 0.37 } } as const;

const TABULAR: (keyof typeof type)[] = ['figure', 'hud', 'display', 'status'];

/** Type style. Tabular figures only for number styles: prose keeps proportional digits. */
export function font(k: keyof typeof type, ink: string = design.color.text): TextStyle {
  const s = type[k];
  return {
    fontSize: s.size,
    lineHeight: s.lineHeight,
    fontWeight: s.weight,
    // SF tracking values; Roboto carries its own, and the SF numbers set it visibly tight (body) or loose (large titles).
    letterSpacing: Platform.OS === 'ios' && 'letterSpacing' in s ? s.letterSpacing : undefined,
    color: ink,
    fontVariant: TABULAR.includes(k) ? ['tabular-nums'] : undefined,
  };
}

/** Number in prose-sized text (rows, values) with tabular figures. */
export const figureFont = (k: keyof typeof type = 'body', ink: string = design.color.text): TextStyle => ({ ...font(k, ink), fontVariant: ['tabular-nums'] });

export const STATUS_INK = design.STATUS_COLOR;
/** Hex colour + alpha 0..1 -> #RRGGBBAA. */
export const alpha = (hex: string, a: number) => hex + Math.round(a * 255).toString(16).padStart(2, '0');
