# Orbit — Logros, insignias y métricas "más padres"

Extiende `mobile.md` (§2.5 color, §2.6 gráficas, §11.2 medallas, §11.3 exploraciones) y `dashboard.md` (§3 sistema, §5.8 leaderboard, §5.9 exploración, §5.12 logros del crew). Donde algo cambia, se dice en **[Cambio]**. No se tocó código de la app.

## 0. Autoridad, evidencia y dos decisiones

**Taste (leído: `mobile/.claude/skills/design-taste-frontend/SKILL.md`, reglas de casa y `app-screens.md` citado):** sin emoji como icono, sin morado/índigo, sin glow, sin degradados decorativos ni sombras en reposo, sin iconos en cuadritos de color, sin MAYÚSCULAS tracked, color solo donde significa algo, una cifra grande por pantalla (≤ 40 pt en teléfono vertical).

**Decisión 1 — metal solo en las insignias [Cambio a mobile.md §11.2 "sin degradado"].** El usuario pide aspecto metálico; las medallas de Apple y los parches de misión son *objetos*, no UI. Regla: el degradado existe **únicamente dentro del SVG de una insignia** (5 paradas, desaturadas). Ningún botón, tarjeta, fondo, anillo de vital ni gráfica lo usa. Sigue sin haber glow ni sombra exterior.

**Decisión 2 — el color de tier (bronce/plata/oro/platino) es material, no estado.** Nunca aparece fuera de una insignia. Los colores de estado (`ok/watch/critical`) y `accent` siguen siendo los únicos de la UI. El oro (`#D1AA4A`) es mate y verdoso frente al ámbar `watch` (`#FF9F0A`) y el bronce es marrón rojizo frente a `critical`; aun así **ninguna insignia aparece junto a un vital en la misma fila**.

### Evidencia (qué vi y qué sé)

| Fuente | Estado | Qué tomé |
|---|---|---|
| Strava Trophy Case, support.strava.com/hc/en-us/articles/216918557-The-Strava-Trophy-Case (resultado de búsqueda, sin abrir la página) | **Visto (extracto)** | Todos los retos completados en una página, orden por fecha, **4 más recientes en el perfil**; un reto abierto no aparece hasta cumplir el hito final. |
| Strava Local Legend: dcrainmaker.com/2020/06/strava-legends-feature.html, road.cc/content/news/strava-launches-local-legends-heres-how-become-one-275471, cyclingnews.com/news/how-local-legends-are-made-on-strava (extractos de búsqueda) | **Visto (extracto)** | Local Legend = quien más veces completa un segmento en **90 días móviles**, laurel, no velocidad; se pierde si dejas de ir. |
| Strava PRs, support.strava.com/hc/en-us/articles/216918487 | **Visto (abierto)**, solo habla de PRs manuales de por vida | PR como dato de perfil. |
| Apple Fitness Premios — discussions.apple.com/thread/252452243 y macworld.com/article/3265107 (extractos) | **Visto (extracto, no oficial)** | Premios al final de Resumen en Fitness; reto distinto cada mes; puede tardar hasta 9 días. **Arte 3D, silueta bloqueada, inclinación: conocimiento propio** (ya citado en mobile.md). |
| Garmin Connect, garmin.com/en-US/blog/general/garmin-connect-challenges/ y blog Garmin "25 badges" (extractos) | **Visto (extracto)** | Badges con puntos → niveles 1-10; insignias de un solo uso, repetibles, limitadas y **multinivel**; retos mensuales con opt-in. No hay datos de rareza oficiales. |
| WHOOP, whoop.com/thelocker/how-does-whoop-recovery-work-101 (extracto) | **Visto (extracto)** | Recovery 0-100 con bandas 0-33 / 34-66 / 67-100. La escala de Strain 0-21 **no** la confirmó la búsqueda: es conocimiento propio. |
| Strava feed/Year in Sport (manualcreative.com/work/strava-year-in-sport-2021, techradar) | **Visto (extracto)** | Year in Sport = resumen anual dentro de la app tipo "Wrapped". Diseño de tarjeta del feed: conocimiento propio. |
| Oura Readiness, Nike Run Club, Duolingo (racha + liga), Steam/Xbox (% global), parches NASA | **Conocimiento propio, no consultado** | Ver §1.5 y §2. |
| Fallos: support.apple.com/108779 (era de Health, irrelevante), strava Segments 216918497 (404), Garmin FAQ (403). | — | No se citan. |

---

## 1. Sistema de logros rediseñado

### 1.1 Principios (salud mental primero)
1. **Progreso acumulativo, no castigo.** Los logros de vitales cuentan *días acumulados*, nunca rachas que se rompen al enfermar. Una racha rota nunca quita medallas ya ganadas.
2. **Nada gamifica un vital peligroso.** No hay logros de temperatura, presión ni SpO2 (premiar "estar bien" empuja a ocultar síntomas o ajustar la banda). Solo variables entrenables y de conducta: FC en reposo, sueño, agua, comida, actividad, check-in.
3. **Cooperar > competir.** Hay metas semanales de toda la tripulación y el ranking mide **esfuerzo ponderado y con tope**, no salud ni rendimiento bruto (§1.6).
4. **Constancia con gracia.** Racha con 1 *día de gracia* por semana (como el "streak freeze" de Duolingo, conocimiento propio): no se pierde y se muestra como guion, no como fallo.
5. **Rareza honesta.** Con tripulación de 4 "12 % lo tiene" es absurdo: se muestra **"2 de 4 lo tienen"**; el porcentaje solo si `crew ≥ 8`.

### 1.2 Categorías (la forma del parche = la categoría)
| Categoría | Forma (§2.2) | Qué premia | Glifo de categoría |
|---|---|---|---|
| Física | hexágono | contramedidas, sueño, hidratación, FC en reposo | `Dumbbell` |
| Mente | círculo | check-in, calma, mascota | `Brain` |
| Equipo | escudo | ánimo, conversación, metas comunes | `Users` |
| Exploración | chevrón | km, lugares, travesías | `Compass` |
| Misión | octógono | protocolos, días de misión, juego | `Rocket` |

### 1.3 Tiers (parches de misión)
`bronce → plata → oro → platino`. **Un logro = una escalera**, no 4 insignias sueltas (como los multinivel de Garmin): la misma insignia cambia de metal al subir y el aro de progreso apunta al siguiente tier. Logros de un solo nivel llevan el tier fijo en su único `level`. **Nivel de perfil** = `floor(xpTotal / 500)` (se mantiene de mobile.md §11.1). XP por tier: bronce 1×, plata 2×, oro 4×, platino 8× el XP base redondeado a 5.

