# Revisión de diseño — app móvil de la tripulación (Orbit)

Revisor: diseño de producto iOS. Alcance: `mobile/src` completo, leído línea a línea. Sin editar código.
Verificado: `npx expo export --platform ios` empaqueta (4.26 MB hbc). `tsc --noEmit` da 13 errores de tipo (listados en el §A de verificación al final), ninguno impide el bundle.
No se pudo correr en dispositivo: todo lo que dice "en pantalla" se razona desde el código; lo marcado **[verificar en device]** necesita ojo humano.
Criterio rector: skill *taste* (`design-taste-frontend` + `references/app-screens.md`), luego *apple-design*, *animate-expo* y `DESIGN-BRIEF.md`. Donde el usuario pide "más visual" (anillos, gráficas, insignias) y taste dice "los KPI son tipografía, no tiles / sin sparklines", gana el usuario pero con las reglas de taste que sí sobreviven: plano, un matiz por gráfica, sin glow, sin degradados decorativos, sin iconos en cuadritos de color, color solo donde significa algo.

---

## 0. Diagnóstico en diez líneas (por qué "está muy mal")

1. **No hay nada que mirar.** Hoy son 4 baldosas iguales con número + texto + una línea de 55 pt; Mascota es un círculo azul con dos puntos; Logros son candados grises. Todo es lista y texto. Falta el objeto visual de cada pantalla (anillo, gráfica, personaje, insignia, ruta).
2. **Seis pestañas en un UITabBar**: iOS colapsa a 5 + "Más" (`MainTabs.tsx:64-69`). Check-in es una acción, no un destino.
3. **Migración a medias**: Protocolos, Check-in y Juego pasan `title=` a `ScreenHeader` (no existe, error TS) y no tienen `contentInsetAdjustmentBehavior`, así que con `headerTransparent` el primer bloque queda **bajo** el título grande (`ProtocolsScreen.tsx:31`, `CheckInScreen.tsx:39`). Perfil mete "Ajustes" en un segmentado en vez de empujar pantalla.
4. **Eyebrows y mayúsculas** por todos lados (`ScreenHeader.tsx:9` kicker azul en mayúsculas bajo el título grande; `FormSection.tsx:9` cabeceras en mayúsculas): es el tic nº1 que taste prohíbe y duplica el título nativo.
5. **El Toast nunca se cierra**: `showToast` solo hace `set({toast})` y nadie lo pone a `null` (`store.ts:181`, `runtime.ts:30`); queda pegado arriba sobre el título grande para siempre.
6. **El campo de texto es invisible** en Check-in: `input.backgroundColor = surface` dentro de `FormSection` que ya es `surface` (`CheckInScreen.tsx:18` + `FormSection.tsx:10`).
7. **Color con significado mezclado**: el juego pinta enemigos con `status.watch/critical` (`GameScreen.tsx:93,95`); BodyMap selecciona en azul sin estado; Sparkline siempre azul aunque el valor esté crítico.
8. **Emergencia**: "Resuelto" cierra con un toque (`EmergencyTakeover.tsx:54`), dos patrones de háptico a la vez (1.5 s Warning + 110/min Medium, `:31` y `CprGuide.tsx:47`), y el contador RCP es un `hero` 34 pt entre párrafos de 13 pt.
9. **Controles sin responder al dedo**: SOS exige 1 s de pulsación sin ningún progreso visible (`SosButton.tsx:17`); Juego usa `PanResponder` + `setState` por frame (`GameScreen.tsx:21,30,50`), lo que animate-expo prohíbe.
10. **Lo que sí está bien y se conserva**: tokens Apple (`design.ts`), `SegmentedControl` nativo, SF Symbols con par Ionicons, `StatusMark` con forma + texto, tab bar nativa, copy en español sereno, FeedRow con divisor inset, `borderCurve: 'continuous'`.

---

## 1. Referencias investigadas (qué hace cada una, exactamente)

Nota de método: las dos páginas de docs de Expo (`@expo/ui`, `expo-symbols`) se leyeron en vivo; el comportamiento de producto de Apple/Oura/WHOOP/etc. es de uso y documentación pública conocida, no de capturas de esta sesión.

| Componente Orbit | Referencia 1 | Referencia 2 |
|---|---|---|
| Resumen del día / estado general | **Apple Health › Resumen**: tarjetas `secondarySystemGroupedBackground`, radio ~20, cabecera = SF Symbol + nombre en el color de la categoría + hora en gris a la derecha; valor en 28-34 semibold con unidad 15 gris; en la misma tarjeta un mini-gráfico (barras/línea) sin ejes. Sección "Aspectos destacados" con tarjetas horizontales paginadas, cada una con una frase y su gráfica comparativa. | **WHOOP Recovery**: un solo dial grande con un número y un color; debajo, 3 contribuyentes. Aquí: un anillo segmentado cuyo dato real es "N de 4 vitales en rango" (sin inventar un puntaje). |
| Vitales con rango normal | **Apple Watch › Signos vitales**: una barra de rango por métrica con la **banda de "tu rango típico"** sombreada y un punto donde está el valor hoy; fuera de rango = el punto cambia de color y la fila sube. | **Oura Readiness**: lista de contribuyentes con barra fina + valor, color solo cuando hay desvío. |
| Anillos de objetivos diarios | **Apple Fitness anillos**: 3 anillos concéntricos, trazo ≈ 1/6 del radio, extremos redondos, pista = mismo matiz al ~25 %, relleno > 100 % da la vuelta con sombra; al abrirse animan una vez con muelle. | **Gentler Streak**: anillo/arco único con zona "recomendada" y mensaje en lenguaje natural debajo ("hoy conviene ir suave"). |
| Tendencias / gráficas | **Swift Charts** (HIG › Charting data): una serie, línea 2 pt, sin marcadores, 3-4 líneas guía finas, etiquetas de eje a la derecha, `RuleMark` de selección con tarjeta flotante al arrastrar, `RectangleMark` para la banda objetivo. | **Apple Health › detalle** (selector D/S/M/6M/A + gráfica 220 pt + "Aspectos destacados" abajo). |
| Insignias | **Apple Fitness › Premios**: medallas de 3 columnas, arte único por premio, bloqueadas = silueta apagada con progreso; al tocar, la medalla se inclina con el dedo/giroscopio y hay botón Compartir. | **Duolingo / Strava trofeos**: la fecha de logro y el "x/y" de progreso bajo la medalla. |
| Feed de exploraciones | **Strava feed**: tarjeta con título 17/600, lugar · hora en gris, fila de 3 estadísticas (Distancia · Tiempo · Ritmo) con etiqueta pequeña encima, mapa/trazado arriba, "kudos" y comentarios debajo. | **Apple Fitness › Compartir**: hoja de actividad de un amigo con anillos y premios recientes. |
| Mascota | **Finch**: la mascota es el 70 % de la pantalla, vive en una escena (cielo + terreno), reacciona al toque (rebote + corazones), la energía se ve como una barra con icono, el chat va en burbujas. | **Fabulous / Tamagotchi**: el estado de la mascota deriva de hábitos reales; carita cambia en 3-4 estados con un rasgo exagerado por estado (ojos, antena, color de mejillas). |
| Guía de respiración | **Apple Watch › Respirar**: flor de 6 pétalos translúcidos que se abre y cierra, un háptico "tic-tic" que sube durante la inhalación. | **Calm**: círculo que se expande con texto de fase y cuenta atrás de la sesión en el borde. |
| Check-in de ánimo | **Apple Health › Estado de ánimo (iOS 17)**: forma tipo flor que se redondea/crece al arrastrar un control vertical continuo; 7 niveles con etiqueta de texto bajo la forma. | **Daylio**: 5 caras en fila como alternativa de baja fricción. |
| Hojas/detalle | **HIG › Sheets**: `UISheetPresentationController` con detents medium/large, agarrador visible, radio ~28. | **Apple Maps** (hoja inferior con detent medio y contenido que sigue navegable). |
| Modo nave (horizontal) | **Live Activity expandida / Dynamic Island**: 4 regiones (leading, trailing, center, bottom), valor principal enorme, secundario compacto, sin cromo. | **WHOOP / Garmin en el brazo**: pocas cifras, contraste máximo, un único color de alerta. |
| SOS | **iPhone › SOS de emergencia** (mantén botones): cuenta atrás visible, vibración que sube, soltar cancela. | |
| Ajustes | **iOS Ajustes**: lista inset agrupada, etiqueta a la izquierda y valor/campo a la derecha, pie en 13 gris, hoja push. | |
| Toast | **Apple "isla" de confirmación** (AirPods conectados, Cargando): cápsula centrada con símbolo + texto, material translúcido, sale sola a los ~2 s. | |

`@expo/ui` (docs SDK 58 leídas): paquete beta, estable desde SDK 56, expone `Host`, `Gauge`, `Picker`, `Slider`, `Toggle`, `ContextMenu`, `BottomSheet` bajo `@expo/ui/swift-ui`. Esta app es Expo 54 y no lo tiene instalado (`node_modules/@expo/ui` no existe). **Decisión**: los anillos de Fitness son vistas custom en la propia Apple (no un control del sistema), así que se dibujan con `react-native-svg` (ya instalado) y se ven igual en Android. `Gauge`/`Picker` de SwiftUI se dejan como mejora opcional tras confirmar con `npx expo install @expo/ui` qué versión resuelve para 54.
`expo-symbols` (docs leídas): `SymbolView` soporta `type: 'monochrome' | 'hierarchical' | 'palette' | 'multicolor'`, `colors` (palette), `weight`, `scale`, `animationSpec` (`bounce`, `pulse`, `scale`, `variableAnimationSpec`).

---

## 2. Sistema (todo componente lo sigue)

