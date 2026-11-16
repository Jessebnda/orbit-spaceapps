# Orbit — arquitectura

```
 ESP32 banda ─┐  BLE (notify JSON c/2 s)
 ESP32 manga ─┼──────────────► Celular del tripulante (Expo)  ──┐
 ESP32 chaleco┘                  · pet con LLM en el cel (llama.rn) │  WebSocket LAN
          ▲  RSSI de ESP32 ajenas → proximidad                      │  ws://<mac>:8790/ws
          └──────────────────────────────────────────────────────────┤
                                                                     ▼
                         Hub (Node, Mac del capitán) ── reglas, emergencias, RAG, agente
                           │            │                     │
                pgvector local     Flash Next (llama.cpp :8080)   Dashboard Next.js (:3000)
                (Docker, ~20 MB)   asistente con tools           monitor principal
                           │
                 Supabase (respaldo/sync cuando hay red; mismo esquema)
```

Todo funciona **sin internet**. Supabase es opcional; el hub solo necesita `DATABASE_URL`.

## 1. ESP32 → celular: BLE (Bluetooth Low Energy)

| Opción | Por qué sí / no |
|---|---|
| **BLE (elegida)** | Sin router, ~10–20 mA, el celular es central de sus 3 ESP32. Además cualquier celular *escucha* los anuncios de las ESP32 de otros → proximidad gratis. |
| WiFi por ESP32 | ~100+ mA, depende de un AP, y la intensidad que ves es la del router, no la de la persona. |

Contrato (en `shared/src/index.ts`, `BLE`):
- Cada ESP32 anuncia el nombre `ORB-<crewId>-<device>` (p.ej. `ORB-c2-vest`).
- Servicio `6f726269-7400-4000-8000-000000000001`, característica NOTIFY `…0002` con JSON UTF-8 cada 2 s: `{"hr":72,"spo2":98,"temp":36.6}`.
- Banda: hr, spo2, temp, sleep · Manga: bpSys, bpDia · Chaleco: resp, activity.
- Comida/agua las mide la nave (registro de galley) y llegan en el mismo mensaje `vitals`.

Alcance BLE: 10–30 m en interiores; dentro de un módulo de nave cubre de sobra. El celular va en la manga, a <1 m de sus 3 ESP32.

## 2. Celular → Mac del capitán: WebSocket en la LAN

- Cada cel abre `ws://<ip-mac>:8790/ws` y manda `hello`, `vitals` (2 s), `proximity` (5 s), `checkin`, `stat`, `sos`.
- Si se pierde el WiFi, el cel **encola** (hasta 500 msgs) y reenvía al reconectar.
- El hub responde con `protocol`, `emergency`, `self` (tu snapshot) y al capitán `snapshot` cada 3 s.
- Rango: WiFi en interiores ~30–50 m por AP; una nave/base real tendría varios APs en la misma red. Sin red, el celular sigue funcionando solo (sensores, mascota, protocolos locales).

## 3. ¿Quién está cerca? Proximidad por RSSI

El celular de cada uno escanea BLE y ve las ESP32 de los demás con su RSSI (dBm, −30 muy cerca … −100 lejos). Manda `proximity { peers: [{crewId, rssi}] }`.

Cuando hay emergencia (p.ej. paro: `hr < 30`), el hub ejecuta `nearestResponders(víctima)`:
- toma la señal en **ambos sentidos**: el cel del rescatista oyendo el chaleco de la víctima, y el cel de la víctima oyendo las ESP32 del rescatista;
- ordena por la señal más fuerte y avisa a los 2 más cercanos + al capitán + a la víctima;
- si nadie tiene señal, avisa a toda la tripulación conectada.

Limitación honesta: RSSI es ruidoso (cuerpos y paredes metálicas atenúan). Sirve para **"quién está en el mismo módulo / más cerca"**, no para metros exactos. Mejora futura: promedio móvil + calibración por módulo.

## 4. Emergencia cardíaca: RCP en microgravedad