### 1.4 Tipos de datos propuestos (`shared/src/index.ts`, sin dependencias)
```ts
export type AchCategory = 'fisica' | 'mente' | 'equipo' | 'exploracion' | 'mision';
export type Tier = 'bronce' | 'plata' | 'oro' | 'platino';

/** De dónde sale el progreso. El teléfono lo calcula y manda `stat achievement`; el hub suma XP. */
export type AchSource =
  | { kind: 'stat'; stat: 'petMin' | 'gameBest' | 'exploreKm' | 'exploreCount' | 'explorePlaces' | 'exploreMaxKm' | 'checkins' | 'missionDays' }
  | { kind: 'days'; metric: MetricKey; rule: 'inRange' | 'gte'; value?: number }                 // días acumulados que cumplen
  | { kind: 'streak'; metric: MetricKey | 'checkin'; rule: 'gte'; value?: number; graceDays: 0 | 1 } // días consecutivos
  | { kind: 'event'; event: 'protocol_done' | 'breathing_done' | 'cpr_done' | 'kudos_sent' | 'crew_goal_met' }
  | { kind: 'weeks'; rule: 'talkedToAll' | 'fullWeek' };                                           // semanas que cumplen

export interface AchLevel { tier: Tier; target: number; xp: number }

export interface Achievement {
  id: string;                 // estable; los 10 ids actuales se conservan
  title: string;
  desc: string;               // pasado simple, sin imperativo de culpa; {n} se sustituye por el target del siguiente nivel
  category: AchCategory;
  glyph: string;              // nombre de lucide (web: lucide-react; móvil: lucide-react-native, ver §2.6)
  symbol: string;             // SF Symbol equivalente SOLO para toasts/listas nativas, nunca dentro del SVG
  unit: 'días' | 'noches' | 'min' | 'km' | 'veces' | 'lugares' | 'puntos' | 'semanas';
  levels: AchLevel[];         // ascendente; length 1 = logro único
  source: AchSource;
  secret?: boolean;           // oculto hasta el primer progreso (silueta con "?" no: se muestra "Logro oculto")
  needsHub?: boolean;         // requiere endpoint nuevo (kudos, metas de tripulación)
}

/** Reto mensual (parche circular con el mes en el aro). Lo define el capitán o la rotación por defecto. */
export interface MonthlyChallenge {
  id: string;                 // `m-2026-11`
  month: string;              // '2026-11'
  title: string; desc: string;
  glyph: string; source: AchSource; target: number; unit: Achievement['unit'];
  xp: number;
}

/** Meta de toda la tripulación, semanal. Cooperativa: todos reciben el parche y el XP si se cumple. */
export interface CrewGoal {
  id: string;                 // `cg-2026-W46-activity`
  week: string;               // ISO '2026-W46'
  title: string;
  sum: { metric: MetricKey | 'activityMin'; target: number; unit: string } | { allMembers: { metric: MetricKey; rule: 'gte'; value: number; days: number } };
  xpEach: number;
}

/** Evento (ClientMsg stat): se añade `tier` opcional; ausente = 'bronce' (compatible con el hub actual). */
// { type: 'achievement'; id: string; tier?: Tier }
// XP del miembro = suma de level.xp hasta el tier alcanzado (el hub usa la misma tabla importada de shared).
// LeaderRow.achievements: string[] se mantiene; se añade tiers?: Record<string, Tier>.

/** Pura, en shared: la usan teléfono (para el aro) y dashboard (para medallas del crew). */
// export function progressOf(a: Achievement, ctx: AchContext): { value: number; levelIndex: number; next?: AchLevel; pct: number }
```
`AchContext` (solo datos que ya existen): `daySummaries: Record<dayKey,{activityMin,sleepH,waterL,kcal,restHr?,checkin:boolean,steps?>}>` (ya previsto en mobile.md §11.1.2), `stats` (`petMin`…), `explorations[]`, `protocolsDone`, `comms.byPeer`, `firstSeen`.
`shortcut:` **FC en reposo = percentil 10 de las muestras `hr` del día con `activity` ≈ 0** (no hay sensor de "reposo"); sustituir si el firmware lo manda. Sin datos de banda ese día = el día no cuenta *ni* resta.

### 1.5 Racha (Duolingo, conocimiento propio) y retos mensuales
- **Racha de check-in**: fila de 7 círculos de 28 pt bajo "Racha 5 días" (`figure` 22/600 + unidad 15 muted). Día cumplido = relleno `accent` + `checkmark` 12 blanco; hoy = aro `accent` 2 pt vacío; pasado sin cumplir = `raised`; **día de gracia usado = guion `muted` en `raised`** (no `critical`). Letras L M X J V S D 11/500 `faint` debajo. Hito 7/14/30 → toast + sube el tier de "Órbita estable".
- **Reto del mes** (Apple Monthly Challenge y Garmin monthly, vistos en extractos): parche circular **120 pt** (Medalla grande en cabecera de Logros). Aro de progreso = **N marcas** (30/31, una por día) alrededor del borde: cumplidas en metal oro, pendientes `#3A3A3C`; el nombre del mes sale en el aro con `<TextPath>` (SF, 11/700, tracking 0.12 em — sí, tracked, **es lettering bordado**, no etiqueta de UI: única excepción documentada; si el revisor la veta, ponerlo en horizontal bajo el glifo). Ganado = pasa a la vitrina permanente (patch del mes) como las 4 últimas del Trophy Case de Strava: en Perfil se ven las **4 más recientes**, "Ver todo" abre la vitrina.
- Rotación por defecto (pueden sustituirse desde el dashboard):
  - Nov: "Órbita 30" — 20 días con ≥ 30 min de actividad.
  - Dic: "Sueño de cristal" — 18 noches ≥ 7 h.
  - Ene: "Cartógrafo" — 25 km explorados.
  - Feb: "Círculo cerrado" — hablar con toda la tripulación 4 semanas.

