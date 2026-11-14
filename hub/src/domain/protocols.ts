import type { EmergencyKind, Protocol } from '@orbit/shared';

export const PROTOCOLS: Protocol[] = [
  { id: 'cpr_microgravity', kind: 'emergency', title: 'RCP en microgravedad', guide: 'cpr', createdBy: 'rules', steps: [
    'Avisa a toda la tripulación y al capitán. Pide el DEA (desfibrilador).',
    'Comprueba respuesta y respiración. Si no responde y no respira con normalidad, inicia RCP.',
    'Método Evetts-Russomano: rodea el torso de la víctima con las piernas y comprime el esternón 5-6 cm a 100-120 por minuto.',
    'Cuando la víctima esté sujeta en el Crew Medical Restraint System, pasa al método de la vertical (handstand).',
    'Ciclo 30:2: 30 compresiones y 2 ventilaciones con bolsa y mascarilla.',
    'Cambia de reanimador cada 2 minutos por fatiga.',
    'Conecta el DEA en cuanto esté disponible y sigue sus instrucciones.',
    'Continúa hasta que el equipo médico tome el control o la víctima reaccione.',
  ] },
  { id: 'hypoxia', kind: 'emergency', title: 'Hipoxia', createdBy: 'rules', steps: [
    'Pon mascarilla de oxígeno a la víctima.',
    'Revisa las alarmas de ppO2 y CO2 de la cabina y avisa al control de la nave.',
    'Traslada a la víctima a un módulo seguro. No entres en un módulo con aire dudoso sin equipo de respiración.',
    'Vigila la SpO2 cada 5 minutos y anota los valores.',
    'Avisa al cirujano de vuelo si no mejora con oxígeno.',
  ] },
  { id: 'fever', kind: 'emergency', title: 'Fiebre', createdBy: 'rules', steps: [
    'Reposo y líquidos.',
    'Mide la temperatura cada 15 minutos.',
    'Usa el antipirético del botiquín solo con la dosis que indique el cirujano de vuelo.',
    'Aíslate si tienes tos, dolor de garganta o síntomas respiratorios.',
    'Avisa al cirujano de vuelo si la temperatura supera 39 °C.',
  ] },
  { id: 'hypertensive_crisis', kind: 'emergency', title: 'Crisis hipertensiva', createdBy: 'rules', steps: [
    'Siéntate o túmbate y evita cualquier esfuerzo.',
    'Repite la medición de presión en 5 minutos.',
    'Si hay dolor de pecho, dificultad para respirar, visión borrosa o confusión, avisa de inmediato al equipo médico.',
    'No tomes medicación sin la pauta del cirujano de vuelo.',
  ] },
  { id: 'panic_attack', kind: 'emergency', title: 'Ataque de pánico', guide: 'breathing', createdBy: 'rules', steps: [
    'Siéntate y apoya la espalda.',
    'Respira 4 s dentro, 4 s retenido, 4 s fuera, 4 s retenido.',
    'Di en voz alta dónde estás y que el ataque pasará.',
    'Pide a un compañero que se quede contigo.',
    'Si dura más de 20 minutos o aparece dolor en el pecho, avisa al equipo médico.',
  ] },
  { id: 'jumping_jacks', kind: 'physical', title: 'Ejercicio: saltos de tijera', durationMin: 5, guide: 'jumping_jacks', createdBy: 'rules', steps: [
    'Sujétate en la zona de ejercicio con las correas.',
    'Haz 5 minutos de saltos de tijera a un ritmo cómodo.',
    'Anota los minutos en el registro de actividad.',
  ] },
  { id: 'hydrate', kind: 'physical', title: 'Hidratación', createdBy: 'rules', steps: [
    'Bebe medio litro de agua ahora.',
    'Repite cada hora hasta llegar a 2 L en el día.',
  ] },
  { id: 'sleep_hygiene', kind: 'physical', title: 'Higiene del sueño', createdBy: 'rules', steps: [
    'Baja la luz del módulo una hora antes de dormir.',
    'Evita la cafeína en las últimas 6 horas.',
    'Usa antifaz y tapones si el ruido te molesta.',
    'Mantén la misma hora de dormir, también en días de trabajo intenso.',
  ] },
  { id: 'eat_meal', kind: 'physical', title: 'Come una comida completa', createdBy: 'rules', steps: [
    'Prepara una comida con proteína, carbohidratos y verduras.',
    'Come despacio y en compañía si es posible.',
    'Revisa el registro de alimentación al terminar.',
  ] },
  { id: 'box_breathing', kind: 'mental', title: 'Respiración cuadrada', durationMin: 4, guide: 'breathing', createdBy: 'rules', steps: [
    'Siéntate cómodo.',
    'Inhala 4 s, retén 4 s, exhala 4 s, retén 4 s.',
    'Repite durante 4 minutos.',
  ] },
  { id: 'connect_crew', kind: 'mental', title: 'Habla con un compañero hoy', createdBy: 'rules', steps: [
    'Elige a un compañero con quien no hayas hablado hoy.',
    'Habla 15 minutos de algo que no sea trabajo.',
    'Si prefieres, cenad juntos o jugad una partida.',
  ] },
  { id: 'grief_support', kind: 'mental', title: 'Apoyo por duelo', createdBy: 'rules', steps: [
    'No tienes que estar bien hoy.',
    'Pide una sesión con tu mascota de apoyo y con el psicólogo de vuelo.',
    'El capitán ha sido informado para facilitar el apoyo y la comunicación con tu familia.',
  ] },
  { id: 'journal', kind: 'mental', title: 'Diario de 5 minutos', durationMin: 5, createdBy: 'rules', steps: [
    'Escribe tres cosas que pasaron hoy.',
    'Escribe una cosa que te gustaría contar a tu familia.',
    'Guárdalo; puedes compartirlo con el psicólogo.',
  ] },
];

export const EMERGENCY_PROTOCOL: Record<EmergencyKind, string> = {
  cardiac_arrest: 'cpr_microgravity',
  hypoxia: 'hypoxia',
  fever: 'fever',
  hypertensive_crisis: 'hypertensive_crisis',
  panic: 'panic_attack',
};
