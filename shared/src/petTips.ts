import type { CheckIn } from './index';

/**
 * Up to two short support cards for the small pet model (2048-token context, so no RAG on the phone).
 * Picked from self-report and real sleep only; simulated vitals never trigger a card.
 * Distilled from NASA BHP (Picano 2024, APEX 2026) and the WHO Psychological First Aid guide (2011); full text lives in hub/kb.
 */
const CARDS = {
  hardNews: 'Recibió una noticia difícil de casa: escucha sin presionar a que cuente, reconoce su pérdida, no des falsas tranquilidades y ofrece conectar con su familia o con el capitán.',
  sleep: 'Durmió poco: en misión el sueño es lo primero que se protege; sugiere cuidar el siguiente descanso (luz, ruido, antifaz) antes que exigirse más.',
  stress: 'Estrés alto: suele venir de la carga de trabajo y de situaciones concretas; pregunta qué pasó hoy y sugiere una pausa breve o repartir tareas.',
  mood: 'Ánimo bajo: escucha sin juzgar y propone algo pequeño y agradable o hablar con alguien de casa o de la tripulación.',
  outlook: 'Ve mal la misión: reconoce lo que ya logró y ayúdale a enfocarse en la siguiente meta concreta.',
} as const;

export function petTips(c: Pick<CheckIn, 'mood' | 'stress' | 'missionOutlook'> | undefined, sleepH?: number, hardNews = false): string {
  const picked = [
    hardNews && CARDS.hardNews,
    sleepH != null && sleepH < 6 && CARDS.sleep,
    c && c.stress >= 4 && CARDS.stress,
    c && c.mood <= 2 && CARDS.mood,
    c && c.missionOutlook <= 2 && CARDS.outlook,
  ].filter(Boolean).slice(0, 2);
  return picked.length ? `Guía de apoyo (úsala con naturalidad, no la cites): ${picked.join(' ')}` : '';
}
