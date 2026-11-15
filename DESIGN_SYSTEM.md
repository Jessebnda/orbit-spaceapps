# Orbit · sistema de diseño

## 1. Producto y superficies
Orbit es un monitor de tripulación para una cabina espacial. Dos superficies: app nativa de iOS/Android y dashboard del capitán. Dirección: rediseño de producto, con prioridad en lectura rápida, calma y acciones claras. Tokens de código: `shared/src/design.ts`; geometría común: `shared/src/visuals.ts`.

## 2. Dirección y criterio
La cabina se convierte en instrumentos legibles y la constancia en parches de misión. La mascota aporta cercanía sin modificar el lenguaje de estado médico. Español directo, sin juicios ni puntajes de salud inventados.

Referencias razonadas en `docs/product/review/`: Apple Health (valor con rango), Apple Fitness (progreso), Strava (distancia/tiempo/ritmo), parches de misión (colección). La investigación histórica distingue extractos de buscador de conocimiento de producto; no equivale a una auditoría visual completa de esas aplicaciones.

Revisión adversarial: la combinación de instrumentos, bitácora y parches permite reconocer el contexto de misión sin el nombre. Debilidad encontrada y corregida en dispositivo: `Press` colocaba `flex` y posición en su hijo; botones y globo de la mascota quedaban colapsados. El layout ahora pertenece al touchable.

## 3. Color
| Rol | Valor |
|---|---|
| Fondo OLED | `#000000` |
| Superficie | `#1C1C1E` |
| Elevada/campo/pulsado | `#2C2C2E` |
| Divisor/pista | `#38383A` |
| Texto principal | `#FFFFFF` |
| Texto secundario | `#98989F` |
| Acción/icono/foco | `#E8EAED` |
| Enlace sobre superficies elevadas | `#E8EAED` |
| Texto sobre acción | `#141518` |
| Normal/vigilar/crítico | `#A5A7AE` / `#FF9F0A` / `#FF453A` |
| Emergencia/SOS | `#FF3B30` |

El dashboard conserva `#8E8E93` para tinta terciaria sobre fondo/superficie; evitarlo sobre elevada. No usar color solo: combinar estado con texto y forma. `accentText` comparte el blanco de interacción. Los anillos de objetivos usan `muted` uniformemente. Normal es neutro; el color queda reservado para anomalías y SOS.

## 4. Tipografía
Fuente del sistema: San Francisco en Apple, sistema en Android/web. Es una herramienta de cabina y debe sentirse nativa.

Móvil: body/button 17/22; small/caption 13/18; section 20/25; title 22/28; figure 28/34; hero 34/41; display 40/46. HUD 56/60 solo en horizontal/RCP. Pesos 400 en prosa, 600 en cifras/acciones, 700 en títulos. Cifras tabulares con `figureFont`, no en toda la prosa.

Dashboard: `t-body` 15/22, `t-small` 13/18, `t-heading` 15/20, `t-title` 22/28, `t-figure` 28/32, `t-lead` 36/40; la densidad de escritorio es una excepción explícita al tamaño de cuerpo web de 16 px. No introducir fuentes descargadas ni etiquetas decorativas en mayúsculas.

## 5. Layout y navegación
Móvil: cinco pestañas, cada una con stack; check-in como hoja. Headers nativos inline: evitan el espacio de título grande vacío observado en la combinación actual de pestañas nativas/iOS. Margen 16, separación de secciones 32, tarjetas con padding 16. Inset automático y áreas seguras. Modo nave superpuesto: girar no desmonta la navegación.

Web: sidebar expandida en escritorio, rail en tablet y navegación en rejilla en teléfono. Contenido de actividad hasta 1024 px. Rejilla de parches: 2/3/5 columnas; tarjetas de exploración: 1/2. Sin hero de marketing ni secciones de pantalla completa. No hay carruseles.

## 6. Componentes
Una base por plataforma: componentes nativos/RN y HTML/CSS en web. Recharts para históricos web; SVG para instrumentos y parches.

- `Press`: layout en el Pressable; aspecto y animación en el hijo. Filas se tiñen; tarjetas escalan 0.98. Háptica explícita.
- `MetricTile`: lectura compacta, unidad y tendencia o banda fina; sin diales repetidos ni cuatro estados normales.
- `RangeDial`: solo en detalle, arco 270°, banda de referencia y punto de medición; no es un puntaje. Ausencia de medición = sin punto.
- `Ring`: progreso de un objetivo; nunca representa directamente un vital clínico.
- `MetricTrend`: muestras reales, selección táctil, banda y etiquetas. Histórico insuficiente = mensaje, sin curva inventada.
- `Medal`: mismo path/glifo en ambas plataformas. Progreso local real en el móvil; el dashboard muestra los desbloqueos recibidos.
- `Card`/`FormSection`: tarjeta visual o grupo inset; no anidar tarjetas elevadas.
- `EmptyState`, `SkeletonRows`, `AppErrorBoundary`: estados explícitos.

## 7. Superficies y materiales
Tarjeta móvil 20 pt, grupo 12 pt, hoja 28 pt; curvas continuas en RN. Web usa los radios compartidos. Sin sombras en tarjetas en reposo. Material del sistema solo en navegación/toast. Gradiente únicamente dentro del arte de medallas: bronce `#D9A982 → #A8693F → #7A4A2B → #BF8556 → #5E3820`; oro `#F0D78C → #D1AA4A → #9C7A2B → #E2C16B → #75591D`. Campo bordado `#141416`. Plata/platino están definidos para futuras extensiones; no se otorgan sin reglas y persistencia.

