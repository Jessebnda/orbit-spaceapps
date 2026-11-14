// Orbit design tokens — single source for mobile (RN styles) and dashboard (CSS vars).
// Direction "Cabina": dark instrument panel, colour only carries meaning. See docs/product/DESIGN-BRIEF.md.
import type { Status } from './index'; // type-only: no runtime cycle

/** Status colours (WCAG AA on bg). Always paired with STATUS_LABEL text or a StatusMark. */
export const STATUS_COLOR: Record<Status, string> = { ok: '#3DDC97', watch: '#FFB547', critical: '#FF5A5F' };

export const color = {
  bg: '#0B0D12',          // cabin night; dark-first protects sleep cycles
  surface: '#12161E',     // one step up, no shadows
  raised: '#1A1F2A',      // sheets, pressed rows
  hairline: '#232A36',    // 1px dividers instead of cards
  text: '#E8ECF2',
  muted: '#8A94A6',
  faint: '#5B6578',
  accent: '#7AA7FF',      // the ONE non-status colour: focus, selection, primary action
  onAccent: '#0B0D12',
  emergency: '#FF3B42',   // reserved for active emergencies only (takeover, SOS), never decoration
  status: STATUS_COLOR,
} as const;

export const STATUS_LABEL: Record<Status, string> = { ok: 'Normal', watch: 'Vigilar', critical: 'Crítico' };

/** Same scale as colab (status/caption/body/section/title/hero) + instrument figures. */
export const type = {
  status: { size: 11, lineHeight: 14, weight: '800', letterSpacing: 0.9 },   // StatusMark, uppercase
  caption: { size: 13, lineHeight: 16, weight: '700' },                       // kickers
  small: { size: 13, lineHeight: 18, weight: '400' },
  body: { size: 16, lineHeight: 24, weight: '400' },
  button: { size: 16, lineHeight: 20, weight: '700' },
  section: { size: 18, lineHeight: 24, weight: '700', letterSpacing: -0.3 },
  title: { size: 22, lineHeight: 28, weight: '700', letterSpacing: -0.3 },
  figure: { size: 28, lineHeight: 32, weight: '600' },                        // metric values, tabular-nums
  hero: { size: 34, lineHeight: 40, weight: '800' },
  hud: { size: 56, lineHeight: 60, weight: '600' },                           // landscape ship mode, read at arm's length
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 18, xl: 24, '2xl': 32 } as const;

/** Swiss/flat radii, contained (colab). */
export const radius = { sm: 6, md: 10, lg: 14, xl: 18, full: 999 } as const;

/** Only intentional motions; everything else is instant or a 150 ms fade. Respect Reduce Motion. */
export const motion = {
  fast: 150,
  base: 220,
  slow: 300,
  spring: { damping: 18, stiffness: 260, mass: 0.7 },
  cprBpm: 110,
} as const;
