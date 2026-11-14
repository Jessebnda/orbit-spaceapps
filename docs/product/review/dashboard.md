# Revisión de diseño — Dashboard del capitán

Revisor: diseño de producto, base = skill `design-taste-frontend` (rama *app screens*), con `apple-design`, `emil-design-eng` y `docs/product/DESIGN-BRIEF.md`.
Evidencia: capturas en `/private/tmp/claude-501/-Users-jesse-Documents/d8f37cdc-c2dd-4363-83ac-3c857ed7b267/scratchpad/review-dash/` (`overview|crew|protocolos|asistente|logros|exploracion` × `-1440.png` / `-1024.png`, más `insp-overview/` del inspector). El inspector `inspect.mjs --app` da 0 FAIL y 1 WARN (contraste 3.4:1 en texto `faint`): **pasar el medidor no es aprobar**; la pantalla es "un kit bien aplicado, no un producto con cara propia" (la queja nº 1 del skill).

Alcance: no se tocó código de la app. Este documento es la especificación.

---

## 0. Antes de diseñar: dos bloqueos que ensucian toda captura

| # | Hallazgo | Evidencia | Qué hacer |
|---|---|---|---|
| P0-1 | **`/crew/[id]` se cae.** `TypeError: comms is not iterable` en `lib/domain/behaviour.ts:33` (`dailySummaries`). El hub responde `GET /api/comms/:id` con un **objeto** `{records, todayMin, byPeer, anomalies}` (`hub/src/routes/api.ts:73-77`) y el dashboard lo tipa y usa como `CommsRow[]` (`CrewScreen` → `comms.data ?? []`). | Captura del error overlay de Next al abrir `/crew/c1` (hay que desenvolver `.records` para ver la pantalla; yo lo hice inyectando un `fetch` parcheado solo en el navegador). | Tipar `useApi<{records: CommsRow[]; anomalies: CommsAnomaly[]}>` y pasar `data.records`. Añadir un check de contrato (el repo ya usa `*.check.ts`). Hasta entonces nadie ve el detalle de un tripulante. |
| P0-2 | El CSS que sirve el dev server **no contiene ninguna regla `.mac-*`** (grep sobre `dashboard_app_globals_css_*.css` = 0 coincidencias; `globals.css` se editó a las 11:55). Resultado en pantalla: botones "Enviar" con el icono apilado sobre el texto, listas sin superficie, sidebar sin material, composer del chat sin botón. | `protocolos-1440.png`, `asistente-1440.png`. | Reiniciar `next dev` y repetir capturas antes de juzgar spacing. **Los juicios de abajo tienen en cuenta la intención del código, no solo el render roto**; lo marcado "(render)" depende de este bloqueo. |

---

## 1. Diagnóstico (taste skill, §2.2 / §2.7 / tells)

Pregunta única del overview: **"¿Está toda la tripulación en rango ahora, y quién necesita algo?"**. Hallazgo del día (hoy): *Leo Park en paro cardíaco, Omar Haddad en vigilancia*.

1. **Cero imagen, cero personas.** 0 imágenes (inspector). Cuatro humanos son filas de texto. El skill: "su gente y sus objetos como ellos mismos".
2. **Todo es el mismo número en 13–16 px.** Tamaños en uso: 11/12/13/16/17/20/22/28; la tabla del overview son 8 columnas de texto idéntico; solo el color distingue algo. No hay forma de dato (anillo, rango, sparkline, mapa).
3. **La emergencia no pesa más que una tabla.** `overview-1440.png`: el banner de paro cardíaco mide 88 px y comparte jerarquía con el strip de KPIs; el botón "Marcar resuelto" es texto plano (render).
4. **Proximidad = diamante de 4 círculos iguales** en un panel de 1152 px con 400 px de vacío a cada lado; las etiquetas ("Ana Ruiz / Normal") quedan cruzadas por las líneas; la distancia solo se lee como grosor.
5. **Detalle: seis gráficas idénticas de 160 px** con bandas verde/ámbar/rojo al 10-14 % sobre `#1C1C1E` → barro oliva/marrón (`crew-1440.png`); ticks Y no redondos (139/111/71/31, 102.3/98.7/92.7/86.7); la etiqueta del eje X choca con el último tick Y ("31 11:42").
6. **Tablas anchas que ocultan datos sin avisar.** A 1440 la cabecera "Comunicación" queda cortada en el borde; a 1024 la tabla se corta en "Sueño" sin pista de scroll; la columna identidad se parte en 3 líneas ("Ingeniero de vuelo · en línea").
7. **Logros = 4 filas de texto** con chips de borde 1 px (tell: "no thin outlined boxes"). Los 10 logros del catálogo no existen visualmente; los bloqueados no se ven.
8. **Exploración = dos tablas** (totales + feed) con las mismas cifras; ningún mapa.
9. **Asistente**: pantalla 85 % vacía, compositor pegado arriba, sin avatar ni burbujas, chips de acción en `font-mono` (tell prohibido).
10. **Protocolos**: 13 filas en una columna, botón "Enviar" a 800 px del título, `<details>` para ver pasos.
11. **Contraste**: texto `faint #6E6E73` sobre `surface` = 3.4:1 (WARN); se usa para texto real en 10+ sitios.
12. **Fugas de implementación en la UI**: "El hub no expone todavía los protocolos…", "Calculado con 14 días…" (párrafos que explican el sistema, no el dato).
13. **Glifo crítico engañoso**: `OctagonX` relleno se lee como "prohibido" (⛔) en la tabla; no dice "grave".

Qué funciona y se conserva: tokens Apple dark sobre negro, `StatusMark` con glifo + texto (estado nunca solo color), tabular-nums, foco visible, `prefers-reduced-motion/transparency`, `InView` para no montar gráficas fuera de pantalla, el principio "rojo emergencia solo en emergencia".

**Las tres jugadas que más mueven la aguja** (ordenadas): (1) personas como tarjetas con avatar + anillos de rango + sparkline en lugar de tabla de texto; (2) la emergencia como *takeover* con cronómetro y respondedores con distancia, y la proximidad como mapa espacial real; (3) una sola gráfica grande por vital con bandas legibles en vez de seis iguales.

---

## 2. Referencias (qué hacen exactamente) — investigación