En la app aparece una guía animada (sin internet) con metrónomo a 110/min:
- **Evetts-Russomano** para soporte vital inmediato: el rescatista rodea el torso del paciente con las piernas, 30:2, 5–6 cm.
- **Pino (handstand)** cuando el paciente está sujeto en la camilla médica (CMRS).
- Cambiar de rescatista cada 2 min (fatiga).

Fuente: guía ESA/DGLRM 2020, https://pmc.ncbi.nlm.nih.gov/articles/PMC7607644/

## 5. Comunicación del equipo

La nave mide (asumido) cada conversación como `{crewId, peerId, minutes, channel}`. El hub compara a cada persona **contra su propio historial de 7 días** (`commsAnomalies`):
- `withdrawal`: habló menos de la mitad de su promedio → posible aislamiento.
- `peer_drop`: dejó de hablar con alguien con quien hablaba casi diario → posible conflicto.
- `spike`: >2.5× su promedio → posible crisis/conflicto.
Esto dispara el protocolo mental `connect_crew` y aparece en el dashboard.

## 6. IA

| Dónde | Modelo | Para qué |
|---|---|---|
| Celular | Bonsai-4B 1-bit (llama.rn, ~572 MB, se baja al cel) | Mascota/mentor, privado, sin red |
| Mac capitán | Qwen 3.8 Flash Next (fork npanj/llama.cpp) | Asistente de análisis con tools |
| Mac capitán | multilingual-e5-small (~120 MB, transformers.js) | Embeddings para el RAG en pgvector |

### Por qué Flash Next corre local en un M5 Pro de 24 GB

- Es **MoE**: por token solo se activan unos pocos expertos, no los ~92 GB del archivo.
- El fork usa `--moe-stream`: los expertos se leen del SSD bajo demanda (cache de 9 GB + prefetch), así que la RAM no tiene que contener el modelo entero.
- KV cache en Q8 con contexto de 64k → cabe con el resto del sistema.
- Ventaja para la misión: sin servidor, sin red, los datos médicos nunca salen de la nave.

 Tools del agente: `get_crew_overview`, `get_member_history`, `get_comms`, `search_knowledge` (RAG), `list_protocols`, `trigger_protocol`, `create_protocol`.

## 7. Memoria: todo se carga cuando se usa y se suelta solo

**Mac del capitán**

| Pieza | Cuándo se carga | Cuándo se libera | RAM |
|---|---|---|---|
| Flash Next (`hub/scripts/llm.sh`) | 1ª pregunta al asistente | `--sleep-idle-seconds 300`: el server descarga el modelo tras 5 min sin uso y lo recarga al siguiente request | ~12–15 GB activo · casi 0 dormido |
| Mascota de respaldo en el hub | nunca despierta a Flash Next; solo lo usa si ya está despierto | — | 0 |
| Encoder e5-small (RAG) | 1ª búsqueda o ingest | `dispose()` tras 5 min sin uso | ~200 MB activo |
| pgvector (Docker) | `npm run db` | `docker compose stop` | ~20 MB medido (tope 256 MB) |
| Hub (buffers con tope) | siempre | — | <100 MB |
| Dashboard | mientras está abierto | — | snapshot reemplaza, gráficas ≤500 puntos |

`llm.sh` arranca el modelo **sin** herramientas de control de la computadora: solo las tools del agente del hub.

**Celular**

| Pieza | Cuándo | Libera |
|---|---|---|
| Bonsai-4B Q1_0 (llama.rn, n_ctx 2048) | 1er mensaje a la mascota o al iniciar sesión | `release()` tras 2 min sin uso o al ir a background |
| Juego | pantalla enfocada | loop parado al salir |
| Escaneo BLE de proximidad | app en primer plano | se pausa en background (las 3 ESP32 propias siguen conectadas) |
| Historial | 24 h a 1 muestra/min | ring buffer, AsyncStorage solo guarda agregados |


## 8. Umbrales

`THRESHOLDS` en `shared/src/index.ts` son rangos clínicos genéricos **provisionales**; se reemplazan con los valores del paper de la NASA.