## 8. Iconografía
SF Symbols en iOS, equivalentes Ionicons en Android mediante `Icon`. Lucide ya establecido en dashboard. Los glifos de parche son paths compartidos de 24 unidades. Tamaños: 18–24 en acciones, 44 en estado vacío, 88 en vitrina móvil, 200 en detalle. Acciones sin texto necesitan etiqueta accesible.

## 9. Assets
Marca existente en `brand/` y assets nativos en `mobile/assets/`. Parches vectoriales; Orbi SVG. Sin imágenes generadas nuevas ni mapas que representen un recorrido inexistente. Exploraciones se identifican como registro manual sin GPS. Las mediciones del simulador se identifican en Hoy.

## 10. Movimiento, interacción y arranque
Reanimated para móvil, CSS para web. Ring anima su arco en UI thread; no recrear sus valores con setState por frame. Foco visible en web, tinte hover, feedback de pulsado y disabled. Respeto de Reduce Motion en las animaciones de anillos/mascota; sus configuraciones viven en los componentes existentes.

Toast se cierra a los 2.4 s. Guardar exploración valida distancia y tiempo, conserva los campos con error y confirma el guardado. Contador basado en reloj para resistir pausas de la app. SOS y resolver emergencia requieren mantener pulsado, con progreso visible.

Primer frame independiente de importaciones de features. `index.js` guarda solo etapas y tiempos en `Documents/startup.json`; no registra salud ni identidad. BLE/modelo local se inicializan al usarlos. Release incluye `main.jsbundle`; después de añadir dependencias nativas hay que instalar pods y recompilar. Nunca confundir proceso vivo con pantalla renderizada: comprobar captura real.

Rendimiento: sin web fonts, geometría vectorial pequeña, separación por rutas, gráficos secundarios visibles bajo demanda, históricos limitados, medidas reservadas para SVG, animación en UI thread y sin assets fotográficos grandes. No se han medido Core Web Vitals; no atribuir cifras de LCP/CLS/INP a estas decisiones.

## 11. Accesibilidad y verificaciones
Texto secundario `#98989F`: 7.33:1 sobre negro, 5.94:1 sobre superficie, 4.86:1 sobre elevada. Blanco: mínimo 13.94:1 sobre esas superficies. Texto #141518 sobre acción #E8EAED: 15.15:1. Normal #A5A7AE sobre elevada: 5.80:1. Glifo bronce/oro sobre campo: 10.90:1/13.57:1. Estado nunca solo color.

Touch targets principales ≥44 pt; headers ajustados a 44. Permitir crecimiento del texto y wrap; no fijar altura en contenido largo. Web tiene foco `:focus-visible`. Medallas se acompañan de título, estado y tier en texto. Dynamic Type 200 %, VoiceOver y Reduce Transparency requieren una pasada manual; no declararlos verificados por typecheck.

## 12. Excepciones y límites de alcance
Negro/blanco puros son deliberados para OLED nocturno. El usuario pidió más visualización: diales/anillos son intencionales, sin añadir puntajes de salud. Metal se limita al parche. Se conservan los diez IDs/XP existentes y se muestran como tales: no presentar la propuesta de 21 logros como si ya existiera. Ranking actual = XP acumulado; no llamarlo esfuerzo semanal. El sistema ampliado, nuevos tiers persistidos, retos de tripulación y kudos de fase 2 siguen en la propuesta de investigación, no en el contrato actual.

## 13. Pantallas futuras
Reutilizar tokens, componentes y estados de este documento. Prioridad: datos y lectura; la mascota y los parches no pueden tapar alertas. Cada nuevo logro requiere fuente de datos, regla comprobable, compatibilidad y persistencia antes de mostrarse como activo.

## 14. Mantenimiento
Actualizar este archivo junto a cualquier cambio de tokens, componentes o comportamiento. Las reseñas históricas en `docs/product/review/` son especificaciones y propuestas; este archivo y el código describen lo implementado. La información de build del dispositivo está en `mobile/README.md`.

### Ajuste de interacción: juego y chat
El juego mide su escena y reserva solo la parte de la barra nativa que la superpone: altura de `react-native-bottom-tabs`, posición de ventana y margen de 12 pt. Nave, pausa y panel de partida se posicionan respecto a ese campo visible. El acceso a la mascota se llama «Escribir a Orbi»; el globo abre chat, y la sesión guiada mantiene su propia acción. El compositor reserva la barra al cerrar el teclado, conserva Enviar visible y limita la espera de UI a 30 segundos. Las preguntas sin hub disponible no se guardan en la cola offline.

### Revisión de acabado
La estructura se conserva. Interfaz monocroma con una acción primaria blanca, secundarios grises y texto sin tintes decorativos. Orbi conserva su forma y animación, pero viste un traje claro sobre una superficie simple: sin planeta ni estrellas. Sus tres indicadores son cifras/iconos discretos, no tres anillos competidores. Diagnóstico y prueba del modelo viven en Ajustes, fuera de la conversación. Se aprovechan los controles nativos ya instalados (segmentado, fecha, sheets, navegación, símbolos); no se añadieron dependencias.

Referencias primarias consultadas: [Color de Apple](https://developer.apple.com/design/human-interface-guidelines/color), [Buttons de Apple](https://developer.apple.com/design/human-interface-guidelines/buttons). La implementación de listas/tarjetas sigue siendo RN adaptado; no se presenta como UITableView nativo.

Verificación de esta iteración: Release simulator compilado; capturas de Hoy/Mascota/Chat revisadas en iOS26.5 y guardadas en `docs/product/review/screenshots/`. El iPhone físico no estaba disponible. El runtime de simulador iPhone18/iOS27.2 exige adoptar UIScene antes de lanzar esta app: incompatibilidad registrada en PROBLEMS, no validación de diseño en ese runtime.
