# Modo nave (HUD horizontal): spec de diseño

Archivo actual: `mobile/src/features/ship/ShipHud.tsx`. Este documento no toca código.

## 1. Diagnóstico y tesis

- Hoy: 6 celdas iguales sin estructura + "tarjeta" gris para el protocolo + pastillas (Hablar, enlaces). Todo pesa lo mismo, así que "se ve vacío" y a la vez "genérico".
- Tesis: **un instrumento, no un dashboard.** Negro puro, números enormes alineados a una rejilla rígida, cero cajas, cero líneas, cero color decorativo. El único color de la pantalla es (a) estado, (b) el azul de la acción "Hecho", (c) el rojo de SOS. La jerarquía la dan tamaño y alineación, no contenedores.
- Hallazgo de ejecución: ni cajas ni hairlines. Las celdas de vitales no tienen fondo ni borde; la columna de acciones se separa por 40 pt de aire, y su único relleno son dos botones (Hecho azul, SOS rojo).

## 2. Reglas de las skills que mandan

- design-taste (principios transferibles; el skill es web): "No thin rules", "No gradients", "No glass", "No shadows on things at rest", "No icon-topped feature cards, no rows of identical cards" (House rules); "Two or three sizes do the visible work: one very large, one small, nothing in between"; "Five sizes on a page is the ceiling"; "One ground, one ink, one accent"; "Running text in the full ink. A page set in soft grey reads unfinished"; "Removing ornament leaves space. Never fill it with another ornament. Fill it with scale"; "Equal outer margins". Conflicto: las hairlines de Apple Health se descartan por la regla de taste; se separa con aire.
- apple-design: 1 Response (el tap de "Hecho" responde en el mismo frame: haptic + estado); 7 Spatial consistency (nada se reordena al alertar: la celda cambia de tinta, no de sitio); 13 Multimodal (un haptic por compromiso, nunca por frame; "Utility"); 14 Reduced motion ("fewer and gentler", se conservan cambios de color); 15 Typography (tracking negativo en grande, peso para jerarquía, Dynamic Type); 16 Simplicity not minimalism ("el más importante es lo más obvio"); 12 Materials: se descarta (sin blur; la lectura a un brazo exige opacidad total).
- animate-expo: paso 1 gate de frecuencia ("100+ veces/día: no animar": los números de vitales NO ruedan); "Reanimated, no Animated"; "transform + opacity, nunca height/width"; "scale(0) prohibido"; "un haptic por commit, siempre con un visual"; paso 9 `useReducedMotion`; "no animar a alturas fijas: Dynamic Type".
- mobile-native: se aplica la idea, no el CSS (es web): safe areas respetadas, probar en dispositivo real; objetivos táctiles 44 pt; sin selección de texto en botones (en RN, `selectable={false}` por defecto).

## 3. Referencias reales (qué copiar de cada una)

