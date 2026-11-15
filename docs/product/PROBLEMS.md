# Orbit · problemas y seguimiento

Actualizado: 2026-11-14. Evidencia de esta sesión; no son estimaciones permanentes.

## Memoria de la Mac
- [x] Identificar modelos: Mac Qwen3.8-Flash-Next (GGUF 92 GB, streaming expertos); móvil Bonsai-4B Q1_0 (antes Qwen3-0.6B Q8_0). No hay segundo proceso local de 0.6B en la Mac.
- [x] Detener lectores de logs del agente: PID53339 consumía ~1.6 GiB RSS; PID53004 también cerrado. No dejar syslog continuo sin límite.
- [x] Verificar memoria completa del servidor Mac: PID40580 dormido, RSS ~47MiB, pero footprint5.6GiB y pico18.5GiB; vmmap atribuye5.6GiB a swapped writable memory. RSS solo no representa su consumo.
- [x] Liberar servidor dormido PID40580: swap bajó de9.2GB a3.4GB tras SIGTERM, sin generación activa. El asistente puede reiniciarlo bajo demanda.
- [ ] Resolver retención de memoria al dormir en el fork de llama.cpp. `--moe-stream-cache 9` son9GiB de expertos, no un límite de proceso.
- [ ] Presupuestar memoria durante compilaciones: 24GiB físicos; pico del modelo18.5GiB deja poco margen para Xcode, navegador y sistema. No se puede atribuir todo el swap histórico a un único proceso.

## Modelo del iPhone
- [x] Confirmar fallo: no existía GGUF en Documents; respuestas no probaban inferencia local.
- [x] Instalar GGUF Qwen3-0.6B Q8_0 (639446688 bytes; SHA2569465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031) en Documents. Diagnóstico iPhone2026-11-14T20:57Z: gpu=true, local-test-ok y dos local-response; última29tokens/409ms. Servidor Mac apagado.
- [x] Chat comprueba carga e inferencia local y muestra resultado. model-status.json guarda etapas/timings/tokens sin prompts, respuestas ni salud.
- [x] Descarga: se baja a `.part`, se valida tamaño exacto (639446688 B) y solo entonces se mueve; `checkModel` borra archivos incompletos. Pendiente: SHA-256 si cambia el archivo upstream.

## Interfaz
- [x] Arranque negro: pods nativos faltantes; recompilado con GestureHandler/Blur/DatePicker.
- [x] Juego y compositor detrás de barra nativa: reserva de altura medida, build instalado.
- [x] Chat confuso: CTA Escribir a Orbi; globo abre chat; sesión guiada separada.
- [x] Press colapsaba layout: layout pertenece al Pressable.
- [ ] Prueba manual completa de accesibilidad y rotación con teclado abierto.

## Propuesta ampliada
- [ ] 21 logros, tiers persistidos, retos compartidos y esfuerzo semanal: aún propuesta; versión actual conserva diez IDs y XP acumulado.

## Revisión de acabado y roles
- [x] Código: Hoy compacto sin cuatro diales/Normal repetidos; superficie/acciones monocromas.
- [x] Código: mascota sin planeta/estrellas, indicadores discretos; diagnóstico del modelo fuera del chat.
- [x] Prompt: pregunta separada de telemetría y ejemplo sin hallazgos médicos inventados. Historial excluye respuestas anteriores con confusión de rol, preservando las palabras del usuario.
- [ ] Verificar nueva respuesta en iPhone físico: actualmente no disponible.
- [x] Build Release de simulador y capturas revisadas en iPhone17ProMax/iOS26.5: Hoy, Mascota, Chat. Evidencia en review/screenshots/monochrome-*.png.
- [ ] Compatibilidad con runtime iPhone18/iOS27.2: cierra antes de JavaScript, error UIKit exige UIScene. No se alteró lifecycle en este cambio visual.