### 1.6 Leaderboard y metas comunes (anti-tóxico)
- **Se ordena por Esfuerzo semanal (EP)**, que se reinicia el lunes: `EP = min(actividad,120)·1 + 20 por check-in + 30 por protocolo + 15 por sesión mental + 2 por km (tope 10 km/día)`; **tope 200 EP/día**. Participar en lo mental vale como entrenar; nadie puede ganar sobreesforzándose.
- **Nunca** se ordena ni muestra por valor de vital (FC, sueño, peso, kcal). Ningún "último lugar", "bajo rendimiento" ni flecha roja: el rango se pinta solo para los **3 primeros** (numeral `ink`, sin oro/plata/bronce como en dashboard.md); el resto va sin numeral en orden alfabético estable dentro de su tramo. Tu fila siempre fijada abajo (teléfono) con tu EP y **tu delta contra tu semana anterior**, no contra otros.
- Ajuste "Ocultar mi posición" (Yo › Ajustes): sales del orden público y solo cuentas para la meta común.
- **Meta de la tripulación** (arriba del leaderboard, en ambas plataformas): barra de 8 pt dividida en **segmentos por aportante** (un tono de `accent` por persona: 100/72/48/32 %, sin rótulo de ranking) con "148 / 200 min de contramedidas · faltan 52" y días restantes. Cumplida: parche de equipo (escudo oro) para todos + `xpEach`. Ejemplos semanales: "La tripulación suma 20 h de contramedidas", "Todos con ≥ 6 h de sueño 4 noches", "Cada tripulante habla con cada uno".
- **Kudos** ("Ánimo", `hand.thumbsup`/`ThumbsUp`): máximo 5 al día, sin comentarios libres en v1; el contador de recibidos se muestra, el de enviados da el logro "Buen ánimo". Requiere mensaje `{t:'kudos', from, to, refId}` en el hub (**Fase 2**, marcar `needsHub`).

### 1.7 Lista completa (21 logros, 5 categorías)
Notación `levels`: tier:target→xp. Fuente = dato que ya existe salvo `needsHub`.
```ts
const L = (u: Achievement['unit'], l: [Tier, number, number][]) => ({ unit: u, levels: l.map(([tier, target, xp]) => ({ tier, target, xp })) });
export const ACHIEVEMENTS: readonly Achievement[] = [
 // ── Física (hexágono)
 { id:'exercise_2h',   title:'Contramedida',     desc:'Días con 2 h de ejercicio',                 category:'fisica', glyph:'Dumbbell',   symbol:'figure.strengthtraining.traditional', ...L('días',[['bronce',1,150],['plata',5,300],['oro',14,600],['platino',30,1200]]), source:{kind:'days',metric:'activity',rule:'gte',value:120} },
 { id:'heart_iron',    title:'Corazón de hierro',desc:'Días con FC en reposo en rango (50-100 lpm)',category:'fisica', glyph:'HeartPulse', symbol:'heart.fill',     ...L('días',[['bronce',7,100],['plata',14,200],['oro',30,400],['platino',60,800]]), source:{kind:'days',metric:'hr',rule:'inRange'} },
 { id:'sleep_7h_x3',   title:'Circadiano',       desc:'Noches seguidas de 7 h o más',              category:'fisica', glyph:'Moon',       symbol:'moon.zzz.fill',  ...L('noches',[['bronce',3,150],['plata',5,300],['oro',7,600],['platino',14,1200]]), source:{kind:'streak',metric:'sleep',rule:'gte',value:7,graceDays:1} },
 { id:'hydrated',      title:'Bien hidratado',   desc:'Días con agua en rango',                    category:'fisica', glyph:'Droplet',    symbol:'drop.fill',      ...L('días',[['bronce',3,50],['plata',7,100],['oro',14,200],['platino',30,400]]), source:{kind:'days',metric:'water',rule:'inRange'} },
 { id:'fuel',          title:'Combustible',      desc:'Días comiendo lo suficiente (≥ 2000 kcal)', category:'fisica', glyph:'Utensils',   symbol:'fork.knife',     ...L('días',[['bronce',3,50],['plata',7,100],['oro',14,200],['platino',30,400]]), source:{kind:'days',metric:'kcal',rule:'gte',value:2000} },
 // ── Mente (círculo)
 { id:'first_checkin', title:'Primer registro',  desc:'Tu primer check-in diario',                 category:'mente',  glyph:'ClipboardCheck', symbol:'checkmark.circle.fill', ...L('veces',[['bronce',1,50]]), source:{kind:'stat',stat:'checkins'} },
 { id:'checkin_streak_7',title:'Órbita estable', desc:'Días seguidos con check-in (1 de gracia por semana)', category:'mente', glyph:'CalendarCheck', symbol:'calendar', ...L('días',[['bronce',7,200],['plata',14,400],['oro',30,800]]), source:{kind:'streak',metric:'checkin',rule:'gte',graceDays:1} },
 { id:'pet_session',   title:'De corazón',       desc:'Minutos con tu mascota',                    category:'mente',  glyph:'HeartHandshake', symbol:'pawprint.fill', ...L('min',[['bronce',30,100],['plata',120,200],['oro',300,400],['platino',600,800]]), source:{kind:'stat',stat:'petMin'} },
 { id:'breath_calm',   title:'Respira hondo',    desc:'Guías de respiración terminadas',           category:'mente',  glyph:'Wind',       symbol:'wind',           ...L('veces',[['bronce',1,50],['plata',10,100],['oro',30,200]]), source:{kind:'event',event:'breathing_done'} },
 // ── Equipo (escudo)
 { id:'kudos_given',   title:'Buen ánimo',       desc:'Ánimos enviados a la tripulación',          category:'equipo', glyph:'ThumbsUp',   symbol:'hand.thumbsup.fill', ...L('veces',[['bronce',1,50],['plata',10,100],['oro',30,200]]), source:{kind:'event',event:'kudos_sent'}, needsHub:true },
 { id:'crew_goal',     title:'Meta común',       desc:'Metas de la tripulación cumplidas juntos',  category:'equipo', glyph:'Users',      symbol:'person.3.fill',  ...L('veces',[['bronce',1,100],['plata',4,200],['oro',12,400]]), source:{kind:'event',event:'crew_goal_met'}, needsHub:true },
 { id:'talk_circle',   title:'Círculo cerrado',  desc:'Semanas hablando con cada tripulante',      category:'equipo', glyph:'MessagesSquare', symbol:'bubble.left.and.bubble.right.fill', ...L('semanas',[['bronce',1,100],['plata',4,200],['oro',12,400]]), source:{kind:'weeks',rule:'talkedToAll'} },
 { id:'cpr_trained',   title:'Salvavidas',       desc:'Simulacro de RCP completado',               category:'equipo', glyph:'HeartPulse', symbol:'cross.case.fill',...L('veces',[['oro',1,200]]), source:{kind:'event',event:'cpr_done'} },
 // ── Exploración (chevrón)
 { id:'first_explore', title:'Explorador',       desc:'Tu primera exploración',                    category:'exploracion', glyph:'Compass', symbol:'location.fill', ...L('veces',[['bronce',1,100]]), source:{kind:'stat',stat:'exploreCount'} },
 { id:'explore_10km',  title:'Larga caminata',   desc:'Kilómetros explorados en total',            category:'exploracion', glyph:'Footprints', symbol:'figure.walk', ...L('km',[['bronce',10,250],['plata',25,500],['oro',50,1000],['platino',100,2000]]), source:{kind:'stat',stat:'exploreKm'} },
 { id:'cartographer',  title:'Cartógrafo',       desc:'Lugares distintos explorados',              category:'exploracion', glyph:'Map',    symbol:'map.fill',      ...L('lugares',[['bronce',3,100],['plata',6,200],['oro',12,400]]), source:{kind:'stat',stat:'explorePlaces'} },
 { id:'traverse',      title:'Travesía',         desc:'Una sola exploración de 5 km o más',        category:'exploracion', glyph:'Mountain', symbol:'mountain.2.fill', ...L('km',[['plata',5,200],['oro',10,500]]), source:{kind:'stat',stat:'exploreMaxKm'} },
 // ── Misión (octógono)
 { id:'protocol_done', title:'Al pie de la letra',desc:'Protocolos de la nave terminados',         category:'mision', glyph:'ListChecks', symbol:'list.bullet.clipboard.fill', ...L('veces',[['bronce',1,75],['plata',5,150],['oro',15,300]]), source:{kind:'event',event:'protocol_done'} },
 { id:'mission_days',  title:'Días en órbita',   desc:'Días de misión a bordo',                    category:'mision', glyph:'CalendarDays', symbol:'calendar.badge.clock', ...L('días',[['bronce',7,100],['plata',30,300],['oro',90,700],['platino',180,1500]]), source:{kind:'stat',stat:'missionDays'} },
 { id:'full_week',     title:'Semana redonda',   desc:'Semanas con check-in, ejercicio y sueño al día', category:'mision', glyph:'CalendarRange', symbol:'calendar', ...L('semanas',[['bronce',1,150],['plata',4,400],['oro',12,1000]]), source:{kind:'weeks',rule:'fullWeek'} },
 { id:'defender_1000', title:'Defensor',         desc:'Puntos en Orbit Defender',                  category:'mision', glyph:'Rocket',     symbol:'gamecontroller.fill', ...L('puntos',[['bronce',1000,50],['plata',3000,100],['oro',10000,200]]), source:{kind:'stat',stat:'gameBest'} },
];
```
Suma bronce de los 10 ids originales idéntica a la actual (XP conservado). `full_week` regla: ≥ 6 check-ins, ≥ 5 días de actividad `ok`, ≥ 5 noches ≥ 6 h. Texto de `desc` mostrado como "Siguiente: {n} {unit}" bajo el aro.