### 2.1 Tipografía (San Francisco del sistema, sin fuentes extra)
Se conserva `type` de `shared/src/design.ts` y se añade el uso:
| Uso | Token | pt / peso |
|---|---|---|
| Título de pestaña | nativo `headerLargeTitle` | 34 bold, se contrae solo |
| Título de sección fuera de tarjeta (Health) | `section` | 20/600, sentence case, 24 pt sobre, 8 pt bajo |
| Cabecera de grupo de ajustes | `small` | 13/400 `muted`, **sentence case, sin mayúsculas** |
| Etiqueta de métrica en tarjeta | `caption` | 13/600 en el color de estado/categoría |
| Valor en tarjeta | `figure` | 28/600, unidad `body` 15 `muted` en la misma línea base |
| Valor de detalle | nuevo `display` | **40**/700 (tope taste: ninguna cifra ≥ 48 en teléfono vertical) |
| Cifra de modo nave y de RCP | `hud` | 56/600 (excepción documentada: lectura a brazo extendido) |
| Cuerpo / fila | `body` | 17/400 |
| Pie / ayuda | `small` | 13/400 `muted` |
Reglas: (a) `font()` aplica `tabular-nums` a **todo** (`theme/index.ts:16`); limitarlo a un `figureFont()` para números, la prosa no lleva cifras tabulares. (b) Prohibido `textTransform: 'uppercase'` en todo el proyecto (hoy: `ScreenHeader.tsx:9`, `FormSection.tsx:9`). (c) Un solo kicker permitido: ninguno. El título grande nativo ya dice dónde estás. (d) Probar a Dynamic Type 200 %: ninguna altura fija en filas ni tarjetas (usar `minHeight`).

### 2.2 Espacio, superficies, radios
- Margen lateral **16** (hoy `space.lg = 18` en pantallas y 16 en filas: unificar a 16). Separación entre secciones **32**; dentro de sección 8-12. Padding de tarjeta **16**.
- Dos tipos de contenedor, nunca más: **Tarjeta visual** (Health: `surface`, radio **20** continuo, sin borde, sin sombra) para anillos/gráficas/personaje; **Grupo inset** (`FormSection`/lista: `surface`, radio **10→12**, filas 44 mín., divisor hairline con sangría 16 / 56 si hay icono) para listas y formularios. Añadir `radius.card = 20` a `design.ts`.
- Pila de superficies por tono: `bg #000` → `surface #1C1C1E` → `raised #2C2C2E` (pulsado, pista de anillo, campo de texto sobre `surface`). **Campos de texto: `raised` dentro de grupos** (arregla `CheckInScreen.tsx:18`).
- Nada de sombras en reposo; solo en lo que flota (toast, hoja).

### 2.3 Lista inset agrupada (regla de fila)
`[icono 28 opcional] [título 17 / subtítulo 13 muted, máx. 2 líneas] [valor trailing 17 muted] [chevron 13 semibold faint si navega]`. El **estado va al final** como glifo + texto 13, nunca encima del título (hoy `FeedRow.tsx:21` lo pone arriba = eyebrow). Fila de navegación se tiñe `raised` al pulsar; fila de acción no.

### 2.4 Iconografía (SF Symbols, `expo-symbols`)
- iOS siempre `SymbolView`; **cero Ionicons directos en pantalla** (hoy `CheckInScreen.tsx:3,46`); Ionicons solo vía `ANDROID` map.
- `weight="regular"` por defecto, `scale="medium"`; en barras de rango/cabeceras de tarjeta `weight="semibold"`, 15 pt.
- Renderizado: **`hierarchical`** con el color de estado para iconos de métrica (corazón, gota); **`palette`** `[ink, accent]` para símbolos de dos partes (p. ej. `heart.text.square`); `monochrome` para chevrons y acciones; `multicolor` nunca.
- Animación de símbolo (`animationSpec`) solo en 3 sitios: check completado (`bounce`), SOS armado (`pulse`), antena de conexión (`variableColor` repetido mientras busca).
- Sin iconos dentro de cuadrados/círculos de color repetidos por fila (taste §13).
- Tabla de símbolos del sistema (añadir a `ANDROID` junto a cada uno): `heart.fill` (hr), `lungs.fill` (resp), `drop.fill` (spo2/agua), `thermometer.medium` (temp), `waveform.path.ecg` (presión/estado), `moon.zzz.fill` (sueño), `figure.run` (actividad), `fork.knife` (comida), `pawprint.fill`, `list.bullet.clipboard.fill`, `gamecontroller.fill`, `person.crop.circle.fill`, `cross.case.fill`, `brain.head.profile`, `checkmark.circle.fill`, `circle`, `lock.fill`, `figure.mind.and.body`, `antenna.radiowaves.left.and.right`, `bolt.heart.fill`.

### 2.5 Color
- Un solo no-estado: `accent #0A84FF`. Estado: ok/watch/critical (siempre forma + texto). `emergency` solo en emergencia y SOS.
- **Anillos y gráficas usan el color del estado actual** del dato (ok verde, watch ámbar, critical coral); pista = mismo color a 22 % de opacidad; línea de gráfica = color de estado, banda normal = `ok` al 12 %.
- Anillos de objetivos diarios (que no son estado): una sola familia en `accent` con tres pasos de luminosidad (100 / 72 / 48 %). Nada de morado/índigo.
- Juego: paleta propia sin colores de estado (blanco, `muted`, `accent`); ver §14.

### 2.6 Gráficas (estilo único, componente `TrendChart`)
`react-native-svg`. Una serie, línea **2 pt**, `strokeLinejoin="round"`, `strokeLinecap="round"`, **sin marcadores**, sin suavizado (segmentos rectos: no inventa valores). Relleno bajo la línea: plano 14 % → 0 % solo si es la gráfica principal. 3 guías horizontales 1 px `hairline`; etiquetas de eje Y a la derecha 11/400 `faint`, X: 4 etiquetas planas. **Banda normal** (`THRESHOLDS[k][1..2]`) como rectángulo `ok` 12 % con etiqueta "Normal" 11 pt. Alto 220 en detalle, 56 en tarjeta (sin ejes). Selección: arrastre con *long-press* 150 ms → regla vertical 1 px + tarjeta con valor/hora; `Haptics.selectionAsync()` cada vez que cambia el punto más cercano (máx. 1 por 60 ms). Sin leyenda (una serie). Cero datos = línea punteada + "Sin datos".

### 2.7 Movimiento (presupuesto ampliado con justificación)
El brief limita a 4 movimientos. Se conservan y se añaden, por la tabla de frecuencia de animate-expo (ocasional / raro = presupuesto de deleite):
1. Píldora de tab/segmentado — nativa.
2. Respiración idle de la mascota (rediseñada, §6).
3. Guía de respiración / RCP — ahora con una sola línea de tiempo.
4. Aparición de emergencia.
5. **(nuevo, raro)** Barrido de anillo al montar la tarjeta la primera vez que se enfoca la pestaña en la sesión: `withTiming(progress, { duration: 900, easing: Easing.bezier(0.23,1,0.32,1) })`; cambios posteriores `withSpring(v, { duration: 600, dampingRatio: 1 })`.
6. **(nuevo, raro)** Desbloqueo de insignia: escala 0.9→1 con `{ duration: 400, dampingRatio: 0.8 }` + `notificationAsync(Success)`.
7. **(nuevo, ocasional)** Reacción de la mascota al toque (squash & stretch, §6).
Muelles con la forma de dos parámetros (`duration`, `dampingRatio`), no masa/rigidez: reposo `{400, 1}`, tras arrastre `{400, 0.8, velocity}`, hoja `{300, 0.8}`. Solo `transform`/`opacity` (los arcos de anillo animan `strokeDashoffset` mediante `useAnimatedProps` en la UI thread; no hay `setState` por frame). **Reduce Motion**: sin barrido (el anillo aparece en su valor), sin squash, sin flor; se conservan cambios de color/opacidad y el háptico.
Pulsación: filas = tinte `raised` inmediato; tarjetas y CTA = `scale 0.98` en 120 ms (CSS-transition de Reanimated); nunca rebote.

### 2.8 Háptica (corrige `Press.tsx:25`)
Hoy **todo** `Press` dispara `selectionAsync`. Nuevo contrato: navegar = ninguna; botón primario que confirma = `impactAsync(Light)`; tick de selector/segmentado/scrub = `selectionAsync`; acción completada = `notificationAsync(Success)`; error/SOS = `Error`; una por acción; siempre con feedback visual equivalente. Prop `haptic?: 'none'|'light'|'success'|'tick'`.

### 2.9 Reglas anti-vibecode propias de Orbit
Sin eyebrow, sin mayúsculas, sin sparkline de 20 pt como adorno, sin 4 baldosas iguales, sin icono en cuadro de color por fila, sin emoji, sin degradado decorativo, sin "tarjeta por todo". Cada pantalla tiene **un objeto dominante** y su pregunta: Hoy "¿estoy bien?", Mascota "¿cómo está ella (y yo)?", Protocolos "¿qué hago ahora?", Yo "¿cómo voy?".

---

## 3. Lista de problemas por impacto (resumen ejecutivo)

