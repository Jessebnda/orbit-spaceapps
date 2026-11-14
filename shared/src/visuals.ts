import { THRESHOLDS, type MetricKey } from './index';

/** Display geometry, never a diagnostic or health score. */
export function rangeDial(metric: MetricKey, value?: number) {
  const [lo, normalLo, normalHi, rawHi] = THRESHOLDS[metric];
  const hi = metric === 'spo2' ? 100 : rawHi;
  const unit = (v: number) => Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  return { value: value == null || !Number.isFinite(value) ? null : unit(value), normalLo: unit(normalLo), normalHi: unit(normalHi), lo, hi };
}
export function arcPath(from: number, to: number, radius = 43) {
  const point = (v: number) => {
    const a = (135 + v * 270) * Math.PI / 180;
    return [50 + radius * Math.cos(a), 50 + radius * Math.sin(a)];
  };
  const a = point(from), b = point(to);
  return `M${a[0]} ${a[1]} A${radius} ${radius} 0 ${to - from > 2 / 3 ? 1 : 0} 1 ${b[0]} ${b[1]}`;
}
export const GOALS: Partial<Record<MetricKey, number>> = { activity: 120, kcal: 2400, water: 2.5, sleep: 8 };
export type BadgeCategory = 'fisica' | 'mente' | 'equipo' | 'exploracion' | 'mision';
export const CATEGORY_LABEL: Record<BadgeCategory, string> = { fisica: 'Física', mente: 'Mente', equipo: 'Equipo', exploracion: 'Exploración', mision: 'Misión' };
export const BADGE_SHAPES: Record<BadgeCategory, string> = {
  fisica: 'M60 6L106.8 33V87L60 114L13.2 87V33Z',
  mente: 'M60 6A54 54 0 1 1 59.99 6Z',
  equipo: 'M60 6C82 16 98 18 108 18V60C108 88 88 106 60 116C32 106 12 88 12 60V18C22 18 38 16 60 6Z',
  exploracion: 'M60 6L110 42V108L60 84L10 108V42Z',
  mision: 'M60 10.11H80.67L109.89 39.33V80.67L80.67 109.89H39.33L10.11 80.67V39.33L39.33 10.11Z',
};
export const BADGE_PERIMETER: Record<BadgeCategory, number> = { fisica: 324, mente: 339.3, equipo: 341.9, exploracion: 366.1, mision: 330.6 };
export const BADGE_METALS = {
  bronce: { stops: ['#D9A982', '#A8693F', '#7A4A2B', '#BF8556', '#5E3820'], light: '#E8C09A', label: 'Bronce' },
  plata: { stops: ['#F2F3F5', '#C4C7CC', '#8E9299', '#D5D8DC', '#6B6F76'], light: '#E6E8EB', label: 'Plata' },
  oro: { stops: ['#F0D78C', '#D1AA4A', '#9C7A2B', '#E2C16B', '#75591D'], light: '#F3DC96', label: 'Oro' },
  platino: { stops: ['#F4F7FA', '#CFE0EA', '#93A9B8', '#E3EEF4', '#6C8394'], light: '#EAF3F8', label: 'Platino' },
} as const;
/** Glyph paths use the same 24-unit coordinates on native and web. */
export const BADGE_GLYPHS = {
  check: 'M9 12l2 2 4-4 M20 12a8 8 0 1 1-16 0 8 8 0 1 1 16 0',
  orbit: 'M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0 M3 15c-4-6 15-13 18-6S6 22 3 15',
  exercise: 'M3 8v8 M6 5v14 M6 12h12 M18 5v14 M21 8v8',
  moon: 'M20.5 13a9 9 0 0 1-10-10A9 9 0 1 0 20.5 13Z',
  protocol: 'M9 4H5v17h14V4h-4 M9 3h6v4H9Z M8 13l2 2 5-5',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  rocket: 'M4 16l4-1 4-9 8-3-1 8-9 4-1 4Z M5 19l-2 2 M13 6l5 5 M7 9H3v5 M15 17v4h-5',
  compass: 'M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0 M16 8l-3 5-5 3 3-5Z',
  walk: 'M14 3h.01 M12 7l-2 5 4 3 1 6 M10 12l-3 9 M12 7l4 4h4 M10 7H6l-2 4',
  aid: 'M9 3h6v4H9Z M4 7h16v14H4Z M12 10v8 M8 14h8',
} as const;
export const BADGE_STYLE = {
  first_checkin: { category: 'mente', glyph: 'check', target: 1, unit: 'registro' },
  checkin_streak_7: { category: 'mente', glyph: 'orbit', target: 7, unit: 'días' },
  exercise_2h: { category: 'fisica', glyph: 'exercise', target: 120, unit: 'min' },
  sleep_7h_x3: { category: 'fisica', glyph: 'moon', target: 3, unit: 'noches' },
  protocol_done: { category: 'mision', glyph: 'protocol', target: 1, unit: 'protocolo' },
  pet_session: { category: 'mente', glyph: 'heart', target: 1, unit: 'sesión' },
  defender_1000: { category: 'mision', glyph: 'rocket', target: 1000, unit: 'puntos' },
  first_explore: { category: 'exploracion', glyph: 'compass', target: 1, unit: 'salida' },
  explore_10km: { category: 'exploracion', glyph: 'walk', target: 10, unit: 'km' },
  cpr_trained: { category: 'equipo', glyph: 'aid', target: 1, unit: 'simulacro' },
} as const;