---

## 2. Arte de insignias (SVG, idéntico en `react-native-svg` y web)

### 2.1 Un solo módulo de datos en `shared/src/badge.ts` (puro)
Exporta `SHAPES`, `TIER`, `FIELD` y `PERIMETER` (abajo). Ambas plataformas dibujan con un componente `Medal` que solo cambia de backend (`react-native-svg` ↔ `<svg>`). La rejilla de mobile (88 pt) y la del dashboard (56 px) son el **mismo** viewBox.

### 2.2 Formas (viewBox `0 0 120 120`, radio ≈ 54, centro 60,60; todas arrancan arriba y giran en sentido horario)
| Cat. | `d` | Perímetro (para aro de progreso) |
|---|---|---|
| Física · hexágono | `M60 6L106.8 33V87L60 114L13.2 87V33Z` | 324 |
| Mente · círculo | `M60 6A54 54 0 1 1 59.99 6Z` | 339.3 |
| Equipo · escudo | `M60 6C82 16 98 18 108 18V60C108 88 88 106 60 116C32 106 12 88 12 60V18C22 18 38 16 60 6Z` | 341.9 |
| Exploración · chevrón | `M60 6L110 42V108L60 84L10 108V42Z` | 366.1 |
| Misión · octógono | `M60 10.11L80.67 10.11L109.89 39.33V80.67L80.67 109.89H39.33L10.11 80.67V39.33L39.33 10.11Z` | 330.6 |
Perímetros calculados con muestreo de Bézier (escudo) y geometría exacta (resto). Web: `pathLength="100"` basta; **RN-SVG no soporta `pathLength` de forma fiable → usar `strokeDasharray={[p*P/100, P]}` con estas constantes**.

### 2.3 Colores de tier (degradado lineal 135°, `x1=0 y1=0 x2=1 y2=1`, `gradientUnits="objectBoundingBox"`)
| Tier | 0 % | 30 % | 55 % | 80 % | 100 % | `light` (glifo y puntadas) |
|---|---|---|---|---|---|---|
| bronce | `#D9A982` | `#A8693F` | `#7A4A2B` | `#BF8556` | `#5E3820` | `#E8C09A` |
| plata | `#F2F3F5` | `#C4C7CC` | `#8E9299` | `#D5D8DC` | `#6B6F76` | `#E6E8EB` |
| oro | `#F0D78C` | `#D1AA4A` | `#9C7A2B` | `#E2C16B` | `#75591D` | `#F3DC96` |
| platino | `#F4F7FA` | `#CFE0EA` | `#93A9B8` | `#E3EEF4` | `#6C8394` | `#EAF3F8` |
Campo bordado `FIELD = #141416`. Bloqueado: contorno `#3A3A3C`, glifo `#6E6E73` al 55 %, pista de progreso `#2C2C2E`. Contraste del glifo `light` sobre `#141416` ≥ 9:1 en los 4 tiers.

