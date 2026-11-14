// Orbit design tokens — single source for mobile (RN styles) and dashboard (CSS vars).
// Direction "Cabina": Apple-native dark UI (system colours, text styles, inset-grouped lists); colour only carries meaning. See docs/product/DESIGN-BRIEF.md.
import type { Status } from './index'; // type-only: no runtime cycle

/** iOS dark system colours (systemGreen/Orange/Red). Always paired with STATUS_LABEL text or a StatusMark. */
export const STATUS_COLOR: Record<Status, string> = { ok: '#30D158', watch: '#FF9F0A', critical: '#FF453A' };

/** Apple dark-mode semantic colours, opaque so they composite the same in RN and CSS. */
export const color = {
  bg: '#000000',          // systemGroupedBackground (dark): true black, OLED-friendly at night
  surface: '#1C1C1E',     // secondarySystemGroupedBackground: inset-grouped cells
  raised: '#2C2C2E',      // tertiarySystemGroupedBackground: pressed cell, sheets
  hairline: '#38383A',    // opaque separator
  text: '#FFFFFF',        // label
  muted: '#98989F',       // secondaryLabel
  faint: '#98989F',       // supporting text, AA on both surface and raised backgrounds
  accent: '#0A84FF',
  accentText: '#64B5FF', // same blue family, AA for links on raised surfaces      // systemBlue: the ONE non-status colour (tint)
  onAccent: '#000000',
  emergency: '#FF3B30',   // systemRed (light variant), reserved for active emergencies and SOS
  status: STATUS_COLOR,
} as const;

export const STATUS_LABEL: Record<Status, string> = { ok: 'Normal', watch: 'Vigilar', critical: 'Crítico' };

/** Apple text styles (Dynamic Type "Large" defaults). Keys kept so callers don't change. */
export const type = {
  status: { size: 12, lineHeight: 16, weight: '600' },                        // caption1 semibold, StatusMark label
  caption: { size: 13, lineHeight: 18, weight: '600' },                       // footnote semibold: grouped-section headers
  small: { size: 13, lineHeight: 18, weight: '400' },                         // footnote
  body: { size: 17, lineHeight: 22, weight: '400', letterSpacing: -0.4 },     // body
  button: { size: 17, lineHeight: 22, weight: '600', letterSpacing: -0.4 },   // headline
  section: { size: 20, lineHeight: 25, weight: '600', letterSpacing: -0.45 }, // title3
  title: { size: 22, lineHeight: 28, weight: '700', letterSpacing: -0.26 },   // title2
  figure: { size: 28, lineHeight: 34, weight: '600', letterSpacing: 0.36 },   // title1, tabular-nums
  hero: { size: 34, lineHeight: 41, weight: '700', letterSpacing: 0.37 },     // largeTitle
  hud: { size: 56, lineHeight: 60, weight: '600' },                           // landscape ship mode, read at arm's length
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 18, xl: 24, '2xl': 32 } as const;

/** iOS radii: 10 = inset-grouped cell, 14/18 = cards and sheets. Use with borderCurve: 'continuous'. */
export const radius = { sm: 6, md: 10, lg: 14, xl: 18, full: 999 } as const;

/** Only intentional motions; everything else is instant or a 150 ms fade. Respect Reduce Motion. */
export const motion = {
  fast: 150,
  base: 220,
  slow: 300,
  spring: { damping: 18, stiffness: 260, mass: 0.7 },
  cprBpm: 110,
} as const;