| # | Impacto | Problema | Dónde |
|---|---|---|---|
| 1 | Crítico | 6 pestañas → "Más" en iOS | `MainTabs.tsx:64-69` |
| 2 | Crítico | Toast no se cierra jamás | `store.ts:181`, `Toast.tsx` |
| 3 | Crítico | Contenido bajo el título grande en Protocolos/Check-in | `ProtocolsScreen.tsx:31`, `CheckInScreen.tsx:39`, `ProtocolDetail:82` |
| 4 | Crítico | "Resuelto" de emergencia a un toque; hápticos en conflicto | `EmergencyTakeover.tsx:31,54` |
| 5 | Alto | Hoy sin objeto visual: baldosas idénticas + sparkline diminuta | `TodayScreen.tsx:62-68`, `MetricTile.tsx` |
| 6 | Alto | Mascota = círculo con dos puntos; chat como filas de tabla | `Creature.tsx`, `PetScreen.tsx:115-127` |
| 7 | Alto | Logros = candados y texto | `AchievementsGrid.tsx` |
| 8 | Alto | Perfil: "Esta semana" muestra totales acumulados; Ajustes en segmentado | `ProfileScreen.tsx:32-47` |
| 9 | Alto | Modo nave: rejilla 3+2 con huérfano; desmonta toda la navegación | `ShipHud.tsx:44-52`, `App.tsx:26-30` |
| 10 | Alto | RCP: contador pequeño, pulso minúsculo, magic numbers | `CprGuide.tsx:28,75` |
| 11 | Medio | Respiración: dos relojes desincronizados; disco plano | `Breathing.tsx:23,38,54` |
| 12 | Medio | Check-in: campos invisibles, Ionicons, metáforas mezcladas | `CheckInScreen.tsx:16,18` |
| 13 | Medio | SOS sin progreso de pulsación; icono ambiguo | `SosButton.tsx:17,25` |
| 14 | Medio | BodyMap: zonas de 8-14 pt, silueta de rectángulos | `BodyMap.tsx:11-15` |
| 15 | Medio | Juego: `PanResponder` + `setState` por frame; colores de estado como decoración | `GameScreen.tsx:21-50,93,95` |
| 16 | Medio | Detalles vía `Modal` propio, no hoja nativa | `TodayScreen.tsx:103,113`, `SessionFlow.tsx:59` |
| 17 | Bajo | `ScreenHeader`, `FormSection`, `FeedRow` con tics de plantilla | ver §4 |

---

## 4. Componentes compartidos (`components/ui`, `components/layout`)

### 4.1 Tab bar — `MainTabs.tsx`
**Mal**: 6 destinos (`:64-69`) → "Más". Check-in es una acción diaria, no una sección. `tabIcon` devuelve solo `{sfSymbol}` sin variante seleccionada. `headerRight: SosButton` en cada stack hace que el SOS compita con botones propios de la pantalla. TS: `getImageSourceSync` no tipado (`:58`).
**Referencia**: Apple Health (5 tabs: Resumen, Compartir, Explorar) y HIG tab bars (3-5).
**Spec**:
- 5 pestañas: **Hoy · Mascota · Protocolos · Juego · Yo**. Check-in sale como botón `square.and.pencil` en el `headerRight` de Hoy (junto a SOS) **y** como tarjeta "Check-in de hoy" dentro de Hoy hasta que se envía; abre `presentation: 'formSheet'`.
- Iconos con par: `sfSymbol: { default: 'heart.text.square', selected: 'heart.text.square.fill' }` (idem `pawprint`/`.fill`, `list.bullet.clipboard`/`.fill`, `gamecontroller`/`.fill`, `person.crop.circle`/`.fill`).
- `headerRight` con SOS solo en Hoy y Protocolos; en Juego y Mascota no (tapa el juego; en Mascota roba foco). En el resto el SOS vive en Hoy. Si el capitán exige SOS siempre: botón flotante inferior derecho 56 pt sobre la tab bar, no en la barra de navegación.
- Badge en Protocolos con el número de protocolos pendientes (`tabBarBadge`), valor `'•'` si hay uno crítico.
- Sin animación entre pestañas (nativo ya lo hace bien).

### 4.2 `ScreenHeader.tsx` (13 líneas)
**Mal**: kicker azul en mayúsculas bajo el título grande (`:9`) = eyebrow, repite el título nativo; las pantallas le pasan `title` que no existe.
**Spec**: **eliminar el componente**. El título grande lo pone el stack. El subtítulo útil se convierte en una línea `body` 15 `muted` como primer hijo del `ScrollView` (`paddingHorizontal 16, paddingBottom 16`) con datos reales: Hoy "Día 142 · banda, manga y chaleco conectados", Protocolos "2 pendientes · 1 crítico". Si no hay dato útil, no hay subtítulo.

### 4.3 `FormSection.tsx`
**Mal**: cabecera en mayúsculas (`:9`); radio 10 está bien para filas pero es el único contenedor, y se usa para cosas que no son filas (anillos, `BodyMap`, botones, un `TextInput` desnudo).
**Spec**: (a) cabecera `small` 13/400 `muted` sentence case, `paddingHorizontal 16`, 6 pt sobre el grupo; (b) pie `small` `faint`; (c) para contenido visual usar el nuevo `Card` (radio 20, padding 16) y el nuevo `Section` (título 20/600 fuera de la tarjeta + acción "Ver todo" `accent` 15 a la derecha); (d) `TextInput` siempre dentro de una fila con padding 16 (`SettingsRow`).

### 4.4 `FeedRow.tsx`
**Mal**: `StatusMark` encima del título (`:21`); sin hueco para icono líder; `numberOfLines={2}` para título pero el valor trailing puede comprimirlo; el divisor es `absolute` dentro de `body` y se corta al pulsar la fila (la tinta `raised` pinta debajo del divisor, bien, pero con `left:16` fijo no respeta icono).
**Spec**: props `{ icon?, title, subtitle?, value?, status?, onPress, destructive? }`. Altura mín. 44, `paddingVertical 11`, gap 12. Icono líder 22 pt `SymbolView hierarchical`, columna 28, divisor `left: 16 + (icon ? 40 : 0)`. `status` pinta `StatusMark` **trailing** (glifo 14 + texto 13) o, si hay `value`, el glifo solo y el texto en `accessibilityLabel`. `accessibilityRole="button"`, `accessibilityHint` con el destino.

### 4.5 `Press.tsx`
**Mal**: háptico `selectionAsync` en todo (`:25`); `opacity 0.6` pulsado en botones (`:29`); comentario "sin escala" contradice animate-expo; `hitSlop` ausente (SOS de cabecera 26 + 8 padding = 42 pt, bajo el mínimo de 44).
**Spec**: variantes `row` (tinte), `button` (opacity 0.7 + scale 0.98, 120 ms), `card` (scale 0.98). `hitSlop={8}` por defecto; `pressRetentionOffset={{top:12,bottom:12,left:12,right:12}}`. Háptico según §2.8.

### 4.6 `Icon.tsx`
Correcto como wrapper. Añadir props `type?: 'hierarchical'|'palette'|'monochrome'`, `colors?`, `weight?`, `animation?` y mapear a `SymbolView` (`type`, `colors`, `weight`, `animationSpec`). Ampliar `ANDROID` con la tabla de §2.4. Los nombres de símbolo fuera del mapa deben dar error de tipo (ya lo da: bien).

### 4.7 `StatusMark.tsx`
Bien (forma + texto, 12 pt). Cambios: glifo 14 pt `hierarchical`; ok = `checkmark.circle.fill`, watch = `exclamationmark.triangle.fill`, critical = `xmark.octagon.fill` (se mantienen: la forma distingue sin color); en `accent` usar `circle.fill` 8 pt (punto). Variante `compact` (solo glifo + `accessibilityLabel`) para tarjetas pequeñas.

### 4.8 `MetricTile.tsx` → `VitalCard` (rediseño)
**Mal**: `width` fijo cuadrado, label 13 muted, valor 28, unidad inline, `StatusMark` + `Sparkline` de ~55×20 abajo (`:26-29`); cuatro iguales sin jerarquía; el sparkline no tiene escala ni banda y siempre es azul; `Press haptic={false}` pero tarjeta sin feedback de escala.
**Referencia**: Health tarjeta de Resumen + Watch Vitals (barra de rango).
**Spec** (ancho = (W − 32 − 12)/2 ≈ 175 en iPhone 15; alto ≈ 132):
```
┌──────────────────────────┐ radio 20, surface, padding 16
│ ♥  Ritmo cardiaco   2 min │  símbolo hierarchical 15 + label 13/600 color de estado; "hace 2 min" 11 faint
│                           │
│ 72 lpm                    │  figure 28/600 + unidad 15 muted; "—" si no hay dato
│ ▬▬▬▬▬▬▬▬▬▬▬●▬▬▬▬▬▬▬▬     │  RangeBar 8 pt alto: pista raised, banda normal 18 % ok, punto 12 pt color de estado, borde bg 2 pt
│ Normal                    │  StatusMark compact + texto 13
└──────────────────────────┘
```
`RangeBar`: escala = `[criticalLow, criticalHigh]` de `THRESHOLDS`; banda = `[watchLow, watchHigh]`; punto con `withSpring({duration: 400, dampingRatio: 1})` al cambiar el valor (cada 2 s, solo cuando |Δ| > 0.5 % para no vibrar). Toque → hoja de detalle (§5.4). `accessibilityValue={{text: '72 latidos por minuto, normal'}}`.
La gráfica de 24 h **no** va en la tarjeta (taste: sin sparkline en KPI); sí en el detalle y en "Aspectos destacados".

### 4.9 `Sparkline.tsx` → `TrendChart.tsx`
**Mal**: sin `strokeLinejoin`, sin banda, sin escala, sin selección, color fijo `accent`, recalcula `Math.min(...values)` en cada render con 1440 puntos.
**Spec**: ver §2.6. Props `{ values:{t,v}[], metric, height, compact }`; `useMemo` para los puntos; decimar a ≤ 120 puntos (mediana por cubo) antes de pintar; `accessibilityLabel` resumido ("24 h: mín 61, máx 94, ahora 72").

### 4.10 `EmptyState.tsx`
**Mal**: icono 28 gris, frase 17, sin acción.
**Referencia**: `ContentUnavailableView`.
**Spec**: icono 44 pt `hierarchical` `muted` (tras ~12 pt de aire); título `title` 22/700 centrado; descripción `body` 15 `muted` máx. 280 pt ancho; acción opcional botón `borderedProminent`-like (accent, radio 12, 44 pt). Ej. Protocolos vacío: `checkmark.seal` / "Todo al día" / "La nave no te ha pedido nada".

### 4.11 `SegmentedTabs.tsx`
Bien (UISegmentedControl nativo). Añadir `style={{height: 32}}`; en cabecera de pantalla ponerlo **fuera** del scroll como `headerSearchBar`-like: en iOS 26 sigue siendo un control normal. Háptico `selectionAsync` ya correcto.

