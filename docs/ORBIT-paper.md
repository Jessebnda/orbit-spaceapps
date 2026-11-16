# ORBIT: Onboard Risk & Behavioral Insight Tracker

Jorge Humberto Ibarra Flores · Alejandro Pineda Aguirre · Francisco Javier Castillo Osobampo · Erick Blanco Nakashima · Jesse Banda Chaidez

*Centro de Enseñanza Técnica y Superior (CETYS Universidad)* · 15 de noviembre de 2026

> Documento técnico del equipo (en español). Para la versión en inglés del proyecto, ver el [README](../README.md).

## 1. Planteamiento del Challenge

En misiones de larga duración hacia la Luna o Marte, la tripulación está expuesta a riesgos como radiación, aislamiento, confinamiento y gravedad alterada. La comunicación con la Tierra puede tener retrasos importantes y los astronautas no son necesariamente expertos médicos.

Actualmente, la evaluación de la salud en vuelo depende en gran medida del seguimiento desde Tierra y de datos dispersos o poco interpretables. Esto limita la capacidad de la tripulación para detectar deterioros graduales —por ejemplo, en salud cardiovascular, sueño, ejercicio o medicación— y actuar de forma oportuna antes de que se conviertan en emergencias.

## 2. Propuesta de Solución: Arquitectura ORBIT

Para dar respuesta a las limitaciones de monitoreo médico en misiones de larga duración, se propone ORBIT (Onboard Risk & Behavioral Insight Tracker). ORBIT es un ecosistema ciberfísico que integra hardware vestible (wearables) de grado médico con una arquitectura de software de doble capa (Edge Computing y Control de Misión), diseñado para monitorear de forma autónoma la salud física y cognitiva de la tripulación, prediciendo riesgos antes de que se conviertan en emergencias.

**Visión general.** La arquitectura de ORBIT se divide en dos ecosistemas interconectados que operan en red:

1. **Ecosistema de Hardware (Red de Sensores Corporales)**, compuesto por tres prendas inteligentes interconectadas mediante microcontroladores ESP32 y protocolos de comunicación ESP-NOW para la red de área corporal y LoRa como repetidores para cubrir distancia dentro de la nave.
   1. *Chaleco (Torso):* integra electrodos para electrocardiograma (ECG) y respiración, termistor, IMU y un sistema de alimentación regulada.
   2. *Brazalete:* incorpora sensores de ritmo cardíaco e IMU. Además, se apoya de un dispositivo móvil (celular) anclado a la muñeca que actúa como Interfaz Humano-Máquina (HUD).
   3. *Headband (Cabeza):* incluye una cámara para registro de evidencia.
2. **Ecosistema de Software**
   1. *Capa Local (APP):* reside en la app del brazalete/dispositivo móvil. Utiliza un modelo de lenguaje ligero (Qwen) para procesar métricas inmediatas (presión, oxígeno, ritmo cardíaco, temperatura, actividad física, respiración) y emitir alertas tempranas en tiempo real sin depender de la Tierra.
   2. *Capa Central (Dashboard de Control de Misión):* un modelo pesado ejecutado en una computadora local que recibe los datos de toda la tripulación, realiza análisis predictivos, gestiona las señales de SOS y genera diagnósticos clínicos detallados, incluyendo representaciones del estado del astronauta.

**Enfoque centrado en el astronauta y gamificación.** A diferencia de los sistemas de telemetría tradicionales, ORBIT pone al astronauta en el centro de la experiencia, abordando no solo la salud física, sino también los riesgos psicológicos derivados del aislamiento y el confinamiento.

1. *Monitoreo conductual y cognitivo:* el sistema no solo registra métricas fisiológicas; la app local evalúa la actividad mental y los comportamientos del astronauta mediante un sistema de logros. Incorpora minijuegos de activación cognitiva para medir reflejos, comunicación y actividad física.
2. *Gamificación para la adhesión al tratamiento:* para combatir la monotonía y fomentar el ejercicio, se implementa un sistema de tablas de clasificación (leaderboards estilo Strava) que incentiva la actividad física y la interacción social entre los miembros de la misión.
3. *Autonomía y protocolos personalizados:* el Dashboard de Control de Misión analiza los datos recabados (métricas y comportamientos) y genera protocolos específicos para cada astronauta. Dependiendo de su desempeño físico y mental, el sistema "receta" sesiones de trabajo individual o en equipo, enviando señales de SOS bidireccionales entre la computadora y el dispositivo móvil del astronauta.

## 3. Diseño de Hardware

Para efectos de validación y demostración (MVP), el sistema ORBIT se ha diseñado como un prototipo funcional orientado inicialmente a un solo sujeto de prueba (astronauta), pero con una arquitectura escalable para el resto de la tripulación. El hardware se compone de una red de dispositivos vestibles (wearables) interconectados de forma inalámbrica, los cuales recolectan datos fisiológicos y de contexto en tiempo real.

### 3.1 Red y sensores de comunicación

La columna vertebral de la comunicación del hardware es el uso de microcontroladores ESP32 en cada una de las prendas. Para garantizar una red de área corporal (BAN) de baja latencia y alta eficiencia energética, la comunicación entre las prendas y el dispositivo móvil se realiza mediante el protocolo ESP-NOW.

Dado que las misiones espaciales implican desplazamientos a lo largo de la nave (más allá del alcance típico del ESP-NOW), el sistema incorpora repetidores basados en tecnología LoRa. Esto garantiza que las señales de telemetría y las alertas de emergencia (SOS) emitidas desde cualquier prenda lleguen de forma fiable a la computadora de misión, superando los obstáculos físicos del entorno.

### 3.2 Limitaciones físicas y sensores especializados

