# Orbit · app del tripulante (mobile)

Expo SDK 54 (React Native 0.81.5, React 19.1). El teléfono va en la manga del brazo. Recibe los vitales de las tres ESP32 (banda, manga, chaleco) por BLE y los reenvía al hub de la nave por WebSocket en la LAN.

## Ejecutar

```bash
npm install
npx expo start            # Expo Go: corre con el simulador como fuente de datos
npm run typecheck         # tsc --noEmit
npm run check:domain      # asserts de la lógica pura (domain/*.check.ts)
```

BLE (`react-native-ble-plx`) y el cerebro de la mascota (`llama.rn`) son módulos nativos. Necesitan un build de desarrollo:

```bash
npx expo prebuild
npx expo run:ios          # o: npx expo run:android
# alternativa en la nube:
eas build --profile development
```

En Expo Go ambos módulos se cargan con `require` dentro de `try/catch`: la app arranca igual, BLE aparece como "no disponible" y la mascota usa el hub o respuestas predefinidas.

## Configurar el hub

La URL por defecto es `ws://192.168.1.50:8790/ws`, armada con `HUB_PORT` de `@orbit/shared` (8790). Para cambiarla, en **Yo → Ajustes → URL del hub**. Tiene que ser la IP LAN de la Mac del capitán y el puerto del hub. El teléfono y el hub deben estar en la misma red; no hay internet a bordo.

## Estructura

```
App.tsx                         entrada (solo reexporta src/app/App)
src/app/                        App (providers, tabs u HUD según orientación), MainTabs, navigation
src/features/<feature>/         una carpeta por pantalla: today, checkin, pet, protocols, emergency, game, profile, ship
src/components/ui/              StatusMark, FeedRow, FormSection, SettingsGroup, SegmentedTabs, EmptyState, MetricTile, Sparkline, BodyMap, SosButton, Press, Toast
src/components/layout/          ScreenHeader
src/domain/                     lógica pura sin I/O (+ *.check.ts)
src/services/                   hub.ts, petBrain.ts, runtime.ts, sensors/{types,sim,ble}.ts
src/store/                      zustand + AsyncStorage (store.ts, types.ts)
src/theme/                      reexporta los tokens de @orbit/shared + useReducedMotion
src/config/env.ts               valores por defecto y límites
```

Los tokens (color, tipo, espacio, radios, motion), los textos de estado, las etiquetas y el análisis de comportamiento viven en `@orbit/shared`. No se redefinen aquí.

## Fuentes de datos

Ambas implementan `SensorSource` (`src/services/sensors/types.ts`): `start(onMetrics, onPeers)`, `stop()` y, opcional, `setBackground(bg)`. El resto de la app no sabe cuál corre.

- `simSource`: vitales cada 2 s, compañeros cercanos falsos cada 5 s.
- `bleSource`: escanea nombres `ORB-<crewId>-<device>`. Mantiene conexión con los tres dispositivos propios y solo mide la proximidad de los demás.

## Memoria

Pensado para correr todo el día en un teléfono con poca RAM y batería, en la manga:

- **Historial acotado.** Una muestra por minuto, 24 h como máximo (`ENV.historyMax` = 1440 por métrica). Es un anillo: lo más viejo sale primero.
- **Persistencia agregada.** AsyncStorage guarda el historial por minuto, los días, check-ins, protocolos y estadísticas. Nunca cada muestra de 2 s. `metrics`, `peers`, `self` y `emergency` viven solo en memoria. Las escrituras se agrupan con un debounce de 3 s y se omiten si el contenido no cambió.
- **Chat de la mascota.** Últimos 100 mensajes (`ENV.chatMax`).
- **Cola offline del hub.** 500 mensajes como máximo (`ENV.queueMax`); se descarta el más viejo al llenarse. Se vacía al reconectar. La reconexión usa backoff de 1 s a 15 s.
- **Cerebro de la mascota (llama.rn).**
  - El contexto se carga solo con el primer mensaje del chat, nunca al abrir la app. Al abrir solo se comprueba que el archivo exista.
  - `n_ctx` = 2048 y `use_mlock` = false.
  - Se libera con `context.release()` tras 2 min sin uso, al pasar la app a background, y antes de descargar otro modelo.
  - Si una carga está en curso, no se inicia otra. Las generaciones van en serie.
  - Las palabras de crisis se responden sin modelo.
- **Orbit Defender.** El loop de `requestAnimationFrame` se detiene cuando la pantalla pierde el foco (`useIsFocused`) o la app va a background.
- **BLE en background.** Se detiene el escaneo de proximidad y se retoma al volver. Las conexiones a banda, manga y chaleco se mantienen.
- **Tiempo de mascota.** Solo cuenta con la pestaña enfocada y se guarda cada 15 s.

## Pendiente antes de producción

- Probar BLE y llama.rn en un build de desarrollo y en un teléfono real, no solo en simulador.
- Los umbrales son genéricos (los de `@orbit/shared`); reemplazar por los valores del equipo.
- La descarga del modelo (Qwen3-0.6B Q8_0) pide conexión a internet; el resto de la app no la necesita.