### 4.12 `SettingsGroup.tsx` / `SettingsRow`
Delegan en `FormSection`: bien. `SettingsRow` apila hijos con `gap 8` (`:14`) y cada campo repite etiqueta 13 muted arriba (`SettingsScreen.tsx:27`): sustituir por **fila `LabeledContent`**: etiqueta 17 a la izquierda (ancho 110), `TextInput` 17 alineado a la derecha `muted→text` al enfocar, sin fondo propio.

### 4.13 `Toast.tsx` (bug + diseño)
**Mal**: nunca se cierra (nadie llama `showToast(null)`; `Toast` solo monta/desmonta por `toast ?`). Posición `top: insets.top + 8` pisa el título grande; sin símbolo; sin háptico propio; `exiting` nunca corre porque el estado no cambia.
**Referencia**: isla de confirmación de iOS.
**Spec**: `useEffect` en `App.tsx` o en `showToast`: `setTimeout(() => set({toast:null}), 2400)` con cancelación al llegar otro. Cápsula **centrada**, alto 44, `paddingHorizontal 16`, `raised`, radio `full`, símbolo 17 (`checkmark.circle.fill` ok / `star.circle.fill` logro) + texto 15/600; aparece desde `translateY(-12) + opacity 0` a reposo `{duration 300, dampingRatio 0.8}`, sale `FadeOut 150`. Posición `insets.top + 4` (bajo la isla), `pointerEvents="none"`. Para logros: toast "+150 XP" con medalla 24 mini. VoiceOver: `AccessibilityInfo.announceForAccessibility(text)`.

### 4.14 `SosButton.tsx`
**Mal**: pulsar 1 s sin ningún indicio (`:17`); `Alert` bloqueante después (`:14`); el icono `exclamationmark.circle.fill` rojo en la barra parece una insignia de aviso; objetivo táctil 42 pt.
**Referencia**: SOS de iPhone (cuenta atrás visible) + brief (≥ 72 pt en HUD).
**Spec**: cabecera: cápsula roja `emergency` 32×56, texto "SOS" 15/700 blanco, `hitSlop 8` (objetivo ≥ 44). Al mantener: un **anillo** (22 pt, trazo 3) alrededor de la cápsula se llena 0→100 % en 1000 ms (`withTiming linear`), `impactAsync(Light)` a 0 %, `Medium` a 33 %, `Heavy` a 66 %, `notificationAsync(Error)` al completar; soltar antes cancela con `withTiming(0, 120)`. Tras enviar: la cápsula pasa a "Enviado" con `checkmark` 3 s (sin `Alert`); `AccessibilityInfo` + acción personalizada `accessibilityActions=[{name:'activate'}]` para VoiceOver (mantener no es accesible). Versión grande (modo nave): 72 pt de alto, texto "Mantén para SOS" 20/700, mismo anillo como borde de 4 pt.

### 4.15 `BodyMap.tsx`
**Mal**: figura de 5 rectángulos (`:11-15`); brazos 8-14 pt de ancho y piernas ≈ 16 pt (objetivos táctiles muy bajo 44); selección = `accent` sin relación con el estado; sin etiquetas.
**Referencia**: Health › Cuerpo (silueta + puntos) y Apple Fitness+ muscle maps.
**Spec**: silueta frontal con un único `Path` suave (cabeza elipse, cuello, hombros curvados, torso con cintura, brazos con codo, piernas con rodilla) en `raised`; 5 **zonas** invisibles de toque de ≥ 56 pt (rectángulos transparentes con `hitSlop`) y encima **marcadores**: anillo 28 pt cuyo color es el peor estado de las métricas de la zona (`ZONES[z].metrics`), con valor principal en una cápsula de 13 pt conectada por una línea de 1 px `hairline` a ambos lados de la figura (izquierda: cabeza, pecho; derecha: brazos, abdomen, piernas). Zona seleccionada: anillo se llena `accent` 2 pt y la figura hace `scale 1.02` 150 ms. Tamaño 220×440 centrado en una `Card`. La lista de zonas de abajo se mantiene (accesibilidad) pero como `FeedRow` sin tarjeta propia.

---

## 5. Hoy (vitales + BodyMap) — `features/today/TodayScreen.tsx`

### 5.1 Qué está mal
- Primera pantalla = `StatusMark` suelto + 4 baldosas iguales (`:62-68`). La pregunta "¿estoy bien?" no tiene un objeto visual.
- "Resto de hoy" (`:69`) es una tabla de 5 filas donde `badge` (estado) está encima del título y el valor a la derecha sin unidad (`formatMetric`): ruido de lista.
- `BodyMap` pequeño (120 pt) en una fila de grupo, con la lista de zonas al lado (`:84-96`): no se entiende para qué sirve.
- Check-in como botón azul de ancho completo al final (`:98`), invisible bajo el scroll.
- Detalle de métrica y de zona en `Modal` propio con "Cerrar" a mano (`:103,113`), sin detents, sin agarrador, 100 % texto; el detalle muestra `hero` 34 + `Sparkline` 96 sin eje (`:118-121`).
- Cálculo `tile = (width − 36 − 8)/2` ignora `space` real y se rompe con rotación (no hay rotación porque cambia a HUD, pero sí en iPad compat).

### 5.2 Estructura nueva (de arriba abajo)
Título grande nativo "Hoy". Sin kicker.
1. **Línea de contexto** (`body` 15 muted): "Día 142 · Banda, manga y chaleco conectados" — los tres con `antenna.radiowaves.left.and.right` 13; los desconectados en `faint` con `slash`.
2. **Hero `StatusRing`** (Card radio 20, alto 188): izquierda anillo segmentado 132 pt; derecha texto.
   - Anillo: 4 arcos (hr, spo2, bpSys, temp), cada uno 90° − 6° de hueco, trazo 12, extremos redondos, color = estado de esa métrica; centro "4/4" `display` 40 + "en rango" 13 muted. Si hay un watch/critical, su arco late **una vez** a la entrada (opacidad .5→1, 400 ms) y el centro muestra "3/4".
   - Derecha: `title` 22/700 ("Todo en rango" / "Presión fuera de rango"); debajo `body` 15 muted con el "qué hago" de `ACTION` de la peor métrica; debajo **botón** "Hacer check-in" (`accent`, 36 pt alto, 15/600) **solo si no hay check-in hoy**; si lo hay: `StatusMark ok` "Check-in enviado a las 08:12".
   - Toque en el anillo → hoja con las 4 métricas.
3. **Sección "Signos vitales"** (`Section` título 20/600, acción "Ver todo"): rejilla 2×2 de `VitalCard` (§4.8): hr, spo2, bpSys (con "/ dia" en `small` al lado), temp.
4. **Sección "Aspectos destacados"** (scroll horizontal paginado, tarjetas 280×168, snap 296): **cada una** = frase + gráfica comparativa real. Fuente: `behaviorInsights` (ids `sleep_drop`, `mood_drop`, `social_drop`, `escape`, `sleep_mood`, `move_stress`) + 1 tarjeta de "Mayor cambio en 24 h" derivada de `history`. Gráfica de la tarjeta: 7 barras (`daySummaries`) de la serie citada, barra de hoy en `accent`, resto `raised`. Si no hay ≥ 5 días: una tarjeta "Aún reuniendo datos · 2 de 5 días" con anillo de progreso.
5. **Sección "Objetivos de hoy"** (Card única, 3 anillos concéntricos a la izquierda 112 pt, leyenda a la derecha): Actividad `activity/120 min`, Sueño `sleep/8 h`, Agua `water/2.5 L` en la familia `accent` (100/72/48 %). Cada línea de la leyenda: símbolo + nombre + `valor / meta`. Comida (`kcal`) como fila debajo con `fork.knife`. Reutiliza el pro-rateo `dayProgress` de `shared` para pintar una **marca de 1 px** del avance esperado del día en cada anillo (como la "banda" de la gráfica).
6. **Sección "Cuerpo"**: `Card` con `BodyMap` nuevo (§4.15) 220×440. Es el único sitio donde la figura aparece.
7. Fin. El check-in ya no es botón a pie de página.

### 5.3 Estados
- Sin datos (`Object.keys(metrics).length === 0`): anillo apagado `raised`, centro "—", título "Esperando datos de tus sensores", `VitalCard` con `—`; **skeleton** de 600 ms antes de ese estado para no saltar.
- Valor `undefined` en una sola métrica: tarjeta con `—` y "Sin señal de la banda" en 13 faint.
- Offline del hub: badge discreto `wifi.slash` 13 `faint` en la línea de contexto (no alarma).
- Crítico: tarjeta con borde 1.5 px `critical` (única excepción de borde; hoy ningún borde) y el hero cambia título a coral; **no** usar `emergency`.

### 5.4 Detalle de métrica → hoja nativa
`presentation: 'formSheet'`, `sheetAllowedDetents: [0.62, 1]`, `sheetGrabberVisible: true`, `sheetCornerRadius: 28`, `sheetInitialDetentIndex: 0`. Contenido (de arriba):
1. Cabecera: símbolo 22 + nombre 17/600; derecha botón de cierre `xmark.circle.fill` `faint` 28 (o `headerRight`).
2. `display` 40/700 + unidad 17 muted + `StatusMark`.
3. **`TrendChart` 220 pt** con banda normal y selección por arrastre (§2.6).
4. Segmentado "24 h · 7 días" (7 días llega cuando `days` tenga ≥ 2 días; hasta entonces deshabilitado).
5. Grupo inset (3 filas con icono líder): `info.circle` "Qué significa" (`METRIC_META.info`), `sensor` "Cómo se mide" (`HOW`), `checklist` "Qué hacer".
6. "Qué hacer" en tarjeta `raised` con **acciones reales**: ok → nada; watch → botón "Repetir en 30 min" (programa recordatorio) y "Anotarlo en el check-in"; critical → botón coral "Avisar al capitán" — requiere un mensaje nuevo en el contrato de `shared` (hoy solo existe `sos`); hasta entonces, enlazar al SOS con el texto de la métrica.
Presentación: se sube con `navigation.navigate('MetricDetail', {metric})` en el stack de Hoy, no con `useState` + `Modal`.