### 2.4 Estructura (ganada) — orden de capas exacto
```svg
<svg viewBox="0 0 120 120" width="88" height="88" role="img" aria-label="Contramedida, oro, ganada el 14 nov">
  <defs>
    <linearGradient id="t-{uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0"    stop-color="#F0D78C"/><stop offset=".30" stop-color="#D1AA4A"/>
      <stop offset=".55"  stop-color="#9C7A2B"/><stop offset=".80" stop-color="#E2C16B"/>
      <stop offset="1"    stop-color="#75591D"/>
    </linearGradient>
    <clipPath id="c-{uid}"><path d="{SHAPE}"/></clipPath>
    <pattern id="w-{uid}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="4" height="1" fill="#fff" fill-opacity=".05"/>      <!-- sarga del bordado -->
    </pattern>
  </defs>
  <path d="{SHAPE}" fill="url(#t-{uid})"/>                                               <!-- 1 borde merrow (8.6 u de ancho) -->
  <path d="{SHAPE}" transform="translate(9.6 9.6) scale(.84)" fill="#141416"/>          <!-- 2 campo -->
  <path d="{SHAPE}" transform="translate(9.6 9.6) scale(.84)" fill="url(#w-{uid})"/>    <!-- 3 sarga -->
  <path d="{SHAPE}" transform="translate(9.6 9.6) scale(.84)" fill="none" stroke="#000" stroke-opacity=".4" stroke-width="1"/> <!-- 4 relieve -->
  <path d="{SHAPE}" transform="translate(15 15) scale(.75)" fill="none" stroke="{light}" stroke-opacity=".6"
        stroke-width="1.2" stroke-dasharray="2.4 2.4" stroke-linecap="round"/>           <!-- 5 puntadas -->
  <g clip-path="url(#c-{uid})"><rect id="sheen" x="-30" y="-20" width="26" height="170" fill="#fff" fill-opacity=".10"
        transform="translate(40 0) rotate(20 60 60)"/></g>                                <!-- 6 brillo estático (sweep: ver 2.7) -->
  <g transform="translate(37.2 37.2) scale(1.9)" stroke="{light}" fill="none" stroke-width="1.6"
     stroke-linecap="round" stroke-linejoin="round">{lucide paths 24×24}</g>             <!-- 7 glifo 45.6 u -->
</svg>
```
`{uid}` = `${id}-${tier}` (evita colisión de ids). Escalas: `scale(s)` con `translate(60(1−s))` (0.84→9.6, 0.75→15). El borde (capa 1) se ve de 54·0.16 ≈ 8.6 u: a 88 pt ≈ 6.3 pt, a 56 px ≈ 4 px; a ≤ 32 px **omitir capas 3, 5 y 6** (ruido).
Glifo: `lucide-react` ya está en dashboard; en móvil **instalar `lucide-react-native` con `npx expo install lucide-react-native`** (usa el `react-native-svg` 15.12.1 ya presente) y renderizar el icono con `size=45.6 color={light} strokeWidth={1.6}` en `<G transform="translate(37.2 37.2)">`. Los SF Symbols **no pueden ir dentro de un SVG**; se usan solo en toasts/lista nativa (`symbol`).

### 2.5 Tamaños y rejilla
| Dónde | Tamaño | Notas |
|---|---|---|
| Rejilla móvil (3 col, 16 margen, 12 gap → celda 106) | 88 pt | título 13/600 1 línea, bajo: tier + estado 11 `faint` |
| Hoja de detalle móvil | 200 pt | inclinación §2.7, "Oro · 14 de 30 días" |
| Dashboard rejilla (5 col × 2) | 56 px | como dashboard.md §5.8; capas 3, 5, 6 omitidas bajo 40 px |
| Crew card / toast | 24-40 | solo capas 1, 2, 7 |
| Cabecera del reto mensual | 120 pt | círculo + marcas de días |

### 2.6 Estados
- **Ganada**: arriba. Texto bajo la medalla: `Oro` (13/600 `ink`) + fecha 11 `faint`. Nunca solo por color: el tier va en el texto y en `aria-label`.
- **En progreso (siguiente tier)**: la medalla del tier actual a color + **arco de progreso 5 u** sobre el **borde exterior** (`<path d={SHAPE} fill="none" stroke="url(#t-next)" stroke-width="5" stroke-linecap="round" stroke-dasharray="{p*P/100} {P}" transform="rotate(0)"/>` sobre pista `#2C2C2E` 5 u, ambos con `scale(1)` y se aprecian *sobre* el merrow porque se dibuja `stroke` centrado; reducir el borde a `scale(.97)`). Texto: "Oro · 14 / 30 días".
- **Bloqueada sin progreso**: `fill="#1C1C1E"`, `stroke="#3A3A3C" stroke-width="2" stroke-dasharray="5 4"`, glifo `#6E6E73` al 55 %, sin sarga, sin brillo. **Sin candado dibujado**; `lock.fill` 11 junto al texto "Bloqueado".
- **Bloqueada con progreso**: igual + arco de progreso del bronce (pista `#2C2C2E`).
- **Secreta**: contorno discontinuo y glifo `HelpCircle`; título "Logro oculto"; al primer progreso se revela.
- **Reto mensual**: marcas de días = 31 trazos radiales `stroke-width 3`, longitud 7 u, en el aro exterior a radio 50; cumplidos = `url(#t-oro)`, pendientes `#3A3A3C`.

### 2.7 Desbloqueo (momento de deleite; solo ocurre al subir de tier)
1. t = 0: `Haptics.notificationAsync(Success)` (**una vez**, ya en `runtime.ts:31`).
2. Medalla: `scale 0.6 → 1` y `opacity 0 → 1`, `withSpring({ damping: 14, stiffness: 180, mass: 0.8 })` (≈ 450 ms).
3. t = 120 ms: brillo barre la medalla: `translateX 0 → 160` en el `rect#sheen` (opacidad .22), 600 ms, `Easing.out(Easing.cubic)`, luego `opacity` 0 y queda el estático .10. Sin partículas ni confeti.
4. Etiqueta "+400 XP" `figure` 22/600 sube 8 pt y aparece (`withTiming 220`, retraso 300 ms).
5. Dashboard: la misma secuencia con CSS `@keyframes` de `transform`/`opacity`, solo al llegar el evento `achievement` de la persona seleccionada; en la rejilla no se anima al cargar.
6. **Reduce Motion** (`useReducedMotion()` / `@media (prefers-reduced-motion: reduce)`): sin escala ni barrido; la medalla aparece con `opacity 0→1` 150 ms y el háptico **sí** se dispara (no es movimiento). El brillo estático queda.
7. En la hoja de detalle móvil la medalla se inclina con el dedo (`rotateX/rotateY ±12°`, `perspective 600`, spring `{duration 300, dampingRatio .8}` [de mobile.md §11.2]) y el rect de brillo se desplaza ±24 u con `rotateY` (da la ilusión metálica sin degradado en movimiento). Reduce Motion: sin inclinación.
8. Accesibilidad: `AccessibilityInfo.announceForAccessibility("Logro desbloqueado: Contramedida, oro")`.

---

## 3. Métricas "más padres"

Color: **solo** `STATUS_COLOR` (`#30D158 / #FF9F0A / #FF453A`), `accent #0A84FF`, y neutros del sistema. Nunca tier. El estado siempre en glifo + texto además de color (mobile.md §2.5).

### 3.1 Qué visual para qué métrica
| Métrica | Visual | Razón |
|---|---|---|
| `hr`, `spo2`, `temp`, `bpSys/bpDia`, `resp` | **RangeDial** (arco 270°, banda normal, marcador) | valor instantáneo con rango sano a ambos lados |
| `activity`, `kcal`, `water` | **PaceRing** (anillo cerrado con marca de ritmo del día) | totales acumulados que usan `dayProgress` |
| `sleep` | **Noche**: 7 barras + línea de 7 h; barra de fases solo si hay datos (§3.6) | total nocturno, no se prorratea |

