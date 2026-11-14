# Orbit — Astronaut Health Monitor

NASA Space Apps Challenge 2026 · *Create Health Monitoring Software for Astronauts on Space Missions*

Wearables ESP32 (banda, manga, chaleco) → BLE → app del tripulante → LAN → hub en la Mac del capitán → dashboard + asistente IA local. Funciona sin internet.

| Carpeta | Qué es |
|---|---|
| `shared/` | Contrato único: tipos, umbrales, BLE, mensajes, tokens, textos |
| `hub/` | Servidor local: reglas, emergencias, RAG, agente con Flash Next |
| `mobile/` | App Expo (vertical + modo nave horizontal) |
| `dashboard/` | Monitor del capitán (Next.js) |
| `firmware/` | Sketch ESP32 de referencia |
| `supabase/` | Esquema pgvector (local o Supabase) |

Docs: [Arquitectura](docs/ARCHITECTURE.md) · [Convenciones](docs/CONVENTIONS.md) · [Diseño](docs/product/DESIGN-BRIEF.md)

```bash
npm run db         # pgvector local (Docker, ~20 MB)
npm run hub        # hub en :8787
npm run sim        # 4 tripulantes simulados (añade -- --emergency c2)
npm run dashboard  # http://localhost:3000
npm run mobile     # Expo
npm run check      # pruebas del contrato
```