Fuentes consultadas (web): [HIG Gauges](https://developer.apple.com/design/human-interface-guidelines/gauges.md), [HIG Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars.md), [HIG Status](https://developer.apple.com/design/human-interface-guidelines/status.md), [WHOOP design breakdown](https://www.925studios.co/blog/whoop-design-breakdown), [WHOOP Home](https://www.whoop.com/at/fr/thelocker/the-all-new-whoop-home-screen/), [Strava design guide](https://blakecrosley.com/guides/design/strava), [Strava x Mapbox](https://bikerumor.com/2019/10/31/strava-x-mapbox-upgrades-your-static-maps-to-better-display-your-ride/). Lo demás (marcado *conocimiento de producto*) no se verificó en esta sesión.

| Componente | Referencia 1 | Referencia 2 | Qué copiar |
|---|---|---|---|
| Vitales como anillo/gauge | **Apple Gauge / Level Indicator** (HIG): valor dentro de un rango, estilos circular y capacidad; marcador sobre pista | **WHOOP Home**: tres diales (Sueño, Recuperación, Esfuerzo) arriba, cada uno con su pantalla de detalle; un número dominante por dial; color estrecho y semántico (verde = listo, rojo = bajo) | Un anillo = una magnitud con **zona normal visible** en la pista y marcador; número grande al centro; color solo para estado. |
| Anillos de actividad | **Apple Fitness/Activity** (rings): arco de 270-360° de trazo grueso con caps redondeados, sobre pista del mismo tono al ~20 % | **Oura** (*conocimiento de producto*): puntuación 0-100 grande + contribuyentes en barras finas | Pista del mismo tono atenuado; sin etiquetas sobre el arco; valor al centro. |
| Sparklines en filas | **Linear / Vercel dashboard** (*conocimiento de producto*): sparkline monocroma 60-80×20 px en tablas, punto final resaltado, sin ejes | **Garmin Connect web** (*conocimiento*): mini-tendencia 7 d junto a cada métrica, con rango "normal" como banda gris | 1.5 px, un color, último punto marcado, banda de normalidad gris. |
| Tabla / lista de personas | **macOS HIG tables** + **Linear issues list**: fila 44-56 px, sin zebra, cabecera 12 px gris sin relleno, números a la derecha, selección con relleno neutro | **Raycast** (*conocimiento*): fila con avatar 24-32 px a la izquierda y metadato gris a la derecha, hover solo tono | Identidad a la izquierda con avatar; una línea; metadatos grises. |
| Sidebar | **macOS sidebar/source list** (HIG: ancho completo de la ventana, selección con esquina redondeada) | **Linear** (*conocimiento*): workspace arriba, ítems 32 px, contador solo en colas que requieren acción, estado de conexión/sync abajo | Producto + ámbito arriba, selección neutra, cuenta solo en "Alertas", pie con estado del hub. |
| Segmented control | **macOS NSSegmentedControl / iOS UISegmentedControl** | **Vercel** tabs | Pista `raised`, píldora activa `surface`+texto ink, ancho = suma de opciones. |
| Consola de misión | **NASA JSC/Mission Control & Grafana** (*conocimiento*): fondo oscuro único, una fila de estado arriba, paneles por subsistema, líneas finas con **líneas de límite con etiqueta** y valores actuales grandes | **SpaceX Dragon UI** (*conocimiento*): fondo negro, tipografía grotesca, color solo en estado, mapa/trayectoria como figura central | Líneas de límite etiquetadas en vez de lavados de color; el color vive en la serie, no en el fondo. |
| Feed de actividad | **Strava feed**: jerarquía quién → dónde → **mapa de ruta (foco)** → cifras → logro/kudos; ruta saturada sobre mapa base desaturado (guía de diseño) | **Apple Fitness+ / Workouts summary** (*conocimiento*): 3 cifras grandes bajo el mapa | Tarjeta: cabecera persona, mapa 16:7, tres cifras 22 px. |
| Leaderboard | **Strava segment leaderboard / club**: rango + avatar + nombre + cifra a la derecha, el tuyo resaltado | **Apple Game Center** (*conocimiento*): medallas con estado bloqueado en gris | Rango como numeral, barra fina de proporción, cifra alineada a la derecha. |
| Logros/insignias | **Apple Fitness Awards**: medalla circular grande, bloqueada = silueta gris, fecha | **Strava trophy case** | Medalla 56 px, bloqueado = contorno punteado y glifo `faint`. |
| Mapa espacial / proximidad | **Apple Find My (Mapa de dispositivos cercanos)** y **AirTag "Precision Finding"** (*conocimiento*): puntos con avatar sobre rejilla tenue, anillos de distancia | **Grafana Node graph / Network map** (*conocimiento*) | Anillos concéntricos con distancia en metros, avatares como nodos. |
| Chat | **Apple Messages (macOS)**: burbuja propia a la derecha, ajena sin burbuja o gris, compositor anclado abajo | **Raycast AI / Claude.ai** (*conocimiento*): acciones de herramienta como filas compactas bajo la respuesta | Compositor fijo abajo, acciones como filas con glifo y resultado. |

---

## 3. Sistema (todo componente lo sigue)

**Dirección y cara propia (skill §2.3).** Estilo base `data-terminal` (oscuro, monitoreo): una sola tierra negra, elevación por tono, color solo en datos. *Cara elegida*: **la tripulación como personas** (avatar con anillo de estado en todas partes) + **el anillo de rango** como elemento propio de Orbit. *Elemento firma*: el **mapa de proximidad calculado desde RSSI** (§6). Marca: monograma "órbita" (círculo 14 px + elipse inclinada −25° trazo 1.5, en `accent`), no el icono genérico `Orbit` de lucide.

**Escala tipográfica** (fuente: sistema SF; tokens existentes; sin segunda familia; **sin monospace en ningún sitio**):

| Rol | px / peso / interlínea / tracking | Uso (y solo este) |
|---|---|---|
| `lead-figure` | 36 / 600 / 40 / −0.02em, tabular | UNA cifra por pantalla: la que responde la pregunta (p. ej. "2 de 4") |
| `figure` | 28 / 600 / 32 / −0.01em, tabular | Cifra de tile, cifras de ruta |
| `title` | 22 / 700 / 28 / −0.02em | `h1` de página, cifras secundarias de leaderboard |
| `heading` | 15 / 600 / 20 / −0.01em | Título de panel, nombre en fila, título de tarjeta |
| `body` | 15 / 400 / 22 | Texto corrido, chat |
| `small` | 13 / 400 o 500 / 18 | Metadatos, celdas de tabla, descripciones |
| `micro` | 11 / 500 / 14 | **Mínimo absoluto**: ejes de gráfica, unidades bajo anillo, etiquetas de leyenda |

Máximo 5 tamaños visibles por pantalla. Se eliminan 12, 16, 17 y 20 px del dashboard. Etiquetas en minúscula inicial ("Fuera de rango"), nunca MAYÚSCULAS ni tracked.

**Rejilla y espaciado.** Base 4 px. Canvas: sidebar 224 px; contenido `max-width 1152`, padding lateral 32; **12 columnas, gutter único 24** (12×74 + 11×24 = 1152; cierra aritméticamente). Padding de panel 20; título→contenido 16; entre bloques 24 (ni 12, ni 16, ni 32 mezclados). Altura de fila: 44 (una línea), 56 (dos líneas con avatar 40). Controles: 28 px (mac-btn) y 36 px (inputs y botón primario de pantalla).

**Superficies.** `bg #000` → `surface #1C1C1E` → `raised #2C2C2E`. Separación por tono. **Sin bordes de 1 px alrededor de cajas, sin sombras, sin gradientes** (el degradado de `mac-toolbar` es máscara funcional; se conserva solo si hay contenido bajo él). Hairline 0.5 px `#38383A` solo entre filas de tabla/lista (inset 56 px si hay avatar, 16 si no). Radios: 10 (panel/tarjeta), 6 (botón/input), 999 (avatar, pastilla). Nada más.

**Color.** `accent #0A84FF`: selección, botón primario, **la serie principal de datos** (línea del vital, barra de ruta, trazo del mapa). Estado `ok/watch/critical` solo en estado: anillos fuera de rango, `StatusMark`, tramos de línea fuera de rango. `emergency` solo en emergencia activa. Texto: `ink #fff`, `muted #98989F` (4.9:1 sobre surface). **`faint #6E6E73` deja de usarse para texto** (3.4:1): texto terciario = `#8E8E93` (nuevo CSS var `--t-text-3`, solo dashboard, no tocar `shared/design.ts`); `faint` queda para glifos desactivados, rejilla y pistas. Identidad de persona: **sin tinte por persona** (desviación consciente de la regla de tintes del skill: verde/ámbar/rojo ya son estado y un tinte por persona colisionaría o se confundiría; la identidad la dan foto/iniciales + nombre). Avatar: foto si `member.avatar`, si no disco `#2C2C2E` con iniciales 600, 40 px → 15, 24 px → 11.

**Avatar con estado** (`<Avatar size status online>`): disco + anillo de 2 px, separado 2 px (offset), color = `statusColor`; offline = anillo discontinuo `3 3` y disco al 50 %; emergencia = anillo `emergency` 2.5 px. El estado además viaja en texto (`aria-label="Leo Park, crítico"`).

**Iconografía.** lucide, trazo 1.5, 16 px (20 en vacíos, 24 en medallas). Nunca en cuadrado tintado, nunca emoji. Glifos de estado: ok `CircleCheck`, watch `TriangleAlert`, **critical `OctagonAlert`** (octógono con "!", no `OctagonX`), cada uno relleno con knockout (como hoy).

**Estilo de gráfica (todas).** Línea recta 1.75 px, sin suavizado, sin puntos salvo el último (6 px) y el hover. Rejilla: 3-4 líneas horizontales 1 px `#2C2C2E`, sin eje Y ni X dibujados. Ticks Y **redondos** (función `niceTicks(lo, hi, 4)`: pasos 1/2/5×10ⁿ), tope por encima del máximo; ticks 11 px `muted`; X: 5 etiquetas HH:mm, la primera `textAnchor: start`, margen 8 para que no choque con Y. Un color por gráfica (accent); fuera de rango el tramo cambia a color de estado. Leyenda: ninguna para serie única; si hay varias, ≤4 puntos 8 px + etiqueta 11-13 px en la cabecera. Tooltip: caja `raised` sin sombra, "valor unidad · hora" en una línea. Eventos (emergencia, protocolo enviado) = marca vertical 1 px + etiqueta 11 px sobre el plot.

**Movimiento.** Solo: feedback de pulsación (scale .98, 100 ms), hover de tono, entrada del takeover de emergencia (translateY −8 → 0 + opacity, 220 ms `cubic-bezier(.2,0,0,1)`), transición de posición de nodos del mapa (300 ms, solo `transform`) y relleno de anillo al cambiar de valor (220 ms, `stroke-dashoffset`). Nada anima al cargar la pantalla. Todo con `@media (prefers-reduced-motion: reduce)` → sin transición (el contenido y el valor se mantienen). `@media (hover: hover)` para hovers.

**Accesibilidad.** Estado nunca solo color (glifo + texto, líneas de límite con etiqueta de texto). Objetivos clic ≥ 32 px en dashboard (ratón), 44 px en tablet. Anillos: `role="meter"` con `aria-valuemin/max/now` y `aria-valuetext="Ritmo cardiaco 74 lpm, normal"`. Mapa: `role="img"` + lista equivalente (tabla "Distancias") accesible. Tablas con `scope`. Orden de foco = orden visual.

**Responsive.** ≥1280: sidebar 224. 1024–1279: sidebar pasa a **rail de 56 px** (iconos con tooltip y `aria-label`; el producto sigue con monograma) → ganan 168 px y la tabla/tarjetas respiran. <1024: barra superior como hoy.

---

## 4. Primitivos (base de lo demás)

### 4.1 StatusMark (`components/ui/StatusMark.tsx`)
**Mal**: en celdas de tabla el glifo crítico parece "prohibido"; "Normal" verde repetido en cada fila añade ruido; solo existe una forma.
**Referencia**: Apple Status (glifo + texto), pastillas de estado de Linear.
**Spec**: variantes `inline` (hoy), `pill` y `dot`.
- `pill`: alto 20, padding 0 8, radio 999, fondo = color de estado al 14 % compuesto sobre surface, texto/glifo en el color de estado; texto `micro` 11/600 en celdas de tabla y `small` 13/600 en tarjetas; glifo 12.
- `dot`: círculo 8 px + `<span class="sr-only">` con el texto; solo dentro de gráficas pequeñas y leyendas.
- Cambiar glifo crítico a `OctagonAlert`. Contraste de texto de estado sobre su tinte ≥ 4.5:1 (verificar `#FF453A` sobre 14 % → ok; si falla, sube el texto a `#FF6961`).
- `showOk=false` por defecto en celdas de métricas; el estado **del miembro** siempre se muestra (también "Normal").

### 4.2 Panel (`components/ui/Panel.tsx`)
**Mal**: título 13/700 gris encapsulado en mayúscula-pequeña; todo vive en una caja gris igual (rejilla de cajas idénticas).
**Spec**: `<Panel title subtitle action>`: padding 20; cabecera flex 28 px: `h2` `heading` 15/600 ink + (derecha) `action` (segmented/selector, 28 px) ; `subtitle` `small` `muted` bajo el título (la **ventana temporal o el hallazgo**, nunca instrucciones de la interfaz). Usar Panel **solo** para gráficas y mapas; listas y formularios van sin caja (brief §7: "dónde no va card"). Dos paneles en la misma fila comparten borde inferior (`align-items: stretch` + contenido que llene, o `items-start`).

### 4.3 LedgerRow (`components/ui/LedgerRow.tsx`)
**Mal**: `items-start`, sin media, sin celda de acción fija → la acción flota (Protocolos).
**Spec**: `<LedgerRow media? title meta trailing action selected? href?>`: min-height 56 (44 si no hay `meta`), `items-center`, padding 8 16; slot media 40 + gap 12; título 15/600, meta 13 muted, **una línea con ellipsis**; `trailing` alineado a la derecha, tabular-nums, **un único borde derecho** (padding-right 16); `action` en columna fija 96 px (ghost button 28 px). Hover `rgba(255,255,255,.04)` solo si `href`/`onClick`; `selected` = `rgba(255,255,255,.08)` (igual que el pill del nav, para que no se confunda con foco). Hairline 0.5 px inset 68 px (16 + 40 + 12).

### 4.4 EmptyState (`components/ui/EmptyState.tsx`)
**Mal**: caja con borde punteado 1 px y una frase (tell "1px outlined box"; no dice qué hacer).
**Spec**: bloque `surface` radio 10, padding 32 24, centrado: glifo lucide 20 px `faint` → línea `body` 15 ink → línea `small` `muted` (qué lo llenará) → acción opcional `mac-btn` 28. Mantiene su marco. Variante `loading`: 3 filas skeleton 56 px (barras `raised`, `animation: pulse 1.2s` solo `opacity .5↔1`; reduced-motion = estático).

### 4.5 HubBanner (`components/ui/HubBanner.tsx`)
**Mal**: banda gris en medio de la página; no dice cuánto hace que no hay datos.
**Spec**: pasa a **tira sticky de 36 px bajo la barra de título**, fondo `raised`, glifo `WifiOff` 14 + "Hub desconectado · datos de hace 42 s · reintentando {HUB}" (`small`; contador vivo con `useNow`); el contenido de abajo `opacity .6` + `aria-busy`. Conectado: no se pinta; el estado conectado vive en el pie del sidebar (§5.1).

---

## 5. Componentes, por impacto

### 5.1 Overview — CrewSummary + CrewTable → **CrewBoard** (impacto máximo)
Archivos: `components/crew/CrewSummary.tsx`, `CrewTable.tsx`, `OverviewScreen.tsx`.

**Mal** (`overview-1440.png`): 8 columnas de texto del mismo peso; el miembro crítico solo se distingue por dos celdas rojas; "0 lpm" sin contexto (un paro cardíaco es un número entre otros); identidad en 3 líneas; sin sparklines ni forma; strip de 3 KPIs de 28 px sin cifra líder (`Fuera de rango 2` mide igual que `Sueño medio 6.1 h`); cabecera cortada; 1024 oculta columnas sin aviso.
**Referencia**: Apple Gauge + WHOOP Home (anillo con número dominante), Garmin/Linear (sparkline monocroma), Strava (tarjeta con persona).

**Layout (1440, contenido 1152, 12 col):**
1. Barra de título (52 px): `h1` "Vista general" `title` + sublínea-hallazgo `body` 15 ink: `Leo Park, crítico · Omar Haddad, vigilar` (cada nombre seguido de `StatusMark` `inline`). A la derecha: sello "Actualizado hace 2 s" `small` muted.
2. (si hay) **EmergencyBanner** 12 col (§5.2).
3. **KpiStrip** 12 col, un contenedor `surface` radio 10 partido por 3 divisores 0.5 px, altura 112:
   - Celda 1 (6 col, la que responde): `lead-figure` "**2** de 4" + `small` "fuera de rango" + debajo `StatusMark pill` "1 crítico" y "1 vigilar" (si 0: "Toda la tripulación en rango", `CircleCheck`).
   - Celda 2 (3 col): "Sueño medio" `small` muted → `figure` "6.1 h" → barra de progreso 4 px (pista `raised`, relleno ink al ratio `avg/8 h`), extremos "0" y "8 h", `micro` muted; baseline: "objetivo 7 h".
   - Celda 3 (3 col): "Actividad hoy" → `figure` "120 min" → barra 4 px al ratio `activity/(crew×120)`; extremos "0" y "480 min" (2 h × 4: la contramedida del brief, `METRIC_META.activity.info`).
   Sin iconos en círculos, sin deltas inventados.
4. **Tripulación** (título de sección `heading` + a la derecha **segmented** "Tarjetas | Tabla", persistido en `localStorage` con try/catch). Por defecto **Tarjetas**: grid 4 col × 3 (cada tarjeta 3 col = 276 px; 4×276 + 3×24 = 1176 ≠ 1152 → usar `grid-template-columns: repeat(4, 1fr)` con gap 24 → 270 px; si ≥1280 y <1440 `repeat(2, 1fr)`; a 1024 con rail: 2 columnas).
5. **Proximidad** + **Respondedores** (§5.3), fila de 12 col (7 + 5).

**CrewCard (270 × ~212, `surface`, radio 10, padding 16, es un `<Link>` a `/crew/:id`):**
- Fila 1 (altura 40): `Avatar 40` con anillo de estado · nombre `heading` 15/600 + rol `small` muted (1 línea, ellipsis) · a la derecha `StatusMark pill` (estado del miembro, incluso "Normal"). Offline: debajo del rol "visto hace 12 min".
- Fila 2 (mt 12, h 68): **4 `RangeGauge`** (hr, spo2, presión, temp), 52 px, gap `space-between`:
  - Geometría: arco de 270° (inicio 135°, fin 405°), trazo 5, caps redondeados, radio 21.5.
  - Dominio del gauge por métrica = `[THRESHOLDS[k][0] − pad, THRESHOLDS[k][3] + pad]` con pad = 10 % del ancho (spo2 y casos con `1e9`/`101` acotados a [80, 100]).
  - Pista `#2C2C2E`; **zona normal** = tramo del arco entre `watchLow` y `watchHigh` pintado `rgba(255,255,255,.16)` (más claro que la pista, sin color); valor = arco desde el inicio hasta el valor, **ink `#fff` si ok**, `watch`/`critical` si no; **marcador** punto 6 px en el final del arco con borde 2 px `surface`.
  - Centro: valor `heading` 15/600 tabular (presión: "120/80", `micro`+`heading` ajustado a 13/600); unidad `micro` 11 muted **bajo el anillo** (no dentro) → altura total 52 + 14.
  - Fuera de rango: el valor del centro toma el color de estado **y** el `StatusMark dot` + `sr-only` aparece a la derecha del valor (estado no solo por color); `aria-valuetext` completo.
  - Sin dato / offline: pista sola, "—" `faint`.
  - Transición del arco 220 ms al cambiar (solo `stroke-dashoffset`).
- Fila 3 (mt 8, h 40): **Sparkline FC 6 h** ancho 238 × alto 28: línea recta 1.5 `accent`, banda normal `rgba(255,255,255,.06)` entre 60–100 lpm, último punto 5 px en color de estado; etiqueta izquierda `micro` muted "FC · 6 h" y derecha `small` tabular "65 lpm". Datos: `useApi('/api/history/:id?hours=6', 60000)` por tripulante (un hook `useCrewSpark`), `downsample` a ≤ 40 puntos, `InView` no (son 4).
- Fila 4 (mt 12, pt 12, hairline 0.5 px arriba, h 24): `small` muted: "Sueño **6.5 h**" · "Ánimo" + 5 puntos de 6 px (llenos ink según `mood`, vacíos `raised`; aria `Ánimo 4 de 5`) · derecha "2 alertas" (ámbar + glifo `TriangleAlert` 12) o "Sin alertas" muted.
- Estados: hover = tarjeta `raised`; `:active` scale .98; foco 2 px accent. Tarjeta de la víctima de emergencia activa: anillo del avatar `emergency` 2.5 px + chip "En emergencia" (pill con `TriangleAlert`, fondo `emergency` al 14 %); orden: críticos primero, luego vigilar, luego nombre (fijo entre refrescos para no saltar: reordenar solo cuando cambia el estado).

**Vista Tabla** (la opción densa del capitán; resuelve 1024 y orden): filas de 56 px, **una** línea de identidad: `Avatar 32` + nombre `heading` + rol·estado `small` muted con ellipsis (columna 240 fija). Columnas: Estado (pill, 120) · FC · SpO₂ · Presión · Temp · Sueño · Ánimo · Comms — cada cifra `body` 15 tabular a la derecha, con **sparkline 64 × 20** debajo/derecha **solo en FC, SpO₂ y Presión** (mismo estilo que la tarjeta); valores fuera de rango con color + `StatusMark dot`. Respiración, Comida y Agua pasan a un **grupo "Hábitos"** visible ≥1440 (columnas 72 px). Cabeceras `small` 13/500 muted, sentence case, sin relleno, 40 px de alto, **no se parten** (`white-space: nowrap`, nombres cortos: "FC", "SpO₂", "Presión", "Temp.", "Sueño", "Ánimo"; el nombre largo en `title`). La primera columna es sticky a la izquierda; sombra de scroll **no** (usar máscara de 16 px en el borde derecho cuando hay overflow). Fila de la víctima: `Avatar` con anillo `emergency` + pill.

### 5.2 EmergencyBanner (`components/emergency/EmergencyBanner.tsx`)
**Mal**: franja de 88 px, texto 16 px, "hace 2 minutos" estático; respondedores solo por nombre; "Marcar resuelto" sin forma de botón (render) y de un clic (acción irreversible).
**Referencia**: brief §8 *Emergencia (takeover)*; Apple Safety alerts; consola de misión (estado crítico = barra + cronómetro).
**Spec**: contenedor 12 col, `surface`, radio 10, **barra superior de 6 px `emergency` a ancho completo** (única mancha roja del dashboard; sin fondo rojizo ni borde de 1 px).
- Línea 1 (padding 20): `TriangleAlert` 28 `emergency` · título `title`→ **28/700** "Paro cardíaco · Leo Park" · a la derecha **cronómetro** `figure` 28 tabular "02:14" (actualiza cada segundo con `useNow`; `aria-label="hace 2 minutos 14 segundos"`, `aria-live="off"`; la región `role="alert"` anuncia solo al aparecer).
- Línea 2 (mt 16): "Va primero" `small` muted + **cadena de respondedores**: por cada uno, `Avatar 32` + "**1** Ana Ruiz · ≈3 m" `small` 13/600 (rango = nº, orden más cercano primero; distancia desde RSSI con la fórmula de §5.3, redondeada a 0.5 m y prefijo `≈`). Sin respondedores: texto "Sin respondedores cercanos" + `TriangleAlert` ámbar.
- Línea 3 (mt 16, derecha): botón **"Marcar resuelto"** 36 px, secundario `raised`; **dos pasos**: primer clic cambia a "Confirmar: resuelto" (accent, 3 s, vuelve solo; `aria-live=polite`). Acción secundaria: "Ver proximidad" ancla a §5.3. Error (`catch`) = `small` ink con `TriangleAlert`, no gris apagado.
- Entrada: `translateY(-8px) → 0` + opacity, 220 ms; salida 150 ms. Reduced-motion: solo opacity. `beep()` se mantiene. Extra gratis: `document.title = "● Emergencia · Orbit"` y contador en el nav (§5.6).

### 5.3 ProximityGraph → **ProximityMap** (`components/proximity/ProximityGraph.tsx`)
**Mal** (`overview-1440.png`): círculos en polígono regular (no hay "dónde"); las líneas cruzan los nombres; todos los nodos iguales; 360 px de SVG en 1152 de panel; distancia = grosor (ilegible); leyenda de 12 px gris explicando el gráfico (el control debería explicarse solo).
**Referencia**: Find My / Precision Finding (avatares sobre plano con anillos de distancia), Grafana node graph.
**Spec**: panel 7 col (≈ 660 px) × 360 alto, mapa a todo el ancho, lista de respondedores en el panel de 5 col (§ abajo).
- **Cálculo de posiciones (honesto)**: distancia por par `d = 10^((−59 − rssi) / (10 × 2.2))` m (1 m a −59 dBm, exponente 2.2 por entorno metálico; marcar en código `shortcut: modelo log-distance sin calibrar; calibrar en la nave real`). Con las distancias disponibles se corre **stress majorization (SMACOF), 80 iteraciones** desde la disposición circular actual (determinista, N ≤ 8, < 1 ms). Pares sin lectura: peso 0 (sin restricción). **Alineación con el cuadro anterior** (rotación/reflexión Procrustes) para que el mapa no se voltee entre refrescos; transición de cada nodo 300 ms (`transform`), sin transición con reduced-motion. Orientación arbitraria: el pie del panel lo dice en **una** frase `micro`: "Solo las distancias son reales; la orientación es arbitraria."
- **Plano**: fondo `surface`; puntos de rejilla cada 1 m (r 1, `#2C2C2E`) recortados al área; **escala** abajo-izquierda "2 m" (barra 1 px + etiqueta `micro`); autoescala para que el conjunto ocupe el 70 % del alto con margen 48 px.
- **Nodos**: `Avatar 40` con anillo de estado (§3) y etiqueta debajo (nombre `small` 13/600 y estado `micro` con glifo) **sobre un halo `surface` de 4 px** para que ninguna línea cruce el texto; offline = anillo discontinuo + 50 % opacidad.
- **Aristas**: 1 px `#48484A` (todas, sin grosor variable); las del flujo de emergencia (víctima → cada respondedor) 2 px `ink`, con distancia "3 m" `micro` en el punto medio sobre fondo `surface`.
- **Emergencia activa**: anillos concéntricos alrededor de la víctima a 2, 5 y 10 m, 1 px discontinuo `#38383A`, etiqueta `micro` en cada anillo; la víctima con anillo `emergency` 2.5 px y chip "Víctima" (no pulso animado; el brief permite una sola animación de emergencia y ya la usa el banner); respondedores numerados 1, 2… (disco 16 px `ink` con número `micro` negro, esquina superior derecha del avatar).
- **Panel derecho (5 col) "Distancias"**: lista `LedgerList` de pares ordenados por cercanía: `Avatar 24` ·· "Ana Ruiz ↔ Leo Park" `small` · derecha "≈3 m" tabular + `micro` "−62 dBm" muted. Es también el equivalente accesible del mapa (`role="img"` + `aria-describedby` a la lista). Sin lectura: "—" y "sin señal".
- Vacío: `EmptyState` "Sin tripulación conectada" con glifo `Radio`.
- Se elimina la leyenda "Línea más gruesa y opaca…".

### 5.4 CrewScreen / CrewVitals / ThresholdChart (detalle del tripulante)
Archivos: `CrewScreen.tsx`, `CrewVitals.tsx`, `components/ui/ThresholdChart.tsx`. (Primero resolver P0-1.)

**Mal** (`crew-1440.png`): seis gráficas iguales de 160 px (sin jerarquía; 1 cifra de 28 px por gráfica); bandas de estado al 10-14 % = barro; ticks no redondos; X choca con Y; valores en 28 px compiten con el título del panel de 13 px; el encabezado de página es texto (nombre 22 px + una línea) sin cara; "Estado Normal" va incrustado en la línea gris.
**Referencia**: WHOOP (un dial → una pantalla de detalle con gráfica grande), Garmin Connect (métrica seleccionada + gráfica grande + rango), consola de misión (límites como líneas etiquetadas).

**Cabecera (barra de título 72 px)**: migas `small` muted "Tripulación / Ana Ruiz" (la anterior flecha "Vista general" se mantiene como primer segmento clicable) · fila: `Avatar 64` (anillo 3 px) · `h1` `title` 28/700 nombre · `small` muted "Comandante · en línea" · `StatusMark pill` del estado general · a la derecha 2 acciones: **"Enviar protocolo"** (primario 36 px, enlaza a `/protocolos?para=:id`, que preselecciona) y "Preguntar al asistente" (secundario).

**Fila de tiles (selector de métrica)**: 6 `VitalTile`, grid 3 × 2 (cada una 4 col = 360 × 112), `surface` radio 10, padding 16, **actúan como pestañas** de la gráfica grande (`role="tablist"`, flechas ←→; seleccionada = anillo 1.5 px `accent`, no relleno):
- Línea 1: etiqueta `small` muted ("Ritmo cardiaco") · derecha `StatusMark pill` (solo si ≠ ok; si ok, nada).
- Línea 2: `figure` 28/600 "74" + unidad `small` muted "lpm" (baseline alineada).
- Línea 3 (mt 12): **barra de rango lineal** (6 px, radio 3, ancho completo): pista `raised`, tramo normal `rgba(255,255,255,.16)`, marcador = tick 2 × 14 px ink centrado en la pista; extremos `micro` muted con el mínimo/máximo del dominio ("40" … "130"); si fuera de rango el tick toma color de estado.
- Seleccionado por defecto: la métrica más fuera de rango, si no, FC. Sin sparkline (la gráfica grande la sustituye; evita 6 gráficas iguales).

**Gráfica grande (Panel 12 col, alto 280)**: título `heading` = nombre de la métrica; `action` = segmented "6 h | 24 h | 14 d" (14 d reusa `history14`; si el hub devuelve pocos puntos se dibuja honesto, sin relleno); subtítulo `small` muted "Normal 60–100 lpm" (viene de `THRESHOLDS`).
- Dominio Y = `[critLow − 5 %, critHigh + 5 %]` recortado a los datos ±; ticks con `niceTicks(…, 4)`.
- **Zona normal**: `ReferenceArea` `#fff` opacidad .05 (neutral, **no verde**). Fuera de ella no hay relleno.
- **Límites**: `ReferenceLine` horizontal 1 px discontinua `3 3` en `watch` (ámbar .7) y `critical` (rojo .7) con etiqueta de texto a la derecha del plot `micro` "Vigilar > 100" / "Crítico > 130" (con el mismo glifo del StatusMark) → el estado se lee en texto, no solo color.
- **Serie**: `accent` 1.75 px; los tramos fuera de rango se dibujan con el color de su estado: tres `<Line>` (`ok`/`watch`/`critical`) sobre arrays con `null` fuera de su tramo y un punto de solape, `connectNulls={false}`. Sin gradientes.
- Último punto 6 px + etiqueta de valor a su derecha `small` 13/600 tabular. Marcas de evento: si hay emergencia/protocolo en la ventana, línea vertical 1 px `muted` + etiqueta `micro` encima ("Protocolo enviado 11:52").
- Hover: cursor vertical 1 px `muted`, tooltip `raised` "74 lpm · 11:47". Teclado: la gráfica no es foco; el valor actual y el resumen "mín/máx 24 h" van como texto bajo el plot (`small` muted, tabular) para lectores de pantalla.
- Vacío/error: `EmptyState` con "No se pudo leer el histórico" + acción "Reintentar"; no un párrafo gris.

### 5.5 Comms (`CommsPanel.tsx`, `CommsChart.tsx`)
**Mal**: panel de 260 px que en captura aparece vacío (el chart espera `InView`; en pantalla completa deja 300 px de vacío); leyenda con cuadrados de 8 px sin estilo; en el panel "Alertas" una frase suelta de 16 px sin nombre ni acción.
**Referencia**: Vercel/Grafana barras apiladas con leyenda-tabla; Strava "relative effort" barras.
**Spec**: fila 12 col = Panel 8 col (gráfica) + 4 col (alertas).
- Gráfica: barras apiladas por día (14), **separador de 1 px `surface`** entre segmentos, esquinas rectas, `barCategoryGap 30 %`; colores `accent` / `ink` / `muted` (+ `faint` "Otros") → la serie principal (par con más minutos) en `accent`; **leyenda = tabla** en la cabecera: punto 8 + nombre `small` + total `small` tabular ("Omar Haddad 148 min") — la leyenda lleva datos. Ticks Y redondos con "min"; línea de referencia 1 px discontinua en la media diaria con etiqueta `micro` "media 32 min". La caída o pico detectado por `commsOf` se marca con etiqueta `micro` sobre el día ("Sin hablar con Omar").
- `InView` se mantiene pero con `min-height` real y esqueleto (no un hueco en blanco).
- **Alertas** (4 col): `LedgerRow` por anomalía: media = `Avatar 24` del par (si `peerId`), texto `small` ink (la frase de `anomalyText`), `StatusMark inline` tono `watch`. Vacío: `EmptyState` compacto "Sin alertas · la conversación es la habitual".

### 5.6 Shell: Nav (`components/shell/Nav.tsx`) + `app/layout.tsx`
**Mal** (todas las capturas): selección azul tintada al 22 % (el "pill de color" del template); producto sin ámbito; icono `Orbit` genérico + "ORBIT" tracked (mayúscula espaciada: tell); sin pie (el sidebar acaba en vacío con el badge de Next); sin información viva (nada indica emergencia, hub ni miembros en línea); a 1024 ocupa 208 de 1024.
**Referencia**: macOS source list, Linear (workspace + contador en cola + estado).
**Spec**:
- Ancho 224 (≥1280), rail 56 (1024–1279). Material translúcido `mac-sidebar` se mantiene (con `prefers-reduced-transparency` sólido).
- Cabecera (h 56): monograma 20 px + "Orbit" `heading` 15/700 (sin tracking, sin mayúsculas); debajo, **fila de ámbito** como selector estático 32 px `raised`: "Misión · Día 142" + `micro` muted "4 tripulantes · 4 en línea" (datos reales del hub; el día = lo que provea el hub, si no existe, omitir y mostrar solo tripulantes).
- Ítems: alto 32, `small` 13/500, icono 16 (trazo 1.5). **Activo = relleno neutro `rgba(255,255,255,.10)`**, radio 6, icono y etiqueta en ink; inactivo icono `muted`. Acento azul solo en el foco.
- Contador: en "Vista general" un pill "2" (alertas abiertas = miembros ≠ ok) con `aria-label="2 miembros fuera de rango"`; con emergencia abierta el pill es `emergency` con glifo `TriangleAlert` (única presencia roja fuera del banner, justificada: es la cola que exige acción).
- Pie (mt auto, 48 px): estado del hub como `StatusMark`-estilo: `CircleCheck` + "Hub conectado" `small` (o `WifiOff` ámbar + "Sin hub") y debajo `micro` muted "último dato hace 2 s".
- Nav = pantallas, nunca anclas. Grupos: etiquetas sentence-case 12/600 muted (ya está bien).
- `layout.tsx`: `<main>` con la barra de título propia (52 px, sticky con el `mac-toolbar` existente **solo** si hay scroll bajo ella) y `max-w-[1152px] mx-auto px-8 py-6`. Quitar `p-8` genérico que provoca los márgenes distintos entre páginas (overview 1152, protocolos/logros/exploración `max-w-4xl` = 896 centrado con 380 px de vacío a la izquierda en 1440: ver capturas). **Todas las páginas comparten el mismo borde izquierdo**.

### 5.7 Page headers (todas las páginas)
**Mal**: `h1` 22 px + línea gris descriptiva sobre la interfaz ("Biblioteca del hub. Elige a quién enviarlo."), anchos de columna distintos por página, sin acciones coherentes.
**Spec**: componente `PageHeader({title, finding, actions})`: `h1` `title` 22/700; `finding` = una frase `body` 15 `muted` **sobre el dato** (el hallazgo, p. ej. "Ana Ruiz lidera con 150 XP", "3 salidas registradas hoy · 15.1 km"), nunca sobre cómo usar la UI; acciones a la derecha, 36 px, una sola primaria. Ancho = 12 col (1152) en todas las páginas; el ancho de lectura de 720 aplica al chat y a formularios *dentro* de su columna, no a la página.

### 5.8 LeaderboardScreen (`/logros`)
**Mal** (`logros-1440.png`): cuatro filas de texto en 896 px centrado; chips con borde 1 px; el XP en 20 px sin barra; ninguna medalla bloqueada; ocupa 40 % de la pantalla.
**Referencia**: Strava club leaderboard, Apple Fitness Awards.
**Layout (12 col)**: izquierda 7 col **Clasificación**, derecha 5 col **Medallas** (o apilado <1100).
- **Fila de clasificación** (`LedgerRow` 72 px, `ol`): numeral de rango `title` 22/700 tabular (1º ink, resto `muted`, sin oro/plata) en columna 32 · `Avatar 40` · nombre `heading` + (bajo) barra fina **4 px** `raised` con relleno `accent` al ratio `xp / maxXP` (ancho máx. 100 % de la columna; 0 XP = **sin muñón**, pista vacía) · derecha `figure` 22/600 "150" + `small` muted "XP". Empates: mismo numeral. Hallazgo en cabecera: "Ana Ruiz y Leo Park empatan con 150 XP".
- **Medallas**: grid 5 col × 2 (cierra 10), **sin tarjeta** (sin fondo): `Medal` 56 px circular SVG: **ganada** = disco `raised` + aro 2 px ink + glifo lucide 24 ink; **bloqueada** = aro 1.5 px `faint` discontinuo `3 3` + glifo `faint` (contraste decorativo; el título lleva el texto) — el estado bloqueado también se dice en texto `sr-only` "bloqueada". Debajo: título `small` 13/600 (2 líneas máx.), "+150 XP" `micro` muted, y **pila de avatares 16 px** de quienes la tienen (solapados −4, máx. 4). Glifos: `first_checkin` ClipboardCheck · `checkin_streak_7` CalendarCheck · `exercise_2h` Dumbbell · `sleep_7h_x3` Moon · `protocol_done` ListChecks · `pet_session` HeartHandshake · `defender_1000` Shield · `first_explore` Compass · `explore_10km` Footprints · `cpr_trained` HeartPulse. Descripción (`desc`) en tooltip y en `aria-describedby`; en ≥1440 visible bajo el título en `micro` 2 líneas.
- Sin colores arcoíris, sin brillos, sin confeti. Ganar = relleno; no ganar = contorno.
- Vacío: `EmptyState` "Todavía no hay XP" + glifo `Trophy`.

### 5.9 ExplorationsScreen (`/exploracion`)
**Mal** (`exploracion-1440.png`): dos listas con las mismas cifras (km/min/ritmo), sin mapa; sub-título "Salidas" como columna de totales; filas con 4 columnas de cifras alineadas por `gap` (los km no se alinean entre filas: "3.2 km" vs "7.8 km" desplazan el resto).
**Referencia**: **Strava feed card** (persona → lugar → mapa → 3 cifras) y su leaderboard de club.
**Layout**: feed 7 col + **Totales** 5 col.
- **ActivityCard** (`surface`, radio 10, padding 20, gap 16; sin sombra):
  1. Cabecera: `Avatar 40` · nombre `heading` · `small` muted "hace 3 min · Surface sim" (lugar) · a la derecha, si el evento desbloqueó medalla ("Explorador"), `Medal 24` + texto `micro`.
  2. Título de la ruta `title` 22/700 ("Crater ridge traverse").
  3. **Mapa** 100 % × 168 px, radio 8, fondo `#0F0F10`: **dibujado, no real** (el hub no guarda GPS). Contornos topográficos: 4 curvas cerradas offset (stroke `#2C2C2E` 1 px, generadas con seed = hash(`title|crewId`)); ruta: spline Catmull-Rom por 7 puntos pseudoaleatorios deterministas (seed igual), trazo `accent` 2.5 px, caps redondeados, **sin gradiente**; punto de salida (disco 6 px ink) y de llegada (anillo 6 px ink); escala "1 km" abajo-izquierda `micro`. Longitud visual proporcional a `km`. Pie `micro` muted "Plano simulado": honesto sobre que no es GPS.
  4. Tres cifras en fila (grid 3, gap 24): `figure` 28/600 tabular + etiqueta `small` muted: "7.8 km" Distancia · "2 h 30" Tiempo · "19:14 /km" Ritmo (columnas alineadas porque cada una es una celda de grid, no `gap` suelto).
- **Totales (5 col)**: Panel "Totales" → bar-list ordenada por km: fila 64 px: `Avatar 32` · nombre `heading` + subtítulo `small` muted "150 min · 1 salida" · derecha `body` tabular "7.8 km"; **barra fina 4 px** bajo el nombre al ratio `km/maxKm`, primera en `accent`, resto `muted`. Elimina la tabla duplicada (Minutos/Ritmo/Salidas quedan en el subtítulo y en la tarjeta).
- Hallazgo en cabecera: "3 salidas hoy · 15.1 km entre todos".
- Vacío: `EmptyState` "Todavía no hay exploraciones" + `Route` + "Aparecen cuando alguien registra una salida en el móvil".

### 5.10 ProtocolLibrary / CustomProtocolForm / ProtocolsScreen
**Mal** (`protocolos-1440.png`): 13 filas en una columna de 896 px; **"Enviar" a ~830 px del título** (el ojo cruza toda la fila); pasos detrás de `<details>` (clic extra y triángulo nativo); `select` nativo en la cabecera para el destinatario; formulario con inputs de borde 1 px y botón primario desalineado; cabecera con instrucción.
**Referencia**: Mail/Linear master-detail (lista a la izquierda, detalle a la derecha, acción en el detalle).
**Layout 12 col**: **lista 5 col** | **detalle 7 col**.
- Barra superior de la página: `PageHeader` con hallazgo "13 protocolos · 5 de emergencia". Debajo, fila de controles (mb 24): **Segmented** "Emergencia | Física | Mental" (reemplaza las 3 secciones apiladas; conteo `micro` en cada opción: "Emergencia 5") y a la derecha el **selector de destinatario**.
- **Selector de destinatario** = `radiogroup` de 4 `Avatar 32` + nombre (`small`), el seleccionado con anillo accent 2 px; sustituye al `<select>` (gente como gente; un clic). Preselecciona por `?para=` y recuerda el último.
- **Lista** (`LedgerList` sin cajas añadidas): `LedgerRow` 56: título `heading`, meta `small` muted "5 pasos · 4 min"; el `reason` (si existe) en una línea 13 muted; `selected` con relleno neutro; sin botón en la fila. Atajos: ↑/↓ cambian selección.
- **Detalle** (sin caja; columna con padding-left 24 y hairline vertical 0.5 px no — usar solo espacio): título `title` 22/700, meta `small` muted; **pasos como `<ol>`** `body` 15/22, número `figure` 22 tabular muted en una columna de 32 px, gap 16 entre pasos (pasos siempre visibles); al pie fijo (sticky bottom) **"Enviar a {Nombre}"** primario 36 px (`Send` 14) — acción junto al contenido. Estado enviado: el botón pasa a "Enviado" con `CircleCheck` 3 s + `role="status"`; error `small` ink con `TriangleAlert`.
- **Nuevo protocolo**: botón secundario al pie de la lista "Nuevo protocolo" que cambia el panel de detalle a **formulario** (`FormSection`, sin Panel): campos Título (input 36 px, fondo `raised`, radio 6, **sin borde**, foco 2 px accent), Categoría (segmented de 3), Pasos: **una fila-input por paso** con numeral a la izquierda y "+ Añadir paso" (Enter añade; ⌫ en vacío elimina), vista previa viva a la derecha opcional ≥1440. Errores inline bajo el campo (`small`, glifo), no al final. Botón "Crear y enviar a {Nombre}" primario 36.
- Vacío por categoría: `EmptyState` "Sin protocolos de esta categoría".

### 5.11 AssistantScreen (`/asistente`)
**Mal** (`asistente-1440.png`): 85 % de la pantalla vacía, columna de 768 px descentrada respecto al shell, compositor justo bajo el texto de vacío (no anclado), sin avatar, sin burbujas diferenciadas, chips de acción en `font-mono` (tell prohibido), botón sin forma (render), estado del modelo escondido en la esquina.
**Referencia**: Apple Messages (burbuja propia a la derecha, compositor anclado), Claude/Raycast AI (acciones de herramienta como filas).
**Spec**: página a alto completo (`h = 100dvh − barra`), columna de lectura **720** centrada en el canvas, tres zonas: (1) lista que hace scroll (`flex-1 overflow-y-auto`, `aria-live="polite"`, auto-scroll al final salvo que el usuario haya subido), (2) compositor **anclado abajo** (sticky bottom 0, padding 16, fondo `bg` con la máscara de fade de `mac-toolbar` invertida), (3) cabecera con el **estado del modelo como `StatusMark`-estilo**: Moon "Dormido · se carga al preguntar" / LoaderCircle "Cargando modelo…" / CircleCheck "Listo" (`small`, color `muted`, ok verde solo en el glifo).
- **Vacío**: glifo del monograma 28 + `title` "¿Qué necesitas saber?" + **3 filas sugeridas** (`LedgerRow` 44, glifo `ArrowUpRight` a la derecha, clic = envía): derivadas de datos vivos — "¿Quién está fuera de rango ahora?" · "Envía respiración cuadrada a {miembro en vigilar}" · "Resume el sueño de la tripulación".
- **Usuario**: burbuja `raised`, radio 18 con esquina inferior derecha 6, `body` 15, máx. 80 % del ancho, alineada a la derecha. **Asistente**: sin burbuja, `Avatar 28` (monograma) a la izquierda, `body` 15/22, medida ≤ 64ch.
- **Acciones** (`m.actions`): bajo la respuesta, filas 40 px `surface` radio 10, padding 0 12: glifo (`Send` para protocolo, `CheckCheck` para resolver, `Wrench` genérico) · texto `small` legible ("Protocolo enviado a Ana Ruiz: Respiración cuadrada") · derecha resultado (`CircleCheck`/`TriangleAlert` + "enviado"/"falló"). `actionChip()` produce la cadena; mapear `tool`→glifo+texto en español. **Sin monospace**.
- **Pensando**: tres líneas esqueleto 12 px (`raised`, pulso opacidad 1.2 s; estático con reduced-motion) + `small` muted "Pensando… 12 s · puede tardar 2–3 min" + botón "Cancelar" (ghost 28, `Square` 10). `role="status"`.
- **Compositor**: textarea 2 líneas (alto mín 52), fondo `raised`, radio 12, sin borde, foco 2 px accent; botón **Enviar** circular 32 px accent con `ArrowUp` (aria-label "Enviar"), deshabilitado 40 % con contraste legible; Enter envía / Shift+Enter nueva línea (hint solo `aria-describedby`, no texto permanente). Errores: `small` ink con glifo sobre el compositor, no gris apagado.

### 5.12 CheckInPanel (`components/crew/CheckInPanel.tsx`)
**Mal** (`crew-1440.png`): `dl` en dos columnas con 3 cifras "4/5, 2/5, 4/5" (sin forma ni significado); "Logros" como chips con borde 1 px y "150 XP" suelto; dentro de cards (el brief: check-in no va en card).
**Spec**: sección sin Panel, 12 col = 6 + 6 (bloque `FormSection`: título `heading`, filas 44 con hairline inset 16).
- **Último registro**: por cada escala una fila: etiqueta `small` · **barra de 5 segmentos** (cada segmento 28 × 6, gap 4, radio 3; llenos ink, vacíos `raised`; aria `meter` "Ánimo 4 de 5") · derecha `small` tabular "4/5" + palabra ("Bien") en `muted`. Estrés: misma barra, **la polaridad se dice con texto** ("Estrés 2/5 · bajo"); nunca rojo/verde por valor. Lesión/nota/familia: filas `LedgerRow` con glifo (`Bandage`, `StickyNote`, `HeartHandshake`); la pérdida familiar se mantiene como línea simple sin detalle. Sello de fecha "hace 3 h" en la cabecera. Vacío: `EmptyState` "Sin registros todavía".
- **Logros**: `Medal 40` en fila (máx. 6 + "+3") con título `micro` bajo cada una; `figure` 22 "150 XP" a la derecha de la cabecera. Reutiliza `Medal` de §5.8 (un solo componente).

### 5.13 BehaviourPanel (`components/crew/BehaviourPanel.tsx`)
**Mal**: lista de señales como texto coloreado (color como único canal), 12 px de nota técnica que explica limitaciones del hub (fuga de implementación), botón sin forma (render), respuesta del asistente como párrafo suelto.
**Spec**: Panel "Análisis de comportamiento", subtítulo `small` muted "Últimos 14 días". Señales = `LedgerRow` 44: **glifo de tono (`StatusMark dot` + glifo `TriangleAlert`/`OctagonAlert`/`CircleCheck`)** + texto `body` en ink (no coloreado; el color vive en el glifo) → color + forma + texto. Sin señales: `EmptyState` compacto "Sin señales destacadas" (el aviso "no hay historial suficiente" va como `small` muted solo si es el caso real). La nota técnica se mueve a un `title`/popover `Info` 14 px junto al título del panel. Botón **"Pedir análisis al asistente"** `mac-btn` 28 con `Sparkles`; al cargar: spinner + skeleton de 3 líneas en el hueco de la respuesta; respuesta = bloque con `Avatar 24` del asistente + `body` 15 (mismo estilo que el chat), con `aria-live=polite`.

### 5.14 Protocolos enviados (panel en CrewScreen)
**Mal**: "El hub no expone todavía los protocolos…" es un mensaje de implementación en una caja de producción.
**Spec**: no renderizar el panel hasta que exista el dato; mientras tanto, bloque de acción en la cabecera del detalle ("Enviar protocolo") y nada más. Si el producto exige el hueco: `EmptyState` "Sin protocolos enviados" + botón "Enviar protocolo".

---

## 6. Resumen de componentes nuevos (todo en `components/ui/` salvo indicado)

| Componente | Reutiliza | Notas |
|---|---|---|
| `Avatar` | — | iniciales/foto, anillo de estado, offline discontinuo |
| `RangeGauge` | `THRESHOLDS`, `statusOf` | SVG 52 px, `role="meter"` |
| `RangeBar` | idem | barra lineal de rango (tiles) |
| `Sparkline` | `downsample` | SVG puro, sin recharts |
| `Medal` | `ACHIEVEMENTS` | ganada/bloqueada |
| `Segmented` | — | pista `raised`, píldora `surface`, flechas ←→ |
| `PageHeader`, `KpiStrip` | — | §5.7, §5.1 |
| `lib/domain/proximity.ts` | — | `rssiToMeters`, `smacof`, `procrustes` (+ assert en `domain.check.ts`) |
| `lib/domain/ticks.ts` | — | `niceTicks` |

Dependencias nuevas: **ninguna** (SVG a mano; recharts se mantiene para la gráfica grande y comms).

## 7. Orden de implementación sugerido (por impacto / riesgo)

1. P0-1 (contrato comms) y P0-2 (reiniciar dev server).
2. Tokens/sistema (§3): `--t-text-3`, escala, `PageHeader`, ancho 1152 común, `StatusMark` (glifo).
3. `Avatar` + `RangeGauge` + `Sparkline` → CrewBoard (§5.1).
4. EmergencyBanner (§5.2) + contador en Nav (§5.6).
5. ProximityMap (§5.3).
6. Detalle: tiles + gráfica grande (§5.4), luego comms/check-in/comportamiento (§5.5, 5.12-5.14).
7. Logros y Exploración (§5.8, 5.9).
8. Protocolos master-detail (§5.10) y chat (§5.11).
9. Pasada final: inspector `--app` a 1440/1024 + capturas, comprobar reduced-motion y `prefers-reduced-transparency`.

## 8. Checklist anti-slop (el skill, aplicado)

- [ ] Ninguna cifra KPI con icono en círculo tintado ni delta inventado.
- [ ] Sin gradientes, sin glow, sin sombras en reposo, sin glass decorativo, sin emoji, sin violeta/índigo.
- [ ] Sin monospace (el chat y los IDs incluidos), sin MAYÚSCULAS tracked, sin numeración decorativa (el rango del leaderboard es dato).
- [ ] Sin cajas de 1 px alrededor de nada (EmptyState, chips, inputs).
- [ ] Color solo en datos/estado/acción primaria; el azul es la serie principal.
- [ ] Una cifra `lead-figure` por pantalla; ≤5 tamaños.
- [ ] Todo estado tiene glifo + texto; todo gráfico tiene límites rotulados.
- [ ] Mismo borde izquierdo en todas las páginas; gutter único 24.
- [ ] Reduced-motion: valores y contenido idénticos sin transición.

## 9. Qué no se verificó

- La pantalla `/crew/:id` se vio solo con el `fetch` parcheado en el navegador (la app real se cae, P0-1); el panel de comunicación apareció vacío porque `InView` no monta fuera de viewport en capturas de página completa.
- Las capturas `protocolos`/`asistente` se tomaron con el CSS `.mac-*` ausente (P0-2): espaciados exactos por confirmar tras reiniciar `next dev`.
- Las referencias marcadas *conocimiento de producto* (Oura, Linear, Raycast, Garmin, Find My, NASA/SpaceX) no se contrastaron con fuentes en esta sesión; HIG, WHOOP y Strava sí (enlaces en §2).
- Fórmula RSSI→metros (n = 2.2, −59 dBm @1 m) es un modelo genérico sin calibrar en hardware real.