### 3.2 RangeDial (arco de 270°, abierto abajo)
Geometría (SVG, origen en el centro; 0° = +x, grados horarios, `y` hacia abajo):
```ts
const P = (cx:number, cy:number, r:number, deg:number) => [cx + r*Math.cos(deg*Math.PI/180), cy + r*Math.sin(deg*Math.PI/180)];
const arc = (cx:number, cy:number, r:number, a0:number, a1:number) => {
  const [x0,y0] = P(cx,cy,r,a0), [x1,y1] = P(cx,cy,r,a1);
  return `M${x0} ${y0}A${r} ${r} 0 ${a1-a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};
const START = 135, SWEEP = 270;                      // 135° (abajo-izq) → 405° = 45° (abajo-der)
const ang = (v:number, lo:number, hi:number) => START + SWEEP * Math.min(1, Math.max(0, (v-lo)/(hi-lo)));
// Dominio por métrica, derivado de THRESHOLDS [cl, wl, wh, ch]:
// lo = cl − 0.5·(wl−cl);  hi = ch === wh ? 100 (spo2) : ch + 0.5·(ch−wh)
// hr: lo 35, hi 145 · temp: lo 34.5, hi 40 · bpSys: lo 80, hi 207.5 · resp: lo 6.5, hi 34.5 · spo2: lo 85, hi 100
```
Capas (tamaño de tarjeta Hoy: **96 pt**, `cx=cy=48`, radio 40, trazo **9**, `strokeLinecap="round"`):
1. Pista de zonas (cada zona es un `arc` con su color al **22 %**): `[lo..cl]` crítico, `[cl..wl]` vigilar, `[wl..wh]` ok, `[wh..ch]` vigilar, `[ch..hi]` crítico (omitir zonas que no existen: spo2 sin zona alta). Entre zonas, separación 0 (cortes limpios; `strokeLinecap="butt"` en zonas, redondo solo en extremos del conjunto).
2. Arco de valor: de `START` hasta `ang(v)`, color = `STATUS_COLOR[statusOf]` al 100 %, trazo 9.
3. Marcador: disco 6 pt radio `text`, con anillo exterior 3 pt `surface` (separa del arco), en `ang(v)`.
4. Marca de tu base de 7 días: tick radial 1.5 × 10 pt `muted` en `ang(base7)` (solo en el detalle y a ≥ 120 pt).
5. Centro: **valor** 30/700 tabular, `letterSpacing −0.5`, `text`; bajo, en el hueco del arco (y = cy + 24): **unidad** 12/500 `muted`. Alto del valor centrado en `cy − 2`.
Cabecera: símbolo hierarchical 15 semibold + etiqueta 13/600 `muted` (mobile.md §2.4). Pie: `StatusMark` 12 + tendencia (§3.4).

Tamaños: **96 pt** en Hoy · **200 pt** (trazo 14, valor `display` 40/700, unidad 17/500 `muted` en la misma línea base a la derecha) en el detalle · **64 px** (trazo 7, valor 17/600) en el dashboard solo si hay hueco; por defecto el dashboard usa la RangeBar lineal (§3.7).

### 3.3 PaceRing (activity, kcal, water) — usa `dayProgress`
Metas propuestas (`shared`, `GOALS`): `activity 120 min` (de `METRIC_META.info`), `kcal 2800` (mitad de ok 2000-3600), `water 3.0 L`. Anillo **96 pt**, `r=42`, trazo **12**, `rotate(-90)`, `butt` en la pista y `round` en el relleno (como Apple).
- Pista: `accent` al 22 % (compuesta `#0F2A47` sobre `surface` — opaco para RN y CSS).
- Relleno: `min(1, v / goal)`. Color = `accent` si `statusOf(k, v)==='ok'`; `watch`/`critical` solo cuando el propio `statusOf` (ya prorrateado) lo dice. Así "vas atrasado para esta hora" aparece con el mismo criterio que el resto del sistema, sin colores nuevos.
- **Marca de ritmo**: tick 2 × 16 pt `text` cruzando el anillo en `360·(wl·dayProgress(now)/goal)`. A las 14:30 (f=0.5) con meta de agua 3 L y `wl`=2: 120°. El relleno por delante del tick = a ritmo; por detrás = atrasado. Se recalcula cada minuto; transición `strokeDashoffset 220 ms`.
- Meta cumplida (≥ 100 %): el centro pasa de cifra a `checkmark` 28 semibold `accent` durante 1 vuelta de `bounce` (`SymbolView animationSpec`), la cifra baja a 13 pt bajo él. Más allá del 100 %: el valor sigue contando, el anillo no da 2ª vuelta.
- Centro: valor 28/600 tabular + unidad 12 `muted`; bajo el anillo: "a ritmo", "−250 ml para esta hora" 13/500 (`muted`; texto, no color).
- Hoy muestra los **3 PaceRing de 64 pt en una fila** dentro de una tarjeta (trazo 9) o individuales de 96 en la rejilla 2 col; mismo código.

### 3.4 Tendencia contra la base de 7 días
`base7` = mediana de los valores del mismo vital en los últimos 7 días (para acumulados: mediana del total diario a la misma hora). `Δ = v − base7`; **plano** si `|Δ| < 5 %·(wh−wl)` (spo2: `< 1`).
- Glifo: `arrow.up.right` / `arrow.down.right` / `arrow.forward` (SF `semibold` 12) · web lucide `ArrowUpRight/ArrowDownRight/ArrowRight` 14.
- Texto 13/500: "+6 lpm · tu media de 7 días". Color `muted` **salvo** que el valor ya esté fuera de rango: entonces glifo + texto en el color de estado de `v`. Nunca verde para "subió"; sin juicio de bueno/malo.
- Sin 3+ días de datos: "Aún sin media" y se oculta el glifo.

### 3.5 Sparkline con banda normal
- **Móvil Hoy** (card 173 × 56): línea **1.75 pt** en el color de estado **actual** (regla mobile.md §2.5), sin marcadores salvo el último punto (6 pt, anillo `surface` 2). Banda normal `[wl..wh]` = rect `ok` al 12 %; si `v` sale de ella, sin cambio de la banda. Eje Y implícito = dominio del dial; sin etiquetas. 24 h (7 con el segmentado "H · D · S" del detalle).
- **Dashboard** (tarjeta crew, 360 × 48): línea `accent` **1.75 px**, tramos fuera de rango en su color de estado (dashboard.md §3). Misma banda.
- **Detalle** (mobile.md §2.6, 220 pt): añadir **línea punteada de tu base de 7 días** (1 pt, `muted`, dash 4 4) y el chip de récord (§3.8).
- Punto de último valor con "ahora"; datos con hueco > 2 min = línea discontinua (`faint`) y no interpolar.