El diseño del hardware reconoce los desafíos de medir ciertos parámetros en entornos espaciales. Para el prototipo se implementan las siguientes soluciones:

- *Medición de radiación:* se integra un sensor basado en MOSFET de radiación, alineado con las investigaciones actuales de la Agencia Espacial Canadiense (CSA) para el monitoreo de dosis absorbidas.
- *Limitaciones físicas (glucosa, EEG, pérdida muscular):* se reconoce la complejidad de integrar sensores no invasivos de glucosa o electroencefalograma (EEG) en el prototipo actual. Asimismo, la pérdida de densidad ósea y muscular no puede medirse con estos wearables. Para mitigar esto, el sistema delega esta responsabilidad al software del Dashboard, el cual emitirá protocolos indicando al astronauta acudir a equipos de alta resolución dentro de la nave (como resonancia magnética o tomografía) cuando los datos de actividad física sugieren un riesgo.

## 4. Caso de Uso y Demostración

Para validar la efectividad del sistema ORBIT, se han definido tres escenarios principales que no solo demuestran la viabilidad técnica del prototipo, sino también la experiencia de usuario (UX) y la utilidad clínica del sistema para la tripulación y el control de misión.

1. **Flujo de monitoreo rutinario.** En su rutina diaria, el astronauta viste el chaleco, el brazalete y la banda cefálica. Mientras realiza sus actividades, los sensores recolectan datos biométricos de forma pasiva. El astronauta interactúa con el sistema a través del dispositivo móvil anclado a su muñeca. El modelo ligero (Qwen) procesa los signos vitales localmente y le presenta su estado mediante un sistema de logros y estadísticas. Para fomentar la actividad física y mental, el astronauta participa en los minijuegos de reflejos y comunicación, y consulta su posición en la tabla de clasificación frente a otros miembros de la misión, incentivando la cohesión del equipo.
2. **Predicción de riesgos.** Mientras el astronauta realiza sus tareas, el Dashboard (computadora de misión) recibe los flujos de datos procesados. El modelo pesado de inteligencia artificial analiza tendencias a largo plazo (deriva fisiológica y de comportamiento). Si detecta, por ejemplo, una disminución paulatina en la calidad del sueño combinada con un bajo rendimiento en los juegos cognitivos, el sistema predice un riesgo de fatiga crónica. Automáticamente, el Dashboard genera un protocolo personalizado, recetando una sesión de trabajo en equipo más ligera o derivando al astronauta a un escaneo de alta resolución para descartar pérdida de densidad ósea o muscular.
3. **Flujo de emergencia SOS.** Ante una anomalía repentina (ej. arritmia detectada por el chaleco o un evento traumático), el astronauta puede activar una señal de SOS de forma manual desde su brazalete o el sistema puede dispararla de forma automática. La señal llega hasta el Dashboard de misión. Inmediatamente, la computadora despliega alertas visuales en rojo, mostrando en tiempo real qué signos vitales están fallando y sugiriendo los pasos de primeros auxilios a seguir, sin depender de la comunicación con la Tierra.

## 5. Conclusión

El desarrollo de ORBIT propone una solución integral y autónoma a la creciente necesidad de monitorización médica y psicológica en misiones espaciales de larga duración. A través de la integración de una red de sensores vestibles (chaleco, brazalete y banda cefálica), el sistema garantiza la captura continua de telemetría biométrica sin depender de infraestructuras de comunicación limitadas.

La arquitectura de software de doble capa de ORBIT demuestra que es posible delegar la autonomía al propio astronauta. La implementación de un modelo ligero local (Qwen) en el dispositivo de muñeca permite un análisis inmediato de los signos vitales y las conductas, mientras que el Dashboard de Control de Misión, impulsado por un modelo de inteligencia artificial más grande, es capaz de procesar los datos de toda la tripulación, predecir riesgos y generar protocolos médicos personalizados.

Más allá del monitoreo físico, la inclusión de un sistema de gamificación y registro conductual (minijuegos cognitivos y leaderboards) aborda de manera innovadora los desafíos psicológicos derivados del aislamiento y el confinamiento, fomentando la cohesión del equipo y la adherencia a las rutinas de ejercicio.

Si bien el prototipo actual presenta limitaciones inherentes al hardware disponible (como la imposibilidad de medir glucosa, EEG o densidad ósea de forma no invasiva), el sistema mitiga estas carencias derivando al astronauta a equipos de alta resolución dentro de la nave. De cara al futuro, el proyecto contempla la miniaturización de los componentes electrónicos, la integración de sensores médicos más avanzados, la red ESP-NOW con repetidores LoRa y la validación del modelo predictivo en simulaciones análogas de hábitats espaciales.

> **Estado del prototipo (noviembre 2026):** las prendas se comunican hoy por Bluetooth (BLE y Bluetooth clásico) con el celular, y el celular con la computadora de misión por WiFi local. ESP-NOW, los repetidores LoRa, el sensor de radiación y la representación 3D del astronauta son trabajo futuro. Ver [Status and limits](../README.md#status-and-limits).

## Referencias

1. Bell S.T. et al., *Summary Results from the APEX Standardized Suite*, NASA HRP IWS 2026. https://ntrs.nasa.gov/api/citations/20260002661/downloads/Bell_APEX_IWS_2026_final.pdf
2. NASA NTRS 20250011721. https://ntrs.nasa.gov/citations/20250011721
3. Picano J., *Behavioral Risk in Spaceflight*, NASA. https://ntrs.nasa.gov/api/citations/20240000994/downloads/Behavioral%20Risk%20In%20Spaceflight_Picano.pdf
4. NASA NTRS 20130012640. https://ntrs.nasa.gov/api/citations/20130012640/downloads/20130012640.pdf
