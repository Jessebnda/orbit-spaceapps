# Design Brief — Orbit

**Status:** Living · basado en la infraestructura de diseño de colab (`docs/product/DESIGN-BRIEF.md` + `src/theme` + `components/ui`), adaptado a una cabina espacial.
**Visual direction:** *Cabina* — panel de instrumentos nocturno, calma operativa.
**Tokens (fuente de verdad):** `shared/src/design.ts` (mobile los usa directo; dashboard los mapea a CSS vars).
**Related:** [ARCHITECTURE](../ARCHITECTURE.md)

---

## 1. One-sentence story

Como **astronauta en una misión larga**, quiero **ver de un vistazo si mi cuerpo y mi cabeza están bien y qué hacer si no**, para **actuar solo, sin esperar a un médico en la Tierra**.
Como **capitán**, quiero **ver a toda la tripulación y que me avisen primero lo urgente**.

## 2. Who is this for?

- **Tripulante:** teléfono en la **manga** del brazo. Lo mira de reojo (horizontal = modo nave) o lo saca para check-in, mascota y juego (vertical). Guantes, poca luz, a veces estrés alto.
- **Capitán:** laptop/monitor en la nave, sesión larga, densidad alta.

## 3. Problem (design lens)

- Métricas médicas sin contexto asustan o se ignoran → cada valor necesita **estado + qué significa + qué hago**.
- En emergencia no hay tiempo de leer → **una sola acción por pantalla**, tipografía grande, háptica.
- Salud mental es privada y sensible → tono cálido, sin juicio, nunca alarmista.

## 4. Design intent

| Pilar | En la UI |
|---|---|
| **Instrumento** | Números grandes `tabular-nums`, unidades pequeñas, alineados en retícula. Nada decorativo. |
| **Estado primero** | Cada métrica lleva `StatusMark` (tick + MAYÚSCULAS) — color **y** texto. |
| **Calma** | Fondo oscuro de cabina, sin rojo salvo emergencia real. Movimiento mínimo. |
| **Una acción** | Cada pantalla tiene un trabajo; el siguiente paso es el CTA. |

### Anti-slop (heredado de colab + propio)

- Sin gradientes morado/azul, sin glow neón, sin "glassmorphism" decorativo, sin emoji como ícono.
- Sin cards idénticas con sombra: superficies por **tono** (`surface`/`raised`) y **hairline 1px**.
- Listas (protocolos, exploraciones, sesiones, logros) = **`FeedRow` ledger**: fila, divisor, sin caja.
- Formularios (check-in, ajustes, crear protocolo) = **`FormSection`**, nunca dentro de card.
- Ajustes = `SettingsGroup` + filas.
- El rojo `emergency` **solo** aparece en emergencia activa o botón SOS. `critical` (coral) es para métricas.
- Sin métricas-confeti: el home no es un dashboard de 12 KPIs iguales; jerarquía clara (estado general → 4 vitales → resto).
- Fuente de sistema (SF / Roboto). Nada de Inter/Geist por default.

## 5. Brand & voice

- **Tono:** directo, sereno, español neutro. "Tu presión está un poco alta. Respira 2 minutos." — no "⚠️ ¡ALERTA!".
- **Mascota:** cálida, breve (≤3 frases), nunca diagnostica; deriva al capitán/cirujano de vuelo en crisis.
- **Nombre:** Orbit. Kicker en mayúsculas tracked (`type.caption`) arriba de títulos, como colab.

## 6. Tokens

### Color — Cabina

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#0B0D12` | Fondo (noche de cabina, protege ciclo de sueño) |
| `surface` | `#12161E` | Superficie un paso arriba |
| `raised` | `#1A1F2A` | Sheets, fila presionada |
| `hairline` | `#232A36` | Divisores 1px |
| `text` / `muted` / `faint` | `#E8ECF2` / `#8A94A6` / `#5B6578` | Tinta |
| `accent` | `#7AA7FF` | El único color no-estado: foco, selección, CTA |
| `status.ok/watch/critical` | `#3DDC97` / `#FFB547` / `#FF5A5F` | Estado de métricas |
| `emergency` | `#FF3B42` | Solo emergencia activa / SOS |

### Tipografía (escala colab + instrumento)

| Rol | Tamaño / peso | Notas |
|---|---|---|
| status | 11 / 800 | StatusMark, MAYÚSCULAS, tracking 0.9 |
| caption | 13 / 700 | kickers |
| body | 16 / 400 | |
| section | 18 / 700 | −0.3 tracking |
| title | 22 / 700 | |
| figure | 28 / 600 | valores de métricas, `tabular-nums` |
| hero | 34 / 800 | solo saludo/estado general |
| hud | 56 / 600 | modo nave horizontal |