### 3.6 Sueño
- **Datos actuales**: solo horas (`sleep`). Hoy no hay fases: **no dibujar barra de fases inventada**.
- **Barras de 7 noches** (detalle y tarjeta de 2 col): 7 barras de **28 × 64** pt con 8 de gap (en 326 pt de ancho útil, `space-between`), radio superior 6; línea de 7 h dashed `muted` 1 pt con etiqueta "7 h" 11 `faint` al final; barra ≥ `THRESHOLDS.sleep[1]` (6 h) = `accent`; < 6 h = `watch`; < 4 h = `critical`; la de anoche con la cifra `figure` 28/600 encima ("7,2 h"). Días sin dato = tallo de 4 pt `raised`.
- **Barra de fases (stub, activar solo si el firmware manda `sleepStages?: {deep:number;rem:number;light:number;awake:number}` en minutos — añadir a `Metrics` solo entonces)**: barra segmentada de 12 pt de alto, radio 6, proporcional; colores opacos sobre `#1C1C1E`: profundo `#0A84FF`, REM `#1061B3`, ligero `#15416F`, despierto `#6E6E73`. Una sola familia de matiz (accent) + gris: sin morado. Leyenda debajo: 4 filas "Profundo 1 h 40" con disco 8; estado `ok/watch` no aplica a fases.

### 3.7 Tarjetas del dashboard (crew)
Tarjeta crew de **564 px** (6 col; dashboard.md §3), `surface`, radio 10, padding 20, sin borde ni sombra.
1. Cabecera (alto 40): `Avatar 40` con anillo de estado · nombre `heading` 15/600 · `StatusMark pill` a la derecha · `small` muted "hace 3 min" debajo del nombre.
2. **Franja de vitales (5 celdas de 96 px, gap 14)**: `hr`, `spo2`, `temp`, `bp` (sist/diast "128/82"), `resp`. Cada celda de arriba abajo: etiqueta `micro` 11/500 `muted` · valor **`figure` 28/600 tabular** + unidad 13 `muted` en la misma línea base · **RangeBar** (alto **4**, radio 2: 5 zonas al 22 %, marcador disco 10 `text` con anillo 2 `surface`, tick de base 1 × 10 `muted`) · tendencia `micro` ("↗ +6"). Una celda fuera de rango tinta su RangeBar activa y añade el glifo de estado (12) a la derecha del valor; **el resto no cambia de color**.
3. **Sparkline** del vital elegido (clic en una celda = selecciona, `aria-pressed`): 100 % × 48, §3.5.
4. **Fila de acumulados**: 3 PaceRing de **36 px** (trazo 5) con etiqueta `micro` bajo cada uno ("Actividad 62/120 min"), tick de ritmo 1.5 × 8.
5. Pie (alto 28): sueño de anoche "7,2 h" con 7 barras de 6 × 20 px.
Dashboard ≥ 1280: 2 × 2. Vacío/offline: ver estados.

### 3.8 Callouts de récord personal (Strava-style)
Se muestran **solo donde el extremo es bueno**, nunca en vitales de riesgo:
| Métrica | Récord | Texto |
|---|---|---|
| `activity` | máximo en un día | "Récord · 148 min hoy" |
| `sleep` | media de 7 noches más alta | "Mejor semana de sueño · 7,6 h" |
| `hr` (reposo) | mínimo de 30 días | "Reposo más bajo en 30 días · 52 lpm" |
| Exploración | km o ritmo | "Tu salida más larga" |
| `water` | racha de días en rango | "8 días seguidos" |
Forma: **chip de 28 pt** (radio 14, fondo `accent` al 14 % → `#0A2540` opaco, texto 13/600 `accent`) con una **mini medalla de 18 pt** a la izquierda (círculo oro simplificado: capas 1, 2, 7) y el texto. Ubicación: bajo el valor en el detalle y en la esquina del gráfico donde ocurrió (marcador 8 pt `accent` con anillo `surface`). Aparece una vez por récord (queda en el historial), sin animación salvo `fade 150`. Dashboard: mismo chip 24 px en la tarjeta de la persona y en el feed.

### 3.9 Tipografía de cifras (resumen)
| Contexto | Cifra | Unidad | Etiqueta |
|---|---|---|---|
| Detalle móvil (1 por pantalla) | `display` 40/700, tabular, −0.4 | 17/500 `muted`, misma línea base, 4 de separación | 13/600 `muted` |
| Dial en Hoy | 30/700 tabular | 12/500 `muted` bajo el valor | 13/600 en cabecera |
| Cifra de tarjeta (PaceRing 96, listas) | `figure` 28/600 | 15 (móvil) / 13 (web) `muted` | 13/600 |
| Crew card (web) | `figure` 28/600 | 13 `muted` | `micro` 11/500 `muted` |
| `hud` modo nave | 56/600 | 22 | — |
Reglas: unidad siempre **menor y más tenue** que la cifra (relación ≥ 2.2 : 1, "big numbers, small units" de Strava), `fontVariant: ['tabular-nums']` solo en números, `Dynamic Type` = `minHeight`, nunca altura fija. Decimales de `METRIC_META.decimals`. Coma decimal en español.

### 3.10 Estados (todos los visuales de §3.1)
| Estado | Dial / PaceRing | Texto |
|---|---|---|
| Cargando | pista de zonas a 12 %, sin valor ("—" `faint`), sin skeleton animado | — |
| Sin banda / sin señal | arco punteado `faint` (`strokeDasharray 2 6`), "—" | "Sin señal · hace 3 min" |
| Obsoleto (> 2 min en vivo) | todo al 50 %, el valor conserva su última cifra | "hace 2 min" |
| ok | arco `ok` | `StatusMark` "Normal" |
| vigilar | arco `watch` + glifo `TriangleAlert` | "Vigilar" + una línea corta (p. ej. "Alta para reposo") |
| crítico | arco `critical` + glifo `OctagonAlert`; sin parpadeo (el takeover de emergencia es otro sistema) | "Crítico" |
| Reduce Motion | sin transición de arco; el valor salta | — |
VoiceOver/aria: `role="meter"` / `accessibilityRole="adjustable"`, `valuemin/max/now`, `valuetext="Ritmo cardiaco 74 lpm, normal, estable"`.

---

## 4. Exploración, resumen semanal y leaderboard (estilo Strava)