1. Apple HIG Workouts, https://developer.apple.com/design/human-interface-guidelines/workouts.md : "use large font sizes, high-contrast colors, and arrange text so that the most important information is easy to read". Copiar: pila vertical de métricas, número dominante, etiqueta mínima.
2. Apple Watch Workout, Multiple Metric (https://www.cultofmac.com/722094/apple-watch-workout-app-tips/): el tipo se escala para llenar el espacio; menos métricas = números más grandes. Copiar: los números llenan la celda hasta el borde; la etiqueta y la unidad son subtexto de 13 pt. Por qué no parece plantilla: no hay contenedor, solo tipografía y alineación a la izquierda.
3. Apple Fitness+ métricas en pantalla (https://support.apple.com/guide/fitness-plus/apd12f665e17): las métricas se superponen sobre el contenido, sin cromo y con opción de ocultarlas. Copiar: lectura plana sobre fondo, sin marcos. (Apple no documenta el layout horizontal; no se inventa.)
4. Live Activities HIG, https://developer.apple.com/design/human-interface-guidelines/live-activities.md : la vista expandida es la compacta "escalada" y no admite color de fondo propio; solo se tiñen texto y símbolos. Copiar: regla de que el color es tinta (valor + glifo), nunca fondo; el layout crece de forma predecible.
5. StandBy iOS 17 (https://www.macstories.net/news/wwdc-2023-standby-for-iphone/): pantalla horizontal, tipo grande, legible a distancia, modo nocturno. Copiar: un solo foco por zona y márgenes generosos. Lo que NO copiar: el rojo nocturno (aquí el rojo es solo alarma).
6. NASA Orion glass cockpit (https://www.nasa.gov/missions/artemis/orion/orion-cockpit-designed-with-crew-in-mind-for-artemis-missions-to-deep-space; estándar de formato https://ntrs.nasa.gov/api/citations/20110001664/downloads/20110001664.pdf): estándar de formato de pantalla, color reservado a estado y posiciones fijas. Copiar: posiciones invariables (la tripulación memoriza dónde está cada dato) y "silencio = normal" (solo lo anormal añade marca).
7. Garmin / WHOOP / Polar / clúster Tesla (de memoria, no verificadas en esta sesión): números grandes en tipografía sin serifa, una zona de alerta, el resto monocromo. Copiar: un único hero numérico por zona y la zona de estado arriba a la izquierda como en un clúster.

## 4. Rejilla (pt)

Safe area horizontal 59 izq/der, inferior 21, superior 12 (barra oculta en horizontal). Ancho útil = W-118. Alto útil = H-33.

| | 844x390 | 932x430 | peor caso 330 alto |
|---|---|---|---|
| Ancho útil | 726 | 814 | 726 |
| Alto útil | 357 | 397 | 330 |
| Cabecera | 36 | 36 | 36 |
| Gap | 8 | 8 | 8 |
| Cuerpo | 313 | 353 | 286 |
| Zona vitales (izq) | 446 | 510 | 446 |
| Columna (2 col vitales) | 223 | 255 | 223 |
| Fila vital (3 filas) | 104 | 117 | 95 |
| Gutter | 40 | 40 | 40 |
| Columna acciones (der) | 240 | 264 | 240 |
| Bloque protocolo | 229 | 269 | 202 |
| SOS (alto) | 72 | 72 | 72 |
| Gap protocolo-SOS | 12 | 12 | 12 |

- Márgenes exteriores iguales (59 + 0 a cada lado). Bordes de texto comunes: borde izquierdo de vitales y borde izquierdo de la columna de acciones; todo lo demás se alinea a ellos.
- Fila mínima 95: caption 18 + gap 2 + valor 60 = 80, más 15 de aire. No se comprime el valor.

## 5. Jerarquía

1. **Vitales** (62 % del ancho, la zona más grande). Los 6 con el mismo tamaño (`hud` 56/60, 600, `tabular-nums`): ninguno es "hero" en reposo, porque todos son igual de críticos. El hero lo decide el estado: lo anormal cambia de tinta y se hace la única cosa con color.
2. **Paso de protocolo + Hecho** (columna derecha, arriba). Texto del paso en `title` 22/28 700.
3. **SOS** (columna derecha, abajo, 72 pt, rojo emergencia). Siempre en el mismo sitio, nunca tapado.
4. **Cabecera**: estado global (izq), enlaces (centro-der), Orbi (der). Terciario: 13 pt.

Escala tipográfica usada (4 tamaños, tope 5): 56 (valores) / 22 (paso y estado global) / 17 (botón Hecho) / 13 (etiquetas, enlaces). SF del sistema, sin mono. Tracking: 56 con -1 (grande = más apretado), 22 con -0.26 (token title). Contraste: valores `#FFFFFF`, etiquetas `#98989F` (AA sobre negro, 7.9:1); nada en `#6E6E73` salvo "sin dato".

## 6. Los 6 vitales

Rejilla 2 columnas x 3 filas, orden de lectura por filas (posiciones fijas, nunca se reordenan):

```
HR            SpO2
Presión       Respiración
Temperatura   Actividad
```

- Sexto vital: **Actividad (min de ejercicio hoy)**. Es acumulativo, así que se usa `statusOf` igual que hoy, pero sin glifo hasta pasado `dayProgress`; mientras tanto va siempre en blanco. Sustituye la celda "Manga" que hoy ocupa el hueco (el estado de la manga ya vive en la cabecera).
- Presión: una sola celda "118/76" (`bpSys`/`bpDia`), estado = peor de los dos. A 56 pt ocupa ~190 pt de 223: cabe. Si en 844 no cabe tras escala de fuente, `adjustsFontSizeToFit` con `minimumFontScale 0.8`.
- Anatomía de celda (sin fondo, sin borde, sin icono, alineada a la izquierda, padding derecho 16):
  - Línea 1 (caption 13/600, `#98989F`): `Ritmo · lpm`. Etiquetas cortas locales: Ritmo, Oxígeno, Presión, Respiración, Temperatura, Actividad. Unidad en la misma línea, nunca al lado del valor (el valor usa todo el ancho).
  - Línea 2: valor `hud`, 1 línea.
- Sin ícono por métrica, sin sparkline, sin anillo. Los anillos se reservan para progreso (SOS hold) y el paso.

## 7. Color: solo codifica estado

- Normal: valor `#FFFFFF`. "Silencio = normal": no se pinta check verde por celda.
- Vigilar: valor `#FF9F0A` + glifo `exclamationmark.triangle.fill` 14 pt antes de la etiqueta + texto "Vigilar" en la línea 1 (StatusMark). Forma + texto + color: nunca solo color.
- Crítico: valor `#FF453A` + `xmark.octagon.fill` + "Crítico", y la celda sube a `#1C1C1E` (tono, sin borde, radius 14 continuous, padding 8 que se absorbe en la fila) para que sea la cosa más "sólida" de la pantalla.
- Azul `#0A84FF`: solo el botón Hecho y el segmento activo del progreso. Nada más.
- Rojo `#FF3B30` (emergencia): solo SOS. Crítico (`#FF453A`) es otro tono y siempre va como tinta, nunca relleno: no se compite con el botón SOS.
- Prohibido: degradados, brillos, tinte por métrica, violeta, emoji.

## 8. Protocolo, Hecho y progreso

Columna derecha, sin tarjeta (se quita el `surface` de hoy), de arriba abajo:
1. Caption 13/600 `#98989F`: título del protocolo (1 línea).
2. Paso actual en `title` 22/28 blanco, máx. 3 líneas (84 pt); con Dynamic Type grande baja a 4 líneas y luego trunca con "…" (el texto completo está en VoiceOver).
3. Progreso: **N segmentos** de 4 pt de alto, gap 4, ancho repartido en 240; hechos `#98989F`, actual `#0A84FF`, pendientes `#2C2C2E`. Etiqueta "2 de 5" en caption a la derecha. (Sustituye los puntos de 8 pt, que eran un guiño a carrusel web.)
4. Botón **Hecho**: 56 pt alto, ancho completo (240), fondo `#0A84FF`, texto `button` 17/600 negro (`onAccent`), radius 14 continuous.
Vacío (sin protocolo): texto `title` "Sin protocolo activo" + caption "Check-in de hoy registrado" o "Falta el check-in de hoy"; sin icono de sello, sin botón. Al terminar el último paso: "Protocolo completo" y Hecho desaparece (no se deshabilita: no hay nada que hacer).

## 9. SOS y Orbi

- SOS: `SosButton large width={colAncho}`, 72 pt, abajo de la columna derecha, siempre montado, fuera del flujo del chat. Mantener 1 s con HoldRing. Nada se superpone: ni toasts (los toasts van a la izquierda abajo, nunca sobre la columna derecha), ni teclado de forma no controlada (ver 9b).
- Orbi: botón **solo con la criatura** (`Creature` 36 pt, sin texto, sin pastilla), arriba a la derecha de la columna de acciones, alineado a la derecha de la cabecera. Zona táctil 44x44 con `hitSlop 4`. `accessibilityLabel` "Hablar con Orbi". La mascota sirve de indicador de ánimo (como hoy con `petMood`).
- 9b. Chat abierto: el panel sustituye el bloque de protocolo (no la columna entera) con el mismo ancho. Al abrir el teclado (≈162 pt en horizontal) el layout pasa a "modo chat": solo queda una franja de 168 pt: izquierda, último mensaje de Orbi (2 líneas, 17 pt); derecha, campo (44 pt) + SOS (72 pt) + gap 12 = 128 pt. Los vitales se ocultan mientras hay teclado; al cerrar vuelven (misma posición). SOS nunca se mueve fuera de pantalla.

## 10. Cabecera (36 pt)

- Izquierda: estado global. OK: `checkmark.circle.fill` 16 en `#30D158` + "Todo en rango" en `title` blanco. Alerta: glifo y texto del estado + nombre del vital peor: "Vigilar: Ritmo cardiaco" (texto en tinta de estado). Un solo estado, no un banner aparte.
- Enlaces (derecha del centro), texto 13 pt: "Nave  Banda  Manga  Chaleco" en `#98989F`, sin icono, sin pastilla, separados por 16 pt. Silencio = conectado. Desconectado: glifo `antenna.radiowaves.left.and.right.slash` 12 pt `#FF9F0A` + el nombre en blanco. Todo el grupo es un solo elemento accesible.

## 11. Wireframes (844x390, escala aproximada; `|` = margen seguro 59)

Normal:
```
|  (Todo en rango)            Nave Banda Manga Chaleco          [Orbi]  |  36
|                                                                       |
|  Ritmo · lpm        Oxígeno · %            Paso 2 de 5                |
|  72                 98                     Respira lento por la nariz |
|                                            contando hasta cuatro      |
|  Presión · mmHg     Respiración · rpm      ▬▬ ▬▬ ▬▬ ▬▬ ▬▬   2 de 5    |
|  118/76             14                     [        Hecho        ]    |  56
|  Temperatura · °C   Actividad · min                                    |
|  36.8               42                     [   Mantén para SOS   ]    |  72
|   <-------- 446 -------->  <-- 40 -->  <------- 240 ------>           |
```
Alerta (SpO2 en Vigilar, presión en Crítico; nada cambia de sitio):
```
|  /!\ Crítico: Presión                Nave Banda Manga Chaleco  [Orbi] |
|                                                                       |
|  Ritmo · lpm        Oxígeno · % /!\ Vigilar   Protocolo: Presión alta |
|  72                 91 (ámbar)               Siéntate y respira...    |
|  ┌ Presión · mmHg /X\ Crítico ┐ Respiración      ▬▬ ▬▬ ▬▬   1 de 3   |
|  │ 172/108 (rojo, fondo #1C1C1E)│ 14            [        Hecho       ] |
|  Temperatura · °C   Actividad · min                                    |
|  36.8               42                       [   Mantén para SOS   ]  |
```
(`┌ ┐ │` solo ilustran el relleno de tono; no hay borde.)

## 12. Estados

- **Sin dato** (`metrics[k] == null`): valor "—" en `#98989F`, línea 1 sin cambios, accesible "sin dato". Si el dispositivo que lo mide está desconectado (`DEVICE_METRICS`), la cabecera lo marca (enlace ámbar); la celda no repite aviso.
- **Valor obsoleto** (>30 s): el valor baja a `#98989F` y la línea 1 añade "Hace 40 s". No se oculta.
- **Alerta**: lo que cambia es (a) tinta del valor, (b) glifo + etiqueta de estado en la línea 1, (c) celda crítica con tono `#1C1C1E`, (d) cabecera con el nombre del vital peor, (e) el protocolo mostrado pasa al de emergencia si el store lo prioriza, (f) un haptic `notificationWarning` al entrar en Vigilar/Crítico, solo una vez por cambio de estado. NO cambia: orden, tamaños, SOS, ni hay parpadeo.
- **Normal tras alerta**: la tinta vuelve a blanco con fundido de 150 ms.

## 13. Movimiento (lo que vale la pena, lo demás no)

- Números de vitales: **sin animación de rodillo** (animate-expo paso 1: se actualizan cada segundo, "100+ veces/día = no animar"). Solo cambia el texto. Tabular-nums evita saltos.
- Cambio de estado de una celda: `withTiming(…, {duration:150})` sobre el color de tinta con `interpolateColor` (shared value 0/1/2), `reduceMotion: System`. Sin escala ni rebote.
- Paso nuevo: cross-fade del texto 150 ms (opacidad); segmento que se completa: `scaleX` 0.0 a 1.0, origen izquierdo, `Easing.bezier(0.23,1,0.32,1)`, 200 ms. Haptic `Medium` (ya existe en `markStep`). Sin altura animada.
- SOS: HoldRing ya rellena el anillo en 1 s; no se toca.
- Latido sincronizado, glow, pulso del SOS: **no**. Un bucle lento en pantalla de lectura constante rompe la regla de bucles lentos (apple-design 14) y compite con la alerta.
- Reduced motion: se eliminan scaleX y fundido de paso; se conserva el cambio de color instantáneo (apple-design 14: "keep opacity/color changes that aid comprehension").

## 14. Accesibilidad

- Orden VoiceOver: 1 estado global, 2 vitales en orden de lectura (cada celda un solo elemento: "Ritmo cardiaco 72 lpm, Normal"; presión: "Presión 118 sobre 76 mmHg, Normal"), 3 paso de protocolo ("Paso 2 de 5. Texto"), 4 Hecho, 5 SOS ("SOS, mantén pulsado"), 6 Orbi, 7 enlaces (un grupo). Se establece con orden de montaje en el árbol, no con `accessibilityElementsHidden`.
- Cambios de estado: `accessibilityLiveRegion="polite"` / `AccessibilityInfo.announceForAccessibility` solo al pasar a Vigilar o Crítico (una vez).
- Dynamic Type: valores `maxFontSizeMultiplier={1}` (ya son 56 pt; el tamaño es la accesibilidad); captions `1.3`; paso `1.3`; botón Hecho `1.2`. La altura de fila no se hardcodea: `flex:1` + `minHeight 95`.
- Objetivos: Hecho 56, SOS 72, Orbi 36+hitSlop = 44. Contraste mín. 7:1 en texto principal.
- Contraste de alerta: ámbar y rojo llevan siempre glifo + texto (no depender del color).

## 15. Plan de implementación (sin cambiar contratos de store)

Reutiliza: `Press`, `SosButton large`, `StatusMark`, `Icon`, `Creature`, `useReducedMotion`, `font('hud'|'title'|'caption'|'button')`, `statusOf`, `worstStatus`, `METRIC_META`. Reanimated ya está disponible.

Archivos nuevos en `mobile/src/features/ship/` (todos < 60 líneas):
1. `VitalCell.tsx`: `{ label: string; unit: string; value: string | null; status: 'ok'|'watch'|'critical'; stale?: boolean; a11y: string }`. Renderiza línea 1 (caption + StatusMark compact si status != ok) y valor `hud`. Color con `useAnimatedStyle`/`interpolateColor`. Fondo `color.surface` solo si `critical`.
2. `StatusReadout.tsx`: `{ overall: Status; worstLabel?: string }`. Glifo + texto de la cabecera.
3. `LinkStrip.tsx`: `{ links: { label: string; on: boolean }[] }`. Un `accessible` con label combinado.
4. `StepBar.tsx`: `{ n: number; i: number; done: number[] }`. Segmentos con `scaleX` animado (reduced motion: instantáneo).
5. `StepPanel.tsx`: `{ title: string; step: string; i: number; n: number; onDone: () => void; empty?: string }`. Incluye caption, texto, StepBar, Hecho.
6. `OrbiButton.tsx`: `{ mood; open: boolean; onPress }` (Creature 36 + hitSlop).

Cambios en `ShipHud.tsx`: sustituir el árbol por Header (StatusReadout + LinkStrip + OrbiButton) y Body (`flexDirection:'row'`: zona vitales `flex:1` con 3 filas x 2 `VitalCell`; gutter 40; columna derecha de ancho fijo `min(264, max(240, 0.29*ancho útil))` con StepPanel `flex:1` y `SosButton large width={col}`). Quitar `slots`, `cell`, `LINKS` con iconos, `surface` del protocolo, puntos. Mantener `ShipChat`, quitar bordes redondeados 20 de panel (radius 14). Sexto vital `activity` en lugar de `sleeve`. `KeyboardAvoidingView` solo activa "modo chat" (sección 9b).

Verificación: probar en iPhone 15/17 real en horizontal, Dynamic Type máximo, Reduce Motion, VoiceOver, con `metrics` vacío y con un valor crítico en cada celda.

## 16. Lista anti-vibecoded (pasar todas)

- [ ] Cero degradados, cero glow, cero blur en la pantalla.
- [ ] Cero fondos de tarjeta salvo celda crítica (tono, no borde).
- [ ] Cero iconos de métrica decorativos; los glifos son solo estado.
- [ ] Cero pastillas (el botón Orbi es una criatura, no un chip).
- [ ] Color solo para estado; azul solo en Hecho y segmento activo; rojo emergencia solo en SOS. Sin violeta.
- [ ] 4 tamaños de texto como máximo (56, 22, 17, 13); números tabulares.
- [ ] Posiciones fijas: nada se reordena al alertar.
- [ ] Márgenes izq/der iguales y bordes de texto compartidos (2 ejes).
- [ ] SOS 72 pt visible siempre, incluso con chat y teclado.
- [ ] Ningún estado se comunica solo con color; ninguna animación en bucle.
- [ ] Capturas de peor caso (330 pt) sin recorte ni scroll.
