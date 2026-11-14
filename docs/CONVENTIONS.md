# Convenciones — estructura, SOLID y DRY

## Mapa del repo

```
shared/      contrato único (tipos, umbrales, BLE, WS, ruteo de emergencias, tokens, textos, insights)
hub/         servidor local en la Mac del capitán
mobile/      app Expo del tripulante
dashboard/   monitor del capitán (Next.js)
firmware/    sketch ESP32 de referencia
supabase/    migraciones (mismo SQL para el contenedor local y Supabase)
docs/        ARCHITECTURE, CONVENTIONS, product/DESIGN-BRIEF
```

## Capas (iguales en las 3 apps, convención de colab)

| Capa | mobile | dashboard | hub | Regla |
|---|---|---|---|---|
| Entrada / rutas | `src/app` | `app/` | `src/server.ts`, `src/routes` | Delgada: compone, no decide |
| Pantallas / features | `src/features/<f>` | `components/<f>` | — | Una feature = una carpeta |
| UI reutilizable | `src/components/ui`, `layout` | `components/ui` | — | Sin datos ni I/O |
| Dominio (puro) | `src/domain` | `lib/domain` | `src/domain` | Sin I/O, con `*.check.ts` |
| Servicios (I/O) | `src/services` | `lib/services` | `src/services` | Red, BLE, DB, LLM |
| Estado | `src/store` | hooks | `src/domain/state.ts` | |
| Tema | `src/theme` → `@orbit/shared` | `lib/theme.ts` → `@orbit/shared` | — | Nunca hex sueltos |

## DRY: qué vive en `shared` y en ningún otro lado

| Qué | Dónde |
|---|---|
| Tipos de mensajes, métricas, protocolos | `shared/src/index.ts` |
| Umbrales y `statusOf` / `worstStatus` | `shared/src/index.ts` (cambiar umbral = 1 línea) |
| Nombres, unidades y explicaciones de métricas | `METRIC_META` |
| Textos de enums (emergencias, tipo de protocolo, dispositivos) y `formatMetric` | `shared/src/labels.ts` |
| Anomalías de comunicación | `commsAnomalies` + `anomalyText` |
| Análisis de comportamiento | `shared/src/insights.ts` (`behaviorInsights`) |
| Quién está más cerca | `nearestResponders` |
| Logros | `ACHIEVEMENTS` |
| Tokens de diseño | `shared/src/design.ts` |

Si algo lo necesitan dos apps → va a `shared`. Si solo una → se queda en su `domain`.

## SOLID aplicado

- **S** — un archivo, un trabajo: `rules.ts` decide, `routes/ws.ts` envía, `services/db.ts` guarda.
- **O** — agregar una métrica = agregarla a `MetricKey`, `METRIC_META`, `THRESHOLDS` (TypeScript marca todo lo que falta). Agregar protocolo = una entrada en `hub/src/domain/protocols.ts`.
- **L** — las fuentes de sensores (`sim` y `ble`) cumplen la misma interfaz: el resto de la app no sabe cuál corre.
- **I** — el cel solo recibe `self`/`protocol`/`emergency`; el capitán recibe `snapshot`. Nadie recibe lo que no usa.
- **D** — el dominio no importa servicios: `rules.ts` devuelve decisiones, la capa de rutas las ejecuta. La DB es opcional (best-effort) y el LLM se inyecta por URL.

## Otras reglas

- Commits sin co-author. Mensajes en español: `feat(mobile): …`, `fix(hub): …`.
- `npm run check` en la raíz antes de commitear cambios a `shared`.
- Un atajo con límite conocido lleva comentario `shortcut: <límite>, <cuándo mejorarlo>`.