### 4.1 Tarjeta de exploración
**Móvil (extiende mobile.md §11.3; sigue sin mapa falso):** `ExplorationCard` radio 20, padding 16, `surface`, gap 12.
1. Fila superior (alto 56): **parche de lugar 56 pt** a la izquierda (forma chevrón, glifo `Map`, tier del `Cartógrafo` actual: el parche es la miniatura, equivale al mapa de Strava) · derecha: título `section` 17/600 (2 líneas) y debajo `small` 13 `muted` "Módulo Columbus · hace 2 h" · extremo: `ellipsis` 44 × 44.
2. **Fila de 3 cifras** (grid 3, columnas iguales, gap 12): etiqueta 11/500 `faint` **encima**, cifra `figure` 28/600 tabular + unidad 15/500 `muted` en la misma línea base: "Distancia 2,4 km", "Tiempo 34:10", "Ritmo 14:14 /km". Ritmo = `minutes/km` formateado `mm:ss`. Si `km=0` "—".
3. Barra **"Contra tu media"**: alto 6, `raised`, relleno `accent` hasta `min(1, km / máxKm30d)`, marca 1 × 10 `muted` en tu mediana de km.
4. **Fila de récords** (solo si aplican, chips de §3.8, máx. 2): "Salida más larga", "Ritmo más rápido del mes", "Habitual de Columbus" (≥ 4 salidas al mismo `place` en 30 días, análogo a Local Legend de 90 días de Strava pero **sin corona ni rival**: es contra uno mismo).
5. **Kudos** (Fase 2, `needsHub`): fila 44 pt: botón `hand.thumbsup` 20 + contador 15/500 (relleno `accent` si ya diste), pila de avatares 20 pt (−6 solape, máx. 3, "+2"). `impactAsync(Light)` al pulsar; resorte `scale .9 → 1`. Sin comentarios libres.
**Dashboard (extiende dashboard.md §5.9):** misma jerarquía; el plano simulado de 168 px con la etiqueta "Plano simulado" **se conserva**; las 3 cifras **bajo** el plano (etiqueta `small` bajo la cifra, como ya define dashboard.md). Los chips de récord (24 px) van en la cabecera de la tarjeta a la derecha del nombre, con la Medal 24 de dashboard.md. Fila de kudos 36 px al pie con `ThumbsUp` 16 y el contador.

### 4.2 Resumen semanal
**Móvil** (Card, `surface`, radio 20, padding 16):
1. `display` 40/700 "12,4" + `km` 17/500 `muted`; a la derecha chip de tendencia 13/500 "↗ +2,1 km · semana pasada" (muted).
2. **Barras de 7 días**: 7 × (28 × 72) pt, `space-between` en 326 pt útiles; radio sup. 6. Hoy `accent`; días con datos `#144B83` (accent 45 % opaco); sin datos tallo 4 pt `raised`. Línea de meta dashed `muted` 1 pt si hay `weeklyGoalKm`. Letras 11 `faint` bajo cada barra.
3. **Racha** (§1.5) y meta común semanal (§1.6) debajo, separadas 16.
4. Tocar una barra: `selectionAsync`, cifra y fecha del día en el encabezado.
**Dashboard:** panel `surface` radio 10, padding 20; `lead-figure` 36/600 + unidad; barras 7 × (36 × 80) px, gap 16; tooltip `raised` sin sombra; a la derecha, la meta común en 5 col.
**Resumen del mes** (estilo Year in Sport, conocimiento propio): hoja `formSheet` con 4 `figure` y las 4 insignias más recientes; compartible como imagen; sin animación de entrada.

### 4.3 Fila del leaderboard (ambas plataformas)
| | Móvil (alto 64, 16 margen) | Dashboard (alto 72, dashboard.md §5.8) |
|---|---|---|
| 1 | Rango: numeral `title` 22/700 tabular en columna 28, **solo top 3**; el resto, columna vacía | numeral 22/700 en columna 32 (1º `ink`, resto `muted`; captain ve el orden completo) |
| 2 | `Avatar 40` con anillo de estado | `Avatar 40` |
| 3 | Nombre 17/600; debajo barra **4 pt**, `raised`, relleno `accent` a `EP / máxEP` (cada tripulante = un `accent` único, no por persona) | igual con `heading` 15/600 |
| 4 | Derecha: `figure` 22/600 "312" + `small` 13 `muted` "EP" | igual |
| 5 | Chip **ánimo** (`hand.thumbsup` 14 + "3") `muted` a la derecha de EP (Fase 2) | `ThumbsUp` 14 + "3" |
| 6 | Las **3 insignias más recientes** en miniatura de 24 pt en fila bajo el nombre (solo capas 1, 2, 7), "+4" | `Medal 24`, hasta 4 |
Tu fila fija al pie de la lista (blur no: tono `raised`) con "Tú" y delta contra tu semana anterior. Empates: mismo numeral. Cabecera: la **meta de tripulación** (§1.6), no el líder: "148 de 200 min · faltan 52" `title`. Hallazgo para el dashboard: "Todos participaron esta semana" o "Ana Ruiz y Leo Park empatan con 312 EP" (nunca el nombre de quien menos aportó).

---

## 5. Implementación (orden, riesgos)
1. `shared`: `badge.ts` (SHAPES, TIER, FIELD, PERIMETER), tipos §1.4, `GOALS`, `progressOf`; ampliar el evento `achievement` con `tier?`. Test: `progressOf` con 3 casos (días en rango, racha con día de gracia, km acumulados).
2. `Medal` (SVG) en mobile y dashboard con las 6 capas y los 5 estados; revisar a 88/56/24 px.
3. `RangeDial`, `PaceRing`, `RangeBar`, `Sparkline` (mobile.md §2.6 ya los nombra) → tarjetas Hoy y crew.
4. Logros: pantalla de rejilla agrupada por categoría, hoja de detalle con inclinación, toast de desbloqueo, vitrina de retos.
5. Fase 2 con hub: kudos y metas comunes (`needsHub`).
Dependencias: `lucide-react-native` (compatible con `react-native-svg` 15.12.1 ya instalado); `react-native-gesture-handler` ya previsto en mobile.md.
Riesgos: (a) el degradado metálico rompe la regla "sin degradados" de taste: está acotado al interior de la insignia y declarado; (b) `<TextPath>` y `pathLength` difieren en RN-SVG: usar las constantes de perímetro y probar en dispositivo; (c) el tier oro `#D1AA4A` cerca del ámbar `watch`: comprobar visualmente a 24 px; (d) FC en reposo calculada por percentil es un *shortcut*, no un valor clínico.