### Espaciado / radios / motion

- Espaciado `4 · 8 · 12 · 18 · 24 · 32` (colab).
- Radios `6 · 10 · 14 · 18` — Swiss, contenidos.
- Motion `150 / 220 / 300 ms`, spring `damping 18 · stiffness 260`. **Solo 4 movimientos intencionales:**
  1. píldora del tab bar / segmented,
  2. respiración idle de la mascota,
  3. guía de respiración/RCP con metrónomo (110/min),
  4. aparición de la emergencia.
  Todo lo demás: instantáneo o fade 150 ms. Respetar *Reduce Motion* (`useReducedMotion`).

## 7. Componentes (portados de colab)

| Componente | Origen colab | Uso en Orbit |
|---|---|---|
| `StatusMark` | `components/ui/StatusMark.tsx` | Estado de cada métrica / tripulante |
| `FeedRow` | `components/ui/FeedRow.tsx` | Protocolos, exploraciones, sesiones, logros |
| `FormSection` | `components/ui/FormSection.tsx` | Check-in, ajustes, crear protocolo |
| `SettingsGroup` | `components/ui/SettingsGroup.tsx` | Ajustes (hub, crew, fuente de datos) |
| `ScreenHeader` | `components/layout/ScreenHeader.tsx` | Kicker + título + subtítulo útil |
| `SegmentedTabs` | `components/ui/SegmentedTabs.tsx` | Emergencia / Física / Mental en Protocolos |
| `EmptyState`, `Skeleton` | `components/ui/` | Sin datos / cargando |
| `useReducedMotion` | `theme/useReducedMotion.ts` | Todas las animaciones |

Nuevos de Orbit: `MetricTile` (valor + unidad + StatusMark + sparkline), `BodyMap` (cuerpo SVG clicable), `Pet`, `CprGuide`, `ShipHud` (horizontal).

**Dónde NO va card:** check-in, ajustes, chat de mascota, detalle de protocolo. **Dónde sí:** `MetricTile` (superficie por tono, sin sombra) y la tarjeta de protocolo activo en el HUD.

## 8. Layout por superficie

### Celular vertical (tabs: Hoy · Mascota · Protocolos · Juego · Yo)
- **Hoy:** `ScreenHeader` (kicker "ORBIT · DÍA 142", título = estado general) → 4 vitales grandes (hr, spo2, presión, temp) → resto en fila compacta → BodyMap → CTA check-in.
- **Protocolos:** `SegmentedTabs` Emergencia/Física/Mental + `FeedRow` ledger. Detalle = pasos numerados + timer + guía.
- **Yo:** logros (grid sobrio, bloqueados en `faint`), stats, exploración (ledger tipo Strava), análisis de comportamiento, ajustes en `SettingsGroup`.

### Celular horizontal = modo nave (en la manga)
- Sin tabs. HUD de 2 filas: vitales en `type.hud`, estado general, punto de conexión (hub/banda/manga/chaleco), protocolo activo + siguiente paso, SOS grande (mantener presionado).
- Contraste máximo, legible a la distancia del brazo.

### Emergencia (takeover)
- Fondo `bg`, una barra `emergency`, título enorme ("Leo — paro cardíaco"), quién va (ranking por cercanía), guía RCP con metrónomo visual + háptico. Un solo botón secundario: "Resuelto".

### Dashboard del capitán
- Densidad de mission control: sidebar estrecho, retícula, tablas/ledger, gráficas con bandas de umbral. Banner de emergencia fijo arriba. Sin hero, sin cards con sombra.

## 9. Accesibilidad

- Estado nunca solo por color: StatusMark texto + tick; en gráficas, bandas etiquetadas.
- AA de contraste en todo texto sobre `bg`/`surface`.
- Touch targets ≥ 44 pt (guantes); SOS ≥ 72 pt con long-press para evitar falsos.
- Reduce Motion: la mascota queda quieta; el metrónomo pasa a solo háptico + número.

## 10. Criterios de éxito (diseño)

| Criterio | Señal |
|---|---|
| Entiendo mi estado en 2 s | Estado general + 4 vitales visibles sin scroll |
| Sé qué hacer | Cada watch/critical tiene "qué hago" a un tap |
| Emergencia sin dudas | Rescatista llega a la guía RCP en 1 tap |
| No parece "hecho por IA" | Pasa el checklist anti-slop de §4 |