### 5.5 Hoja de zona
`formSheet` 0.4 de alto: título "Pecho", las métricas de la zona como `FeedRow` con `RangeBar` pequeña de 6 pt bajo el título, tap → `MetricDetail`.

---

## 6. Mascota — `features/pet/*`

### 6.1 Qué está mal
- `Creature.tsx`: círculo `accent` + dos puntos + una boca (`:38-50`). Sin cuerpo, sin extremidades, sin carácter; los tres estados solo cambian la curva de la boca; parpadeo con `setState` y `setTimeout` anidados (`:25-27`); `breathe.value =` fuera de `.set()`.
- `PetScreen`: criatura + 3 barras lineales con etiqueta 13 (`:82-93`) — parece un formulario, no un personaje; "Sesiones" con 3 píldoras de hora (`:99-104`); "Conversación" como **filas de tabla** con la persona en el `subtitle` (`:117-119`); el campo de texto dentro del grupo, debajo de 20 filas, sin gestionar teclado (`KeyboardAvoidingView` ausente).
- Aviso de sesión (`SessionBanner`) con `bottom: 88` fijo para no tapar la tab bar (`SessionFlow.tsx:28`): hack que falla con safe area distinta; `Modal` propio para el flujo de sesión (`:59`).
- Tiempo con la mascota se cuenta en `setInterval` mientras la pestaña tiene foco, aunque la app esté en segundo plano (no es diseño, pero afecta honestidad de "XX min").

