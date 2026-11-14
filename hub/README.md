# Hub

Servidor local en la Mac del capitán. Funciona sin internet en la LAN de la nave: los teléfonos y el dashboard se conectan por WebSocket y REST.

## Ejecutar

Desde la raíz del repo levanta la base de datos y desde `hub/` instala y arranca:

```sh
npm run db            # en la raíz: contenedor pgvector (opcional; sin DB todo sigue en memoria)
cd hub
npm install
npm run dev           # servidor en 0.0.0.0:8790, WebSocket en /ws
npm run sim           # 4 teléfonos simulados (añade --emergency c2 para un paro a los 20 s)
npm run ingest        # indexa hub/kb/ (la primera vez descarga el encoder, ~120 MB)
npm run check         # pruebas de dominio (*.check.ts)
npm run typecheck
```

Variables de entorno (sin fichero `.env`; expórtalas o pásalas en la línea de comandos):

| Variable | Por defecto |
|---|---|
| `DATABASE_URL` | `postgres://orbit:orbit@127.0.0.1:5432/orbit` |
| `LLM_URL` | `http://127.0.0.1:8080` |
| `HUB_PORT` | `8790` (valor de `HUB_PORT` en `@orbit/shared`) |

## Estructura

```
src/server.ts          arranque: http, upgrade de /ws, tick de 3 s
src/routes/ws.ts       mensajes de los teléfonos; ejecuta las decisiones de las reglas
src/routes/api.ts      REST /api/*
src/domain/            lógica pura, sin I/O, con *.check.ts
  rules.ts             evaluate() y decide(): devuelven decisiones
  state.ts             snapshots, buffers con tope
  validate.ts          validación de mensajes entrantes
  protocols.ts         biblioteca de protocolos
  context.ts           texto para el LLM (usa las etiquetas de @orbit/shared)
src/services/          I/O
  db.ts                pg, best-effort
  store.ts             lecturas y escrituras en la DB
  hub.ts               mensajes salientes
  llm.ts               arranque y estado del LLM
  agent.ts             loop de herramientas y petReply
  rag.ts               encoder y búsqueda
scripts/               sim.ts, ingest.ts, llm.sh
kb/                    documentos del RAG
```

Las reglas no importan servicios ni rutas: deciden y la capa de rutas ejecuta.

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/snapshot` | toda la tripulación y emergencias |
| GET | `/api/history/:crewId?hours=24` | métricas (DB, o el buffer en memoria si la DB no responde) |
| GET | `/api/comms/:crewId?days=14` | registros de conversación y anomalías |
| GET | `/api/leaderboard` | tripulación por XP con logros |
| GET | `/api/explorations` | exploraciones, la más reciente primero |
| GET | `/api/protocols` | biblioteca de protocolos |
| GET | `/api/llm` | `off` / `starting` / `ready` |
| POST | `/api/protocol` | `{crewId, protocolId}` o `{crewId, protocol}` |
| POST | `/api/resolve` | `{emergencyId}` |
| POST | `/api/assistant` | `{messages:[{role,content}]}`; 503 si el LLM no arranca |

## Mensajes WebSocket

Entrada (teléfono o simulador): `hello`, `vitals`, `proximity`, `checkin`, `comms`, `stat`, `pet_chat`, `sos`, `protocol_ack`, `resolve`. Un mensaje mal formado se descarta sin error.

Salida: `self` a cada teléfono y `snapshot` a cada capitán cada 3 s; `protocol`, `emergency` y `pet_reply` cuando corresponde. Una emergencia va a la víctima, a los responsables más cercanos (por RSSI) y a los capitanes; si nadie está al alcance, a toda la tripulación en línea.

## Memoria

Todo lo grande se carga bajo demanda y se libera solo. Los buffers tienen tope.

**Flash Next (modelo de 92 GB).** No se carga al arrancar el hub.
- Solo `/api/assistant` lo despierta, mediante `ensureLLM()`. Si ya hay un servidor en `LLM_URL` (por ejemplo el `serve.sh` del usuario) lo usa; si no responde, el hub lanza `scripts/llm.sh` separado del proceso (detached, log en `hub/llm.log`) y espera hasta 180 s a que esté sano.
- `llm.sh` arranca `llama-server` sin herramientas de control del equipo (sin `--agent`, `--mcp-servers-config` ni `open`). Con `--sleep-idle-seconds 300` descarga el modelo tras 5 min sin uso y lo recarga en la siguiente petición.
- `pet_chat` nunca lo despierta: solo responde con el modelo ya en RAM (`/props` debe decir `is_sleeping: false`); si no, responde con la frase predefinida.
- `GET /api/llm` indica `ready` solo cuando el modelo está en RAM, `starting` mientras el hub lo está lanzando y `off` en cualquier otro caso.

**Encoder e5 (~120 MB).** Se carga en la primera búsqueda o al ingerir. Se libera (`dispose()`) tras 5 min sin usarse y se vuelve a cargar cuando hace falta.

**Buffers en memoria.**
- Vitales: anillo de 2000 muestras por tripulante (unos 66 min a 2 s). Lo que sale de ahí queda en la DB, con una fila por crew cada 10 s.
- Conversaciones (comms): ventana de 14 días, purgada cada 3 s.
- Eventos de estadísticas: máximo 5000; se descartan los más antiguos.
- Emergencias: máximo 200; si se llena, se descartan primero las resueltas, así una abierta no se pierde.

Si la DB no responde, la escritura se pierde de la DB pero no de la memoria, y se avisa una sola vez en el log.

## Protocolos y reglas

Los protocolos están en `src/domain/protocols.ts`. Agregar uno es una entrada nueva. Un mismo protocolo se reenvía como mucho cada 30 min por tripulante.