### 6.2 Personaje nuevo: **Orbi** (SVG por capas, `Creature.tsx`)
Idea: una criatura-astronauta pequeña **que sale de la propia identidad Orbit** (órbita + casco), no un emoji genérico. Canvas 200×200 viewBox.
- **Cuerpo**: gota/“bellota” `Path` 120×104, color `accent`, parte superior más ancha; sombra de contacto elipse `rgba(0,0,0,.35)` 80×10 bajo el cuerpo.
- **Visor**: óvalo 92×56 `#000` al 85 % (cristal) con un reflejo plano (arco blanco 18 % de opacidad, sin degradado) arriba a la izquierda. Dentro, los **ojos**: óvalos 14×20 `text`, con pupila 6 pt y brillo 3 pt; las pupilas siguen el dedo (`Gesture.Pan` o el `onTouchMove` → desplazamiento máx. 4 pt, `withSpring {duration 200, dampingRatio 1}`).
- **Antena** con bulbo (`Circle r5`) cuyo color = estado de ánimo: `accent` normal, `status.watch` cansada, `muted` triste. Es **el único** lugar donde cambia color por estado.
- **Mejillas**: óvalos 14×8 `text` al 12 % (solo feliz).
- **Brazos** 2 óvalos pequeños que cuelgan y se levantan en "contenta".
- **Estados** (cambia forma, no solo la boca): *feliz* → ojos redondos, sonrisa con hoyuelo, antena arriba, brazos levantados 10°; *cansada* → párpados a medio cerrar (`Rect` encima de los ojos 50 % alto), bostezo cada 8 s, antena doblada 25°; *triste* → cejas inclinadas, boca en U invertida, cuerpo 6 % más bajo (`scaleY .94`), una gota (óvalo `accent` 60 %) que cae cada 4 s.
- **Idle** (movimiento #2): respiración `scaleY 1→1.035` + `translateY −2` 2400 ms `Easing.bezier(.45,0,.55,1)` ida y vuelta (UI thread, `withRepeat`, `.set()`); parpadeo **en Reanimated** (`scaleY` de los párpados con `withSequence`, intervalo aleatorio 2.8-5 s, no `setState`).
- **Toque** (movimiento #7): squash `scale {x:1.08, y:0.9}` 90 ms → stretch `{0.96, 1.06}` y salto `translateY −14` con `{duration 400, dampingRatio .8}`; `impactAsync(Light)`; 3 `heart.fill` 14 pt `accent` suben 24 pt y desaparecen en 600 ms (escalonados 80 ms). Máx. 1 reacción/450 ms.
- **Reduce Motion**: sin respiración, sin salto; el parpadeo se sustituye por cambio de párpado instantáneo; los corazones hacen solo `opacity`.
- Tamaños: 200 en Mascota, 64 en HUD de nave y en la fila de chat (avatar 32).

### 6.3 Escena (card de 280 pt de alto, radio 28 — la pieza visual más grande de la app)
`Card` `surface` con: estrellas estáticas (14 puntos `Circle r1` `text` 35 %, semilla fija), un arco de planeta `accent` al 14 % que sube 40 pt en la esquina inferior, Orbi centrado 200 pt a 48 pt del borde inferior. Encima, **burbuja de pensamiento** (cápsula `raised`, 15 pt, máx. 2 líneas) con **una frase de estado**: "Hoy dormiste poco. ¿Respiramos un minuto?" (derivada de `petMood` y `petNeeds`). Toque en la burbuja → abre sesión.

### 6.4 Necesidades (de barras a tres medidores con identidad)
Bajo la escena, una fila de **3 mini-anillos** de 56 pt (trazo 6, extremos redondos) con símbolo al centro: `fork.knife` (Alimento), `moon.zzz.fill` (Descanso), `face.smiling` (Ánimo); etiqueta 13 muted debajo y `%` 13 `text`. Color: familia `accent` (100/100/100 %) y **solo** pasa a `watch` si < 35 %. Barrido de entrada 900 ms. Sin `Text` "Alimento" 13 mayúsculas.

### 6.5 Sesiones
Bajo los anillos: **tarjeta "Sesión guiada · 4 min"** con `figure.mind.and.body` 28 palette `[text, accent]`. Estado vacío: botón "Programar" que abre `@react-native-community/datetimepicker` (`display="compact"`, `mode="datetime"`, instalar con `npx expo install`); con sesiones: fila "Hoy 21:00 · en 3 h" + menú nativo (`ContextMenu`/`Alert` de acciones) "Posponer / Cancelar". Quitar las 3 píldoras fijas (`PetScreen.tsx:17-21`); atajo "Ahora" como botón `bordered`.
Flujo (`SessionFlow`): `Modal` → `presentation: 'fullScreenModal'` en stack propio; 4 pasos con **barra de progreso de 4 segmentos** arriba (2 pt, `raised`/`accent`) en lugar de "Paso 1 de 4" 13 muted; emociones como **grid 2×3 de botones 88 pt** con SF symbol (`sun.max`, `cloud.rain`, `cloud.bolt`, `moon.stars`, `bolt.fill`) en vez de píldoras de texto; respiración con la flor (§8).
Aviso (`SessionBanner`): sustituir por tarjeta **dentro de Hoy** (sobre "Signos vitales") y `tabBarBadge` en Mascota; eliminar `bottom: 88`. Si se mantiene flotante: `useBottomTabBarHeight()` de `react-native-bottom-tabs` + `insets.bottom + 8`.

### 6.6 Chat (Finch/Mensajes)
- **Pantalla de chat propia**: botón "Hablar con Orbi" `bubble.left.fill` bajo las necesidades → `push` a `Chat` (stack, título "Orbi", `headerLargeTitle: false`).
- Burbujas: usuario a la derecha `accent` / texto blanco; Orbi a la izquierda `raised` / texto blanco; radio 18 con esquina "cola" 4 pt hacia el emisor; `maxWidth 78 %`; padding 10×14; texto 17; avatar Orbi 28 solo en el primer mensaje de cada bloque; separador de hora centrado 11 `faint` cada > 15 min.
- Escribiendo: 3 puntos que suben/bajan 4 pt en cascada 120 ms (`withRepeat`), reemplaza "Orbit está pensando…" (`:120`). Reduce Motion: 3 puntos fijos con `opacity` pulsando.
- Compositor: barra inferior pegada al teclado (`KeyboardAvoidingView behavior="padding"` con `keyboardVerticalOffset = headerHeight`; o `react-native-keyboard-controller` si se acepta la dependencia), `TextInput` multilínea `raised` radio 20, botón enviar circular 32 `accent` con `arrow.up` 15 que aparece al haber texto (`scale .9→1` 120 ms). `keyboardDismissMode="interactive"`.
- Persistencia: se conservan los últimos 20 (`chat.slice(-20)`, `:117`); el resto se carga con "Mensajes anteriores".
- Nunca diagnostica: si `petReply` toca temas de crisis, tarjeta fija bajo el mensaje con "Hablar con el capitán" (copy del brief §5).

---

## 7. Protocolos — `features/protocols/*`

### 7.1 Mal
- `ProtocolDetail` se monta por `useState` (`ProtocolsScreen.tsx:27`): sin push nativo, sin gesto atrás, el título grande sigue diciendo "Protocolos", y "Volver" es un `Press` de texto (`:83`). El scroll no inicia bajo la cabecera transparente (`:31`, `:82`).
- Kicker y `title` extra (`:32`) → error TS.
- La lista es `FeedRow` en un `View` sin `FormSection` (se ven filas sueltas sin fondo; `:35-44`): **no hay contenedor**.
- Pasos = texto "1. Llama al AED" en un `Press` (`:90-92`): el estado "hecho" solo cambia de blanco a gris, sin casilla.
- Temporizador `figure` 28 con botón de texto (`:98-99`).
- `JumpingJacks`: `setState` cada 500 ms; `CprGuide` y `Breathing` se muestran dentro del scroll con el resto, sin jerarquía.

### 7.2 Lista
- Cabecera nativa "Protocolos"; segmentado Emergencia/Física/Mental como primer elemento del scroll.
- **Hero de lo pendiente** (solo si hay): tarjeta 20 con el protocolo más urgente: `StatusMark`, título 22/700, motivo 15 muted, botón "Empezar" `accent` 44 pt, a la derecha anillo de progreso de pasos 56 pt ("2/5").
- Resto en `FormSection` real con `FeedRow` con icono líder por tipo (`cross.case.fill` critical, `figure.run` accent, `brain.head.profile` muted; hierarchical), subtítulo = `reason`, trailing = duración "5 min" + chevron; hecho → `checkmark.circle.fill` `ok`.
- Simulacro RCP como fila "Entrenamiento" con `heart.text.square` + etiqueta, **fuera** del grupo, como acción secundaria al final de Emergencia.
- Vacío: `EmptyState` (§4.10).

### 7.3 Detalle (push nativo `ProtocolDetail`, `headerLargeTitle: false`, título = tipo)
1. Cabecera de contenido: título 22/700, motivo `body` muted, chip de duración.
2. **Anillo de progreso** 72 pt junto al título: "2/5".
3. **Pasos** en grupo inset: cada fila = casilla `circle` 24 pt → `checkmark.circle.fill` `accent` (`bounce` del símbolo + `impactAsync(Light)`), texto 17; al completarse se tacha **no**, solo `muted`; filas 52 pt mín.; el paso actual con fondo `raised` y número en `accent`.
4. **Temporizador** (si `durationMin`): anillo 160 pt cuya cuenta atrás se dibuja (`strokeDashoffset` linear, no por `setState` por segundo: el texto sí actualiza por segundo), `display` 40 `mm:ss` dentro, debajo botón píldora "Iniciar/Pausar" 44 pt; al llegar a 0 `notificationAsync(Success)`.
5. Guía embebida (respiración / jumping jacks / RCP) en su propia `Card` 20.
6. Barra de acción **inferior fija** (safe area + 8): "Marcar como hecho", `accent`, 50 pt, **deshabilitada hasta que todos los pasos estén marcados** (con texto de ayuda "Faltan 2 pasos"); `notificationAsync(Success)` y toast "Protocolo enviado al capitán".

### 7.4 `Breathing.tsx`
**Mal**: dos relojes (`withRepeat/withSequence` en `:23` y `setInterval` en `:38`) arrancan en instantes distintos y derivan; un disco `accent` 85 % de 200 pt (`:54`); `onDone` en el efecto con `cycles` mal compuesto; con Reduce Motion deja `size = .75` pero sigue vibrando cada 4 s.
**Referencia**: Apple Watch Respirar.
**Spec**: **un solo reloj** — `useSharedValue(progress)` 0→1 sobre 16 s; la fase se deriva con `useAnimatedReaction(() => Math.floor(progress.get()*4), (p, prev) => { if (p !== prev) scheduleOnRN(setPhase, p) })` y el háptico se dispara en ese mismo callback. Flor: 6 círculos 120 pt `accent` al 22 % rotados 0/60/…/300°, que se separan 0→34 pt (inhalar), mantienen, vuelven (exhalar), mantienen; centro: fase 22/700 + cuenta 1-4 `display` 40 `muted`. Anillo de sesión: arco 1.5 pt en el borde exterior con el avance de los ciclos (`cycles`). Háptico: `impactAsync(Light)` a la mitad de cada fase de inhalar (3 toques) y uno suave al exhalar. Reduce Motion: círculo estático de radio 70 con color `accent` 30 %, la fase y la cuenta cambian por texto, háptico se mantiene.

### 7.5 `JumpingJacks.tsx`
**Mal**: figura de palo con alternancia binaria cada 500 ms por `setState` (`:14-19`), sin transición.
**Spec**: sustituir por **contador de repeticiones con metrónomo**: anillo 160 pt que se llena cada 30 reps, número `display` 40, pulso de 500 ms con `scale 1.04` en el anillo y `selectionAsync` cada rep. Figura opcional en SF Symbol `figure.jumprope` / `figure.mixed.cardio` 64 pt `hierarchical` (`variableAnimationSpec: { iterative }`). Sin `setState` por tick: contador en `useSharedValue` + `useDerivedValue` → `TextInput` animado (`animatedProps`).

---

## 8. Emergencia — `features/emergency/*`

### 8.1 Mal
- "Resuelto" a un toque (`EmergencyTakeover.tsx:54`): un dedo con guante termina la guía de RCP.
- Háptico `Warning` cada 1.5 s (`:31`) **más** `Medium` a 110/min (`CprGuide.tsx:47`) = ruido; el ritmo RCP debe ser la única señal.
- `Diagram` con anillo superpuesto con `top: 70, left: 110` (`CprGuide.tsx:28`), números mágicos que no siguen a las manos del dibujo; pulso `scale 1.25` de un anillo de 28 pt (`:51`) casi invisible a un metro.
- Contador `hero` 34 pt (`:75`) y texto de instrucción 17 + dos párrafos 13 muted; la instrucción clave "Mitad inferior del esternón, 5-6 cm" tiene el mismo peso que la nota de AED.
- Un `ScrollView` en emergencia: el usuario no debe tener que desplazarse para llegar al botón.
- Sin diferenciación visual del rescatista nº 1/2/3 salvo el título.

### 8.2 Layout (una sola acción por pantalla, sin scroll en iPhone 13 en adelante)
```
[ barra emergency 6 pt, ancho completo, safe-area top ]
Emergencia · Paro cardiaco                     (caption 13/600 coral→emergency)
Leo necesita RCP                               (hero 34/700, 2 líneas máx.)
Eres el más cercano · a 12 m                   (body 17 muted)

        ┌─────── anillo 260 pt ───────┐
        │  30 puntos que se llenan    │   trazo 14, 30 segmentos, cada compresión llena uno
        │         23                  │   `hud` 56/600 (excepción permitida), "de 30" 17 muted
        └─────────────────────────────┘
        Mitad inferior del esternón · 5–6 cm   (title 22/700 centrado)
        Cambio de reanimador en 1:34           (body 17 muted)

[ Resuelto — mantén 1 s ]                      (50 pt, raised, 1 s hold con anillo)
```
- **Metrónomo visual**: el anillo exterior completo (no un punto) hace `opacity .35→1→.35` y `scale 1→1.03` en cada pulso (120 ms subida, 320 ms bajada = ciclo de 545 ms a 110/min); además un **borde de pantalla** de 6 pt `emergency` que parpadea a la par (visible de reojo). Sin figura de palo en el modo de guía principal; el diagrama de Evetts-Russomano pasa a un botón "Ver postura" (`figure.stand` → `formSheet` 0.6).
- **Ventilaciones**: la pantalla cambia a fondo `raised`, texto "2 ventilaciones" `hero`, **cuenta regresiva 6 s** como anillo (el actual `setTimeout 6000`, `:43`), `notificationAsync(Warning)` al empezar y al terminar.
- **Háptico**: borrar el `setInterval` de 1.5 s del takeover; solo `impact Medium` por compresión (110/min) y `Warning` al pasar a ventilación y al llegar al cambio de reanimador. Reduce Motion: sin `scale`, solo `opacity` y el contador; el háptico se mantiene (es la señal principal).
- **Víctima**: la pantalla `victim` no muestra RCP: título "Se avisó a Ana, Leo", cuerpo "No te levantes. Respira despacio.", icono `figure.mind.and.body`, y **ritmo de respiración de la víctima** (flor, §7.4) si `kind` = `panic`/`hypoxia`.
- **Resuelto**: `Press` con `onLongPress` + `delayLongPress 1000` y anillo de progreso (mismo que SOS §4.14). Texto "Mantén para marcar como resuelto". Al completar, `notificationAsync(Success)`.
- Aparición (movimiento #4): `Modal animationType="fade"`, el título entra con `translateY 8→0` + `opacity` 300 ms ease-out `[0.23,1,0.32,1]`; sin rebote.

---

## 9. Check-in — `features/checkin/CheckInScreen.tsx`

### 9.1 Mal
- Campos invisibles (`:18` + `FormSection.tsx:10`, ambos `surface`).
- Ionicons directos (`:3,46`), metáfora mezclada: `sad-outline`, `thumbs-down`, `remove-circle`, `thumbs-up`, `happy` (`:16`): un pulgar no es un ánimo.
- Cinco secciones del mismo peso: Ánimo, Estrés, Perspectiva, Lesiones, Noticias, Nota — es un formulario de seguro; no es el momento cálido que pide el brief.
- Tipos TS de `borderCurve` (`:18`) y `title` extra (`:40`).
- Tras enviar, el botón queda "Enviado por hoy" deshabilitado sin salir; no hay confirmación háptica ni vuelta a Hoy.
- Pregunta sensible ("noticia familiar difícil") como interruptor de la misma altura que el resto.

### 9.2 Spec — `formSheet` modal desde Hoy (detents [0.92], grabber, título "Check-in", `headerLeft` Cancelar, `headerRight` Enviar `accent` 17/600)
1. **Ánimo (objeto dominante)**: una **forma morfológica** como Estado de ánimo de iOS 17: un `Path` de pétalos (5-8, según nivel) 180 pt que pasa de círculo liso (muy bien) a forma encogida y angulosa (muy mal), color único `accent` con opacidad por nivel (no morado), centrada en una `Card` de 240 pt. Control: `Slider` vertical a la derecha (o arrastre sobre la forma con `Gesture.Pan`), 5 niveles discretos; `selectionAsync` al cruzar cada nivel; etiqueta del nivel 22/700 bajo la forma ("Bien") y sinónimo 15 muted ("Tranquilo").
2. **Estrés** y **Perspectiva de la misión**: `SegmentedTabs` 1-5 se queda (nativo) pero con etiquetas de extremos bajo el control (`small`: "Tranquilo" ← → "Muy alto"), sin pie `hint`.
3. **Lo que quieras contar** (una sola sección con 2 campos): "Molestias o lesiones" (placeholder "Ninguna") y "Nota"; ambos `raised` radio 10 dentro de filas (padding 16); `returnKeyType="done"`, `blurOnSubmit`.
4. **Noticias de casa**: fila inset con `Switch` nativo (`ios_backgroundColor: raised`, `trackColor.true: accent`) y copy "Recibí una noticia difícil de casa"; si se activa, aparece debajo, con `LayoutAnimation`/`FadeIn 150`, un texto de apoyo "Gracias por decirlo. Se lo haremos saber a tu cirujano de vuelo, no al equipo." y botón "Hablar con Orbi". Sensible → sin alarma ni color.
5. Enviar: `impactAsync(Light)` → `notificationAsync(Success)`, toast "Check-in enviado", cierra la hoja y en Hoy la tarjeta pasa a `ok`. Desbloqueo de logro en cadena (§11).
6. Teclado: `KeyboardAvoidingView`, `automaticallyAdjustKeyboardInsets` en el `ScrollView`.

---

## 10. Juego — `features/game/GameScreen.tsx`

### 10.1 Mal
- `PanResponder` (`:26`) y `bump()` por frame (`:50`), ambos vetados por animate-expo.
- Enemigos con `status.watch` y `status.critical` (`:93,95`): el color de estado de salud usado como decoración de juego; mezcla semánticas.
- Campo `surface` plano con cuadrados/triángulos = prototipo; texto de puntos/vidas en el subtítulo `small` (`:88`); `kicker` + título duplican la cabecera.
- Estado "Fin de la partida" como línea de texto (`:106`).

### 10.2 Spec
- Cabecera sólida (`opaque`) con título "Defensor"; **HUD del juego dentro del campo**: puntos `title` 22/700 arriba izquierda; vidas como 3 `heart.fill` 16 (`palette`) arriba derecha; récord `small` bajo los puntos.
- Campo negro `#000` (sin `surface`), 3 capas de estrellas (`Circle r 0.8/1.2/1.8`, opacidad 25/40/60 %) con scroll vertical infinito a 12/24/48 pt/s (`translateY` en Reanimated) — Reduce Motion: estáticas.
- Sprites: nave `accent` con propulsor (triángulo `text` que parpadea 60 ms); enemigos `text` (cuadrado, rombo, triángulo) con contorno 1.5 pt y **mismo color**; el que tiene `hp > 1` se dibuja con doble contorno (no ámbar). Disparos `accent` 3×10 pt. Explosión: 6 chispas `text` que se separan 18 pt en 250 ms.
- Entrada: `Gesture.Pan` (instalar `react-native-gesture-handler` con `npx expo install` y envolver el root en `GestureHandlerRootView`; hoy no está en `package.json`) escribiendo `shipX` en `SharedValue`; la lógica `tick(game, dt, shipX)` sigue en JS pero el pintado de nave/disparos usa `useAnimatedProps`; si se mantiene `bump`, limitar a 30 Hz.
- Fin de partida: hoja pequeña (`formSheet` 0.35) con puntos `display` 40, "Nuevo récord" + medalla si aplica, botón "Otra partida" `accent` y "Salir" `bordered`; `notificationAsync(Warning)` ya existe (`:73`); en récord `Success`.
- Primera vez: overlay con mano (`hand.draw`) y "Arrastra para mover. Dispara sola." 3 s.

---

## 11. Yo — `features/profile/*`

### 11.1 Estructura (de arriba abajo)
Título grande nativo "Yo" (**no** kicker con el nombre, `ProfileScreen.tsx:30`). `headerRight`: engranaje `gearshape` 22 → **push** `Ajustes` (stack), SOS ya no vive aquí. Sin segmentado Perfil/Ajustes (`:32`).
1. **Cabecera de identidad** (sin tarjeta): avatar 64 con **Orbi** o iniciales sobre `raised`, nombre `title` 22/700, `rol · crewId` 15 muted; a la derecha **anillo de XP** 56 pt hacia el siguiente nivel (`level = floor(xp/500)`), nivel en el centro. Derivar el nivel de `ACHIEVEMENTS` XP total (1.5 k posible).
2. **Esta semana** (Section) — Card con **3 anillos pequeños** (Actividad, Con Orbi, Juego) y debajo **barras de 7 días** (gráfica de barras 80 pt: `daySummaries` de los últimos 7 días, barra de hoy `accent`, resto `raised`, etiquetas L M X J V S D). Hoy "Esta semana" mezcla `stats.gameSec` y `stats.petSec` que son **acumulados** de por vida (`ProfileScreen.tsx:44-45`): usar `days[dayKey]` de los últimos 7 días y renombrar "Total" si se mantiene el acumulado.
3. **Aspectos destacados** (Section, scroll horizontal): `InsightCard` → tarjetas 280×168 como en Hoy §5.2-4. Texto del insight 17/600 (2-3 líneas), cifra del cambio `display` 40 (p. ej. "−1,4 h") con etiqueta "sueño medio · últimos 3 días", gráfica de barras 7 días, `StatusMark` positivo/atención como glifo (no encima). Pie "Calculado en el teléfono. Solo tú lo ves." con `lock.fill` 11.
4. **Logros** (Section "Logros · 3 de 10", acción "Ver todo") — ver §11.2.
5. **Exploraciones** (Section) — ver §11.3.
6. **Comunicación** (Card pequeña): anillo "Hablaste hoy 42 min" vs. tu base (marca de 1 px en tu mediana), y las `anomalies` (`anomalyText`) como filas con `StatusMark` al final.

### 11.2 Logros — insignias con arte (`AchievementsGrid.tsx`)
**Mal**: celdas 2 por fila con icono 18 + 3 líneas `small` (`:16-21`); la única señal visual es un candado o un check del mismo tamaño que el texto.
**Referencia**: Apple Fitness › Premios.
**Spec**:
- Rejilla de **3 columnas**, celda = medalla 88 pt + título 13/600 (1 línea) + estado 11 `faint`. `Section` muestra primero las desbloqueadas (más recientes) y 3 siguientes bloqueadas con progreso. "Ver todo" → push con rejilla completa agrupada ("Constancia", "Cuerpo", "Mente", "Misión").
- **Anatomía de la medalla** (SVG, plano, sin degradado): disco exterior 88 pt color de categoría (aro 4 pt), disco interior 72 pt tono oscuro, **pictograma central 40 pt** único por logro, banda diagonal de "brillo" plano `text` 12 % recortada al disco (la señal "metálica" sin degradados), muesca de 10 puntos en el borde (festón) para que no sea un simple círculo. Hex para "mission" (Defensor, Salvavidas), círculo para hábitos, escudo para Salvavidas.
- Arte por logro (pictograma, color): `first_checkin` hoja de registro + pluma (accent); `checkin_streak_7` siete puntos en órbita, uno por día, rellenos a `accent` (accent); `exercise_2h` pesa + reloj (verde `ok` solo aquí por salud física); `sleep_7h_x3` luna con tres estrellas (accent); `protocol_done` casilla con check sobre lista (accent); `pet_session` corazón con antena de Orbi (accent); `defender_1000` nave del juego sobre "1000" (accent); `first_explore` huella de bota + brújula (accent); `explore_10km` ruta serpenteante con bandera (accent); `cpr_trained` cruz médica con onda ECG (accent; `emergency` y `critical` quedan vetados para arte). Colores: solo `accent` y `text`/`raised`; la diferencia por categoría va en la **forma del contorno**.
- Bloqueada: silueta del mismo contorno en `raised` con pictograma `faint` 40 % y, **si hay progreso medible**, arco de progreso 3 pt en el aro (`checkin_streak_7` 3/7, `explore_10km` 6,2/10, `sleep_7h_x3`, `exercise_2h`, `defender_1000` con `bestScore`). Sin candado encima (el candado es un estado, no una imagen): `lock.fill` 11 junto al texto "Bloqueado".
- Interacción: toque → `formSheet` 0.7 con medalla de 200 pt que **se inclina** con el dedo (`Gesture.Pan` → `rotateX/rotateY` ±12°, `perspective 600`, `withSpring {duration 300, dampingRatio .8, velocity}`), título 22/700, descripción 17, "+150 XP · 14 nov", botón Compartir (`ShareLink`/`Share.share`) con imagen de la medalla (`react-native-svg` `toDataURL`). Reduce Motion: sin inclinación.
- Desbloqueo (movimiento #6): toast con la medalla de 24 pt + hoja automática si la app está en Perfil; `notificationAsync(Success)` (ya existe en `runtime.ts:31`).

### 11.3 Exploraciones tipo Strava (`ExplorationLog.tsx`)
**Mal**: un formulario inline con cronómetro `figure`, tres `TextInput` y un botón gris **antes** del historial (`:44-58`); el historial son `FeedRow` con "x.x km" a la derecha; sin jerarquía ni gráfica; la grabación no tiene pantalla propia.
**Spec**:
- **Resumen superior**: `Card` con "Esta semana" `display` 40 `km` + barras de 7 días (km por día) + total del mes 15 muted. Si 0: `EmptyState` con `location` y "Registra tu primera exploración" + botón "Empezar".
- **Botón de grabar**: barra inferior fija en la pestaña (o botón `accent` 50 pt bajo el resumen) → `push` a **pantalla de grabación**: fondo `bg`, `keepAwake`, tiempo `hud` 56 centrado, debajo "Distancia" input con teclado decimal inline 28/600 y botones **Pausar** (círculo 72 `raised` `pause.fill`) y **Terminar** (círculo 72 `accent` `stop.fill`, mantener 1 s); `impactAsync(Medium)` al pausar; al terminar → hoja "Guardar exploración" con título/lugar/km en filas `LabeledContent`, botón "Guardar" `accent`, descartar con confirmación.
- **Feed** (Section "Recientes", `FeedRow` → `ExplorationCard` 20 radio, 16 padding, 12 de separación entre tarjetas): 
  ```
  Larga caminata por el módulo 3       (title 17/600, 2 líneas)
  Módulo Columbus · hace 2 h           (small muted)
  ───────────────────────────────────
  Distancia     Tiempo      Ritmo      (11 faint encima de cada cifra)
  2,4 km        34:10       14:14/km   (figure 28/600 + unidad 15 muted)
  ```
  A la derecha del título, `ellipsis` con menú nativo ("Editar", "Eliminar"). Si `km` ≥ 5 o completa un logro: medalla 24 pt en la esquina superior derecha. Sin mapa falso (no hay GPS en la nave): **no inventar rutas**. Arriba de las cifras, una barra de 6 pt "Contra tu media" (marca 1 px en tu mediana de km, relleno `accent`).
- **Kudos/Comentarios**: la ruta existe porque el hub ya recibe `sendStat({type:'exploration'})`. Fase 2: `hand.thumbsup` con contador y lista de tripulantes (requiere endpoint en hub; marcarlo fuera del alcance de la v1 visual).
- Mantener `Exploration` tipo y `sendStat` tal cual.

### 11.4 Ajustes — pantalla push (`SettingsScreen.tsx`)
**Mal**: se muestra dentro del scroll de Perfil con otro padding horizontal (`SettingsScreen.tsx:24` vs `ProfileScreen`), campos con etiqueta 13 gris arriba y caja `raised` (`:27-28`); `crewId` editable sin aviso; descarga de "cerebro" como botón gris con texto.
**Spec**: `push` desde el engranaje, título grande "Ajustes", grupos inset:
- **Tripulante**: filas `LabeledContent` (Nombre, Rol; `crewId` en `faint` sin edición salvo toque largo "Editar identificador" con confirmación).
- **Nave**: "Hub" con valor `url` + `StatusMark` (conectado/sin conexión) trailing; tocar abre campo.
- **Fuente de datos**: `SegmentedTabs` con pie "Simulador usa datos de ejemplo".
- **Mascota**: fila "Cerebro de Orbi" valor "Listo en el teléfono" + `StatusMark`; si `none`: botón "Descargar (1,2 GB)" `bordered`; si `downloading`: **barra de progreso 4 pt** + "34 %" + botón "Cancelar" (hoy el texto del botón cambia a "Descargando 34 %", `:61`). Pie: "Orbi funciona sin conexión cuando está descargado".
- **Accesibilidad** (nuevo, obligatorio con el brief): "Reducir movimiento" lee el sistema; "Háptico" `Switch`.
- Pie de pantalla `small faint`: versión, hub.

---

## 12. Modo nave (horizontal) — `features/ship/ShipHud.tsx`

### 12.1 Mal
- Rejilla `flexWrap` con `width: '32%'` (`:46`): 5 vitales → 3 + 2, un hueco y celdas de altura distinta; valores `hud` 56 con etiqueta 13 muted y `StatusMark` 12 (ilegible a brazo extendido).
- Estado general arriba a la izquierda como texto 12; conexión como 4 puntos 8 pt + palabras 13.
- Tarjeta de protocolo con `section` 20 y pasos a 2 líneas; `Creature` 64 + SOS `large` repartidos en una fila baja (`:60-63`): la Creature aquí no aporta (compite con el SOS).
- `App.tsx:26-30`: **`width > height` sustituye todo el árbol**: `NavigationContainer` se desmonta, se pierde la ruta y el scroll (p. ej. en un protocolo) al girar.

### 12.2 Layout (iPhone 15: 852×393, área segura ≈ 746×345; sin scroll)
Tres columnas con un solo margen de 16 + safe-area: **[ 2fr vitales ][ 1.2fr protocolo ][ 0.8fr acciones ]**.
- **Fila superior (alto 44)**: izquierda estado general **grande** (`StatusMark` glifo 20 + texto `title` 22/700 "Todo en rango"); derecha 4 símbolos `antenna.radiowaves.left.and.right`/`applewatch`/`rectangle.on.rectangle`… (usar símbolos genéricos) 18 pt color ok/faint con etiqueta debajo 11 (leer a distancia: 13 mínimo).
- **Columna 1** (rejilla 3×2 de **celdas iguales**, 6 slots: hr, spo2, bpSys/bpDia, temp, resp, **estado de la manga**): cada celda: etiqueta 13/600 `muted` arriba, valor `hud` 56/600 con unidad 17 muted, `RangeBar` 6 pt a ancho completo, sin `StatusMark` de texto (el color + el glifo 16 al lado de la etiqueta basta; el texto va en `accessibilityLabel`). Celda con watch/critical: fondo `surface` y valor en color de estado; el resto sobre negro.
- **Columna 2**: tarjeta 20 radio (`surface`) "Protocolo activo": título 13 muted, **siguiente paso 22/700 en 3 líneas**, indicador "Paso 2 de 5" (5 puntos, el actual `accent`), botón "Hecho" 56 pt que marca el paso (`impactAsync Medium`). Sin protocolo: `checkmark.seal` 32 + "La nave no ha enviado nada" 17.
- **Columna 3**: SOS **72 pt de alto** ancho completo (mantén 1 s con anillo, §4.14) y debajo Orbi 64 pt estático (hace guiños cada 6 s; Reduce Motion: fijo) que sirve de "estoy vivo" visual, 40 pt de alto máx.
- Contraste: fondo `#000`, texto `text` **#FFF** (no `muted` para nada necesario), sin `faint` salvo desconectado. Ningún texto < 13 pt.
- Anti-quemado OLED: desplazar el contenido 1 pt aleatorio cada 60 s (opcional).
- **Estado al girar**: no desmontar la navegación: renderizar `<MainTabs/>` siempre con `display: ship ? 'none' : 'flex'` y `<ShipHud/>` encima en `StyleSheet.absoluteFill`; o usar `ScreenOrientation.addOrientationChangeListener` y un estado `ship` que no toque el árbol.
- **Live Activity (stretch)**: las 4 regiones de una Live Activity expandida (leading = estado, trailing = SOS, center = vital peor, bottom = siguiente paso) son exactamente esta jerarquía; requiere ActivityKit/target nativo, fuera del alcance del bundle JS actual.

---

## 13. Capas globales (`App.tsx`): Toast, SessionBanner, emergencia
- `Toast` y `SessionBanner` se montan **fuera** del navegador (`:31-34`): quedan sobre el título grande y la tab bar. Mantener, pero con las posiciones de §4.13 y §6.5.
- `EmergencyTakeover` con `Modal` fullScreen: correcto; añadir `statusBarTranslucent` y `supportedOrientations={['portrait','landscape']}` (si la emergencia ocurre en HUD de nave, el modal debe verse bien en horizontal: hoy `ScrollView` con `flexGrow` no tiene layout horizontal → usar la misma estructura de 2 columnas: izquierda anillo, derecha texto + botón).

---

## 14. Plan de implementación sugerido (orden)

1. **Una tarde, bajo riesgo, mucho efecto**: (a) 5 pestañas y Check-in como hoja; (b) cerrar el Toast; (c) `contentInsetAdjustmentBehavior="automatic"` en Protocolos/Check-in/Perfil y arreglar tipos; (d) quitar `ScreenHeader`/mayúsculas; (e) `Press` con háptico correcto; (f) campos `raised`.
2. **Piezas visuales** (en este orden por impacto): `Ring` (SVG, `useAnimatedProps`) → `RangeBar` → `VitalCard` + `StatusRing` en Hoy → `TrendChart` + hoja de detalle → Orbi + escena → medallas → tarjetas de exploración → modo nave.
3. **Emergencia y SOS** (seguridad): hold-to-confirm, metrónomo, sin hápticos duplicados.
4. **Juego, respiración, jumping jacks** (reescritura de motor).
5. Dependencias nuevas a aprobar, todas con `npx expo install`: `react-native-gesture-handler` (scrub de gráfica, inclinar medalla, juego), `@react-native-community/datetimepicker` (sesiones), opcional `expo-blur` (toast translúcido) y `@expo/ui` (Gauge/Picker, solo tras comprobar compatibilidad con SDK 54).
6. **Comprobación en dispositivo** (no verificable aquí): bajo-cabecera en Protocolos/Check-in; "Más" en la tab bar; tamaños táctiles; `borderCurve` en radios; hápticos; Dynamic Type 200 %; Reduce Motion; rendimiento del bucle del juego en un iPhone de 3 años.

---

## Apéndice A — Verificación hecha
- `npx expo export --platform ios`: OK, `AppEntry-….hbc` 4.26 MB.
- `npx tsc --noEmit`: 13 errores, todos de tipos, ninguno impide el bundle:
  - `MainTabs.tsx:58` `getImageSourceSync` no existe en los tipos de Ionicons (existe en v15 en runtime: **[verificar]**; si no, `Ionicons.getImageSource` es asíncrono).
  - `CheckInScreen.tsx:40`, `GameScreen.tsx:88`, `ProtocolsScreen.tsx:32`: `ScreenHeader` no acepta `title`.
  - `CheckInScreen.tsx:62,75`, `ExplorationLog.tsx:52-54`, `SettingsScreen.tsx:28,32,36,43`: objetos de estilo con `borderCurve: string` (necesitan `as const`).
- Cambios sin commitear del agente anterior revisados con `git diff --stat` (30 archivos en `mobile/`): Hoy, MainTabs, `SegmentedTabs`, `FormSection`, `FeedRow`, `Press`, `StatusMark` migrados; Mascota y Perfil solo parcialmente; Protocolos/Check-in/Juego sin migrar de verdad.

## Apéndice B — Lo que NO se cambia
Tokens Apple de `shared/src/design.ts` (solo se añade `radius.card` y `display`); `SegmentedControl` nativo; `StatusMark` con forma + texto; tab bar nativa; `borderCurve: 'continuous'`; `useReducedMotion`; voz del copy ("Tu presión está un poco alta. Respira 2 minutos."); regla de rojo `emergency` solo para emergencia y SOS; la lista inset agrupada como patrón de filas.
